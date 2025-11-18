import { Hono } from "hono";
import { loggerMiddleware } from "./middleware/logger.js";
import { rateLimiterMiddleware } from "./middleware/rate-limiter.js";
import { getOrGenerateSessionId } from "./utils/session.js";
import { createStandardErrorResponse } from "./utils/errors.js";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Simple CORS middleware
app.use("*", async (c, next) => {
	c.header("Access-Control-Allow-Origin", "*");
	c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
	c.header("Access-Control-Allow-Headers", "Content-Type, X-Session-ID");
	if (c.req.method === "OPTIONS") {
		return c.body(null, 204);
	}
	await next();
});

// Middleware pipeline
app.use("*", loggerMiddleware);
app.use("/api/*", rateLimiterMiddleware);

// Health check endpoint
app.get("/health", (c) => {
	return c.json({
		status: "ok",
		timestamp: new Date().toISOString(),
		version: "1.0.0",
	});
});

// Session ID validation middleware
app.use("/api/*", async (c, next) => {
	const sessionId = c.req.header("X-Session-ID");
	if (!sessionId) {
		// Generate new session ID if missing
		const newSessionId = getOrGenerateSessionId(null);
		c.header("X-Session-ID", newSessionId);
	} else {
		// Validate existing session ID
		const isValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			sessionId
		);
		if (!isValid) {
			return c.json(createStandardErrorResponse("UNAUTHORIZED"), 401);
		}
	}
	await next();
});

// Error handling middleware
app.onError((err, c) => {
	console.error("Unhandled error:", err);
	return c.json(
		createStandardErrorResponse("INTERNAL_ERROR"),
		500
	);
});

// API routes
import { handleChatStream } from "./handlers/chat-stream.js";
import { handleListConversations, handleGetConversation } from "./handlers/conversations.js";
import {
	handleCreateCharacterCard,
	handleListCharacterCards,
	handleGetCharacterCard,
	handleUpdateCharacterCard,
	handleDeleteCharacterCard,
} from "./handlers/character-cards.js";

app.post("/api/chat/stream", handleChatStream);
app.get("/api/conversations", handleListConversations);
app.get("/api/conversations/:conversationId", handleGetConversation);

// Character card routes
app.post("/api/character-cards", handleCreateCharacterCard);
app.get("/api/character-cards", handleListCharacterCards);
app.get("/api/character-cards/:id", handleGetCharacterCard);
app.put("/api/character-cards/:id", handleUpdateCharacterCard);
app.delete("/api/character-cards/:id", handleDeleteCharacterCard);

export default app;
