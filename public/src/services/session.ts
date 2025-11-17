/**
 * Session storage utility
 * localStorage wrapper for session ID (generate on first visit, persist across page reloads)
 */

const SESSION_ID_KEY = "chat-cf-session-id";

/**
 * Get or generate session ID
 */
export function getOrCreateSessionId(): string {
	if (typeof window === "undefined") {
		// Server-side, generate new ID
		return crypto.randomUUID();
	}

	// Check localStorage
	const existing = localStorage.getItem(SESSION_ID_KEY);
	if (existing) {
		return existing;
	}

	// Generate new session ID
	const newSessionId = crypto.randomUUID();
	localStorage.setItem(SESSION_ID_KEY, newSessionId);
	return newSessionId;
}

/**
 * Get current session ID (returns null if not set)
 */
export function getSessionId(): string | null {
	if (typeof window === "undefined") {
		return null;
	}
	return localStorage.getItem(SESSION_ID_KEY);
}

/**
 * Set session ID
 */
export function setSessionId(sessionId: string): void {
	if (typeof window === "undefined") {
		return;
	}
	localStorage.setItem(SESSION_ID_KEY, sessionId);
}

/**
 * Clear session ID
 */
export function clearSessionId(): void {
	if (typeof window === "undefined") {
		return;
	}
	localStorage.removeItem(SESSION_ID_KEY);
}

