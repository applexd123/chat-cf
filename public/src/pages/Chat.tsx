import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useChat } from "../hooks/useChat.js";
import { ChatDisplay } from "../components/ChatDisplay.js";
import { ChatInputForm } from "../components/ChatInputForm.js";
import { ErrorDisplay } from "../components/ErrorDisplay.js";

export function Chat() {
	const { characterId } = useParams<{ characterId: string }>();
	const navigate = useNavigate();
	const {
		messages,
		isStreaming,
		error,
		characterGreeting,
		sendMessage,
		abortStream,
		clearError,
		startNewConversation,
	} = useChat(characterId);

	return (
		<div className="chat-page">
			<header className="app-header">
				<button onClick={() => navigate("/")} className="back-button">
					← Back
				</button>
				<h1>Chat</h1>
				<button
					className="new-conversation-button"
					onClick={startNewConversation}
					disabled={isStreaming}
					title="Start a new conversation"
				>
					+ New Conversation
				</button>
			</header>
			<main className="app-main">
				{characterGreeting && messages.length === 0 && (
					<div className="character-greeting">
						<div className="greeting-label">Character Greeting:</div>
						<div className="greeting-content">{characterGreeting}</div>
					</div>
				)}
				<ErrorDisplay error={error} onDismiss={clearError} />
				<ChatDisplay messages={messages} />
				<ChatInputForm
					onSubmit={sendMessage}
					onCancel={abortStream}
					isStreaming={isStreaming}
				/>
			</main>
		</div>
	);
}