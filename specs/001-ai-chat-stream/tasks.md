# Tasks: AI Chat (Streaming)

**Input**: Design documents from `/specs/001-ai-chat-stream/`  
**Prerequisites**: ✅ plan.md, ✅ spec.md, ✅ research.md, ✅ data-model.md, ✅ contracts/  
**Status**: Generated 2025-11-14  

**Overview**: Implementation task list for AI Chat streaming feature with 3 user stories. Tasks are organized by priority (P1 → P2 → P3) to enable independent implementation, testing, and incremental delivery.

---

## Format: `[ID] [P?] [Story] Description with file path`

- **[P]**: Can run in parallel (different files, no blocking dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3) — Setup/Foundational phases have no story label
- **[ID]**: Task identifier in execution order (T001, T002, etc.)
- File paths are absolute or relative to repository root (`src/`, `public/`, etc.)

---

## Dependency Graph & Execution Order

```
Phase 1: Setup (sequential)
  ↓
Phase 2: Foundational (must complete before Phase 3+)
  ↓
┌─────────────────────────────────────────────┐
│ Phase 3: US1 (P1) - One-off Q&A             │ Can run in parallel
│ Phase 4: US2 (P2) - Multi-turn context      │ with each other
│ Phase 5: US3 (P3) - Cancellation/resume     │ (independent APIs)
└─────────────────────────────────────────────┘
  ↓
Phase 6: Polish & Cross-Cutting Concerns (final)
```

**Parallel Opportunities**:
- **Phase 3 & 4 & 5**: All user story implementation can happen simultaneously (separate React components, separate handler logic, separate message persistence paths)
- **Within Phase 3+**: Model definitions [P] with handler implementations [P]

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Cloudflare Workers project structure

- [x] T001 Initialize D1 database with schema from `specs/001-ai-chat-stream/contracts/database.sql` via `wrangler d1 create chat-cf-db` and apply schema
- [x] T002 Create backend source directory structure: `src/{handlers,models,services,utils}` per plan.md
- [x] T003 Create frontend source directory structure: `public/src/{components,services,hooks,styles}` per plan.md
- [x] T004 Create tests directory structure: `tests/{unit,integration,contract}/` with corresponding subdirectories
- [x] T005 [P] Configure `wrangler.jsonc` with D1 binding, ASSETS binding, environment variables, observability settings (per research.md decisions)
- [x] T006 [P] Add TypeScript configuration: `tsconfig.json` with JSX support for React (per plan.md: React 18+)
- [x] T007 [P] Install npm dependencies: Hono 4.10.5+, @hono/streaming, React 18+, axios (or fetch wrapper)
- [x] T008 [P] Configure build tool: Vite with React plugin for frontend; wrangler for backend

**Checkpoint**: Project structure ready for foundational tasks

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that ALL user stories depend on. MUST complete before Phase 3+.

**⚠️ CRITICAL GATE**: No user story work begins until this phase is 100% complete.

### 2.1 API & Database Infrastructure

- [x] T009 [P] Create Hono app entry point with middleware pipeline in `src/index.ts`: CORS, logging, error handling, session ID validation
- [x] T010 [P] Implement D1 database client wrapper in `src/services/db.ts`: query execution, error handling, type safety wrapper
- [x] T011 [P] Create ClientSession model type in `src/models/client-session.ts`: UUID generation, validation, metadata handling
- [x] T012 [P] Create Conversation model type in `src/models/conversation.ts`: with relationships to ClientSession and Message entities
- [x] T013 [P] Create Message model type in `src/models/message.ts`: role (user|assistant), content, timestamps
- [x] T014 [P] Create StreamChunk model type in `src/models/stream-chunk.ts`: ephemeral chunk with index, text, type (content|error), timestamp

### 2.2 Streaming & AI Integration

