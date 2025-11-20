/**
 * React hooks for state management
 * Manage messages, streaming state, error state, conversation ID
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { Message } from "../../../src/models/message.js";
import { streamChat, getConversation, listConversations, getCharacterCard } from "../services/api.js";
import { getOrCreateSessionId } from "../services/session.js";
import { generateMessageId } from "../../../src/models/message.js";

export interface ChatState {
	messages: Message[];
	isStreaming: boolean;
	error: string | null;
	conversationId: string | null;
	sessionId: string;
	characterCardId: string | null;
	characterGreeting: string | null;
}

export interface UseChatReturn {
	messages: Message[];
	isStreaming: boolean;
	error: string | null;
	conversationId: string | null;
	sessionId: string;
	characterCardId: string | null;
	characterGreeting: string | null;
	sendMessage: (prompt: string) => Promise<void>;
	abortStream: () => void;
	clearError: () => void;
	setConversationId: (id: string | null) => void;
	setCharacterCardId: (id: string | null) => void;
	startNewConversation: () => void;
}

/**
 * useChat hook
 */
export function useChat(activeCharacterId?: string): UseChatReturn {
	const [messages, setMessages] = useState<Message[]>([]);
	const [isStreaming, setIsStreaming] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [conversationId, setConversationId] = useState<string | null>(null);
	const [characterCardId, setCharacterCardId] = useState<string | null>(activeCharacterId || null);
	const [characterGreeting, setCharacterGreeting] = useState<string | null>(null);
	const [sessionId] = useState(() => getOrCreateSessionId());
	const abortRef = useRef<(() => void) | null>(null);

	// Update characterCardId if activeCharacterId changes
	useEffect(() => {
		if (activeCharacterId) {
			setCharacterCardId(activeCharacterId);
		}
	}, [activeCharacterId]);

	// Load conversation history on mount or when character changes
	useEffect(() => {
		async function loadHistory() {
			if (!characterCardId) {
				setConversationId(null);
				setMessages([]);
				return;
			}

			try {
				// Get all conversations for this session
				const conversations = await listConversations(sessionId);
				
				// Filter for the current character
				const relevantConvo = conversations.find(
					(c) => c.character_card_id === characterCardId
				);
				
				if (relevantConvo) {
					const { messages: historyMessages } = await getConversation(
						relevantConvo.id,
						sessionId
					);
					
					setConversationId(relevantConvo.id);
					setMessages(historyMessages);
				} else {
					// No conversation found for this character, start fresh
					setConversationId(null);
					setMessages([]);
				}
			} catch (err) {
				console.error("Failed to load conversation history:", err);
				// Don't show error to user, just start fresh
				setConversationId(null);
				setMessages([]);
			}
		}

		loadHistory();
	}, [sessionId, characterCardId]);

	// Load character greeting when character card is selected
	useEffect(() => {
		async function loadCharacterGreeting() {
			if (!characterCardId) {
				setCharacterGreeting(null);
				return;
			}

			try {
				const card = await getCharacterCard(characterCardId);
				setCharacterGreeting(card.data.data.first_mes);
			} catch (err) {
				console.error("Failed to load character greeting:", err);
				setCharacterGreeting(null);
			}
		}

		loadCharacterGreeting();
	}, [characterCardId]);

	const sendMessage = useCallback(
		async (prompt: string) => {
			if (!prompt.trim()) {
				return;
			}

			setError(null);
			setIsStreaming(true);

			// Add user message
			const userMessage: Message = {
				id: generateMessageId(),
				conversation_id: conversationId || "",
				role: "user",
				content: prompt,
				created_at: new Date().toISOString(),
			};

			setMessages((prev) => [...prev, userMessage]);

			try {
				const { chunks, abort } = await streamChat(
					{
						prompt,
						conversationId: conversationId || undefined,
						characterCardId: characterCardId || undefined,
					},
					sessionId
				);

				abortRef.current = abort;

				// Create assistant message placeholder
				let assistantMessage: Message | null = null;
				let fullContent = "";

				for await (const chunk of chunks) {
					// Extract conversationId from first chunk if present
					if (chunk.conversationId && !conversationId) {
						setConversationId(chunk.conversationId);
					}

					if (chunk.type === "error") {
						// Handle error chunk
						try {
							const errorData = JSON.parse(chunk.text);
							setError(errorData.message || "An error occurred");
						} catch {
							setError(chunk.text);
						}
						break;
					}

					if (chunk.type === "content") {
						fullContent += chunk.text;

						// Update or create assistant message
						if (!assistantMessage) {
							assistantMessage = {
								id: generateMessageId(),
								conversation_id: chunk.conversationId || conversationId || "",
								role: "assistant",
								content: fullContent,
								created_at: new Date().toISOString(),
							};
							setMessages((prev) => [...prev, assistantMessage!]);
						} else {
							// Update existing message
							setMessages((prev) =>
								prev.map((msg) =>
									msg.id === assistantMessage!.id
										? { ...msg, content: fullContent }
										: msg
								)
							);
						}
					}
				}
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to send message";
				setError(errorMessage);
			} finally {
				setIsStreaming(false);
				abortRef.current = null;
			}
		},
		[conversationId, characterCardId, sessionId]
	);

	const abortStream = useCallback(() => {
		if (abortRef.current) {
			abortRef.current();
			abortRef.current = null;
			setIsStreaming(false);
		}
	}, []);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	const startNewConversation = useCallback(() => {
		setConversationId(null);
		setMessages([]);
		setError(null);
		setCharacterGreeting(null);
		// Keep characterCardId so new conversation uses same character
	}, []);

	return {
		messages,
		isStreaming,
		error,
		conversationId,
		sessionId,
		characterCardId,
		characterGreeting,
		sendMessage,
		abortStream,
		clearError,
		setConversationId,
		setCharacterCardId,
		startNewConversation,
	};
}

