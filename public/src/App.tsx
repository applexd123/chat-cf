/**
 * App root component
 * Integrate ChatDisplay + ChatInputForm + ErrorDisplay, wire hooks (useChat), manage streaming state, pass callbacks
 */

import React from "react";
import { useChat } from "./hooks/useChat.js";
import { ChatDisplay } from "./components/ChatDisplay.js";
import { ChatInputForm } from "./components/ChatInputForm.js";
import { ErrorDisplay } from "./components/ErrorDisplay.js";

export function App() {
	const {
		messages,
		isStreaming,
		error,
		sendMessage,
		abortStream,
		clearError,
	} = useChat();

	return (
		<div className="app">
			<header className="app-header">
				<h1>AI Chat</h1>
			</header>
			<main className="app-main">
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

