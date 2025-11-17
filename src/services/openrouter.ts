/**
 * OpenRouter API client wrapper
 * Provides OpenAI-compatible API calls with streaming response handling
 */

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { StreamChunk } from "../models/stream-chunk.js";
import { createStreamChunk } from "../models/stream-chunk.js";

export interface OpenRouterRequest {
	model: string;
	messages: ChatCompletionMessageParam[];
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
	private readonly client: OpenAI;
	private readonly defaultModel: string;

	constructor(config: OpenRouterConfig) {
		// API key must be provided via Cloudflare bindings (c.env.OPENROUTER_API_KEY)
		// For local dev, set it in .dev.vars or wrangler.jsonc vars
		if (!config.apiKey) {
			throw new Error(
				"OPENROUTER_API_KEY is required. Set it via Cloudflare Secrets or .dev.vars for local development."
			);
		}
		
		// Initialize OpenAI SDK with OpenRouter base URL
		this.client = new OpenAI({
			apiKey: config.apiKey,
			baseURL: config.baseUrl || "https://openrouter.ai/api/v1",
		});
		
		this.defaultModel = config.defaultModel || "anthropic/claude-3.5-sonnet";
	}

	/**
	 * Make a streaming chat completion request
	 */
	async *streamChatCompletion(
		request: OpenRouterRequest,
		signal?: AbortSignal
	): AsyncGenerator<StreamChunk, void, unknown> {
		try {
			const stream = await this.client.chat.completions.create(
				{
					model: request.model,
					messages: request.messages,
					max_tokens: request.max_tokens,
					stream: true,
				},
				{
					signal,
				}
			);

			let index = 0;
			for await (const chunk of stream) {
				const content = chunk.choices[0]?.delta?.content;
				if (content) {
					yield createStreamChunk(index++, content, "content");
				}
			}
		} catch (error) {
			if (error instanceof OpenAI.APIError) {
				throw new Error(
					`OpenRouter API error: ${error.status} ${error.message}`
				);
			}
			throw error;
		}
	}

	/**
	 * Make a non-streaming chat completion request (for title generation, etc.)
	 */
	async chatCompletion(
		request: OpenRouterRequest,
		signal?: AbortSignal
	): Promise<string> {
		try {
			const response = await this.client.chat.completions.create(
				{
					model: request.model,
					messages: request.messages,
					max_tokens: request.max_tokens,
					stream: false,
				},
				{
					signal,
				}
			);

			return response.choices[0]?.message?.content || "";
		} catch (error) {
			if (error instanceof OpenAI.APIError) {
				throw new Error(
					`OpenRouter API error: ${error.status} ${error.message}`
				);
			}
			throw error;
		}
	}
}

