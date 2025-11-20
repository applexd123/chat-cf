/**
 * D1 database client wrapper
 * Provides type-safe database operations with error handling
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, and } from 'drizzle-orm';
import type { ClientSession } from "../models/client-session.js";
import type { Conversation } from "../models/conversation.js";
import type { Message } from "../models/message.js";
import type { CharacterCardV3 } from "../models/character-card.js";
import * as schema from '../db/schema.js';
import { mapDbToClientSession, mapDbToConversation, mapDbToMessage, mapDbToCharacterCard, stringifyMetadata } from '../db/mappers.js';

export class DatabaseError extends Error {
	constructor(
		message: string,
		public readonly code?: string,
		public readonly cause?: unknown
	) {
		super(message);
		this.name = "DatabaseError";
	}
}

/**
 * D1 database client wrapper
 */
export class DatabaseClient {
	private readonly orm;

	constructor(private readonly db: CloudflareBindings["DB"]) {
		// Initialize Drizzle ORM instance with D1 binding
		this.orm = drizzle(db, { schema });
	}

	/**
	 * Get or create a client session
	 */
	async getOrCreateSession(
		sessionId: string,
		metadata?: Record<string, unknown>
	): Promise<ClientSession> {
		try {
			// Try to get existing session
			const existing = await this.orm
				.select()
				.from(schema.clientSessions)
				.where(eq(schema.clientSessions.id, sessionId))
				.get();

			if (existing) {
				// Update last_activity
				const now = new Date().toISOString();
				await this.orm
					.update(schema.clientSessions)
					.set({ lastActivity: now })
					.where(eq(schema.clientSessions.id, sessionId))
					.run();

				// Return updated session using mapper
				return mapDbToClientSession({
					...existing,
					lastActivity: now,
				});
			}

			// Create new session
			const now = new Date().toISOString();
			await this.orm
				.insert(schema.clientSessions)
				.values({
					id: sessionId,
					createdAt: now,
					lastActivity: now,
					metadata: stringifyMetadata(metadata),
				})
				.run();

			// Return newly created session
			return {
				id: sessionId,
				created_at: now,
				last_activity: now,
				metadata,
			};
		} catch (error) {
			throw new DatabaseError(
				`Failed to get or create session: ${error instanceof Error ? error.message : String(error)}`,
				"QUERY_ERROR",
				error
			);
		}
	}

	/**
	 * Get conversation with messages
	 */
	async getConversationWithMessages(
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
	async createConversation(
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
	async listConversations(
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
	async getActiveConversation(
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
	 * Create a new character card
	 */
	async createCharacterCard(
		id: string,
		characterCard: CharacterCardV3
	): Promise<{ id: string; name: string; data: CharacterCardV3; created_at: string; modified_at: string }> {
		try {
			const now = new Date().toISOString();
			
			// Insert using Drizzle ORM
			await this.orm
				.insert(schema.characterCards)
				.values({
					id,
					name: characterCard.data.name,
					data: JSON.stringify(characterCard),
					createdAt: now,
					modifiedAt: now,
				})
				.run();

			// Return the created character card
			return {
				id,
				name: characterCard.data.name,
				data: characterCard,
				created_at: now,
				modified_at: now,
			};
		} catch (error) {
			throw new DatabaseError(
				`Failed to create character card: ${error instanceof Error ? error.message : String(error)}`,
				"INSERT_ERROR",
				error
			);
		}
	}

	/**
	 * Get a character card by ID
	 */
	async getCharacterCard(
		id: string
	): Promise<{ id: string; name: string; data: CharacterCardV3; created_at: string; modified_at: string } | null> {
		try {
			const result = await this.orm
				.select()
				.from(schema.characterCards)
				.where(eq(schema.characterCards.id, id))
				.get();

			if (!result) {
				return null;
			}

			return mapDbToCharacterCard(result);
		} catch (error) {
			throw new DatabaseError(
				`Failed to get character card: ${error instanceof Error ? error.message : String(error)}`,
				"QUERY_ERROR",
				error
			);
		}
	}

	/**
	 * Update a character card
	 */
	async updateCharacterCard(
		id: string,
		characterCard: CharacterCardV3
	): Promise<{ id: string; name: string; data: CharacterCardV3; created_at: string; modified_at: string } | null> {
		try {
			const now = new Date().toISOString();
			
			// Check if card exists
			const existing = await this.orm
				.select()
				.from(schema.characterCards)
				.where(eq(schema.characterCards.id, id))
				.get();

			if (!existing) {
				return null;
			}

			// Update using Drizzle ORM
			await this.orm
				.update(schema.characterCards)
				.set({
					name: characterCard.data.name,
					data: JSON.stringify(characterCard),
					modifiedAt: now,
				})
				.where(eq(schema.characterCards.id, id))
				.run();

			// Return the updated character card
			return {
				id,
				name: characterCard.data.name,
				data: characterCard,
				created_at: existing.createdAt,
				modified_at: now,
			};
		} catch (error) {
			throw new DatabaseError(
				`Failed to update character card: ${error instanceof Error ? error.message : String(error)}`,
				"UPDATE_ERROR",
				error
			);
		}
	}

	/**
	 * Delete a character card
	 */
	async deleteCharacterCard(id: string): Promise<boolean> {
		try {
			// Check if card exists
			const existing = await this.orm
				.select()
				.from(schema.characterCards)
				.where(eq(schema.characterCards.id, id))
				.get();

			if (!existing) {
				return false;
			}

			// Delete using Drizzle ORM
			await this.orm
				.delete(schema.characterCards)
				.where(eq(schema.characterCards.id, id))
				.run();

			return true;
		} catch (error) {
			throw new DatabaseError(
				`Failed to delete character card: ${error instanceof Error ? error.message : String(error)}`,
				"DELETE_ERROR",
				error
			);
		}
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
	async updateConversationCompiledContext(
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

	/**
	 * List all character cards
	 */
	async listCharacterCards(
		limit: number = 50
	): Promise<Array<{ id: string; name: string; data: CharacterCardV3; created_at: string; modified_at: string }>> {
		try {
			const results = await this.orm
				.select()
				.from(schema.characterCards)
				.orderBy(desc(schema.characterCards.modifiedAt))
				.limit(limit)
				.all();

			return results.map(mapDbToCharacterCard);
		} catch (error) {
			throw new DatabaseError(
				`Failed to list character cards: ${error instanceof Error ? error.message : String(error)}`,
				"QUERY_ERROR",
				error
			);
		}
	}
}

