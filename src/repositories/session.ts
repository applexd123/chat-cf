import { eq } from 'drizzle-orm';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../db/schema.js';
import { mapDbToClientSession, stringifyMetadata } from '../db/mappers.js';
import { DatabaseError } from '../db/errors.js';
import type { ClientSession } from '../models/client-session.js';

export class SessionRepository {
	constructor(private readonly orm: DrizzleD1Database<typeof schema>) {}

	/**
	 * Get or create a client session
	 */
	async getOrCreate(
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
}