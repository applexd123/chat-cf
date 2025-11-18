/**
 * Chat streaming handler
 * POST /api/chat/stream - Stream AI responses via SSE
 */

import type { Context } from "hono";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import { DatabaseClient } from "../services/db.js";
import { OpenRouterClient } from "../services/openrouter.js";
import { getOrGenerateSessionId } from "../utils/session.js";
import { prepareContextForOpenRouter } from "../utils/prompt.js";
import { createStandardErrorResponse, formatErrorAsStreamChunk } from "../utils/errors.js";
import { generateConversationId } from "../models/conversation.js";
import { generateMessageId } from "../models/message.js";

/**
 * POST /api/chat/stream
 * Stream AI chat response via Server-Sent Events
 */
export async function handleChatStream(
	c: Context<{ Bindings: CloudflareBindings }>
): Promise<Response> {
	const sessionId = c.req.header("X-Session-ID") || getOrGenerateSessionId(null);

	// Parse request body
	let body: { prompt?: string; conversationId?: string };
	try {
		body = await c.req.json();
	} catch (error) {
		return c.json(createStandardErrorResponse("INVALID_REQUEST"), 400);
	}

	// Validate prompt
	const prompt = body.prompt?.trim();
	if (!prompt || prompt.length === 0) {
		return c.json(createStandardErrorResponse("INVALID_REQUEST"), 400);
	}

	if (prompt.length > 10000) {
		return c.json(createStandardErrorResponse("INVALID_REQUEST"), 400);
	}

	// Initialize services
	const db = new DatabaseClient(c.env.DB);
	
	// Get API key from Cloudflare bindings (secrets or .dev.vars)
	const apiKey = c.env.OPENROUTER_API_KEY;
	if (!apiKey) {
		return c.json(
			createStandardErrorResponse("INTERNAL_ERROR"),
			500
		);
	}
	
	// Get AI model from environment (defaults to Claude 3.5 Sonnet)
	const aiModel = c.env.AI_MODEL || "anthropic/claude-3.5-sonnet";
	
	const openRouter = new OpenRouterClient({
		apiKey,
	});

	// Ensure session exists in database (required for foreign key constraint)
	await db.getOrCreateSession(sessionId);

	// Get or create conversation
	let conversationId = body.conversationId;
	let messageHistory: ChatCompletionMessageParam[] = [];

	if (conversationId) {
		// Load existing conversation
		const result = await db.getConversationWithMessages(conversationId);
		if (!result) {
			return c.json(createStandardErrorResponse("NOT_FOUND"), 404);
		}

		// Verify conversation belongs to session
		if (result.conversation.session_id !== sessionId) {
			return c.json(createStandardErrorResponse("UNAUTHORIZED"), 401);
		}

		messageHistory = prepareContextForOpenRouter(result.messages, prompt);
	} else {
		// Create new conversation
		conversationId = generateConversationId();
		await db.createConversation(conversationId, sessionId);
		messageHistory = [{ role: "user", content: prompt }];
	}

	// Save user message
	const userMessageId = generateMessageId();
	await db.createMessage(userMessageId, conversationId, "user", prompt);

	// Track first chunk latency
	const startTime = Date.now();
	let firstChunkReceived = false;
	let fullResponse = "";

	// Create SSE stream
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		async start(controller) {
			try {
				// Create abort controller for cancellation support
				const abortController = new AbortController();

				// Stream from OpenRouter
				let chunkIndex = 0;
				for await (const chunk of openRouter.streamChatCompletion(
					{
						model: aiModel,
						messages: messageHistory,
						max_tokens: 500,
					},
					abortController.signal
				)) {
					// Track first chunk latency
					if (!firstChunkReceived) {
						const latency = Date.now() - startTime;
						console.log(
							JSON.stringify({
								type: "first_chunk_latency",
								latency_ms: latency,
								sessionId,
								conversationId,
							})
						);
						firstChunkReceived = true;
					}

					// Accumulate full response
					if (chunk.type === "content") {
						fullResponse += chunk.text;
					}

					// Send chunk to client
					const chunkData = `data: ${JSON.stringify({
						index: chunkIndex++,
						text: chunk.text,
						type: chunk.type,
						timestamp: chunk.timestamp,
					})}\n\n`;
					controller.enqueue(encoder.encode(chunkData));
				}

				// Save assistant message after streaming completes
				if (fullResponse) {
					const assistantMessageId = generateMessageId();
					await db.createMessage(
						assistantMessageId,
						conversationId,
						"assistant",
						fullResponse
					);
				}

				// Send completion marker
				controller.enqueue(encoder.encode("data: [DONE]\n\n"));
				controller.close();
			} catch (error) {
				// Handle errors
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				console.error("Streaming error:", errorMessage);

				// Send error chunk
				const errorChunk = formatErrorAsStreamChunk(
					0,
					"INTERNAL_ERROR",
					errorMessage
				);
				const errorData = `data: ${JSON.stringify({
					index: 0,
					text: errorChunk.text,
					type: errorChunk.type,
					timestamp: errorChunk.timestamp,
				})}\n\n`;
				controller.enqueue(encoder.encode(errorData));
				controller.close();
			}
		},
	});

	// Return SSE response
	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}

