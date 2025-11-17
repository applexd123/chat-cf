# Tech Stack & Build System

## Core Technologies

- **Runtime**: Cloudflare Workers (serverless edge platform)
- **Framework**: Hono 4.10+ (lightweight web framework)
- **Language**: TypeScript (ESNext target, strict mode)
- **Package Manager**: pnpm
- **Frontend**: React 19+ with Vite for bundling
- **Database**: Cloudflare D1 (SQLite-based)
- **ORM**: Drizzle ORM (type-safe database queries)
- **Testing**: Vitest

## Key Dependencies

- `hono` - Web framework for Workers
- `react` + `react-dom` - Frontend UI
- `wrangler` - Cloudflare Workers CLI and type generation
- `vite` - Frontend build tool
- `vitest` - Test runner
- `drizzle-orm` - Type-safe ORM for D1 database
- `drizzle-kit` - Migration generation and management

## Common Commands

### Development
```bash
pnpm run dev              # Start local dev server (builds frontend + runs wrangler)
pnpm run dev:frontend     # Frontend dev server only (Vite)
```

### Building
```bash
pnpm run build:frontend   # Build React app to dist/
pnpm run build            # Full build (frontend + dry-run deploy check)
```

### Type Safety
```bash
pnpm run cf-typegen       # Generate CloudflareBindings types from wrangler.jsonc
pnpm run type-check       # TypeScript type checking (no emit)
pnpm run pre-commit       # Run typegen + type-check before committing
```

### Testing
```bash
pnpm run test             # Run all tests once
pnpm run test:watch       # Run tests in watch mode
```

### Deployment
```bash
pnpm run deploy           # Build + deploy to Cloudflare Workers (production)
```

### Database & Migrations
```bash
pnpm run db:generate      # Generate migrations from schema changes
pnpm run db:migrate       # Apply migrations to local D1 database
pnpm run db:migrate:prod  # Apply migrations to production D1 database
pnpm run db:drop          # Drop last migration (use with caution)
```

## Database & ORM

### Drizzle ORM

This project uses Drizzle ORM for type-safe database operations with Cloudflare D1.

**Key Features**:
- Zero runtime dependencies (edge-compatible)
- TypeScript-first with full type inference
- Lightweight (~15KB bundle size)
- Native D1 adapter
- SQL-like query builder

**Schema Location**: `src/db/schema.ts`

**Migration Directory**: `src/db/migrations/`

### Database Schema

All database tables are defined in `src/db/schema.ts` using Drizzle's schema API:

```typescript
import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

export const clientSessions = sqliteTable('client_sessions', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  lastActivity: text('last_activity').notNull(),
  metadata: text('metadata'),
}, (table) => ({
  activityIdx: index('idx_session_activity').on(table.lastActivity.desc()),
}));
```

### Migration Workflow

1. **Modify Schema**: Edit `src/db/schema.ts`
2. **Generate Migration**: Run `pnpm run db:generate`
3. **Review SQL**: Check generated files in `src/db/migrations/`
4. **Apply Locally**: Run `pnpm run db:migrate` to test
5. **Apply to Production**: Run `pnpm run db:migrate:prod`

### Using Drizzle in Code

```typescript
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';

// Initialize ORM with D1 binding
const orm = drizzle(c.env.DB, { schema });

// Type-safe queries
const sessions = await orm
  .select()
  .from(schema.clientSessions)
  .where(eq(schema.clientSessions.id, sessionId))
  .all();
```

### Data Mapping

Drizzle uses camelCase (TypeScript convention) while the database uses snake_case (SQL convention). The `src/db/mappers.ts` file provides mapping functions to convert between conventions and maintain compatibility with existing model interfaces.

## Configuration Files

- `wrangler.jsonc` - Workers config (bindings, D1 database, assets, observability)
- `tsconfig.json` - TypeScript config (strict mode, ESNext, JSX)
- `worker-configuration.d.ts` - AUTO-GENERATED types (never edit manually)
- `drizzle.config.ts` - Drizzle ORM configuration (schema path, migrations directory)
- `vite.config.ts` - Frontend build config
- `vitest.config.ts` - Test runner config
- `.dev.vars` - Local environment variables (gitignored, use `.dev.vars.example` as template)

## Type Safety Rules

1. Always instantiate Hono with bindings: `new Hono<{ Bindings: CloudflareBindings }>()`
2. Run `pnpm run cf-typegen` after modifying `wrangler.jsonc` bindings
3. Never manually edit `worker-configuration.d.ts`
4. Use `c.env.BINDING_NAME` to access Cloudflare bindings (D1, secrets, etc.)

## Code Style

- Use `.js` extensions in imports (ESM requirement): `import { foo } from "./utils.js"`
- Prefer async/await over promises
- Use structured logging with JSON for observability
- Export types and interfaces for reusability
- Keep handlers thin - business logic in services/utils

## Environment Variables

- **Local dev**: Set in `.dev.vars` file (not committed)
- **Production**: Use `wrangler secret put <NAME>` for sensitive values
- **Access in code**: `c.env.VARIABLE_NAME` in Hono handlers

## Bundle Constraints

- Target: <50KB minified bundle size
- No Node.js-specific APIs (Workers runtime only)
- Compatibility date frozen at `2025-11-14` in wrangler.jsonc
