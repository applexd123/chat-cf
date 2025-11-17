# AI Chat Application

An AI chat application with streaming responses, built on Cloudflare Workers with Hono framework.

## Quick Start

```bash
pnpm install
pnpm run dev
```

## Deployment

```bash
pnpm run deploy
```

## Database Management

This project uses Drizzle ORM for type-safe database operations with Cloudflare D1.

### Database Schema

The database schema is defined in `src/db/schema.ts` using Drizzle's schema API. All tables, columns, indexes, and relationships are defined there.

### Migration Workflow

#### 1. Generate Migrations

After modifying the schema in `src/db/schema.ts`, generate a migration:

```bash
pnpm run db:generate
```

This creates SQL migration files in `src/db/migrations/` directory.

#### 2. Review Generated SQL

Always review the generated migration files before applying them:

```bash
cat src/db/migrations/0001_*.sql
```

#### 3. Apply Migrations

**Local Development:**
```bash
pnpm run db:migrate
```

**Production:**
```bash
pnpm run db:migrate:prod
```

#### 4. Drop Migrations (if needed)

To remove the last migration (use with caution):

```bash
pnpm run db:drop
```

### Migration Best Practices

- Always review generated SQL before applying migrations
- Test migrations on local D1 database first
- Keep migrations small and focused
- Never edit migration files manually after generation
- Commit migration files to version control

## Type Generation

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```bash
pnpm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiating `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

## Available Scripts

- `pnpm run dev` - Start local dev server (builds frontend + runs wrangler)
- `pnpm run dev:frontend` - Frontend dev server only (Vite)
- `pnpm run build` - Full build (frontend + dry-run deploy check)
- `pnpm run deploy` - Build + deploy to production
- `pnpm run test` - Run all tests once
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run db:generate` - Generate database migrations from schema
- `pnpm run db:migrate` - Apply migrations to local D1 database
- `pnpm run db:migrate:prod` - Apply migrations to production D1 database
- `pnpm run db:drop` - Drop last migration (use with caution)
