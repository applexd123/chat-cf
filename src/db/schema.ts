import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { desc, asc } from 'drizzle-orm';

// ============================================================================
// ClientSession: Track anonymous users and their session lifecycle
// ============================================================================

export const clientSessions = sqliteTable(
  'client_sessions',
  {
    id: text('id').primaryKey(),
    createdAt: text('created_at').notNull(),
    lastActivity: text('last_activity').notNull(),
    metadata: text('metadata'),
  },
  (table) => ({
    activityIdx: index('idx_session_activity').on(desc(table.lastActivity)),
  })
);

// ============================================================================
// Conversation: Group related messages into multi-turn chat sessions
// ============================================================================

export const conversations = sqliteTable(
  'conversations',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => clientSessions.id, { onDelete: 'cascade' }),
    title: text('title'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    sessionUpdatedIdx: index('idx_conv_session_updated').on(
      table.sessionId,
      desc(table.updatedAt)
    ),
    updatedIdx: index('idx_conv_updated').on(desc(table.updatedAt)),
  })
);

// ============================================================================
// Message: Individual messages (user or assistant) within a conversation
// ============================================================================

export const messages = sqliteTable(
  'messages',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    content: text('content').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    conversationIdx: index('idx_msg_conversation').on(
      table.conversationId,
      asc(table.createdAt)
    ),
  })
);

// ============================================================================
// Relations: Define relationships for join operations
// ============================================================================

export const clientSessionsRelations = relations(clientSessions, ({ many }) => ({
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  session: one(clientSessions, {
    fields: [conversations.sessionId],
    references: [clientSessions.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// ============================================================================
// Type Exports: Inferred types from schema
// ============================================================================

export type ClientSession = typeof clientSessions.$inferSelect;
export type NewClientSession = typeof clientSessions.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