- [x] T015 [P] Create OpenRouter API client wrapper in `src/services/openrouter.ts`: fetch-based REST API calls (OpenAI-compatible), streaming response handling, error propagation, support for model routing (per research.md decision)
- [x] T016 [P] Implement streaming chunk parser in `src/utils/stream.ts`: SSE format parsing, chunk validation, error extraction from OpenAI-compatible API responses, delta.choices[0].delta.content parsing
- [x] T017 [P] Create session management utility in `src/utils/session.ts`: UUID generation, header validation, session ID extraction from X-Session-ID header

### 2.3 Frontend State & API Client

- [x] T018 [P] Create React hooks for state management in `public/src/hooks/useChat.ts`: manage messages, streaming state, error state, conversation ID
- [x] T019 [P] Create API client service in `public/src/services/api.ts`: fetch wrapper for `/api/chat/stream` (SSE with EventSource or fetch), `/api/conversations` (list), `/api/conversations/{id}` (load history)
- [x] T020 [P] Create session storage utility in `public/src/services/session.ts`: localStorage wrapper for session ID (generate on first visit, persist across page reloads)

### 2.4 Error Handling & Logging

- [x] T021 [P] Implement structured logging middleware in `src/middleware/logger.ts`: request ID, session ID, conversation ID, timestamps, error details (per spec.md NFR-003)
- [x] T022 [P] Create error handling utilities in `src/utils/errors.ts`: error codes (INVALID_REQUEST, RATE_LIMIT_EXCEEDED, INTERNAL_ERROR), error chunk formatting for SSE, error messages

### 2.5 CI & Type Safety

- [x] T023 [P] Configure TypeScript type generation in CI: ensure `pnpm run cf-typegen` is part of pre-commit hook (per constitution.md Principle II)
- [x] T024 [P] Create `pnpm run build` script for production minification in `package.json`: wrangler build, React build, bundle size validation (<50KB constraint per plan.md)

**Checkpoint**: Foundation complete. All 3 user stories can now be implemented independently in parallel.

---

## Phase 3: User Story 1 - One-off Question + Streaming Reply (Priority: P1) 🎯 MVP

**Goal**: User submits a single prompt and receives AI response as a stream of chunks, arriving within 1 second (95th percentile) with 99% completion success rate.

**Acceptance Scenarios**:
1. ✅ User submits prompt → system receives first chunk within 1s → UI displays partial response
2. ✅ Streaming continues → all chunks ordered → final completion marker received
3. ✅ Malformed prompt → error chunk returned immediately → stream terminates cleanly (fail-fast, per spec.md clarification Q1)

**Independent Test**: Use curl or test client to POST `/api/chat/stream` with prompt, verify SSE chunks arrive, verify first chunk within 1s, verify final completion marker.

### Implementation for User Story 1

- [x] T025 [P] [US1] Create session creation/lookup logic in `src/handlers/chat-stream.ts`: generate session ID if missing, verify X-Session-ID header, update ClientSession.last_activity
- [x] T026 [P] [US1] Create conversation creation handler in `src/handlers/chat-stream.ts`: generate conversation ID on first request (or accept existing), link to session ID
- [x] T027 [US1] Implement POST `/api/chat/stream` handler in `src/handlers/chat-stream.ts`: accept prompt + conversationId (optional), validate input (text-only, no nulls), trigger streaming response
- [x] T028 [US1] Implement OpenRouter API streaming integration in `src/handlers/chat-stream.ts`: fetch to OpenRouter API (`https://openrouter.ai/api/v1/chat/completions`), parse SSE chunks, format as JSON StreamChunk objects, send to client via `c.streamText()` or `c.stream()`
- [x] T029 [US1] Implement first-chunk latency tracking in `src/handlers/chat-stream.ts`: log timestamp of first StreamChunk, validate against 1s SLA (per spec.md SC-001)
- [x] T030 [US1] Persist final message to D1 in `src/handlers/chat-stream.ts`: after streaming completes, save full response text as Message entity with role='assistant', update Conversation.updated_at
- [x] T031 [US1] [P] Create ChatDisplay React component in `public/src/components/ChatDisplay.tsx`: display streaming chunks in real-time, show partial text as it arrives, clear after stream completes
- [x] T032 [US1] [P] Create ChatInputForm React component in `public/src/components/ChatInputForm.tsx`: text input field (text-only validation per spec.md), submit button, disable during streaming, clear input after submit
- [x] T033 [US1] [P] Create ErrorDisplay React component in `public/src/components/ErrorDisplay.tsx`: display error chunks from API (fail-fast error propagation), show error code + message, auto-dismiss after 5s
- [x] T034 [US1] Integrate ChatDisplay + ChatInputForm + ErrorDisplay in `public/src/App.tsx`: wire hooks (useChat), manage streaming state, pass callbacks
- [x] T035 [US1] Add rate-limiting middleware in `src/middleware/rate-limiter.ts`: basic per-session rate limit (e.g., 10 req/min per X-Session-ID), return 429 on limit exceeded (per spec.md FR-007)
- [ ] T036 [US1] Add test: Contract test for `POST /api/chat/stream` endpoint in `tests/contract/chat-stream.test.ts`: verify request schema (prompt required, text-only), verify response schema (SSE StreamChunk objects), verify first chunk within 1s
- [ ] T037 [US1] Add test: Integration test for one-off Q&A in `tests/integration/streaming.test.ts`: send prompt, collect chunks, verify completion, verify message persisted to D1

