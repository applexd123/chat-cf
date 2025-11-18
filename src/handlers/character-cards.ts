/**
 * Character Cards handler
 * POST /api/character-cards - Create a new character card
 * GET /api/character-cards - List all character cards
 * GET /api/character-cards/:id - Get a specific character card
 * PUT /api/character-cards/:id - Update a character card
 * DELETE /api/character-cards/:id - Delete a character card
 */

import type { Context } from "hono";
import { DatabaseClient } from "../services/db.js";
import { createStandardErrorResponse } from "../utils/errors.js";
import { validateCharacterCard, type CharacterCardV3 } from "../models/character-card.js";

/**
 * Validation middleware for character card data
 */
export function validateCharacterCardMiddleware(card: any): { valid: boolean; error?: string } {
	if (!validateCharacterCard(card)) {
		return {
			valid: false,
			error: "Invalid character card format. Must be a valid CCv3 card with required fields: name, description, first_mes",
		};
	}
	return { valid: true };
}

/**
 * POST /api/character-cards
 * Create a new character card
 */
export async function handleCreateCharacterCard(
	c: Context<{ Bindings: CloudflareBindings }>
): Promise<Response> {
	try {
		const body = await c.req.json();
		
		// Validate character card
		const validation = validateCharacterCardMiddleware(body);
		if (!validation.valid) {
			return c.json(
				{
					...createStandardErrorResponse("INVALID_REQUEST"),
					details: validation.error,
				},
				400
			);
		}

		const characterCard = body as CharacterCardV3;
		const db = new DatabaseClient(c.env.DB);
		
		// Generate ID for the character card
		const id = crypto.randomUUID();
		
		// Create character card in database
		const result = await db.createCharacterCard(id, characterCard);
		
		return c.json(result, 201);
	} catch (error) {
		console.error("Error creating character card:", error);
		return c.json(createStandardErrorResponse("INTERNAL_ERROR"), 500);
	}
}

/**
 * GET /api/character-cards
 * List all character cards
 */
export async function handleListCharacterCards(
	c: Context<{ Bindings: CloudflareBindings }>
): Promise<Response> {
	try {
		const db = new DatabaseClient(c.env.DB);
		const limit = parseInt(c.req.query("limit") || "50", 10);
		
		const results = await db.listCharacterCards(limit);
		
		return c.json({ character_cards: results });
	} catch (error) {
		console.error("Error listing character cards:", error);
		return c.json(createStandardErrorResponse("INTERNAL_ERROR"), 500);
	}
}

/**
 * GET /api/character-cards/:id
 * Get a specific character card
 */
export async function handleGetCharacterCard(
	c: Context<{ Bindings: CloudflareBindings }>
): Promise<Response> {
	const id = c.req.param("id");
	
	if (!id) {
		return c.json(createStandardErrorResponse("INVALID_REQUEST"), 400);
	}
	
	try {
		const db = new DatabaseClient(c.env.DB);
		const result = await db.getCharacterCard(id);
		
		if (!result) {
			return c.json(createStandardErrorResponse("NOT_FOUND"), 404);
		}
		
		return c.json(result);
	} catch (error) {
		console.error("Error getting character card:", error);
		return c.json(createStandardErrorResponse("INTERNAL_ERROR"), 500);
	}
}

/**
 * PUT /api/character-cards/:id
 * Update a character card
 */
export async function handleUpdateCharacterCard(
	c: Context<{ Bindings: CloudflareBindings }>
): Promise<Response> {
	const id = c.req.param("id");
	
	if (!id) {
		return c.json(createStandardErrorResponse("INVALID_REQUEST"), 400);
	}
	
	try {
		const body = await c.req.json();
		
		// Validate character card
		const validation = validateCharacterCardMiddleware(body);
		if (!validation.valid) {
			return c.json(
				{
					...createStandardErrorResponse("INVALID_REQUEST"),
					details: validation.error,
				},
				400
			);
		}

		const characterCard = body as CharacterCardV3;
		const db = new DatabaseClient(c.env.DB);
		
		// Update character card in database
		const result = await db.updateCharacterCard(id, characterCard);
		
		if (!result) {
			return c.json(createStandardErrorResponse("NOT_FOUND"), 404);
		}
		
		return c.json(result);
	} catch (error) {
		console.error("Error updating character card:", error);
		return c.json(createStandardErrorResponse("INTERNAL_ERROR"), 500);
	}
}

/**
 * DELETE /api/character-cards/:id
 * Delete a character card
 */
export async function handleDeleteCharacterCard(
	c: Context<{ Bindings: CloudflareBindings }>
): Promise<Response> {
	const id = c.req.param("id");
	
	if (!id) {
		return c.json(createStandardErrorResponse("INVALID_REQUEST"), 400);
	}
	
	try {
		const db = new DatabaseClient(c.env.DB);
		const deleted = await db.deleteCharacterCard(id);
		
		if (!deleted) {
			return c.json(createStandardErrorResponse("NOT_FOUND"), 404);
		}
		
		return c.json({ success: true }, 200);
	} catch (error) {
		console.error("Error deleting character card:", error);
		return c.json(createStandardErrorResponse("INTERNAL_ERROR"), 500);
	}
}
