/**
 * Message model type
 * Represents an individual message (user or assistant) within a conversation
 */

import type { Conversation } from "./conversation.js";

export type MessageRole = "user" | "assistant";

export interface Message {
	id: string; // UUID
	conversation_id: string; // Foreign key to Conversation.id
	role: MessageRole; // Either 'user' or 'assistant'
	content: string; // Full message text
	created_at: string; // ISO 8601 timestamp
}

/**
 * Generate a new UUID for message ID
 */
export function generateMessageId(): string {
	return crypto.randomUUID();
}

/**
 * Validate message role
 */
export function isValidMessageRole(role: string): role is MessageRole {
	return role === "user" || role === "assistant";
}

/**
 * Create a new Message with current timestamp
 */
export function createMessage(
	id: string,
	conversationId: string,
	role: MessageRole,
	content: string
): Message {
	return {
		id,
		conversation_id: conversationId,
		role,
		content,
		created_at: new Date().toISOString(),
	};
}

