/**
 * Session management utility
 * Handles UUID generation, header validation, and session ID extraction
 */

import { generateSessionId, isValidSessionId } from "../models/client-session.js";

/**
 * Extract session ID from X-Session-ID header
 */
export function extractSessionIdFromHeader(
	headerValue: string | null | undefined
): string | null {
	if (!headerValue) {
		return null;
	}

	const trimmed = headerValue.trim();
	return isValidSessionId(trimmed) ? trimmed : null;
}

/**
 * Generate or extract session ID from request headers
 * Returns existing session ID if valid, otherwise generates a new one
 */
export function getOrGenerateSessionId(
	headerValue: string | null | undefined
): string {
	const extracted = extractSessionIdFromHeader(headerValue);
	return extracted || generateSessionId();
}

/**
 * Validate session ID format
 */
export function validateSessionId(id: string): boolean {
	return isValidSessionId(id);
}

