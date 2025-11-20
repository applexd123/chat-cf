import { eq, desc, and } from 'drizzle-orm';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../db/schema.js';
import { mapDbToConversation, mapDbToMessage, mapDbToCharacterCard } from '../db/mappers.js';
import { DatabaseError } from '../db/errors.js';
import type { Conversation } from '../models/conversation.js';
import type { Message } from '../models/message.js';
import type { CharacterCardV3 } from '../models/character-card.js';

export class ConversationRepository {
	constructor(private readonly orm: DrizzleD1Database<typeof schema>) {}

	/**
	 * Get conversation with messages
	 */
	async getWithMessages(
		conversationId: string
	): Promise<{ conversation: Conversation; messages: Message[] } | null> {
		try {
			// Query conversation using Drizzle ORM
			const conversationResult = await this.orm
				.select()
				.from(schema.conversations)
				.where(eq(schema.conversations.id, conversationId))
				.get();

			if (!conversationResult) {
				return null;
			}

			// Query messages using Drizzle ORM with ORDER BY
			const messagesResults = await this.orm
				.select()
				.from(schema.messages)
				.where(eq(schema.messages.conversationId, conversationId))
				.orderBy(schema.messages.createdAt)
				.all();

			// Map results using mapper functions
			return {
				conversation: mapDbToConversation(conversationResult),
				messages: messagesResults.map(mapDbToMessage),
			};
		} catch (error) {
			throw new DatabaseError(
				`Failed to get conversation with messages: ${error instanceof Error ? error.message : String(error)}`,
				"QUERY_ERROR",
				error
			);
		}
	}

	/**
	 * Create a new conversation
	 */
	async create(
		id: string,
		sessionId: string,
		title?: string,
		characterCardId?: string,
		compiledContext?: string
	): Promise<Conversation> {
		try {
			const now = new Date().toISOString();
			
			// Insert using Drizzle ORM
			await this.orm
				.insert(schema.conversations)
				.values({
					id,
					sessionId,
					title: title || null,
					createdAt: now,
					updatedAt: now,
					characterCardId: characterCardId || null,
					compiledContext: compiledContext || null,
				})
				.run();

			// Return the created conversation using mapper
			return mapDbToConversation({
				id,
				sessionId,
				title: title || null,
				createdAt: now,
				updatedAt: now,
				characterCardId: characterCardId || null,
				compiledContext: compiledContext || null,
			});
		} catch (error) {
			throw new DatabaseError(
				`Failed to create conversation: ${error instanceof Error ? error.message : String(error)}`,
				"INSERT_ERROR",
				error
			);
		}
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
		try {
			const now = new Date().toISOString();
			
			// Insert message using Drizzle ORM
			await this.orm
				.insert(schema.messages)
				.values({
					id,
					conversationId,
					role,
					content,
					createdAt: now,
				})
				.run();

			// Update conversation's updated_at using Drizzle ORM
			await this.orm
				.update(schema.conversations)
				.set({ updatedAt: now })
				.where(eq(schema.conversations.id, conversationId))
				.run();

			// Return the created message using mapper
			return mapDbToMessage({
				id,
				conversationId,
				role,
				content,
				createdAt: now,
			});
		} catch (error) {
			throw new DatabaseError(
				`Failed to create message: ${error instanceof Error ? error.message : String(error)}`,
				"INSERT_ERROR",
				error
			);
		}
	}

	/**
	 * List conversations for a session
	 */
	async list(
		sessionId: string,
		limit: number = 10
	): Promise<Conversation[]> {
		try {
			// Query using Drizzle ORM with WHERE, ORDER BY, and LIMIT
			const results = await this.orm
				.select()
				.from(schema.conversations)
				.where(eq(schema.conversations.sessionId, sessionId))
				.orderBy(desc(schema.conversations.updatedAt))
				.limit(limit)
				.all();

			// Map Drizzle results to model Conversation interface
			return results.map(mapDbToConversation);
		} catch (error) {
			throw new DatabaseError(
				`Failed to list conversations: ${error instanceof Error ? error.message : String(error)}`,
				"QUERY_ERROR",
				error
			);
		}
	}

	/**
	 * Get the most recent active conversation for a session
	 */
	async getActive(
		sessionId: string,
		characterCardId?: string
	): Promise<Conversation | null> {
		try {
			// Get the most recently updated conversation for this session
			let result;
			
			if (characterCardId) {
				result = await this.orm
					.select()
					.from(schema.conversations)
					.where(and(
						eq(schema.conversations.sessionId, sessionId),
						eq(schema.conversations.characterCardId, characterCardId)
					))
					.orderBy(desc(schema.conversations.updatedAt))
					.limit(1)
					.get();
			} else {
				result = await this.orm
					.select()
					.from(schema.conversations)
					.where(eq(schema.conversations.sessionId, sessionId))
					.orderBy(desc(schema.conversations.updatedAt))
					.limit(1)
					.get();
			}

			return result ? mapDbToConversation(result) : null;
		} catch (error) {
			throw new DatabaseError(
				`Failed to get active conversation: ${error instanceof Error ? error.message : String(error)}`,
				"QUERY_ERROR",
				error
			);
		}
	}

	/**
	 * Get conversation with character card and messages
	 */
	async getWithCharacterCard(
		conversationId: string
	): Promise<{
		conversation: Conversation;
		messages: Message[];
		characterCard: { id: string; name: string; data: CharacterCardV3; created_at: string; modified_at: string } | null;
	} | null> {
		try {
			// Query conversation using Drizzle ORM
			const conversationResult = await this.orm
				.select()
				.from(schema.conversations)
				.where(eq(schema.conversations.id, conversationId))
				.get();

			if (!conversationResult) {
				return null;
			}

			// Query messages using Drizzle ORM with ORDER BY
			const messagesResults = await this.orm
				.select()
				.from(schema.messages)
				.where(eq(schema.messages.conversationId, conversationId))
				.orderBy(schema.messages.createdAt)
				.all();

			// Query character card if present
			let characterCard = null;
			if (conversationResult.characterCardId) {
				const cardResult = await this.orm
					.select()
					.from(schema.characterCards)
					.where(eq(schema.characterCards.id, conversationResult.characterCardId))
					.get();

				if (cardResult) {
					characterCard = mapDbToCharacterCard(cardResult);
				}
			}

			// Map results using mapper functions
			return {
				conversation: mapDbToConversation(conversationResult),
				messages: messagesResults.map(mapDbToMessage),
				characterCard,
			};
		} catch (error) {
			throw new DatabaseError(
				`Failed to get conversation with character card: ${error instanceof Error ? error.message : String(error)}`,
				"QUERY_ERROR",
				error
			);
		}
	}

	/**
	 * Update conversation's compiled context
	 */
	async updateCompiledContext(
		conversationId: string,
		compiledContext: string
	): Promise<void> {
		try {
			await this.orm
				.update(schema.conversations)
				.set({ compiledContext })
				.where(eq(schema.conversations.id, conversationId))
				.run();
		} catch (error) {
			throw new DatabaseError(
				`Failed to update compiled context: ${error instanceof Error ? error.message : String(error)}`,
				"UPDATE_ERROR",
				error
			);
		}
	}
}