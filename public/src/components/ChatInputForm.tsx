/**
 * ChatInputForm React component
 * Text input field (text-only validation per spec.md), submit button, disable during streaming, clear input after submit
 */

import React, { useState, FormEvent } from "react";

export interface ChatInputFormProps {
	onSubmit: (prompt: string) => void;
	onCancel?: () => void;
	isStreaming: boolean;
	disabled?: boolean;
}

export function ChatInputForm({
	onSubmit,
	onCancel,
	isStreaming,
	disabled = false,
}: ChatInputFormProps) {
	const [input, setInput] = useState("");

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		const trimmed = input.trim();
		if (!trimmed || disabled || isStreaming) {
			return;
		}

		onSubmit(trimmed);
		setInput("");
	};

	const handleCancel = () => {
		if (onCancel) {
			onCancel();
		}
	};

	return (
		<form className="chat-input-form" onSubmit={handleSubmit}>
			<input
				type="text"
				value={input}
				onChange={(e) => setInput(e.target.value)}
				placeholder="Type your message..."
				disabled={disabled || isStreaming}
				className="chat-input"
			/>
			{isStreaming ? (
				<button
					type="button"
					onClick={handleCancel}
					className="chat-button chat-button-cancel"
				>
					Cancel
				</button>
			) : (
				<button
					type="submit"
					disabled={disabled || isStreaming || !input.trim()}
					className="chat-button chat-button-submit"
				>
					Send
				</button>
			)}
		</form>
	);
}

