/**
 * Message formatter for OpenRouter context
 * Converts Message[] array into OpenAI-compatible messages format
 */

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { Message } from "../models/message.js";

/**
 * Convert Message array to OpenAI-compatible messages format
 */
export function formatMessagesForOpenRouter(
	messages: Message[]
): ChatCompletionMessageParam[] {
	return messages.map((msg) => ({
		role: msg.role as "user" | "assistant" | "system",
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
): ChatCompletionMessageParam[] {
	const formattedHistory = formatMessagesForOpenRouter(history);
	return [
		...formattedHistory,
		{
			role: "user",
			content: newUserMessage,
		},
	];
}

