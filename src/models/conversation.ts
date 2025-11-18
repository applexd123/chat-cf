/**
 * Conversation model type
 * Represents a multi-turn chat session with an AI
 */

export interface Conversation {
	id: string; // UUID
	session_id: string; // Foreign key to ClientSession.id
	title: string | null; // Auto-inferred conversation title
	created_at: string; // ISO 8601 timestamp
	updated_at: string; // ISO 8601 timestamp
	character_card_id?: string | null; // Optional foreign key to CharacterCard.id
	compiled_context?: string | null; // Pre-compiled static character context (JSON)
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
	title?: string,
	characterCardId?: string,
	compiledContext?: string
): Conversation {
	const now = new Date().toISOString();
	return {
		id,
		session_id: sessionId,
		title: title || null,
		created_at: now,
		updated_at: now,
		character_card_id: characterCardId || null,
		compiled_context: compiledContext || null,
	};
}


