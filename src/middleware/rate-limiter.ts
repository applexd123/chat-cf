/**
 * Rate limiting middleware
 * Basic per-session rate limit (e.g., 10 req/min per X-Session-ID)
 */

import type { Context, Next } from "hono";
import type { CloudflareBindings } from "../../worker-configuration.js";
import { createStandardErrorResponse } from "../utils/errors.js";

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

// In-memory rate limit store (for MVP)
// In production, consider using Durable Objects or KV for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

/**
 * Rate limiting middleware
 */
export async function rateLimiterMiddleware(
	c: Context<{ Bindings: CloudflareBindings }>,
	next: Next
): Promise<Response> {
	const sessionId = c.req.header("X-Session-ID");

	if (!sessionId) {
		// No session ID, skip rate limiting (will be caught by auth middleware)
		return next();
	}

	const now = Date.now();
	const entry = rateLimitStore.get(sessionId);

	// Clean up expired entries
	if (entry && entry.resetAt < now) {
		rateLimitStore.delete(sessionId);
	}

	// Check rate limit
	const currentEntry = rateLimitStore.get(sessionId);
	if (currentEntry && currentEntry.count >= RATE_LIMIT_MAX_REQUESTS) {
		return c.json(createStandardErrorResponse("RATE_LIMIT_EXCEEDED"), 429);
	}

	// Update rate limit
	if (currentEntry) {
		currentEntry.count++;
	} else {
		rateLimitStore.set(sessionId, {
			count: 1,
			resetAt: now + RATE_LIMIT_WINDOW_MS,
		});
	}

	return next();
}

