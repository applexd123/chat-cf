# [PROJECT NAME] Development Guidelines

Auto-generated from all feature plans. Last updated: [DATE]

## Active Technologies

- Cloudflare Workers (Hono)
- Wrangler (`wrangler.jsonc`)
- TypeScript (ESNext) with `hono/jsx`

## Project Structure

```text
[ACTUAL STRUCTURE FROM PLANS]
```

## Commands (canonical)

- `pnpm run dev`         # Start local Wrangler dev server (interactive)
- `pnpm run cf-typegen`  # Generate `worker-configuration.d.ts` from `wrangler.jsonc`
- `pnpm run deploy`      # Deploy (`wrangler deploy --minify`)

## Code Style

- TypeScript with `strict: true` in `tsconfig.json`.
- Use ES modules (`import` / `export`) only.

## Agent / CI Examples (Cloudflare-specific)

These examples show how an automated agent or CI job SHOULD interact with this
repository safely and predictably.

### Regenerate types and verify (PR check)

Purpose: Ensure `worker-configuration.d.ts` remains in sync when `wrangler.jsonc`
changes.

```bash
pnpm install --frozen-lockfile
pnpm run cf-typegen
# Fail if generated file differs from repo version
git --no-pager diff --exit-code -- worker-configuration.d.ts
```

### PR / CI guidance

- Run the above snippet in PR checks when `wrangler.jsonc` or binding-related
  files change.
- If the check fails, authors MUST regenerate types locally and include
  `worker-configuration.d.ts` in the PR.

### Wranger dev smoke-test (agent-run interactively)

```bash
pnpm run dev
# Then verify endpoints, e.g. GET /message
curl -sS http://127.0.0.1:8787/message
```

### Deploy helper (maintainer-only)

Only run with maintainer credentials and protected-branch controls.

```bash
pnpm run deploy
```

## Safety & Permissions

- Agents MUST NOT expose secrets in logs.
- Agents that perform deploys must require manual approval or be limited to
  protected branches.

## Recent Changes

[LAST 3 FEATURES AND WHAT THEY ADDED]

<!-- MANUAL ADDITIONS START -->
### Notes for CI / PR checks

- This repository includes a GitHub Actions workflow `cf-typegen-check.yml` that
  validates the generated `worker-configuration.d.ts` is up-to-date when PRs
  modify `wrangler.jsonc` or bindings. Update the workflow if you introduce
  new generation steps.

<!-- MANUAL ADDITIONS END -->