**Checkpoint**: User Story 1 complete and testable. `/api/chat/stream` endpoint functional, UI displays streaming responses, messages persisted. MVP is now deployable.

---

## Phase 4: User Story 2 - Multi-Turn Conversation (Priority: P2)

**Goal**: User continues conversation within same session; prior messages used as context, each reply streamed incrementally.

**Acceptance Scenarios**:
1. ✅ Create conversation (US1 already handles first message)
2. ✅ Send follow-up message with conversationId → system loads prior messages → passes full context to OpenRouter → streams response
3. ✅ Response reflects context from prior messages (coherence validated manually, SC-004)

**Independent Test**: Create conversation, send 3+ messages, verify each response references prior context, verify all messages persisted with correct timestamps and roles.

### Implementation for User Story 2

- [ ] T038 [P] [US2] Create conversation loader in `src/services/db.ts`: `getConversationWithMessages(conversationId)` → fetch conversation + all messages ordered by created_at ASC
- [ ] T039 [P] [US2] Create message formatter for OpenRouter context in `src/utils/prompt.ts`: convert Message[] array into OpenAI-compatible messages format: `[{role, content}, ...]`, include all prior messages in correct order
- [ ] T040 [US2] Enhance POST `/api/chat/stream` handler in `src/handlers/chat-stream.ts`: if conversationId provided, load conversation + messages, pass to OpenRouter with full context, verify conversation belongs to session
- [ ] T041 [US2] [P] Create ConversationList React component in `public/src/components/ConversationList.tsx`: display list of conversations (title, updated_at), sorted most-recent-first, click to load conversation
- [ ] T042 [US2] [P] Create MessageList React component in `public/src/components/MessageList.tsx`: display all messages in conversation (user and assistant), timestamp for each, scroll to latest, alternate left/right layout per role
- [ ] T043 [US2] Enhance App.tsx in `public/src/App.tsx`: add conversation management state (currentConversation, conversations list), load conversation list on mount, allow switching between conversations, wire ConversationList + MessageList
- [ ] T044 [US2] Add auto-title inference in `src/handlers/chat-stream.ts`: after first message, call OpenRouter with prompt "Generate a short title (3-5 words) for this conversation: <first user message>", store in Conversation.title (optional but recommended for UX)
- [ ] T045 [US2] [P] Create test: Integration test for multi-turn conversation in `tests/integration/multi-turn.test.ts`: send 3 messages, verify each response uses prior context, verify message history correct
- [ ] T046 [US2] [P] Create test: Contract test for GET `/api/conversations` in `tests/contract/conversations.test.ts`: verify response schema (Conversation[], with title, timestamps), verify ordering

**Checkpoint**: User Stories 1 + 2 complete. Users can create multi-turn conversations, context is preserved, conversation history persists and retrieves correctly.

---

## Phase 5: User Story 3 - Interrupt / Resume & Cancellation (Priority: P3)

