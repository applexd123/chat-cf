/**
 * Streaming chunk parser
 * Handles SSE format parsing, chunk validation, error extraction from OpenAI-compatible API responses
 */

import type { StreamChunk } from "../models/stream-chunk.js";
import { createStreamChunk, createErrorChunk } from "../models/stream-chunk.js";

/**
 * OpenAI-compatible streaming response delta structure
 */
export interface OpenAIDelta {
	choices?: Array<{
		delta?: {
			content?: string;
		};
		finish_reason?: string | null;
	}>;
	error?: {
		message: string;
		code?: string;
	};
}

/**
 * Parse SSE line and extract JSON data
 */
export function parseSSELine(line: string): unknown | null {
	const trimmed = line.trim();
	if (!trimmed.startsWith("data: ")) {
		return null;
	}

	const data = trimmed.slice(6); // Remove "data: " prefix

	// Handle [DONE] marker
	if (data === "[DONE]") {
		return { done: true };
	}

	try {
		return JSON.parse(data);
	} catch (error) {
		return null;
	}
}

/**
 * Extract content from OpenAI-compatible delta
 */
export function extractContentFromDelta(delta: OpenAIDelta): string | null {
	if (delta.error) {
		return null; // Error will be handled separately
	}

	const content = delta.choices?.[0]?.delta?.content;
	return content || null;
}

/**
 * Check if delta indicates stream completion
 */
export function isStreamComplete(delta: OpenAIDelta): boolean {
	return delta.choices?.[0]?.finish_reason != null;
}

/**
 * Extract error from OpenAI-compatible delta
 */
export function extractErrorFromDelta(delta: OpenAIDelta): string | null {
	if (delta.error) {
		return delta.error.message || "Unknown error";
	}
	return null;
}

/**
 * Convert OpenAI-compatible SSE chunk to StreamChunk
 */
export function convertDeltaToStreamChunk(
	index: number,
	delta: OpenAIDelta
): StreamChunk | null {
	// Check for errors first
	const error = extractErrorFromDelta(delta);
	if (error) {
		return createErrorChunk(index, error);
	}

	// Extract content
	const content = extractContentFromDelta(delta);
	if (content) {
		return createStreamChunk(index, content, "content");
	}

	// No content or error, skip this chunk
	return null;
}

/**
 * Parse SSE stream text into chunks
 */
export async function* parseSSEStream(
	reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<StreamChunk, void, unknown> {
	const decoder = new TextDecoder();
	let buffer = "";
	let index = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || ""; // Keep incomplete line in buffer

			for (const line of lines) {
				if (!line.trim()) continue;

				const data = parseSSELine(line);
				if (!data) continue;

				// Handle [DONE] marker
				if (typeof data === "object" && "done" in data && data.done) {
					return;
				}

				// Convert OpenAI-compatible delta to StreamChunk
				const chunk = convertDeltaToStreamChunk(
					index++,
					data as OpenAIDelta
				);
				if (chunk) {
					yield chunk;
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}

