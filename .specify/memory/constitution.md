<!--
Sync Impact Report
- Version change: TEMPLATE -> 1.0.0
- Modified principles: (added Cloudflare-focused principles)
- Added sections: Security & Secrets Management, Development Workflow (Cloudflare tooling)
- Removed sections: none (template placeholders replaced)
- Templates requiring updates: 
	- .specify/templates/plan-template.md -> ✅ reviewed (Constitution Check present)
	- .specify/templates/spec-template.md -> ✅ reviewed
	- .specify/templates/tasks-template.md -> ✅ reviewed
	- .specify/templates/agent-file-template.md -> ⚠ pending (agent guidance may need Cloudflare examples)
	- README.md -> ✅ reviewed (quickstart references preserved)
- Follow-up TODOs: none
-->

# chat-cf Constitution

## Core Principles

### I. Serverless-First (NON-NEGOTIABLE)
All new functionality MUST be designed for Cloudflare Workers execution and the
edge environment. Functions should be stateless where possible, avoid long-running
processes, and fit within Workers CPU/memory limits. Prefer using Cloudflare
managed services (Durable Objects, D1, KV, R2) for state and coordination.

Rationale: This repository is built for Cloudflare's edge platform; designs that
assume a long-lived server or specialized OS features are incompatible.

### II. Type & Binding Safety
All runtime integrations (bindings) MUST be declared in `wrangler.jsonc` and
type-synchronized by running `pnpm run cf-typegen`. The generated
`worker-configuration.d.ts` is the authoritative type for `CloudflareBindings`.
Handlers MUST instantiate Hono with the binding generic: `new Hono<{ Bindings:
CloudflareBindings }>()`.

Rationale: Explicit bindings + generated types prevent silent runtime errors
when deploying to different environments.

### III. Minimal Bundle & Compatibility
Workers MUST keep the Worker bundle minimal: prefer native APIs and small
dependencies. Update `compatibility_date` in `wrangler.jsonc` deliberately and
document rationale when changing it. Avoid Node-specific APIs; use ESNext
modules and `jsxImportSource: "hono/jsx"` where applicable.

Rationale: Small bundles reduce cold-start and deployment size; compatibility
date controls runtime behavior at Cloudflare edge.

### IV. Observability & Local Parity
Applications MUST enable observability (see `wrangler.jsonc.observability`). Use
structured logging and instrument key endpoints. During development use
`pnpm run dev` (Wrangler) to test local Worker behavior; validate responses and
asset bindings (ASSETS) match production behavior.

Rationale: Edge debugging is different from server debugging; ensure logs and
observability are present before deployment.

### V. Deployment-as-Code & Type-First Workflow
Deployment and environment configuration MUST be managed via `wrangler.jsonc`.
Secrets must use Wrangler secrets (do NOT commit secrets to the repo). Type
generation (`pnpm run cf-typegen`) MUST be part of the developer workflow and
CI before deployment.

Rationale: Declarative deployment ensures reproducible environments and safer
rollouts.

## Security & Secrets Management

- Store all sensitive values with `wrangler secret` or Cloudflare Secrets; never
	check secrets into source control.
- Ensure third-party integrations list required bindings in `wrangler.jsonc` and
	document access scopes.
- Validate external requests and sanitize inputs in Worker handlers.

## Development Workflow

- Local dev: `pnpm run dev` (starts `wrangler dev`). Use the browser to
	exercise `public/index.html` and API endpoints (e.g., `/message`).
- Types: run `pnpm run cf-typegen` after modifying `wrangler.jsonc` or adding
	bindings; commit the resulting `worker-configuration.d.ts` file.
- Build/Deploy: `pnpm run deploy` for production deploys (uses `wrangler deploy
	--minify`).
- Quick checks: confirm `ASSETS` binding serves files from `public/` and that
	`src/index.ts` uses `Hono<{ Bindings: CloudflareBindings }>()`.

## Governance

- Amendments to this constitution require a documented PR with rationale and a
	changelog. Changes that add or remove core principles are MAJOR bumps; minor
	clarifications are PATCH bumps. The repository maintainer(s) MUST approve
	governance PRs.
- Versioning: follow semantic versioning for constitution versions:
	- MAJOR: Backwards-incompatible principle redefinitions or removals
	- MINOR: New principle or material expansion
	- PATCH: Wording clarifications, typo fixes

**Version**: 1.0.0 | **Ratified**: 2025-11-14 | **Last Amended**: 2025-11-14
