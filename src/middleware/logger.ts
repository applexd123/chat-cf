/**
 * Structured logging middleware
 * Provides request ID, session ID, conversation ID, timestamps, error details
 */

import type { Context, Next } from "hono";
import type { CloudflareBindings } from "../../worker-configuration.js";

export interface LogContext {
	requestId: string;
	sessionId?: string;
	conversationId?: string;
	timestamp: string;
	[key: string]: unknown;
}

/**
 * Generate a request ID
 */
function generateRequestId(): string {
	return crypto.randomUUID();
}

/**
 * Structured logging middleware
 */
export async function loggerMiddleware(
	c: Context<{ Bindings: CloudflareBindings }>,
	next: Next
): Promise<Response> {
	const requestId = generateRequestId();
	const startTime = Date.now();

	// Add request ID to context
	c.set("requestId", requestId);

	// Extract session ID from header
	const sessionId = c.req.header("X-Session-ID") || undefined;

	// Log request
	const logContext: LogContext = {
		requestId,
		sessionId,
		timestamp: new Date().toISOString(),
		method: c.req.method,
		path: c.req.path,
	};

	console.log(JSON.stringify({ type: "request", ...logContext }));

	try {
		const response = await next();

		// Log response
		const duration = Date.now() - startTime;
		console.log(
			JSON.stringify({
				type: "response",
				...logContext,
				status: response.status,
				duration,
			})
		);

		// Add request ID to response header
		response.headers.set("X-Request-ID", requestId);

		return response;
	} catch (error) {
		// Log error
		const duration = Date.now() - startTime;
		console.error(
			JSON.stringify({
				type: "error",
				...logContext,
				error: error instanceof Error ? error.message : String(error),
				duration,
			})
		);

		throw error;
	}
}

/**
 * Log with context
 */
export function logWithContext(
	context: LogContext,
	message: string,
	level: "info" | "warn" | "error" = "info"
): void {
	const logEntry = {
		type: level,
		...context,
		message,
		timestamp: new Date().toISOString(),
	};

	if (level === "error") {
		console.error(JSON.stringify(logEntry));
	} else if (level === "warn") {
		console.warn(JSON.stringify(logEntry));
	} else {
		console.log(JSON.stringify(logEntry));
	}
}

