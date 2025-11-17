/**
 * ClientSession model type
 * Represents an anonymous user session tracked via session ID
 */

export interface ClientSession {
	id: string; // UUID
	created_at: string; // ISO 8601 timestamp
	last_activity: string; // ISO 8601 timestamp
	metadata?: Record<string, unknown>; // Optional JSON metadata
}

/**
 * Generate a new UUID for session ID
 */
export function generateSessionId(): string {
	return crypto.randomUUID();
}

/**
 * Validate session ID format (UUID)
 */
export function isValidSessionId(id: string): boolean {
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return uuidRegex.test(id);
}

/**
 * Create a new ClientSession with current timestamp
 */
export function createClientSession(
	id: string,
	metadata?: Record<string, unknown>
): ClientSession {
	const now = new Date().toISOString();
	return {
		id,
		created_at: now,
		last_activity: now,
		metadata,
	};
}