**Goal**: Users can cancel in-progress streams and optionally request continuation (fail-fast error on cancellation, no retry-from-middle for MVP).

**Acceptance Scenarios**:
1. ✅ Stream in progress → client sends abort signal → server stops sending chunks → client receives cancellation confirmation
2. ✅ After cancellation, client can request new response or retry (generates fresh response, not resume from middle)

**Independent Test**: Start stream, cancel after 500ms, verify no further chunks, verify cancellation acknowledged, request new response, verify fresh response generated.

### Implementation for User Story 3

- [ ] T047 [P] [US3] Implement AbortController support in POST `/api/chat/stream` handler in `src/handlers/chat-stream.ts`: accept and propagate request.signal to OpenRouter fetch, handle abort (clean stream termination, error chunk if partial)
- [ ] T048 [P] [US3] Implement client-side cancellation in `public/src/services/api.ts`: expose abort() method on streaming response, wire to cancel button in UI
- [ ] T049 [US3] Create cancel button in ChatInputForm in `public/src/components/ChatInputForm.tsx`: show "Cancel" button during streaming (swap with submit), onClick → abort stream, re-enable input
- [ ] T050 [US3] Add cancellation error handling in ChatDisplay in `public/src/components/ChatDisplay.tsx`: if stream aborted, show "Response cancelled by user" message, allow retry
- [ ] T051 [US3] Update useChat hook in `public/src/hooks/useChat.ts`: expose abortStream() method, set streaming = false on abort, preserve partial chunks (user can see what was generated)
- [ ] T052 [P] [US3] Create test: Integration test for stream cancellation in `tests/integration/cancellation.test.ts`: start stream, abort after 500ms, verify no further chunks, verify subsequent request succeeds
- [ ] T053 [P] [US3] Create test: Latency test for cancellation acknowledgment in `tests/integration/cancellation.test.ts`: measure time from abort signal to stream termination, verify ≤500ms (95th percentile, per SC-003)

**Checkpoint**: All 3 user stories complete. MVP feature fully functional: one-off Q&A, multi-turn conversations, stream cancellation.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Optimization, observability, documentation, and production readiness

### 6.1 Performance & Observability

- [ ] T054 [P] Add latency instrumentation in `src/middleware/logger.ts`: log first-chunk-latency, total-stream-time, tokens-per-second for each request, emit metrics for dashboard
- [ ] T055 [P] Implement stream backpressure handling in `src/handlers/chat-stream.ts`: if client buffer full, pause OpenRouter fetch, resume when client ready (prevent memory spikes)
- [ ] T056 [P] Add bundle size validation in build script: ensure Worker bundle <50KB (minified + gzipped), warn if approaching limit (per plan.md constraint)

### 6.2 Documentation & Developer Experience

- [ ] T057 [P] Create `.env.example` file: template for OPENROUTER_API_KEY, environment variables needed for local dev
- [ ] T058 [P] Update README.md: add link to `specs/001-ai-chat-stream/quickstart.md`, add quickstart section to main README
- [ ] T059 [P] Add JSDoc comments to all handlers in `src/handlers/`: describe endpoint purpose, request/response shape, error scenarios
- [ ] T060 [P] Add JSDoc comments to React components in `public/src/components/`: describe props, state, event handlers

### 6.3 Testing & CI

- [ ] T061 Add GitHub Actions workflow for CI in `.github/workflows/test.yml`: run `pnpm test` (Vitest), verify bundle size, type-check with `cf-typegen`
- [ ] T062 [P] Create test fixtures in `tests/fixtures/`: mock OpenRouter API responses (success, error, various content lengths), test data (sample conversations, messages)
- [ ] T063 [P] Add E2E test suite for full user journey in `tests/e2e/`: Playwright test for one-off Q&A, multi-turn, cancellation scenarios

### 6.4 Security & Validation

