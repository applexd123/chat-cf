import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { unstable_dev } from "wrangler";
import type { Unstable_DevWorker } from "wrangler";

describe("Multi-Character Session Integration", () => {
	let worker: Unstable_DevWorker;

	beforeAll(async () => {
		worker = await unstable_dev("src/index.ts", {
			experimental: { disableExperimentalWarning: true },
			vars: {
				OPENROUTER_API_KEY: "mock-key",
				AI_MODEL: "mock-model"
			}
		});
	});

	afterAll(async () => {
		await worker.stop();
	});

	it("should maintain separate conversation histories for different characters", async () => {
		// Use a valid UUID for session ID to pass validation middleware
		const sessionId = "12345678-1234-1234-1234-1234567890ab";
		const char1Id = "char-1";
		const char2Id = "char-2";

		// Create character cards first to satisfy foreign key constraints
		await worker.fetch("/api/character-cards", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				spec: "chara_card_v3",
				spec_version: "3.0",
				data: { name: "Character 1", description: "Test Char 1", first_mes: "Hi 1" }
			})
		});
		// Note: The API generates IDs, but for this test we need to know them.
		// Since we can't easily force the ID via API, we'll rely on the fact that
		// the test environment might not enforce FKs strictly OR we need to use the IDs returned.
		// Let's try to create them and capture IDs, or just use the API to create and get IDs.
		
		// Actually, let's just create them properly and use the returned IDs
		const char1Res = await worker.fetch("/api/character-cards", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				spec: "chara_card_v3",
				spec_version: "3.0",
				data: { name: "Character 1", description: "Test Char 1", first_mes: "Hi 1" }
			})
		});
		const char1Data = await char1Res.json() as any;
		const realChar1Id = char1Data.id;

		const char2Res = await worker.fetch("/api/character-cards", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				spec: "chara_card_v3",
				spec_version: "3.0",
				data: { name: "Character 2", description: "Test Char 2", first_mes: "Hi 2" }
			})
		});
		const char2Data = await char2Res.json() as any;
		const realChar2Id = char2Data.id;

		// 1. Start conversation with Character 1
		const res1 = await worker.fetch("/api/chat/stream", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Session-ID": sessionId,
			},
			body: JSON.stringify({
				prompt: "Hello Character 1",
				characterCardId: realChar1Id,
			}),
		});
		expect(res1.status).toBe(200);
		
		// Read stream to ensure completion and get conversationId
		const text1 = await res1.text();
		// The stream format is data: {...}\n\n
		// We need to find the chunk that contains conversationId
		const conversationId1Match = text1.match(/"conversationId":"([^"]+)"/);
		const conversationId1 = conversationId1Match ? conversationId1Match[1] : null;
		
		if (!conversationId1) {
			console.log("Failed to extract conversationId from response:", text1);
		}
		expect(conversationId1).toBeTruthy();

		// 2. Start conversation with Character 2
		const res2 = await worker.fetch("/api/chat/stream", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Session-ID": sessionId,
			},
			body: JSON.stringify({
				prompt: "Hello Character 2",
				characterCardId: realChar2Id,
			}),
		});
		expect(res2.status).toBe(200);

		const text2 = await res2.text();
		const conversationId2Match = text2.match(/"conversationId":"([^"]+)"/);
		const conversationId2 = conversationId2Match ? conversationId2Match[1] : null;
		expect(conversationId2).toBeTruthy();

		// Verify conversation IDs are different
		expect(conversationId1).not.toBe(conversationId2);

		// 3. Verify we can retrieve Character 1's conversation
		const getRes1 = await worker.fetch(`/api/conversations/${conversationId1}`, {
			headers: { "X-Session-ID": sessionId },
		});
		expect(getRes1.status).toBe(200);
		const data1 = await getRes1.json() as any;
		expect(data1.conversation.character_card_id).toBe(realChar1Id);
		expect(data1.messages.some((m: any) => m.content === "Hello Character 1")).toBe(true);

		// 4. Verify we can retrieve Character 2's conversation
		const getRes2 = await worker.fetch(`/api/conversations/${conversationId2}`, {
			headers: { "X-Session-ID": sessionId },
		});
		expect(getRes2.status).toBe(200);
		const data2 = await getRes2.json() as any;
		expect(data2.conversation.character_card_id).toBe(realChar2Id);
		expect(data2.messages.some((m: any) => m.content === "Hello Character 2")).toBe(true);
	});

	it("should list conversations filtered by session", async () => {
		// Use a valid UUID for session ID to pass validation middleware
		const sessionId = "87654321-4321-4321-4321-ba0987654321";
		
		// Create character card
		const charRes = await worker.fetch("/api/character-cards", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				spec: "chara_card_v3",
				spec_version: "3.0",
				data: { name: "List Test Char", description: "Test Char List", first_mes: "Hi List" }
			})
		});
		const charData = await charRes.json() as any;
		const realCharId = charData.id;

		// Create a conversation
		await worker.fetch("/api/chat/stream", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Session-ID": sessionId,
			},
			body: JSON.stringify({
				prompt: "Test message",
				characterCardId: realCharId,
			}),
		});

		// List conversations
		const listRes = await worker.fetch(`/api/conversations?sessionId=${sessionId}`, {
			headers: { "X-Session-ID": sessionId },
		});
		expect(listRes.status).toBe(200);
		const listData = await listRes.json() as any;
		
		expect(Array.isArray(listData.conversations)).toBe(true);
		expect(listData.conversations.length).toBeGreaterThan(0);
		
		// Find the conversation we just created
		const foundConv = listData.conversations.find((c: any) => c.character_card_id === realCharId);
		expect(foundConv).toBeDefined();
		expect(foundConv.character_card_id).toBe(realCharId);
	});
});