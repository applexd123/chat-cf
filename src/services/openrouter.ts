/**
 * OpenRouter API client wrapper
 * Provides OpenAI-compatible API calls with streaming response handling
 */

import type { StreamChunk } from "../models/stream-chunk.js";
import { parseSSEStream } from "../utils/stream.js";

export interface OpenRouterRequest {
	model: string;
	messages: Array<{ role: string; content: string }>;
	max_tokens?: number;
	stream?: boolean;
}

export interface OpenRouterConfig {
	apiKey: string;
	baseUrl?: string;
	defaultModel?: string;
}

/**
 * OpenRouter API client
 */
export class OpenRouterClient {
	private readonly baseUrl: string;
	private readonly apiKey: string;
	private readonly defaultModel: string;

	constructor(config: OpenRouterConfig) {
		this.baseUrl = config.baseUrl || "https://openrouter.ai/api/v1";
		this.apiKey = config.apiKey;
		this.defaultModel = config.defaultModel || "anthropic/claude-3.5-sonnet";
	}

	/**
	 * Make a streaming chat completion request
	 */
	async *streamChatCompletion(
		request: OpenRouterRequest,
		signal?: AbortSignal
	): AsyncGenerator<StreamChunk, void, unknown> {
		const url = `${this.baseUrl}/chat/completions`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				...request,
				stream: true,
			}),
			signal,
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => "Unknown error");
			throw new Error(
				`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`
			);
		}

		if (!response.body) {
			throw new Error("OpenRouter API response has no body");
		}

		const reader = response.body.getReader();
		yield* parseSSEStream(reader);
	}

	/**
	 * Make a non-streaming chat completion request (for title generation, etc.)
	 */
	async chatCompletion(
		request: OpenRouterRequest,
		signal?: AbortSignal
	): Promise<string> {
		const url = `${this.baseUrl}/chat/completions`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				...request,
				stream: false,
			}),
			signal,
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => "Unknown error");
			throw new Error(
				`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`
			);
		}

		const data = await response.json();
		return data.choices?.[0]?.message?.content || "";
	}
}

