/**
 * ChatDisplay React component
 * Display streaming chunks in real-time, show partial text as it arrives, clear after stream completes
 */

import React from "react";
import type { Message } from "../../../src/models/message.js";

export interface ChatDisplayProps {
	messages: Message[];
}

export function ChatDisplay({ messages }: ChatDisplayProps) {
	return (
		<div className="chat-display">
			{messages.length === 0 ? (
				<div className="empty-state">No messages yet. Start a conversation!</div>
			) : (
				<div className="messages">
					{messages.map((message) => (
						<div
							key={message.id}
							className={`message message-${message.role}`}
						>
							<div className="message-role">{message.role}</div>
							<div className="message-content">{message.content}</div>
							<div className="message-timestamp">
								{new Date(message.created_at).toLocaleTimeString()}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

