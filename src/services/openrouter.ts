/**
 * OpenRouter API client wrapper
 * Provides OpenAI-compatible API calls with streaming response handling
 */

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { StreamChunk } from "../models/stream-chunk.js";
import { createStreamChunk } from "../models/stream-chunk.js";

export interface OpenRouterRequest {
	model: string;
	messages: ChatCompletionMessageParam[];
	max_tokens?: number;
	stream?: boolean;
}

export interface OpenRouterConfig {
	apiKey: string;
	baseUrl?: string;
	defaultModel?: string;
}

/**
 * OpenRouter API client
 */
export class OpenRouterClient {
	private readonly client: OpenAI;
	private readonly defaultModel: string;

	constructor(config: OpenRouterConfig) {
		// API key must be provided via Cloudflare bindings (c.env.OPENROUTER_API_KEY)
		// For local dev, set it in .dev.vars or wrangler.jsonc vars
		if (!config.apiKey) {
			throw new Error(
				"OPENROUTER_API_KEY is required. Set it via Cloudflare Secrets or .dev.vars for local development."
			);
		}
		
		// Initialize OpenAI SDK with OpenRouter base URL
		this.client = new OpenAI({
			apiKey: config.apiKey,
			baseURL: config.baseUrl || "https://openrouter.ai/api/v1",
		});
		
		this.defaultModel = config.defaultModel || "deepseek/deepseek-v3.2-exp";
	}

	/**
	 * Make a streaming chat completion request
	 */
	async *streamChatCompletion(
		request: OpenRouterRequest,
		signal?: AbortSignal
	): AsyncGenerator<StreamChunk, void, unknown> {
		// Mock mode for testing
		if (request.model === "mock-model") {
			const mockResponse = "This is a mock response for testing.";
			const words = mockResponse.split(" ");
			let index = 0;
			
			for (const word of words) {
				yield createStreamChunk(index++, word + " ", "content");
				// Simulate slight delay
				await new Promise(resolve => setTimeout(resolve, 10));
			}
			return;
		}

		try {
			console.log(JSON.stringify({
				event: "openrouter_request",
				model: request.model,
				message_count: request.messages.length,
				max_tokens: request.max_tokens,
				stream: true,
				messages: request.messages.map(msg => ({
					role: msg.role,
					content: msg.content,
					content_length: typeof msg.content === 'string' ? msg.content.length : 0
				}))
			}));

			const stream = await this.client.chat.completions.create(
				{
					model: request.model,
					messages: request.messages,
					max_tokens: request.max_tokens,
					stream: true,
				},
				{
					signal,
				}
			);

			let index = 0;
			for await (const chunk of stream) {
				const content = chunk.choices[0]?.delta?.content;
				if (content) {
					yield createStreamChunk(index++, content, "content");
				}
			}
		} catch (error) {
			console.error("Detailed OpenRouter API Error:", {
				name: (error as Error).name,
				message: (error as Error).message,
				// @ts-ignore
				code: error.code,
				// @ts-ignore
				type: error.type,
				cause: (error as Error).cause
			});

			if (error instanceof OpenAI.APIError) {
				const status = error.status ?? 'Connection';
				throw new Error(
					`OpenRouter API error: ${status} ${error.message}`
				);
			}
			throw error;
		}
	}

	/**
	 * Make a non-streaming chat completion request (for title generation, etc.)
	 */
	async chatCompletion(
		request: OpenRouterRequest,
		signal?: AbortSignal
	): Promise<string> {
		try {
			console.log(JSON.stringify({
				event: "openrouter_request",
				model: request.model,
				message_count: request.messages.length,
				max_tokens: request.max_tokens,
				stream: false,
				messages: request.messages.map(msg => ({
					role: msg.role,
					content: msg.content,
					content_length: typeof msg.content === 'string' ? msg.content.length : 0
				}))
			}));

			const response = await this.client.chat.completions.create(
				{
					model: request.model,
					messages: request.messages,
					max_tokens: request.max_tokens,
					stream: false,
				},
				{
					signal,
				}
			);

			return response.choices[0]?.message?.content || "";
		} catch (error) {
			console.error("Detailed OpenRouter API Error (Non-streaming):", error);
			if (error instanceof OpenAI.APIError) {
				const status = error.status ?? 'Connection';
				throw new Error(
					`OpenRouter API error: ${status} ${error.message}`
				);
			}
			throw error;
		}
	}
}

