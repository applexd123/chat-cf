# Design Document

## Overview

This design document outlines the integration of Drizzle ORM into the existing Cloudflare Workers application to replace raw SQL queries with type-safe ORM operations. Drizzle ORM was selected for its zero-dependency architecture, edge runtime compatibility, and TypeScript-first design philosophy. The migration will maintain full backward compatibility with existing code while providing improved developer experience through type inference and query builder APIs.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Hono Handlers                            │
│                  (chat-stream.ts, etc.)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   DatabaseClient                             │
│              (Public API - Unchanged)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  getOrCreateSession()                                │   │
│  │  createConversation()                                │   │
│  │  createMessage()                                     │   │
│  │  listConversations()                                 │   │
│  │  getConversationWithMessages()                       │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Drizzle ORM                               │
│              (Query Builder + Type System)                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  drizzle(db) - ORM instance                          │   │
│  │  insert(), select(), update() - Query builders       │   │
│  │  eq(), desc(), asc() - Query operators               │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 Cloudflare D1 Binding                        │
│                  (c.env.DB - SQLite)                         │
└─────────────────────────────────────────────────────────────┘
```

### Schema Definition Architecture

```
src/db/
├── schema.ts              # Drizzle schema definitions
│   ├── clientSessions     # Table: client_sessions
│   ├── conversations      # Table: conversations
│   └── messages           # Table: messages
│
└── migrations/            # Generated migration files
    ├── 0000_initial.sql
    └── meta/
        └── _journal.json
```

## Components and Interfaces

### 1. Schema Definitions (src/db/schema.ts)

**Purpose**: Define database tables using Drizzle's schema API

**Implementation**:

```typescript
import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Client Sessions Table
export const clientSessions = sqliteTable('client_sessions', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  lastActivity: text('last_activity').notNull(),
  metadata: text('metadata'), // JSON stored as TEXT
}, (table) => ({
  activityIdx: index('idx_session_activity').on(table.lastActivity.desc()),
}));

// Conversations Table
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => clientSessions.id, { onDelete: 'cascade' }),
  title: text('title'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  sessionUpdatedIdx: index('idx_conv_session_updated').on(table.sessionId, table.updatedAt.desc()),
  updatedIdx: index('idx_conv_updated').on(table.updatedAt.desc()),
}));

// Messages Table
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  conversationIdx: index('idx_msg_conversation').on(table.conversationId, table.createdAt.asc()),
}));

// Relations (for joins)
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
```

**Type Generation**: Drizzle automatically infers TypeScript types from schema:

```typescript
// Auto-generated types (example)
type ClientSession = typeof clientSessions.$inferSelect;
type NewClientSession = typeof clientSessions.$inferInsert;
```

### 2. Updated DatabaseClient (src/services/db.ts)

**Purpose**: Maintain existing public API while using Drizzle internally

**Key Changes**:

```typescript
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, asc } from 'drizzle-orm';
import * as schema from '../db/schema.js';

export class DatabaseClient {
  private readonly orm;

  constructor(private readonly db: CloudflareBindings["DB"]) {
    // Initialize Drizzle with D1 binding
    this.orm = drizzle(db, { schema });
  }

  // Example: getOrCreateSession using ORM
  async getOrCreateSession(
    sessionId: string,
    metadata?: Record<string, unknown>
  ): Promise<ClientSession> {
    // Try to get existing session
    const existing = await this.orm
      .select()
      .from(schema.clientSessions)
      .where(eq(schema.clientSessions.id, sessionId))
      .get();

    if (existing) {
      // Update last_activity
      const now = new Date().toISOString();
      await this.orm
        .update(schema.clientSessions)
        .set({ lastActivity: now })
        .where(eq(schema.clientSessions.id, sessionId))
        .run();
      
      return {
        id: existing.id,
        created_at: existing.createdAt,
        last_activity: now,
        metadata: existing.metadata ? JSON.parse(existing.metadata) : undefined,
      };
    }

    // Create new session
    const now = new Date().toISOString();
    await this.orm
      .insert(schema.clientSessions)
      .values({
        id: sessionId,
        createdAt: now,
        lastActivity: now,
        metadata: metadata ? JSON.stringify(metadata) : null,
      })
      .run();

    return {
      id: sessionId,
      created_at: now,
      last_activity: now,
      metadata,
    };
  }

