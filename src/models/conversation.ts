/**
 * Conversation model type
 * Represents a multi-turn chat session with an AI
 */

import type { ClientSession } from "./client-session.js";

export interface Conversation {
	id: string; // UUID
	session_id: string; // Foreign key to ClientSession.id
	title: string | null; // Auto-inferred conversation title
	created_at: string; // ISO 8601 timestamp
	updated_at: string; // ISO 8601 timestamp
}

/**
 * Generate a new UUID for conversation ID
 */
export function generateConversationId(): string {
	return crypto.randomUUID();
}

/**
 * Create a new Conversation with current timestamp
 */
export function createConversation(
	id: string,
	sessionId: string,
	title?: string
): Conversation {
	const now = new Date().toISOString();
	return {
		id,
		session_id: sessionId,
		title: title || null,
		created_at: now,
		updated_at: now,
	};
}

/**
 * Update conversation's updated_at timestamp
 */
export function updateConversationTimestamp(
	conversation: Conversation
): Conversation {
	return {
		...conversation,
		updated_at: new Date().toISOString(),
	};
}