- [ ] T064 [P] Implement input validation utility in `src/utils/validation.ts`: validate prompt (non-empty, <10K chars, text-only), validate UUIDs, sanitize message content
- [ ] T065 [P] Add CORS configuration in `src/index.ts`: restrict origins for production (allow workers.dev domain), set appropriate headers
- [ ] T066 [P] Implement request ID generation in `src/middleware/logger.ts`: add x-request-id header, propagate through logging for traceability

### 6.5 Accessibility & UX

- [ ] T067 [P] Add ARIA labels to React components: ChatInputForm, ChatDisplay, ConversationList (screen reader support)
- [ ] T068 [P] Add keyboard navigation: Tab through inputs, Enter to submit, Esc to cancel stream
- [ ] T069 [P] Add responsive design to chat UI: mobile-friendly layout, touch-friendly buttons, responsive message display

### 6.6 Deployment & Operations

- [ ] T070 [P] Create deployment guide in `docs/DEPLOY.md`: step-by-step production deployment, set secrets via `wrangler secret put`, verify health endpoint
- [ ] T071 [P] Add health check endpoint in `src/handlers/health.ts`: GET `/health` → 200 if DB responsive, include version, timestamp
- [ ] T072 [P] Create database backup strategy in `docs/DB_BACKUP.md`: D1 backup/restore procedures, export to local SQLite if needed

**Checkpoint**: Production-ready. All tests passing, documentation complete, performance validated, security reviewed.

---

## Summary

| Phase | Name | Task Count | Duration Est. | Status |
|-------|------|-----------|----------------|--------|
| P1 | Setup | 8 | 2-4 hours | ➡️ Ready to start |
| P2 | Foundational | 16 | 4-6 hours | ➡️ Blocked on P1 |
| P3 | US1 (P1) MVP | 13 | 6-8 hours | ➡️ Blocked on P2 |
| P4 | US2 (P2) | 9 | 4-6 hours | ➡️ Blocked on P2, can run parallel with P3 |
| P5 | US3 (P3) | 7 | 3-4 hours | ➡️ Blocked on P2, can run parallel with P3/P4 |
| P6 | Polish | 19 | 6-8 hours | ➡️ Blocked on P3/P4/P5 |
| | **TOTAL** | **72 tasks** | **25-36 hours** | |

---

## Task Statistics

- **Total Tasks**: 72
- **Setup Phase**: 8 tasks (11%)
- **Foundational Phase**: 16 tasks (22%)
- **User Story 1 (P1 MVP)**: 13 tasks (18%)
- **User Story 2 (P2)**: 9 tasks (13%)
- **User Story 3 (P3)**: 7 tasks (10%)
- **Polish & Cross-Cutting**: 19 tasks (26%)

**Parallelizable Tasks ([P])**: 36 tasks (50%)

**Parallel Opportunities**:
- **All Setup tasks** (T001-T008) except T001 can run together
- **All Foundational tasks** (T009-T024) can run in parallel (no cross-dependencies)
- **User Stories 1, 2, 3** can be developed simultaneously (different code paths, independent features)
- **Within each User Story**: Model definitions [P] with handler implementations [P]
- **Tests** (contract + integration): can run in parallel for different stories

---

## MVP Scope (Recommended)

**Phase 1 + Phase 2 + Phase 3 = Complete MVP**

**Result**: Deployable product with core feature (one-off Q&A streaming), functional UI, persistent storage.

**Estimated effort**: ~12-14 hours  
**Deployable after**: Phase 3 completion  
**User value**: ✅ High (solves primary use case: fast AI response with streaming)

---

## Implementation Strategy

### Recommended Execution Path

1. **Day 1 (Start)**: Execute Phase 1 setup (2-4 hours) + Phase 2 foundational (4-6 hours)
   - **Output**: Project structure + database schema + API foundation ready
   - **Checkpoint**: Verify `pnpm run dev` works, database accessible, type generation passing

2. **Day 2 (Parallel)**: Execute Phase 3, 4, 5 simultaneously (different teams or sprints)
   - **Team A**: Implement Phase 3 (US1 MVP) — core streaming chat
   - **Team B**: Implement Phase 4 (US2) — conversation context
   - **Team C**: Implement Phase 5 (US3) — cancellation feature
   - **Checkpoint**: Each story deployable independently; manual testing per story

