/**
 * Error handling utilities
 * Provides error codes, error chunk formatting for SSE, and error messages
 */

import type { StreamChunk } from "../models/stream-chunk.js";
import { createErrorChunk } from "../models/stream-chunk.js";

export type ErrorCode =
	| "INVALID_REQUEST"
	| "RATE_LIMIT_EXCEEDED"
	| "INTERNAL_ERROR"
	| "UNAUTHORIZED"
	| "NOT_FOUND";

export interface ErrorResponse {
	error: ErrorCode;
	message: string;
}

/**
 * Create an error response object
 */
export function createErrorResponse(
	code: ErrorCode,
	message: string
): ErrorResponse {
	return { error: code, message };
}

/**
 * Format error as StreamChunk for SSE
 */
export function formatErrorAsStreamChunk(
	index: number,
	code: ErrorCode,
	message: string
): StreamChunk {
	return createErrorChunk(index, JSON.stringify(createErrorResponse(code, message)));
}

/**
 * Common error messages
 */
export const ErrorMessages = {
	INVALID_REQUEST: "Invalid request parameters",
	RATE_LIMIT_EXCEEDED: "Maximum requests per minute exceeded",
	INTERNAL_ERROR: "An internal error occurred",
	UNAUTHORIZED: "Session ID is required",
	NOT_FOUND: "Resource not found",
} as const;

/**
 * Create standardized error response from code
 */
export function createStandardErrorResponse(code: ErrorCode): ErrorResponse {
	return createErrorResponse(code, ErrorMessages[code]);
}

