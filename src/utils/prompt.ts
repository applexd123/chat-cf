/**
 * Message formatter for OpenRouter context
 * Converts Message[] array into OpenAI-compatible messages format
 */

import type { Message } from "../models/message.js";

/**
 * Convert Message array to OpenAI-compatible messages format
 */
export function formatMessagesForOpenRouter(
	messages: Message[]
): Array<{ role: string; content: string }> {
	return messages.map((msg) => ({
		role: msg.role,
		content: msg.content,
	}));
}

/**
 * Prepare messages for OpenRouter API
 * Includes all prior messages in correct order (chronological)
 */
export function prepareContextForOpenRouter(
	history: Message[],
	newUserMessage: string
): Array<{ role: string; content: string }> {
	const formattedHistory = formatMessagesForOpenRouter(history);
	return [
		...formattedHistory,
		{
			role: "user",
			content: newUserMessage,
		},
	];
}

