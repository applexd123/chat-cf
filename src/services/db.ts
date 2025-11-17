/**
 * D1 database client wrapper
 * Provides type-safe database operations with error handling
 */

import type { CloudflareBindings } from "../../worker-configuration.js";
import type { ClientSession } from "../models/client-session.js";
import type { Conversation } from "../models/conversation.js";
import type { Message } from "../models/message.js";

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
	constructor(private readonly db: CloudflareBindings["DB"]) {}

	/**
	 * Execute a prepared statement and return results
	 */
	async query<T = unknown>(
		sql: string,
		bindings?: unknown[]
	): Promise<D1Result<T>> {
		try {
			const stmt = this.db.prepare(sql);
			if (bindings && bindings.length > 0) {
				return await stmt.bind(...bindings).all<T>();
			}
			return await stmt.all<T>();
		} catch (error) {
			throw new DatabaseError(
				`Database query failed: ${error instanceof Error ? error.message : String(error)}`,
				"QUERY_ERROR",
				error
			);
		}
	}

	/**
	 * Execute a prepared statement and return first row
	 */
	async queryFirst<T = unknown>(
		sql: string,
		bindings?: unknown[]
	): Promise<T | null> {
		try {
			const stmt = this.db.prepare(sql);
			if (bindings && bindings.length > 0) {
				const result = await stmt.bind(...bindings).first<T>();
				return result || null;
			}
			const result = await stmt.first<T>();
			return result || null;
		} catch (error) {
			throw new DatabaseError(
				`Database query failed: ${error instanceof Error ? error.message : String(error)}`,
				"QUERY_ERROR",
				error
			);
		}
	}

	/**
	 * Execute a write operation (INSERT, UPDATE, DELETE)
	 */
	async execute(sql: string, bindings?: unknown[]): Promise<D1ExecResult> {
		try {
			const stmt = this.db.prepare(sql);
			if (bindings && bindings.length > 0) {
				return await stmt.bind(...bindings).run();
			}
			return await stmt.run();
		} catch (error) {
			throw new DatabaseError(
				`Database execute failed: ${error instanceof Error ? error.message : String(error)}`,
				"EXECUTE_ERROR",
				error
			);
		}
	}

	/**
	 * Get or create a client session
	 */
	async getOrCreateSession(
		sessionId: string,
		metadata?: Record<string, unknown>
	): Promise<ClientSession> {
		// Try to get existing session
		const existing = await this.queryFirst<ClientSession>(
			"SELECT * FROM client_sessions WHERE id = ?",
			[sessionId]
		);

		if (existing) {
			// Update last_activity
			await this.execute(
				"UPDATE client_sessions SET last_activity = ? WHERE id = ?",
				[new Date().toISOString(), sessionId]
			);
			return {
				...existing,
				last_activity: new Date().toISOString(),
			};
		}

		// Create new session
		const now = new Date().toISOString();
		const metadataJson = metadata ? JSON.stringify(metadata) : null;
		await this.execute(
			"INSERT INTO client_sessions (id, created_at, last_activity, metadata) VALUES (?, ?, ?, ?)",
			[sessionId, now, now, metadataJson]
		);

		return {
			id: sessionId,
			created_at: now,
			last_activity: now,
			metadata: metadata || undefined,
		};
	}

	/**
	 * Get conversation with messages
	 */
	async getConversationWithMessages(
		conversationId: string
	): Promise<{ conversation: Conversation; messages: Message[] } | null> {
		const conversation = await this.queryFirst<Conversation>(
			"SELECT * FROM conversations WHERE id = ?",
			[conversationId]
		);

		if (!conversation) {
			return null;
		}

		const messages = await this.query<Message>(
			"SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
			[conversationId]
		);

		return {
			conversation,
			messages: messages.results || [],
		};
	}

	/**
	 * Create a new conversation
	 */
	async createConversation(
		id: string,
		sessionId: string,
		title?: string
	): Promise<Conversation> {
		const now = new Date().toISOString();
		await this.execute(
			"INSERT INTO conversations (id, session_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
			[id, sessionId, title || null, now, now]
		);

		return {
			id,
			session_id: sessionId,
			title: title || null,
			created_at: now,
			updated_at: now,
		};
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
		const now = new Date().toISOString();
		await this.execute(
			"INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
			[id, conversationId, role, content, now]
		);

		// Update conversation's updated_at
		await this.execute(
			"UPDATE conversations SET updated_at = ? WHERE id = ?",
			[now, conversationId]
		);

		return {
			id,
			conversation_id: conversationId,
			role,
			content,
			created_at: now,
		};
	}

	/**
	 * List conversations for a session
	 */
	async listConversations(
		sessionId: string,
		limit: number = 10
	): Promise<Conversation[]> {
		const result = await this.query<Conversation>(
			"SELECT * FROM conversations WHERE session_id = ? ORDER BY updated_at DESC LIMIT ?",
			[sessionId, limit]
		);

		return result.results || [];
	}
}

