/**
 * API client service
 * Fetch wrapper for /api/chat/stream (SSE with EventSource or fetch), /api/conversations (list), /api/conversations/{id} (load history)
 */

import type { StreamChunk } from "../../../src/models/stream-chunk.js";
import type { Conversation } from "../../../src/models/conversation.js";
import type { Message } from "../../../src/models/message.js";
import { getOrCreateSessionId } from "./session.js";

const API_BASE = ""; // Relative to current origin

export interface ChatStreamRequest {
	prompt: string;
	conversationId?: string;
}

export interface ChatStreamResponse {
	chunks: AsyncIterable<StreamChunk>;
	abort: () => void;
}

/**
 * Stream chat completion via SSE
 */
export async function streamChat(
	request: ChatStreamRequest,
	sessionId?: string
): Promise<ChatStreamResponse> {
	const sid = sessionId || getOrCreateSessionId();
	const abortController = new AbortController();

	const response = await fetch(`${API_BASE}/api/chat/stream`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Session-ID": sid,
		},
		body: JSON.stringify(request),
		signal: abortController.signal,
	});

	if (!response.ok) {
		throw new Error(`API error: ${response.status} ${response.statusText}`);
	}

	if (!response.body) {
		throw new Error("Response has no body");
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	async function* readChunks(): AsyncGenerator<StreamChunk, void, unknown> {
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed || !trimmed.startsWith("data: ")) continue;

					const data = trimmed.slice(6); // Remove "data: " prefix
					if (data === "[DONE]") {
						return;
					}

					try {
						const chunk = JSON.parse(data) as StreamChunk;
						yield chunk;
					} catch (error) {
						console.error("Failed to parse chunk:", error);
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
	}

	return {
		chunks: readChunks(),
		abort: () => abortController.abort(),
	};
}

/**
 * List conversations for a session
 */
export async function listConversations(
	sessionId?: string
): Promise<Conversation[]> {
	const sid = sessionId || getOrCreateSessionId();

	const response = await fetch(`${API_BASE}/api/conversations?sessionId=${sid}`, {
		method: "GET",
		headers: {
			"X-Session-ID": sid,
		},
	});

	if (!response.ok) {
		throw new Error(`API error: ${response.status} ${response.statusText}`);
	}

	const data = await response.json();
	return data.conversations || [];
}

/**
 * Get conversation with messages
 */
export async function getConversation(
	conversationId: string,
	sessionId?: string
): Promise<{ conversation: Conversation; messages: Message[] }> {
	const sid = sessionId || getOrCreateSessionId();

	const response = await fetch(
		`${API_BASE}/api/conversations/${conversationId}`,
		{
			method: "GET",
			headers: {
				"X-Session-ID": sid,
			},
		}
	);

	if (!response.ok) {
		throw new Error(`API error: ${response.status} ${response.statusText}`);
	}

	return await response.json();
}

