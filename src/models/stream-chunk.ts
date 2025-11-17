/**
 * StreamChunk model type
 * Represents a single chunk of streamed AI response (ephemeral, not persisted)
 */

export type StreamChunkType = "content" | "error";

export interface StreamChunk {
	index: number; // Sequence number (0, 1, 2, ...)
	text: string; // Partial response text from AI model
	type: StreamChunkType; // Either 'content' (text chunk) or 'error' (error message)
	timestamp: string; // ISO 8601 timestamp when chunk was received
}

/**
 * Create a new StreamChunk with current timestamp
 */
export function createStreamChunk(
	index: number,
	text: string,
	type: StreamChunkType = "content"
): StreamChunk {
	return {
		index,
		text,
		type,
		timestamp: new Date().toISOString(),
	};
}

/**
 * Create an error StreamChunk
 */
export function createErrorChunk(index: number, errorMessage: string): StreamChunk {
	return createStreamChunk(index, errorMessage, "error");
}

