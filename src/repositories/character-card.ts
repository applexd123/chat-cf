import { eq, desc } from 'drizzle-orm';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../db/schema.js';
import { mapDbToCharacterCard } from '../db/mappers.js';
import { DatabaseError } from '../db/errors.js';
import type { CharacterCardV3 } from '../models/character-card.js';

export class CharacterCardRepository {
	constructor(private readonly orm: DrizzleD1Database<typeof schema>) {}

	/**
	 * Create a new character card
	 */
	async create(
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
	async get(
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
	async update(
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
	async delete(id: string): Promise<boolean> {
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
	 * List all character cards
	 */
	async list(
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