3. **Day 3 (Final)**: Execute Phase 6 polish (6-8 hours)
   - Optimization, testing, documentation, security, deployment
   - **Checkpoint**: All tests passing, bundle size <50KB, documentation complete, ready for production

### Testing Strategy

**Contract Tests First** (TDD approach):
- T036, T046, T052 should be written BEFORE implementation
- Verify API contracts match OpenAPI spec
- Catch breaking changes early

**Integration Tests** (Per Story):
- T037 (US1), T045 (US2), T052 (US3) verify full workflows
- Can run against local D1 + mock OpenRouter API

**E2E Tests** (Full Journey):
- T063 uses Playwright to test real browser + real API
- Verify UI streaming display, state management, navigation

---

## File Path Reference (Summary)

**Backend**:
- `src/index.ts` — Hono app entry point
- `src/handlers/chat-stream.ts` — POST /api/chat/stream implementation
- `src/handlers/health.ts` — GET /health (added in Phase 6)
- `src/models/{entity}.ts` — Model type definitions
- `src/services/db.ts` — D1 database client
- `src/services/openrouter.ts` — OpenRouter API integration
- `src/middleware/{logger,rate-limiter}.ts` — Middleware
- `src/utils/{stream,session,prompt,errors,validation}.ts` — Utilities
- `tests/{contract,integration,e2e}/` — Test suites

**Frontend**:
- `public/index.html` — Main HTML entry point
- `public/src/App.tsx` — React root component
- `public/src/components/{ChatDisplay,ChatInputForm,ErrorDisplay,ConversationList,MessageList}.tsx` — React components
- `public/src/hooks/useChat.ts` — State management hook
- `public/src/services/{api,session}.ts` — Client-side services
- `public/src/styles/app.css` — Global styles (Tailwind or vanilla CSS)

**Configuration**:
- `wrangler.jsonc` — Cloudflare Workers config (D1, ASSETS, env vars)
- `tsconfig.json` — TypeScript config
- `package.json` — Dependencies + scripts (dev, build, test, deploy)
- `.env.local` — Local environment variables (not committed)
- `.env.example` — Template for env vars

**Documentation**:
- `specs/001-ai-chat-stream/quickstart.md` — Developer setup guide
- `docs/DEPLOY.md` — Production deployment (added in Phase 6)
- `docs/DB_BACKUP.md` — Database backup procedures (added in Phase 6)
- `README.md` — Updated with feature links

---

## Validation Checklist (Before Deployment)

- [ ] All Phase 1 tasks completed (setup)
- [ ] All Phase 2 tasks completed (foundation)
- [ ] All Phase 3 tasks completed (US1 MVP)
- [ ] Phases 4-5 complete (US2-US3) or deferred to Phase 2 release
- [ ] Phase 6 polish tasks completed (tests, docs, security)
- [ ] `pnpm run build` succeeds, bundle <50KB
- [ ] `pnpm run dev` starts without errors
- [ ] `pnpm test` passes all tests
- [ ] `pnpm run cf-typegen` shows no type errors
- [ ] Manual testing: one-off Q&A works, streaming latency <1s, error handling functional
- [ ] Secrets configured in production (`wrangler secret put OPENROUTER_API_KEY`)
- [ ] README + quickstart.md reviewed and updated
- [ ] GitHub Actions CI verified

---

## Next Steps

To execute tasks, developers should:

1. Read `specs/001-ai-chat-stream/quickstart.md` for local setup
2. Create a branch for Phase 1: `git checkout -b 001-phase1-setup`
3. Execute Phase 1 tasks (T001-T008) sequentially
4. Verify checkpoint: `pnpm run dev` + database schema applied
5. Merge Phase 1, then branch for Phase 2: `git checkout -b 001-phase2-foundation`
6. Execute Phase 2 tasks (T009-T024) in parallel groups
7. Repeat for Phases 3-6

All tasks are designed to be independently completable by an LLM agent or human developer with the design documents as reference.