  // Other methods follow similar pattern...
}
```

**Mapping Strategy**: 
- Drizzle uses camelCase (TypeScript convention)
- Database uses snake_case (SQL convention)
- Map between conventions in method implementations to maintain existing interfaces

### 3. Migration System

**Purpose**: Version-control schema changes and apply them to D1

**Configuration** (drizzle.config.ts):

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
} satisfies Config;
```

**Migration Workflow**:

1. Modify schema in `src/db/schema.ts`
2. Run `pnpm drizzle-kit generate` to create migration SQL
3. Review generated SQL in `src/db/migrations/`
4. Apply migrations using `wrangler d1 migrations apply`

**Initial Migration**: Generate from existing database.sql to establish baseline

### 4. Package Dependencies

**New Dependencies**:

```json
{
  "dependencies": {
    "drizzle-orm": "^0.36.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.28.0"
  }
}
```

**Bundle Impact**: 
- drizzle-orm/d1: ~15KB minified
- Zero runtime dependencies
- Total bundle remains under 50KB target

## Data Models

### Type Compatibility

**Current Model Types** (src/models/*.ts):
- `ClientSession` interface
- `Conversation` interface  
- `Message` interface with `MessageRole` type

**Drizzle Inferred Types**:
- Generated from schema definitions
- Need mapping layer to maintain existing interfaces

**Mapping Strategy**:

```typescript
// Internal: Drizzle types (camelCase)
type DbClientSession = typeof schema.clientSessions.$inferSelect;

// External: Existing model types (snake_case)
import type { ClientSession } from '../models/client-session.js';

// Mapper function
function mapDbToModel(db: DbClientSession): ClientSession {
  return {
    id: db.id,
    created_at: db.createdAt,
    last_activity: db.lastActivity,
    metadata: db.metadata ? JSON.parse(db.metadata) : undefined,
  };
}
```

**Rationale**: Maintain existing model interfaces to avoid breaking changes in handlers and services

## Error Handling

### Error Wrapping Strategy

**Current**: Custom `DatabaseError` class wraps all database errors

**With Drizzle**:

```typescript
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

// Wrap Drizzle errors
try {
  await this.orm.insert(schema.messages).values(data).run();
} catch (error) {
  // Drizzle throws D1 errors directly
  throw new DatabaseError(
    `Database insert failed: ${error instanceof Error ? error.message : String(error)}`,
    "INSERT_ERROR",
    error
  );
}
```

**Error Categories**:
- `QUERY_ERROR`: SELECT operations
- `INSERT_ERROR`: INSERT operations
- `UPDATE_ERROR`: UPDATE operations
- `DELETE_ERROR`: DELETE operations
- `CONSTRAINT_ERROR`: Foreign key or CHECK violations

**Constraint Violations**: Drizzle propagates D1 constraint errors; wrap with appropriate codes

## Testing Strategy

### Unit Tests

**Scope**: Test DatabaseClient methods with mocked D1 binding

**Approach**:
1. Mock D1 binding responses
2. Verify ORM query construction
3. Validate data mapping (camelCase ↔ snake_case)
4. Test error handling and wrapping

**Example**:

```typescript
describe('DatabaseClient.getOrCreateSession', () => {
  it('should create new session when not exists', async () => {
    const mockDb = createMockD1Binding();
    const client = new DatabaseClient(mockDb);
    
    const session = await client.getOrCreateSession('test-id');
    
    expect(session.id).toBe('test-id');
    expect(session.created_at).toBeDefined();
  });
});
```

### Integration Tests

**Scope**: Test against real D1 database (local or preview)

**Approach**:
1. Use Wrangler's local D1 for testing
2. Apply migrations before tests
3. Test full CRUD operations
4. Verify foreign key cascades
5. Test transaction behavior

**Setup**:

```typescript
beforeAll(async () => {
  // Apply migrations to test database
  await applyMigrations(testDb);
});

afterEach(async () => {
  // Clean up test data
  await testDb.exec('DELETE FROM messages');
  await testDb.exec('DELETE FROM conversations');
  await testDb.exec('DELETE FROM client_sessions');
});
```

### Migration Tests

**Scope**: Verify migrations apply cleanly and preserve data

**Approach**:
1. Test migration from current schema to ORM schema
2. Verify no data loss
3. Test rollback scenarios
4. Validate index creation

### Backward Compatibility Tests

**Scope**: Ensure existing code works unchanged

**Approach**:
1. Run all existing tests without modification
2. Verify handler behavior unchanged
3. Test API contract compliance
4. Validate response formats

**Success Criteria**: All existing tests pass without changes

## Implementation Phases

### Phase 1: Setup and Schema Definition
- Install Drizzle packages
- Create schema definitions in src/db/schema.ts
- Configure drizzle.config.ts
- Generate initial migration from existing schema

### Phase 2: DatabaseClient Migration
- Update DatabaseClient to use Drizzle internally
- Implement data mapping layer
- Maintain existing method signatures
- Add error wrapping for ORM operations

### Phase 3: Testing and Validation
- Write unit tests for new implementation
- Run integration tests against local D1
- Verify all existing tests pass
- Test migration on preview environment

### Phase 4: Documentation and Cleanup
- Update package.json scripts for migrations
- Document ORM usage patterns
- Add migration workflow to README
- Remove unused raw SQL utilities (if any)

## Design Decisions and Rationales

### Why Drizzle ORM?

**Alternatives Considered**:
- Prisma: Too heavy for Workers (requires engine binary)
- TypeORM: Node.js dependencies, not edge-compatible
- Kysely: Good option, but less type inference than Drizzle

**Drizzle Advantages**:
- Zero dependencies, edge-native
- TypeScript-first with excellent type inference
- Lightweight (~15KB)
- Native D1 adapter
- SQL-like query builder (familiar to developers)

### Why Maintain Existing Interfaces?

**Rationale**: 
- Minimize breaking changes
- Handlers don't need updates
- Gradual migration path
- Easier rollback if issues arise

**Trade-off**: Requires mapping layer between Drizzle types and existing models

### Why Not Use Drizzle Types Directly?

**Rationale**:
- Existing code expects snake_case properties
- Model files have utility functions (generateId, etc.)
- Separation of concerns (ORM is implementation detail)

**Future**: Could migrate to Drizzle types in a separate refactor

### Migration Strategy

**Approach**: Generate migration from existing schema, not from scratch

**Rationale**:
- Preserves existing data
- No downtime required
- Can validate against current schema
- Easier to review changes

## Performance Considerations

### Bundle Size
- Drizzle ORM: ~15KB minified
- Current implementation: ~5KB (custom wrapper)
- Net increase: ~10KB (well within 50KB budget)

### Query Performance
- Drizzle generates optimized SQL
- No N+1 query issues with relations API
- Prepared statements cached by D1
- Performance expected to be equivalent or better

### Type Inference
- Compile-time only (zero runtime cost)
- Improves developer experience without overhead

## Security Considerations

### SQL Injection
- Drizzle uses parameterized queries (same as current)
- No raw SQL string concatenation
- Type system prevents invalid queries

### Data Validation
- Schema enforces constraints at database level
- TypeScript types enforce at compile time
- Maintain existing validation in model files

### Metadata Handling
- JSON metadata still stored as TEXT
- Parse/stringify in mapping layer
- Validate JSON structure before storage

## Rollback Plan

If issues arise during migration:

1. **Immediate**: Revert DatabaseClient to use raw SQL
2. **Schema**: Migrations are reversible (down migrations)
3. **Dependencies**: Remove Drizzle packages if needed
4. **Testing**: Existing tests validate rollback success

**Risk Mitigation**: Deploy to preview environment first, validate thoroughly before production
