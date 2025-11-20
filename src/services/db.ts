/**
 * D1 database client wrapper
 * Provides type-safe database operations with error handling
 */

import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema.js';
import type { ClientSession } from "../models/client-session.js";
import type { Conversation } from "../models/conversation.js";
import type { Message } from "../models/message.js";
import type { CharacterCardV3 } from "../models/character-card.js";
import { SessionRepository } from '../repositories/session.js';
import { ConversationRepository } from '../repositories/conversation.js';
import { CharacterCardRepository } from '../repositories/character-card.js';
import { DatabaseError } from '../db/errors.js';

// Re-export DatabaseError for backward compatibility
export { DatabaseError };

/**
 * D1 database client wrapper
 */
export class DatabaseClient {
	private readonly orm;
	private readonly sessionRepo: SessionRepository;
	private readonly conversationRepo: ConversationRepository;
	private readonly characterCardRepo: CharacterCardRepository;

	constructor(private readonly db: CloudflareBindings["DB"]) {
		// Initialize Drizzle ORM instance with D1 binding
		this.orm = drizzle(db, { schema });
		
		// Initialize repositories
		this.sessionRepo = new SessionRepository(this.orm);
		this.conversationRepo = new ConversationRepository(this.orm);
		this.characterCardRepo = new CharacterCardRepository(this.orm);
	}

	/**
	 * Get or create a client session
	 */
	async getOrCreateSession(
		sessionId: string,
		metadata?: Record<string, unknown>
	): Promise<ClientSession> {
		return this.sessionRepo.getOrCreate(sessionId, metadata);
	}

	/**
	 * Get conversation with messages
	 */
	async getConversationWithMessages(
		conversationId: string
	): Promise<{ conversation: Conversation; messages: Message[] } | null> {
		return this.conversationRepo.getWithMessages(conversationId);
	}

	/**
	 * Create a new conversation
	 */
	async createConversation(
		id: string,
		sessionId: string,
		title?: string,
		characterCardId?: string,
		compiledContext?: string
	): Promise<Conversation> {
		return this.conversationRepo.create(id, sessionId, title, characterCardId, compiledContext);
	}

	/**
	 * Create a new message
	 */
	async createMessage(
		id: string,
		conversationId: string,
		role: Message["role"],
		content: string
	): Promise<Message> {
		return this.conversationRepo.createMessage(id, conversationId, role, content);
	}

	/**
	 * List conversations for a session
	 */
	async listConversations(
		sessionId: string,
		limit: number = 10
	): Promise<Conversation[]> {
		return this.conversationRepo.list(sessionId, limit);
	}

	/**
	 * Get the most recent active conversation for a session
	 */
	async getActiveConversation(
		sessionId: string,
		characterCardId?: string
	): Promise<Conversation | null> {
		return this.conversationRepo.getActive(sessionId, characterCardId);
	}

	/**
	 * Create a new character card
	 */
	async createCharacterCard(
		id: string,
		characterCard: CharacterCardV3
	): Promise<{ id: string; name: string; data: CharacterCardV3; created_at: string; modified_at: string }> {
		return this.characterCardRepo.create(id, characterCard);
	}

	/**
	 * Get a character card by ID
	 */
	async getCharacterCard(
		id: string
	): Promise<{ id: string; name: string; data: CharacterCardV3; created_at: string; modified_at: string } | null> {
		return this.characterCardRepo.get(id);
	}

	/**
	 * Update a character card
	 */
	async updateCharacterCard(
		id: string,
		characterCard: CharacterCardV3
	): Promise<{ id: string; name: string; data: CharacterCardV3; created_at: string; modified_at: string } | null> {
		return this.characterCardRepo.update(id, characterCard);
	}

	/**
	 * Delete a character card
	 */
	async deleteCharacterCard(id: string): Promise<boolean> {
		return this.characterCardRepo.delete(id);
	}

	/**
	 * Get conversation with character card and messages
	 */
	async getConversationWithCharacterCard(
		conversationId: string
	): Promise<{
		conversation: Conversation;
		messages: Message[];
		characterCard: { id: string; name: string; data: CharacterCardV3; created_at: string; modified_at: string } | null;
	} | null> {
		return this.conversationRepo.getWithCharacterCard(conversationId);
	}

	/**
	 * Update conversation's compiled context
	 */
	async updateConversationCompiledContext(
		conversationId: string,
		compiledContext: string
	): Promise<void> {
		return this.conversationRepo.updateCompiledContext(conversationId, compiledContext);
	}

	/**
	 * List all character cards
	 */
	async listCharacterCards(
		limit: number = 50
	): Promise<Array<{ id: string; name: string; data: CharacterCardV3; created_at: string; modified_at: string }>> {
		return this.characterCardRepo.list(limit);
	}
}
