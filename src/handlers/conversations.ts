/**
 * Conversations handler
 * GET /api/conversations - List conversations for a session
 * GET /api/conversations/{id} - Load conversation with messages
 */

import type { Context } from "hono";
import { DatabaseClient } from "../services/db.js";
import { createStandardErrorResponse } from "../utils/errors.js";

/**
 * GET /api/conversations?sessionId=...
 * List conversations for a session
 */
export async function handleListConversations(
	c: Context<{ Bindings: CloudflareBindings }>
): Promise<Response> {
	const sessionId = c.req.query("sessionId") || c.req.header("X-Session-ID");

	if (!sessionId) {
		return c.json(createStandardErrorResponse("UNAUTHORIZED"), 401);
	}

	const limit = parseInt(c.req.query("limit") || "10", 10);
	const db = new DatabaseClient(c.env.DB);

	try {
		const conversations = await db.listConversations(sessionId, limit);
		return c.json({ conversations });
	} catch (error) {
		console.error("Error listing conversations:", error);
		return c.json(createStandardErrorResponse("INTERNAL_ERROR"), 500);
	}
}

/**
 * GET /api/conversations/{conversationId}
 * Load conversation with full message history
 */
export async function handleGetConversation(
	c: Context<{ Bindings: CloudflareBindings }>
): Promise<Response> {
	const conversationId = c.req.param("conversationId");
	const sessionId = c.req.header("X-Session-ID");

	if (!conversationId) {
		return c.json(createStandardErrorResponse("INVALID_REQUEST"), 400);
	}

	if (!sessionId) {
		return c.json(createStandardErrorResponse("UNAUTHORIZED"), 401);
	}

	const db = new DatabaseClient(c.env.DB);

	try {
		const result = await db.getConversationWithMessages(conversationId);

		if (!result) {
			return c.json(createStandardErrorResponse("NOT_FOUND"), 404);
		}

		// Verify conversation belongs to session
		if (result.conversation.session_id !== sessionId) {
			return c.json(createStandardErrorResponse("UNAUTHORIZED"), 401);
		}

		return c.json({
			conversation: result.conversation,
			messages: result.messages,
		});
	} catch (error) {
		console.error("Error getting conversation:", error);
		return c.json(createStandardErrorResponse("INTERNAL_ERROR"), 500);
	}
}

