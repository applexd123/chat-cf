/**
 * Data mapping utilities
 * Convert between Drizzle ORM types (camelCase) and existing model interfaces (snake_case)
 */

import type * as schema from './schema.js';
import type { ClientSession } from '../models/client-session.js';
import type { Conversation } from '../models/conversation.js';
import type { Message } from '../models/message.js';

/**
 * Map Drizzle ClientSession to model ClientSession
 * Converts camelCase to snake_case and parses JSON metadata
 */
export function mapDbToClientSession(
  db: schema.ClientSession
): ClientSession {
  return {
    id: db.id,
    created_at: db.createdAt,
    last_activity: db.lastActivity,
    metadata: db.metadata ? JSON.parse(db.metadata) : undefined,
  };
}

/**
 * Map Drizzle Conversation to model Conversation
 * Converts camelCase to snake_case
 */
export function mapDbToConversation(
  db: schema.Conversation
): Conversation {
  return {
    id: db.id,
    session_id: db.sessionId,
    title: db.title,
    created_at: db.createdAt,
    updated_at: db.updatedAt,
    character_card_id: db.characterCardId,
    compiled_context: db.compiledContext,
  };
}

/**
 * Map Drizzle Message to model Message
 * Converts camelCase to snake_case
 */
export function mapDbToMessage(
  db: schema.Message
): Message {
  return {
    id: db.id,
    conversation_id: db.conversationId,
    role: db.role as 'user' | 'assistant',
    content: db.content,
    created_at: db.createdAt,
  };
}

/**
 * Prepare metadata for database insertion
 * Converts Record<string, unknown> to JSON string or null
 */
export function stringifyMetadata(
  metadata?: Record<string, unknown>
): string | null {
  return metadata ? JSON.stringify(metadata) : null;
}

/**
 * Map Drizzle CharacterCard to CharacterCardV3 model
 * Parses JSON data field
 */
export function mapDbToCharacterCard(
  db: schema.CharacterCard
): any {
  return {
    id: db.id,
    name: db.name,
    data: JSON.parse(db.data),
    created_at: db.createdAt,
    modified_at: db.modifiedAt,
  };
}
