# Project TODO

This file is the canonical model-facing execution tracker for the repository.
Use it as the working plan and status board for `gpt-5.4` and subagents.

## Purpose

- Coordinate whole-project assessment and remediation for the live Next.js app in `web/`.
- Keep `gpt-5.4` as the integration owner while using subagents aggressively where safe.
- Track security, code review, refactor, E2E, and TDD work in one place.
- Stay current. Update this file after each meaningful batch.

## Canonical Sources

Read these before starting major work:

1. `README.md`
2. `prompt.md`
3. `AGENTS.md`
4. `docs/COMMAND-AGENT-MAP.md`
5. Relevant skill files under `skills/`

Rules for source priority:

1. Project architecture and product truth come from `README.md` and `prompt.md`.
2. Agent and workflow policy come from `AGENTS.md` and the skill files.
3. `commands/` are mostly legacy slash-entry shims. Prefer skills and direct agents when possible.
4. If two sources conflict, prefer the more specific project-level source and record the decision below.

## Lead Model Charter

`gpt-5.4` is the primary orchestrator for this project.

Responsibilities:

1. Break work into small, verifiable batches.
2. Delegate bounded tasks to subagents in parallel where files and contracts do not overlap.
3. Review every subagent output before accepting it.
4. Reject low-quality, incomplete, or conflicting subagent work.
5. Keep TDD as the control workflow for implementation.
6. Keep security review attached to all auth, input, storage, API, and admin changes.
7. Keep this file current.

Hard rules:

1. Do not trust a subagent's conclusion without checking the affected files, tests, and risks.
2. Do not allow parallel edits in overlapping files unless `gpt-5.4` explicitly serializes the work.
3. Do not move into implementation without a concrete RED target.
4. Do not mark a batch complete until verification gates pass or the remaining gap is documented.

## Non-Negotiables

These come from the existing repo guardrails and stay in force for every batch:

1. TypeScript stays strict.
2. No hardcoded secrets.
3. Validate every trust boundary on the server.
4. Treat Server Actions as public endpoints.
5. Use Zod at system boundaries.
6. Keep auth and authorization explicit.
7. Never render unsanitized user-authored HTML.
8. Keep DB access server-only and avoid `SELECT *`.
9. Use structured error handling and avoid leaking internal details.
10. A task is not complete until lint, typecheck, tests, and build are addressed.

## Operating Loop

Use this loop for every non-trivial batch:

1. Re-read the relevant product and architecture context.
2. Define the batch goal, files, and acceptance criteria here.
3. Ask `planner` for decomposition only when the batch is complex enough to justify it.
4. Ask `tdd-guide` to define the RED -> GREEN -> REFACTOR slice.
5. Launch independent discovery or implementation subagents in parallel.
6. Review and consolidate all subagent outputs in the main session.
7. Land the smallest correct change.
8. Run verification gates.
9. Update this file with status, blockers, and decisions.

## Subagent Routing Table

Use the smallest correct agent set.

| Need | Primary agent or skill | When to use | Required follow-up |
|---|---|---|---|
| Planning | `planner` | Multi-file features, architecture changes, complex refactors | `gpt-5.4` restates batch and acceptance criteria here |
| TDD control | `tdd-guide` or `skills/tdd-workflow` | New features, bug fixes, refactors | Record RED target, GREEN scope, and verification |
| Security assessment | `security-reviewer` or `skills/security-review` | Auth, input handling, API routes, secrets, uploads, admin surfaces | `gpt-5.4` validates severity and remediation order |
| General code review | `code-reviewer` | Any meaningful code change | Fix or log CRITICAL and HIGH findings before proceeding |
| TypeScript-specific review | `typescript-reviewer` | TS-heavy logic, unsafe typing, API contracts | Pair with `code-reviewer` when risk is medium or higher |
| Build or type failures | `build-error-resolver` | Lint, typecheck, build, or test command failures | Re-run the failed command and re-review the diff |
| Dead code and cleanup | `refactor-cleaner` | Unused code, duplicate utilities, oversized modules | Require tests before risky cleanup |
| E2E flows | `e2e-runner` or `skills/e2e-testing` | Critical user journeys and regression coverage | Capture gaps, flakes, blockers, and artifacts |
| DB and data access | `database-reviewer` | Query safety, schema, migrations, data contracts | Pair with security review for sensitive flows |
| Docs sync | `doc-updater` | Update docs after shipped behavior changes | Keep docs minimal and source-aligned |

Notes:

1. Prefer skills over command docs when the command is only a shim.
2. `/tdd`, `/e2e`, and `/orchestrate` are compatibility entry points, not the main source of workflow truth.
3. If a direct agent is more precise than a slash command, use the agent.

## Parallel Work Rules

Parallelism is the default for discovery and the exception for overlapping implementation.

Safe to run in parallel:

1. Security discovery on one area and code-quality discovery on another.
2. E2E coverage gap analysis and refactor candidate discovery.
3. Reads, searches, and doc lookups across different directories.
4. Implementation batches touching separate files with already-defined contracts.

Do not run in parallel:

1. Two edits in the same file.
2. Two edits in adjacent layers when the contract is not fixed yet.
3. Security remediation and feature implementation in the same surface without serialized review.
4. Refactor cleanup in a module that is actively being behavior-changed elsewhere.

Parallel execution pattern:

1. `gpt-5.4` defines the batch and the non-overlap boundary.
2. Launch multiple subagents only for independent lanes.
3. Review each result in the main session.
4. Merge findings into one ranked action list.
5. Execute the next smallest safe slice.

## Verification Gates

Per batch:

1. Relevant RED evidence recorded.
2. Relevant tests rerun to GREEN.
3. Lint checked for touched files or full app when warranted.
4. Typecheck checked.
5. Build checked when the change can affect app compilation or routing.
6. Security sanity review for auth, inputs, API routes, uploads, or admin flows.
7. E2E rerun for user-facing workflow changes.

Project-wide release-quality gate:

1. `bun run lint`
2. `bunx tsc --noEmit`
3. `bun run test`
4. `bun run test:e2e`
5. `bun run build`

Run from `web/` unless the batch is repo-root-only documentation or tooling work.

### Required Evidence Capture

A batch stays open until this tracker records:

1. RED evidence
   - exact failing test file(s) and test name(s)
   - exact command run
   - one sentence explaining why the failure proves the intended bug, missing validation, or missing behavior
2. GREEN evidence
   - exact rerun command
   - exact tests that passed after the fix
3. REFACTOR evidence
   - whether any refactor happened after GREEN
   - exact tests rerun to show no behavior change
4. Verification evidence
   - lint result
   - typecheck result
   - build result when applicable
   - E2E result and artifact paths when applicable
   - security review result for sensitive changes
5. Exceptions
   - any skipped gate and why
   - the follow-up task that keeps the skipped gate visible

## TDD Batch Template

Use this template before changing production code:

```md
### Batch: <name>
- Goal:
- User journey or failure being protected:
- Scope:
- Files expected to change:
- Tests to add or update first:
- RED command:
- Expected RED test(s):
- Why this RED proves the right problem:
- GREEN target:
- GREEN command:
- Refactor boundary:
- Refactor proof command(s):
- Security impact:
- Required security assertions:
- E2E impact:
- E2E prerequisites (seed, auth state, env):
- Artifact paths (trace/video/screenshot), if E2E:
- Coverage impact:
- Verification commands:
- Status: pending | in_progress | blocked | complete
```

## Assessment Program

The initial program is a whole-project assessment with five coordinated lanes.

### Lane 1: Security

Goal: assess and harden trust boundaries.

Checklist:

1. Env and secret handling
2. Supabase public auth boundaries
3. Auth.js GitHub admin boundaries
4. Authorization source of truth in Turso
5. API route and Server Action input validation
6. Upload and media handling
7. Unsafe HTML or content rendering risks
8. Error leakage and logging hygiene
9. Rate limiting or abuse exposure on public endpoints
10. Security headers and middleware coverage

Required outputs:

1. Findings with severity
2. Files affected
3. Recommended remediation order
4. Test coverage gaps

### Lane 2: Code Review

Goal: assess correctness and maintainability.

Checklist:

1. Large files and long functions
2. Deep nesting and unclear flow
3. Typing gaps and unsafe assumptions
4. Missing error handling
5. Duplicate logic or inconsistent abstractions
6. Inconsistent API and data contracts
7. Missing tests for risky logic

Required outputs:

1. Findings with severity
2. Affected files
3. Suggested batch order
4. Quick wins vs risky work

### Lane 3: Refactor-Clean

Goal: remove low-value complexity without changing behavior.

Checklist:

1. Dead files and unused exports
2. Wrapper indirection with no value
3. Duplicate helpers and types
4. Oversized modules that should be split later
5. Cleanup candidates that need tests before touching

Required outputs:

1. Safe cleanup list
2. Caution list
3. Danger list
4. Test prerequisites

### Lane 4: E2E

Goal: cover critical user flows with stable Playwright coverage.

Priority journeys:

1. Homepage and infinite feed
2. Post detail and related content
3. Comments and comment likes
4. Bookmarks
5. Public auth and account settings
6. Admin login and dashboard access
7. Post create, edit, preview, publish, schedule
8. Image upload and gallery flows
9. Search, category, tag, and map routes
10. Mobile-safe smoke coverage for core pages

Required outputs:

1. Existing coverage map
2. Missing coverage list
3. Flaky tests and likely causes
4. Auth fixture and environment blockers

### Lane 5: TDD Control

Goal: force all remediation through test-first slices.

Checklist:

1. Define RED before implementation
2. Keep GREEN scope minimal
3. Refactor only after GREEN
4. Record coverage impact
5. Require follow-up reviews when risk is non-trivial

## Master Backlog

Statuses:

- `[ ]` not started
- `[-]` in progress
- `[x]` complete
- `[!]` blocked

### Phase 0: Planning Surface

- [x] Create canonical root `TODO.md`.
- [-] Keep this file updated after each meaningful batch.
- [ ] Add links from future handoff or session notes only when they provide unique value.

### Phase 1: Baseline Assessment

- [x] Run security baseline across auth, APIs, uploads, and content rendering.
- [x] Run code-quality baseline across `web/src`, tests, and config surfaces.
- [x] Run refactor-clean discovery for dead code and duplicate logic.
- [x] Run E2E coverage audit for critical user journeys.
- [x] Consolidate findings into one ranked remediation backlog.

### Phase 2: Security Hardening

- [x] Close any CRITICAL or HIGH security findings first.
- [ ] Ensure all trust boundaries use Zod validation.
- [x] Verify authorization checks across public and admin flows.
- [x] Verify upload and media routes are constrained and logged safely.
- [ ] Confirm no sensitive error leakage.
- [x] Fail closed `bun run seed:e2e` unless an explicit non-production opt-in is present and the target Supabase project/base URL matches an approved safe allowlist; add refusal-path tests before changing the script.
- [x] Decide and enforce the persistence policy for public E2E auth artifacts (`web/.env.test.local`, `web/playwright/.auth/public.json`) so reusable credentials/session state are explicit, rotated, cleaned up, and never depended on implicitly.

Completed slice:

- [x] Replace regex-based rich-text HTML sanitization with a vetted allowlist sanitizer and add regression coverage for legacy HTML and raw render sinks.
- [x] Make deployed rate limiting fail closed when Upstash credentials are missing, while keeping in-memory fallback only for local dev and test.
- [x] Harden avatar and admin image uploads with shared server-side byte-signature validation so spoofed image MIME types are rejected before Cloudinary upload.
- [x] Normalize admin GitHub identity mapping around the persisted provider user id so auth helpers no longer disagree about the same admin account.
- [x] Harden `PATCH /api/account/profile` and `GET /api/posts` so invalid input now returns generic `400` responses instead of leaking raw Zod field maps to public callers.
- [x] Harden `POST /api/posts/[postId]/comments` so invalid public comment payloads now return a generic `400` response instead of leaking raw Zod field maps, and lock the route with focused write-path coverage.

### Phase 3: Correctness and Maintainability

- [ ] Fix HIGH correctness findings from code review.
- [ ] Reduce typing risk in high-churn modules.
- [ ] Add tests around fragile logic before restructuring.
- [ ] Normalize error-handling patterns in touched areas.
- [x] Add focused `PATCH /api/account/profile` route coverage for unauthorized, rate-limited, invalid JSON, Zod rejection, null-clearing, omitted-field preservation, and successful update paths before refactoring account/profile code.
- [x] Remove hardcoded fallback `configuredPublicEmail` / `configuredPublicPostSlug` values in `web/tests/e2e/helpers/public.ts` so authenticated public Playwright specs skip or fail fast when seed/preflight state is missing.
- [x] Make `bun run seed:e2e` find the public Supabase fixture user reliably across all auth-user pages or a direct lookup path instead of assuming the first `listUsers({ perPage: 200 })` page contains the fixture account.
- [x] Clarify the admin-profile attribution contract in `web/src/server/auth/admin-users.ts`: either preserve per-admin display/avatar identity for multiple allowlisted GitHub admins or lock the shared site-owner identity assumption in tests and docs.
- [x] Add focused `GET /api/posts` route coverage for throttling, generic invalid-query rejection, and basic happy-path pagination/search behavior before hardening the public error shape.

Completed slice:

- [x] Prevent malformed admin `galleryEntries` payloads from silently erasing existing post media during save/update.
- [x] Locked `PATCH /api/account/profile` with focused route tests for unauthorized, rate-limited, invalid JSON, schema rejection, omitted-vs-null field semantics, and successful updates; the route already satisfied the contract so no production code change was required.
- [x] Locked the shared admin-profile attribution policy in tests and docs: admin accounts remain keyed by GitHub provider user id, `githubLogin` stays sourced from the live GitHub profile for operator attribution, and the persisted display/avatar identity intentionally stays the shared site-owner branding.
- [x] Hardened `GET /api/admin/posts` against malformed query input by returning a safe `400` for invalid admin filters instead of letting Zod validation errors escape the route boundary; added focused route coverage for invalid status, pagination, oversized query input, and unexpected non-Zod failures.
- [x] Added direct route coverage for `DELETE /api/comments/[commentId]`, `POST /api/comments/[commentId]/like`, `POST /api/admin/posts/clone`, and `POST /api/admin/posts/bulk-status` so public/admin mutation contracts are pinned before later cleanup or refactor work.

### Phase 4: Refactor and Cleanup

- [ ] Remove safe dead code with tests green before and after.
- [ ] Consolidate duplicate utilities and types where behavior is identical.
- [ ] Break up oversized modules only after protective tests exist.
- [ ] Leave behavior-adjacent refactors serialized and reviewed.
- [x] Add direct tests for `web/scripts/build.ts` covering `NODE_OPTIONS` sanitization handoff, spawned env/cwd behavior, and child exit-code propagation before refactoring build plumbing.
- [x] Add a parity check or single-source-of-truth workflow for duplicated root `vercel.json` and `web/vercel.json` cron schedules before config drift creates deploy mismatches.
- [x] Remove remaining safe duplication in the E2E bootstrap workflow only after tests protect it: repeated storage-state helper logic between `web/tests/e2e/helpers/public.ts` and `web/tests/e2e/helpers/admin.ts` still remains after the shared env-file persistence and capture env-loading cleanup landed.
- [x] Decide whether cron-secret handling should be unified between `web/src/app/api/cron/publish-scheduled/route.ts` and `web/src/app/api/cron/keep-supabase-awake/route.ts`; parity tests now protect a shared helper and serialized refactor.

Completed slice:

- [x] Extracted shared `.env.test.local` read/write helpers for the public E2E bootstrap, removed the duplicate `E2E_PUBLIC_EMAIL` / `E2E_PUBLIC_PASSWORD` write in `web/scripts/seed-e2e-fixtures.ts`, and replaced the duplicated env-loading loop in `web/scripts/capture-public-storage-state.ts` with the shared env-path resolver while preserving its current `.dev.vars` exclusion.
- [x] Extracted the shared existing-storage-state resolution and capture-hint formatting used by `web/tests/e2e/helpers/public.ts` and `web/tests/e2e/helpers/admin.ts`, while leaving public metadata/fingerprint enforcement and admin remote-mutation gating intentionally separate.
- [x] Unified cron auth enforcement behind `web/src/lib/cron-auth.ts`, kept the local-dev bypass loopback-only, preserved generic `500` responses for missing secrets, and added IPv4/IPv6 helper coverage plus route parity tests.

### Phase 5: E2E Confidence

- [ ] Add smoke coverage for all critical user-facing routes.
- [ ] Add authenticated admin flow coverage.
- [ ] Add authenticated public-user flow coverage.
- [ ] Reduce or quarantine flaky tests with clear follow-up notes.
- [ ] Ensure CI-ready artifact capture and failure diagnosis.
- [-] Add signed-in bookmark removal coverage in `web/tests/e2e/public-authenticated.spec.ts` and verify it live against the managed public fixture environment.
- [x] Make the authenticated public comment-deletion smoke test deterministic by removing the built-in `429` retry path and isolating limiter/user state so the flow passes or fails in one attempt.
- [x] Require explicit public E2E preflight checks for seed data, storage-state origin, and required env so missing setup fails before navigation instead of deep in the UI.

### Phase 6: Ongoing Execution

- [ ] Run all future implementation through TDD slices.
- [ ] Re-review sensitive changes with security and code-review lanes.
- [ ] Keep docs aligned with shipped behavior, not speculative plans.

## Active Batch

### Batch: authenticated public bookmark removal coverage
- Goal: extend the signed-in public Playwright lane with a stable bookmark removal flow on the seeded fixture post.
- User journey or failure being protected: an authenticated public user can remove a saved post and see it disappear from `/bookmarks` without racing the existing bookmark-save flow.
- Scope: `TODO.md` plus `web/tests/e2e/public-authenticated.spec.ts` only unless the live run exposes a real app bug.
- Files expected to change: `TODO.md`, `web/tests/e2e/public-authenticated.spec.ts`.
- Tests to add or update first: a signed-in removal flow that ensures the seeded post is saved, removes it, asserts the CTA flips back to save, and verifies the seeded link is absent on `/bookmarks`.
- RED command: `bunx playwright test tests/e2e/public-authenticated.spec.ts --grep "save a post|remove a saved post" --project=chromium`
- Expected RED test(s): the new removal assertion or shared bookmark state can fail until the authenticated flow block is isolated and the live fixture behavior is confirmed.
- Why this RED proves the right problem: it exercises the reverse bookmark path against the same managed public fixture state the existing signed-in bookmark-save flow depends on.
- GREEN target: bookmark save and remove flows both pass against the managed public fixture environment without cross-test state races.
- GREEN command: `bunx playwright test tests/e2e/public-authenticated.spec.ts --grep "save a post|remove a saved post" --project=chromium`
- Refactor boundary: no bookmark API, page, or button changes unless the live run exposes a real product bug.
- Security impact: low direct code risk, medium confidence gain because this protects an authenticated public mutation flow.
- Required security assertions: the managed public fixture state stays explicit; no fallback credentials or implicit seed assumptions are reintroduced.
- E2E impact: high; this is an authenticated browser-only slice.
- E2E prerequisites (seed, auth state, env): a safe local or explicitly approved non-production Supabase target, fresh public storage state, and a reachable app server at `E2E_BASE_URL`.
- Artifact paths (trace/video/screenshot), if E2E: `web/test-results/`.
- Coverage impact: adds the missing reverse bookmark journey after the existing save-path coverage.
- Verification commands: the targeted Playwright run above plus `bunx tsc --noEmit` and touched-file lint if support code changes again.
- Status: blocked

### Batch: HTML sanitization hardening
- Goal: replace the current regex-based rich-text HTML sanitization contract at raw HTML render sinks.
- Scope: content sanitization utilities, render callers, and focused regression tests in `web/`.
- Files expected to change: `web/src/lib/content.ts`, related render callers, and targeted tests.
- RED target: prove unsafe or structurally invalid HTML is still being accepted by the current sanitizer boundary.
- GREEN target: all raw HTML rendering routes through a vetted allowlist sanitizer with focused regression coverage.
- Refactor boundary: no unrelated content-model or editor refactors.
- Security impact: high, because this protects a direct `dangerouslySetInnerHTML` sink.
- E2E impact: low for the initial slice; unit and integration coverage first.
- Verification commands: targeted unit tests, touched-file lint, `bunx tsc --noEmit`, and broader app verification if the sanitizer swap changes shared rendering behavior.
- Status: complete

### Batch: rate-limit fail-closed behavior
- Goal: prevent production deployments from silently degrading to permissive in-memory rate limiting when Upstash credentials are missing.
- Scope: rate-limit env handling, runtime behavior, and focused regression tests in `web/`.
- Files expected to change: `web/src/lib/rate-limit.ts`, `web/src/lib/env.ts`, and targeted tests.
- RED target: prove production-like configuration still permits degraded fallback behavior when required rate-limit credentials are absent.
- GREEN target: production behavior either fails closed or is explicitly limited to local development, with focused regression coverage.
- Refactor boundary: no unrelated env or middleware cleanup.
- Security impact: medium-high, because this affects abuse protection on public endpoints.
- E2E impact: none for the initial slice.
- Verification commands: targeted unit tests, touched-file lint, `bunx tsc --noEmit`.
- Status: complete

### Batch: account/profile public error-shape hardening
- Goal: stop the authenticated public profile PATCH route from leaking raw Zod field maps.
- User journey or failure being protected: invalid profile updates should fail with a stable generic `400` shape instead of surfacing validator internals.
- Scope: `TODO.md`, `web/src/app/api/account/profile/route.ts`, and `web/tests/unit/account-profile-route.test.ts`.
- Files expected to change: `TODO.md`, `web/src/app/api/account/profile/route.ts`, `web/tests/unit/account-profile-route.test.ts`.
- Tests to add or update first: adjust the schema-rejection assertion to expect a generic invalid-update message instead of `fieldErrors`.
- RED command: `bunx vitest run tests/unit/account-profile-route.test.ts`
- Expected RED test(s): `PATCH /api/account/profile > returns 400 for schema rejection` fails because the route still returns raw `displayName` field errors.
- Why this RED proves the right problem: it exercises the public trust boundary directly and shows the response still leaks validator structure.
- GREEN target: invalid profile updates return a stable generic `400` response while the rest of the PATCH contract stays intact.
- GREEN command: `bunx vitest run tests/unit/account-profile-route.test.ts`
- Refactor boundary: no account UI, profile DAL, or theme-sync changes.
- Refactor proof command(s): `bunx vitest run tests/unit/account-profile-route.test.ts`
- Security impact: medium, because this is an authenticated public write surface.
- Required security assertions: unauthorized and rate-limited behavior stay unchanged; schema rejection returns only a generic error string.
- E2E impact: none for this slice.
- Coverage impact: narrows the public error shape without widening scope.
- Verification commands: `bunx vitest run tests/unit/account-profile-route.test.ts`, `bunx tsc --noEmit`, `npx eslint "src/app/api/account/profile/route.ts" "tests/unit/account-profile-route.test.ts"`.
- RED evidence:
  - Command: `bunx vitest run tests/unit/account-profile-route.test.ts`
  - Result: the schema-rejection test failed because the route still returned raw `displayName` field errors instead of a generic invalid-update response.
  - Why this RED proved the right problem: it showed the PATCH trust boundary still leaked validator details to callers.
- GREEN evidence:
  - Command: `bunx vitest run tests/unit/account-profile-route.test.ts`
  - Result: 12 focused account-profile route tests passed after the route switched to `{ error: "Invalid profile update" }` for schema rejection.
- REFACTOR evidence:
  - No broader refactor followed GREEN; the slice stayed inside the response contract.
- Verification evidence:
  - Tests: included in the final focused route suite (`bunx vitest run tests/unit/cron-auth.test.ts tests/unit/account-profile-route.test.ts tests/unit/cron-publish-scheduled-route.test.ts tests/unit/cron-keep-supabase-awake-route.test.ts tests/unit/posts-route.test.ts`) which passed with 34 tests across 5 files.
  - Typecheck: `bunx tsc --noEmit` passed.
  - Lint: touched-file eslint passed for the route and test.
  - Build: skipped because this was a focused route/test change with no routing or bundling change beyond typecheck.
  - Security review: reviewed after the change; no new issues were found in this route and the public error shape now leaks less detail.
- Status: complete

### Batch: public posts query error-shape hardening
- Goal: stop `GET /api/posts` from leaking raw query-validation details.
- User journey or failure being protected: malformed public listing requests should receive a generic invalid-query response instead of raw field maps.
- Scope: `TODO.md`, `web/src/app/api/posts/route.ts`, and a new focused unit test file.
- Files expected to change: `TODO.md`, `web/src/app/api/posts/route.ts`, `web/tests/unit/posts-route.test.ts`.
- Tests to add or update first: add direct route coverage for throttling, invalid query input, and a minimal happy path.
- RED command: `bunx vitest run tests/unit/posts-route.test.ts`
- Expected RED test(s): the invalid-query test fails because the route still returns `details: parse.error.flatten().fieldErrors`.
- Why this RED proves the right problem: it hits the public query trust boundary directly and shows validator internals are still returned.
- GREEN target: invalid public post-listing requests return only `{ error: "Invalid query parameters" }` while valid listing behavior stays intact.
- GREEN command: `bunx vitest run tests/unit/posts-route.test.ts`
- Refactor boundary: no query-layer or pagination redesign.
- Refactor proof command(s): `bunx vitest run tests/unit/posts-route.test.ts`
- Security impact: medium, because this is a public unauthenticated route.
- Required security assertions: invalid query input returns a generic `400`; rate limiting and happy-path query dispatch remain intact.
- E2E impact: none for this slice.
- Coverage impact: adds the first direct unit coverage for the public post-listing route.
- Verification commands: `bunx vitest run tests/unit/posts-route.test.ts`, `bunx tsc --noEmit`, `npx eslint "src/app/api/posts/route.ts" "tests/unit/posts-route.test.ts"`.
- RED evidence:
  - Command: `bunx vitest run tests/unit/posts-route.test.ts`
  - Result: the invalid-query test failed because the response still included `details.limit` with the raw Zod validation message.
  - Why this RED proved the right problem: it showed the route still leaked field-level validation details on a public endpoint.
- GREEN evidence:
  - Command: `bunx vitest run tests/unit/cron-auth.test.ts tests/unit/account-profile-route.test.ts tests/unit/cron-publish-scheduled-route.test.ts tests/unit/cron-keep-supabase-awake-route.test.ts tests/unit/posts-route.test.ts`
  - Result: the final focused suite passed with 34 tests across 5 files, including the new `GET /api/posts` invalid-query, rate-limit, and happy-path cases.
- REFACTOR evidence:
  - No broader refactor followed GREEN; only the response shape changed.
- Verification evidence:
  - Typecheck: `bunx tsc --noEmit` passed.
  - Lint: touched-file eslint passed for the route and new test file.
  - Build: skipped because this slice stayed inside one route and unit tests.
  - Security review: reviewed after the change; no new issues were found and the public route now leaks less detail.
- Status: complete

### Batch: cron auth parity helper extraction
- Goal: remove auth-policy drift between the publish and keepalive cron routes while keeping missing-secret failures generic and local-dev bypass loopback-only.
- User journey or failure being protected: both cron routes should enforce the same secret policy, fail closed safely when misconfigured, and still allow explicit local loopback development without a secret.
- Scope: `TODO.md`, `web/src/lib/cron-auth.ts`, both cron routes, and focused unit coverage for the helper and both routes.
- Files expected to change: `TODO.md`, `web/src/lib/cron-auth.ts`, `web/src/app/api/cron/publish-scheduled/route.ts`, `web/src/app/api/cron/keep-supabase-awake/route.ts`, `web/tests/unit/cron-auth.test.ts`, `web/tests/unit/cron-publish-scheduled-route.test.ts`, `web/tests/unit/cron-keep-supabase-awake-route.test.ts`.
- Tests to add or update first: lock missing-secret parity, keepalive test-loopback denial, development-only loopback allowance, and IPv6 loopback handling.
- RED command: `bunx vitest run tests/unit/cron-publish-scheduled-route.test.ts tests/unit/cron-keep-supabase-awake-route.test.ts`
- Expected RED test(s): keepalive still allows localhost test runs without a secret and returns a different missing-secret body than publish.
- Why this RED proves the right problem: it exposes real auth-policy drift across two operational endpoints that should share one contract.
- GREEN target: both routes share one auth helper, return generic `500` responses when misconfigured, and keep the unauthenticated bypass limited to loopback development, including IPv6.
- GREEN command: `bunx vitest run tests/unit/cron-auth.test.ts tests/unit/cron-publish-scheduled-route.test.ts tests/unit/cron-keep-supabase-awake-route.test.ts`
- Refactor boundary: no cron business-logic changes beyond auth-policy consolidation.
- Refactor proof command(s): `bunx vitest run tests/unit/cron-auth.test.ts tests/unit/cron-publish-scheduled-route.test.ts tests/unit/cron-keep-supabase-awake-route.test.ts`
- Security impact: medium, because this touches auth enforcement on state-changing operational routes.
- Required security assertions: invalid or missing bearer tokens still return `401`; missing secrets stay generic `500`; no non-loopback or non-development bypass exists; bracketed IPv6 loopback works the same as IPv4 localhost in development.
- E2E impact: none for this slice.
- Coverage impact: adds direct unit coverage for the shared auth helper and expands both route suites.
- Verification commands: `bunx vitest run tests/unit/cron-auth.test.ts tests/unit/cron-publish-scheduled-route.test.ts tests/unit/cron-keep-supabase-awake-route.test.ts`, `bunx tsc --noEmit`, `npx eslint "src/lib/cron-auth.ts" "src/app/api/cron/publish-scheduled/route.ts" "src/app/api/cron/keep-supabase-awake/route.ts" "tests/unit/cron-auth.test.ts" "tests/unit/cron-publish-scheduled-route.test.ts" "tests/unit/cron-keep-supabase-awake-route.test.ts"`.
- RED evidence:
  - Command: `bunx vitest run tests/unit/cron-publish-scheduled-route.test.ts tests/unit/cron-keep-supabase-awake-route.test.ts`
  - Result: keepalive tests failed because the route still returned a different missing-secret body and still allowed localhost test runs without a secret.
  - Why this RED proved the right problem: it showed the two cron routes still disagreed about the same auth boundary.
  - Additional RED command: `bunx vitest run tests/unit/cron-publish-scheduled-route.test.ts tests/unit/cron-keep-supabase-awake-route.test.ts`
  - Additional result: after the first parity extraction, the expanded review-driven cases failed because the helper still leaked `CRON_SECRET is not configured` and did not accept bracketed IPv6 loopback hosts.
- GREEN evidence:
  - Command: `bunx vitest run tests/unit/cron-auth.test.ts tests/unit/cron-publish-scheduled-route.test.ts tests/unit/cron-keep-supabase-awake-route.test.ts`
  - Result: all 19 focused helper and cron-route tests passed after the shared helper switched back to generic `500` misconfiguration responses and normalized IPv6 loopback hostnames.
- REFACTOR evidence:
  - Refactor stayed serialized and minimal: only auth logic moved into `web/src/lib/cron-auth.ts`; cron route business logic stayed unchanged.
  - Refactor proof command: `bunx vitest run tests/unit/cron-auth.test.ts tests/unit/cron-publish-scheduled-route.test.ts tests/unit/cron-keep-supabase-awake-route.test.ts`
- Verification evidence:
  - Tests: included in the final focused suite (`bunx vitest run tests/unit/cron-auth.test.ts tests/unit/account-profile-route.test.ts tests/unit/cron-publish-scheduled-route.test.ts tests/unit/cron-keep-supabase-awake-route.test.ts tests/unit/posts-route.test.ts`) which passed with 34 tests across 5 files.
  - Typecheck: `bunx tsc --noEmit` passed.
  - Lint: touched-file eslint passed for the helper, both routes, and the route/helper tests.
  - Build: skipped because this was a focused helper/route/test change.
  - Security review: reviewed after the final helper change; no remaining prod-scope findings were raised beyond the accepted dev-only loopback bypass.
- Status: complete

### Batch: upload validation hardening
- Goal: constrain upload and media routes with stronger server-side validation instead of trusting client-provided MIME and size metadata alone.
- Scope: avatar upload, admin image upload, shared Cloudinary upload helpers, and focused regression tests in `web/`.
- Files expected to change: `web/src/app/api/account/avatar/route.ts`, `web/src/app/api/admin/uploads/images/route.ts`, `web/src/lib/cloudinary/uploads.ts`, and targeted tests.
- RED target: prove server upload paths accept files that pass client metadata checks but fail stronger server-side validation requirements.
- GREEN target: server upload paths reject invalid content with focused regression coverage and safe error responses.
- Refactor boundary: no unrelated media UI or editor work.
- Security impact: medium-high, because uploads are a direct untrusted input surface.
- E2E impact: none for the initial slice; unit and route coverage first.
- Verification commands: targeted unit tests, touched-file lint, `bunx tsc --noEmit`.
- Status: complete

### Batch: admin identity mapping cleanup
- Goal: fix inconsistent admin identity mapping so authorization checks rely on one clear source of truth across admin flows.
- Scope: admin auth identity helpers and the main consumers called out by the backlog.
- Files expected to change: `web/src/server/auth/admin-users.ts`, `web/src/lib/auth/admin.ts`, and targeted tests.
- RED target: prove current admin identity mapping can disagree across helper boundaries or consumer flows.
- GREEN target: admin identity resolution is normalized behind one consistent contract with focused regression coverage.
- Refactor boundary: no broader auth redesign or public-user flow changes.
- Security impact: medium-high, because this affects admin authorization correctness.
- E2E impact: low for the initial slice; unit coverage first.
- Verification commands: targeted unit tests, touched-file lint, `bunx tsc --noEmit`.
- Status: complete

### Batch: public-user Playwright fixture and signed-in flow coverage
- Goal: establish a reusable authenticated public-user test fixture and cover the highest-value missing signed-in user journeys.
- Scope: Playwright auth fixture/state plus the first critical public signed-in flows from the backlog.
- Files expected to change: Playwright config/helpers/fixtures and targeted E2E specs under `web/tests/e2e/`.
- RED target: prove current E2E coverage lacks a reusable public-user auth path and misses one or more critical signed-in user journeys.
- GREEN target: reusable public-user auth setup exists and multiple critical signed-in public flows are covered with stable assertions, including bookmarks, account settings load, display-name persistence, account sign-out, successful top-level comment creation, nested reply creation, comment like toggling, owned comment deletion on the seeded fixture post, and seeded post author-profile navigation.
- Refactor boundary: no broad frontend refactors while establishing coverage.
- Security impact: low direct code risk, medium confidence impact because this protects authenticated user behavior.
- E2E impact: high; this is the purpose of the batch.
- Verification commands: targeted Playwright runs, touched-file lint if needed, `bunx tsc --noEmit` if TypeScript support files change.
- Status: in_progress

### Batch: newsletter public error-shape hardening
- Goal: stop the public newsletter endpoint from leaking validation structure or setup/env guidance.
- User journey or failure being protected: newsletter signup failures should stay generic for public callers while preserving safe skipped behavior when the integration is intentionally unset.
- Scope: `web/src/app/api/newsletter/route.ts` plus focused route tests.
- Files expected to change: `TODO.md`, `web/src/app/api/newsletter/route.ts`, `web/tests/unit/newsletter-route.test.ts`.
- Tests to add or update first: invalid payload should return a generic error string, and missing newsletter config should not include setup instructions.
- RED command: `bunx vitest run tests/unit/newsletter-route.test.ts`
- Expected RED test(s): invalid-body and missing-config route assertions fail because the route currently returns Zod field maps and newsletter setup instructions.
- Why this RED proves the right problem: both failures exercise the public trust boundary directly and show internal schema/config details are still exposed to callers.
- GREEN target: route keeps rate limiting and success behavior intact while returning only generic invalid-request and missing-config responses.
- GREEN command: `bunx vitest run tests/unit/newsletter-route.test.ts tests/unit/newsletter.test.ts`
- Refactor boundary: no newsletter provider changes or resend service redesign.
- Refactor proof command(s): `bunx vitest run tests/unit/newsletter-route.test.ts tests/unit/newsletter.test.ts`
- Security impact: medium, because this is a public unauthenticated endpoint.
- Required security assertions: invalid input returns a generic `400`; missing config returns a non-fatal skipped result without env/setup details.
- E2E impact: none.
- Coverage impact: closes a public error-shape gap at an existing trust boundary.
- Verification commands: `bunx vitest run tests/unit/newsletter-route.test.ts tests/unit/newsletter.test.ts`, touched-file lint, `bunx tsc --noEmit`.
- RED evidence:
  - Command: `bunx vitest run tests/unit/newsletter-route.test.ts`
  - Result: the invalid-body test still received raw `parse.error.flatten().fieldErrors`, and the missing-config test failed because the route still called `getNewsletterEnvSetupInstructions()` and returned `setup` details.
  - Why this RED proved the right problem: it showed the public route was still exposing schema details and operational setup guidance.
- GREEN evidence:
  - Command: `bunx vitest run tests/unit/newsletter-route.test.ts tests/unit/newsletter.test.ts`
  - Result: 8 targeted newsletter unit tests passed after the route switched to a generic invalid-request message and removed `setup` from the skipped response.
- REFACTOR evidence:
  - No broader refactor followed GREEN; the slice stayed inside the route contract.
- Verification evidence:
  - Typecheck: `bunx tsc --noEmit` passed.
  - Lint: `npx eslint "src/app/api/newsletter/route.ts" "tests/unit/newsletter-route.test.ts"` passed.
  - Build: skipped because this was a focused route/test change with no routing or bundling risk beyond typecheck and lint.
  - Security review: reviewed during the slice; no new issues were introduced and the public response now leaks less internal detail.
- Status: complete

### Batch: shared admin/public storage-state helper extraction
- Goal: remove the remaining safe duplication between the public and admin Playwright helper bootstrap paths without weakening their different safety rules.
- User journey or failure being protected: managed Playwright auth artifacts should keep resolving predictably for both public and admin suites while their different metadata and remote-run guards stay intact.
- Scope: `web/src/lib/e2e/storage-state-helper.ts`, `web/tests/e2e/helpers/admin.ts`, `web/tests/e2e/helpers/public.ts`, and focused unit tests.
- Files expected to change: `TODO.md`, `web/src/lib/e2e/storage-state-helper.ts`, `web/tests/e2e/helpers/admin.ts`, `web/tests/e2e/helpers/public.ts`, `web/tests/unit/admin-e2e-helper.test.ts`, `web/tests/unit/storage-state-helper.test.ts`.
- Tests to add or update first: lock admin explicit/default storage-state resolution and hint text, plus a tiny shared-helper contract test.
- RED command: `bunx vitest run tests/unit/admin-e2e-helper.test.ts tests/unit/storage-state-helper.test.ts`
- Expected RED test(s): the shared helper suite fails because `@/lib/e2e/storage-state-helper` does not exist yet.
- Why this RED proves the right problem: the remaining duplication cannot be reduced safely until a common primitive exists and both helper contracts are pinned.
- GREEN target: both helpers share the minimal path/hint logic while public fingerprint checks and admin remote-mutation gating remain separate.
- GREEN command: `bunx vitest run tests/unit/admin-e2e-helper.test.ts tests/unit/storage-state-helper.test.ts tests/unit/public-e2e-helper.test.ts`
- Refactor boundary: do not unify public metadata validation or admin remote-mutation policy in this slice.
- Refactor proof command(s): `bunx vitest run tests/unit/admin-e2e-helper.test.ts tests/unit/storage-state-helper.test.ts tests/unit/public-e2e-helper.test.ts`
- Security impact: low-medium, because this touches auth-artifact reuse paths.
- Required security assertions: public metadata/fingerprint binding remains enforced; admin remote mutation gating remains explicit.
- E2E impact: low direct UI risk, medium support-code confidence gain.
- Coverage impact: adds direct admin helper coverage and a shared helper contract.
- Verification commands: `bunx vitest run tests/unit/admin-e2e-helper.test.ts tests/unit/storage-state-helper.test.ts tests/unit/public-e2e-helper.test.ts`, touched-file lint, `bunx tsc --noEmit`.
- RED evidence:
  - Command: `bunx vitest run tests/unit/admin-e2e-helper.test.ts tests/unit/storage-state-helper.test.ts`
  - Result: `tests/unit/storage-state-helper.test.ts` failed because `@/lib/e2e/storage-state-helper` did not exist yet.
  - Why this RED proved the right problem: it showed the common primitive needed for the extraction was still missing.
- GREEN evidence:
  - Command: `bunx vitest run tests/unit/admin-e2e-helper.test.ts tests/unit/storage-state-helper.test.ts tests/unit/public-e2e-helper.test.ts`
  - Result: 17 focused helper tests passed after extracting the shared helper and wiring both E2E helpers through it.
- REFACTOR evidence:
  - Refactor stayed minimal: only path resolution and hint formatting were shared; public/admin policy differences stayed in their respective helpers.
  - Refactor proof command: `bunx vitest run tests/unit/admin-e2e-helper.test.ts tests/unit/storage-state-helper.test.ts tests/unit/public-e2e-helper.test.ts`
- Verification evidence:
  - Typecheck: `bunx tsc --noEmit` passed.
  - Lint: `npx eslint "src/lib/e2e/storage-state-helper.ts" "tests/e2e/helpers/admin.ts" "tests/e2e/helpers/public.ts" "tests/unit/admin-e2e-helper.test.ts" "tests/unit/storage-state-helper.test.ts"` passed.
  - Build: skipped because this slice only touched E2E support code.
  - Security review: reviewed during the slice; managed-path enforcement and public fingerprint checks remained intact.
- Status: complete

### Batch: smoke coverage expansion and admin tag editor remount fix
- Goal: extend smoke coverage over missing public/admin routes and fix the admin tag editor bug the broader smoke run exposed.
- User journey or failure being protected: core route shells should stay reachable for anonymous and authenticated users, and inline admin tag edits should replace the saved description instead of appending stale DOM state after refresh.
- Scope: `web/tests/e2e/smoke.spec.ts`, the exact UI components implicated by new axe failures, and the admin tags page remount behavior.
- Files expected to change: `TODO.md`, `web/tests/e2e/smoke.spec.ts`, `web/src/components/blog/home-post-card.tsx`, `web/src/app/(blog)/category/[category]/page.tsx`, `web/src/components/ui/feedback-panel.tsx`, `web/src/app/admin/tags/page.tsx`.
- Tests to add or update first: add smoke coverage for `/about`, `/map`, discovered public post detail, unauthenticated `/bookmarks`, unauthenticated `/admin/posts/new`, and authenticated `/admin/posts/new`.
- RED command: `bunx playwright test tests/e2e/smoke.spec.ts --project=chromium`
- Expected RED test(s): new smoke assertions fail until added, homepage/category axe checks expose contrast regressions, and the admin tag inline-edit smoke reveals the stale append behavior on save.
- Why this RED proves the right problem: it exercises real user-facing routes plus the live admin tag editing flow end-to-end, exposing both missing coverage and an actual regression in the UI refresh behavior.
- GREEN target: expanded smoke coverage passes, axe regressions are fixed, and saving a tag description preserves only the latest value.
- GREEN command: `bunx playwright test tests/e2e/smoke.spec.ts --project=chromium`
- Refactor boundary: no broader admin tags redesign or unrelated visual restyling.
- Refactor proof command(s): `bunx playwright test tests/e2e/smoke.spec.ts --project=chromium --grep "admin can edit a tag description inline|admin create-post page renders for authenticated admins|homepage has no critical axe-core violations|category page has no critical axe-core violations|map page loads its shell|published post detail page loads when a public story exists|bookmarks prompts unauthenticated users to sign in|admin new-post route redirects to sign-in when unauthenticated|about page loads"`
- Security impact: low direct code risk, medium confidence impact because this broadens regression coverage around auth boundaries.
- E2E impact: high; this is a smoke-coverage slice.
- Coverage impact: adds missing route smoke coverage and catches a real admin regression.
- Verification commands: targeted Playwright rerun above, touched-file lint, `bunx tsc --noEmit`.
- RED evidence:
  - Command: `bunx playwright test tests/e2e/smoke.spec.ts --project=chromium`
  - Result: the first run failed in the newly added public/admin smoke assertions, the homepage/category axe checks exposed low-contrast accent labels and badges, and `admin can edit a tag description inline` failed because the textarea value became the new description plus the stale previous value after save.
  - Why this RED proved the right problem: it demonstrated both missing route coverage and a real post-refresh DOM-state bug in the admin tag editor.
- GREEN evidence:
  - Command: `bunx playwright test tests/e2e/smoke.spec.ts --project=chromium`
  - Result: 28 smoke tests passed after tightening the assertions, fixing the contrast regressions, and remounting each admin tag form by `tag.id` plus current description.
  - Command: `bunx playwright test tests/e2e/smoke.spec.ts --project=chromium --grep "admin can edit a tag description inline|admin create-post page renders for authenticated admins|homepage has no critical axe-core violations|category page has no critical axe-core violations|map page loads its shell|published post detail page loads when a public story exists|bookmarks prompts unauthenticated users to sign in|admin new-post route redirects to sign-in when unauthenticated|about page loads"`
  - Result: the nine directly affected smoke tests reran green in isolation.
- REFACTOR evidence:
  - Refactor stayed minimal: the admin tags page only gained a stable remount key on each form, and the accessibility fixes touched only the exact low-contrast labels and badges the axe report flagged.
- Verification evidence:
  - Typecheck: `bunx tsc --noEmit` passed.
  - Lint: `npx eslint "src/app/admin/tags/page.tsx" "src/components/blog/home-post-card.tsx" "src/components/ui/feedback-panel.tsx" "tests/e2e/smoke.spec.ts"` passed.
  - E2E: `bunx playwright test tests/e2e/smoke.spec.ts --project=chromium` passed; targeted rerun artifacts remain under `web/test-results/` for the earlier RED runs.
  - Security review: reviewed during the slice; the added smoke tests strengthened unauthenticated `/bookmarks` and `/admin/posts/new` gate coverage without changing auth policy.
- Status: complete

Planner review note:

- The remaining bootstrap-persistence blocker is closed, but the live rerun is still gated on a clearly safe target. In this shell, `web/.env` resolves `SUPABASE_URL` to a remote hosted project origin, and `seed:e2e` correctly refused to run without `E2E_ALLOW_SUPABASE_SEED=1`; do not override that until a loopback or explicitly approved non-production target is confirmed.

### Batch: admin GitHub profile attribution contract
- Goal: remove ambiguity about whether multiple allowlisted GitHub admins should persist their own profile/avatar data or intentionally share the site-owner admin identity.
- User journey or failure being protected: admin authorization should stay keyed by GitHub provider user id while UI attribution stays intentional and testable instead of accidentally mixing live GitHub avatars with shared persisted branding.
- Scope: `web/src/server/auth/admin-users.ts`, `web/src/lib/auth/admin.ts`, targeted admin auth tests, and a brief project-level contract note.
- Files expected to change: `TODO.md`, `web/src/lib/auth/admin.ts`, `web/tests/unit/admin-auth.test.ts`, `web/tests/unit/admin-users.test.ts`, and `README.md`.
- Tests to add or update first: one auth-session test that locks `githubLogin` to the live GitHub profile while expecting the persisted shared avatar, plus one persistence test that proves the shared display/avatar values are what gets written for new allowlisted admins.
- RED command: `bunx vitest run tests/unit/admin-auth.test.ts tests/unit/admin-users.test.ts`
- Expected RED test(s): the JWT/session callback still prefers the live GitHub avatar instead of the persisted shared admin avatar.
- Why this RED proves the right problem: the storage layer already forces shared admin branding, so a failing auth-session test exposes the contract mismatch between persisted identity and the session payload surfaced to the admin UI.
- GREEN target: provider-user-id-based auth remains intact, `githubLogin` stays live for operator attribution, and the shared admin display/avatar identity is explicit in both code and docs.
- GREEN command: `bunx vitest run tests/unit/admin-auth.test.ts tests/unit/admin-users.test.ts`
- Refactor boundary: no broader admin auth redesign, allowlist parsing changes, or per-admin profile feature work.
- Refactor proof command(s): `bunx vitest run tests/unit/admin-auth.test.ts tests/unit/admin-users.test.ts`
- Security impact: medium, because this touches admin session presentation on an authenticated surface.
- Required security assertions: authorization still keys off allowlisted GitHub provider user id, avatar/display-name data stays display-only, and operator attribution retains the live `githubLogin`.
- E2E impact: low for this slice; unit coverage is sufficient for the contract change.
- E2E prerequisites (seed, auth state, env): none.
- Artifact paths (trace/video/screenshot), if E2E: none.
- Coverage impact: closes a correctness gap on admin identity/session behavior.
- Verification commands: `bunx vitest run tests/unit/admin-auth.test.ts tests/unit/admin-users.test.ts`, `bunx tsc --noEmit`, and touched-file lint.
- RED evidence:
  - Command: `bunx vitest run tests/unit/admin-auth.test.ts tests/unit/admin-users.test.ts`
  - Result: `tests/unit/admin-auth.test.ts` failed because the JWT callback still returned the live GitHub avatar URL instead of the persisted shared admin avatar.
  - Why this RED proved the right problem: it showed the persisted shared-profile policy and the signed-in admin session payload still disagreed about the same admin identity.
- GREEN evidence:
  - Command: `bunx vitest run tests/unit/admin-auth.test.ts tests/unit/admin-users.test.ts`
  - Result: 3 targeted tests passed after the JWT callback was changed to prefer the persisted admin avatar and the persistence contract was pinned with stronger assertions.
- REFACTOR evidence:
  - No broader refactor followed GREEN; the slice stayed within the planned auth-session/doc boundary.
- Verification evidence:
  - Typecheck: `bunx tsc --noEmit` passed.
  - Lint: `npx eslint "src/lib/auth/admin.ts" "tests/unit/admin-auth.test.ts" "tests/unit/admin-users.test.ts"` passed.
  - Build: `bun run build` passed; existing Next/Turbopack warnings remain about deprecated middleware naming and an `env-loader` trace warning from `next.config.ts`, but the build completed successfully.
  - Security review: reviewed after the change; no new security issues were found because auth/authz still key off GitHub provider user id and `avatarUrl` remains display-only, with residual risk limited to operator-attribution confusion that is mitigated by keeping `githubLogin` live in the session.
- Status: complete

### Batch: public E2E bootstrap hardening
- Goal: make authenticated public E2E setup safe, deterministic, and explicit about where reusable auth artifacts are written.
- User journey or failure being protected: a model or developer should only be able to seed/capture public auth against an approved local/test target, missing setup should fail fast, and shared-state smoke tests should not rely on built-in retries.
- Scope: `web/scripts/seed-e2e-fixtures.ts`, `web/scripts/capture-public-storage-state.ts`, `web/tests/e2e/helpers/public.ts`, `web/tests/e2e/public-authenticated.spec.ts`, and new focused tests around script/helper guard behavior.
- Files expected to change: the public E2E seed/capture scripts, public E2E helper/spec files, and targeted tests.
- Tests to add or update first: script/helper tests for unsafe-env refusal, approved local/test allow behavior, fixture-user lookup beyond the first Supabase auth page, public helper preflight behavior, and one-attempt delete-flow determinism.
- RED command: targeted script/helper tests plus the narrow authenticated public spec that currently relies on helper fallbacks and the delete-flow retry path.
- Expected RED test(s): seeding still runs without an explicit non-prod opt-in, fixture lookup only scans the first auth page, helper fallbacks keep skip guards truthy, or the delete-flow still requires a `Retry-After` sleep.
- Why this RED proves the right problem: it shows the current bootstrap can mutate the wrong auth project, hide missing setup until deep UI assertions, and treat rate-limit retries as acceptable smoke-test behavior.
- GREEN target: seeding fails closed for unsafe targets, fixture lookup is reliable, public helper preflight is explicit, and the signed-in delete flow passes or fails in one attempt without built-in retry logic.
- GREEN command: rerun the new targeted tests plus safe local/test dry runs of `bun run seed:e2e` and `bun run e2e:capture-public-state`.
- Refactor boundary: no app auth UI, public account route, or broader signed-in journey work beyond the minimum needed to harden the bootstrap contract.
- Refactor proof command(s): rerun the same targeted tests after any helper extraction.
- Security impact: high, because this workflow currently uses a Supabase service-role key to create or reset a real auth user.
- Required security assertions: unsafe shared/prod targets are refused; reusable credential/session artifacts are explicit and documented; failure messages stay safe.
- E2E impact: high, because all authenticated public smoke work depends on this lane.
- E2E prerequisites (seed, auth state, env): a known-safe local/test Supabase project, matching `E2E_BASE_URL` origin, and explicit storage-state path rules.
- Artifact paths (trace/video/screenshot), if E2E: record any auth-artifact output path and cleanup step.
- Coverage impact: add script/helper coverage for refusal, allow, pagination, and preflight paths.
- Verification commands: targeted script/helper tests, targeted Playwright reruns, and `bunx tsc --noEmit`.
- RED evidence:
  - Command: `bunx vitest run tests/unit/public-e2e-helper.test.ts`
  - Result: helper tests failed because `configuredPublicEmail` and `configuredPublicPostSlug` still defaulted to truthy fallback values, proving missing seed/preflight state was being hidden.
  - Command: `bunx vitest run tests/unit/public-auth-fixture.test.ts`
  - Result: the new pagination suite failed because no helper existed yet, proving `seed:e2e` still only trusted the first Supabase auth page.
  - Command: `bunx vitest run tests/unit/public-e2e-target-guard.test.ts`
  - Result: the new refusal-path suite failed because no seed-target guard existed yet, proving `seed:e2e` would still mutate whichever Supabase project the active service-role env pointed at.
  - Command: `bunx vitest run tests/unit/public-storage-state-config.test.ts`
  - Result: the new capture-path suite failed because no config helper existed yet, proving remote `E2E_BASE_URL` runs could still implicitly reuse the default repo-local public storage-state path.
  - Command: `bunx vitest run tests/unit/public-request-headers.test.ts`
  - Result: the new request-isolation suite failed because no helper existed yet, proving the deterministic one-attempt delete-flow work was still unimplemented.
- GREEN evidence:
  - Command: `bunx vitest run tests/unit/public-request-headers.test.ts tests/unit/public-storage-state-config.test.ts tests/unit/public-e2e-target-guard.test.ts tests/unit/public-authenticated-guard.test.ts tests/unit/public-auth-fixture.test.ts tests/unit/public-e2e-helper.test.ts`
  - Result: 22 tests passed across the six focused bootstrap-hardening suites.
  - Command: `bunx vitest run tests/unit/public-storage-state-config.test.ts tests/unit/public-e2e-helper.test.ts tests/unit/public-env-artifact.test.ts`
  - Result: 22 tests passed across the three focused persistence-policy suites after enforcing explicit public env/storage metadata, origin binding, managed-path reads, and remote-capture opt-in.
- REFACTOR evidence:
  - Refactor stayed within the planned boundary by extracting small E2E/bootstrap helpers only after the focused RED tests existed.
  - Refactor proof command: `bunx vitest run tests/unit/public-request-headers.test.ts tests/unit/public-storage-state-config.test.ts tests/unit/public-e2e-target-guard.test.ts tests/unit/public-authenticated-guard.test.ts tests/unit/public-auth-fixture.test.ts tests/unit/public-e2e-helper.test.ts`
- Verification evidence:
  - Typecheck: `bunx tsc --noEmit` passed after each completed slice, after the final public-authenticated spec change, and again after the persistence-policy hardening landed.
  - Lint: `npx eslint "src/lib/e2e/public-storage-state-config.ts" "src/lib/e2e/public-env-artifact.ts" "scripts/capture-public-storage-state.ts" "scripts/seed-e2e-fixtures.ts" "tests/e2e/helpers/public.ts" "tests/unit/public-storage-state-config.test.ts" "tests/unit/public-e2e-helper.test.ts" "tests/unit/public-env-artifact.test.ts"` passed.
  - Build: skipped for this batch because the work stayed in scripts, helpers, tests, and Playwright support code rather than app compilation/routing logic.
  - Security review: reviewed during the batch; key outcomes now enforced are explicit `E2E_ALLOW_SUPABASE_SEED=1`, approved-or-loopback Supabase origins only, HTTPS required for non-loopback approved targets, paginated exact-email fixture lookup, explicit fixture email requirement for authenticated public flows, explicit public env metadata in `.env.test.local`, explicit storage-state sidecar metadata, origin-bound storage-state reuse, fail-closed reuse when fixture metadata is incomplete, managed `playwright/.auth/public*.json` reads and writes only, explicit remote storage-state paths, explicit `E2E_ALLOW_REMOTE_PUBLIC_CAPTURE=1` for non-local capture, and deterministic loopback request-IP isolation for comment-mutation smoke tests.
  - E2E: targeted browser reruns are still pending; the batch now has helper/spec/script coverage, typecheck, and lint, but the next verification pass should rerun `public-authenticated.spec.ts` against a live safe local fixture environment using freshly generated managed artifacts.
- Status: complete

### Batch: account profile PATCH contract coverage
- Goal: close the missing `/api/account/profile` write-path coverage gap before any account/profile or theme-sync refactor.
- User journey or failure being protected: authenticated public users can update profile fields safely while unauthenticated, malformed, rate-limited, or invalid requests fail with the correct contract.
- Scope: `web/tests/unit/account-profile-route.test.ts` first, and `web/src/app/api/account/profile/route.ts` only if tests expose a real bug.
- Files expected to change: the route test file and the route only if RED exposes a contract bug.
- Tests to add or update first: unauthorized PATCH, throttled PATCH, invalid JSON, schema rejection, null-clearing fields, and successful update coverage.
- RED command: targeted Vitest run for `web/tests/unit/account-profile-route.test.ts` with the new PATCH cases.
- Expected RED test(s): one or more write-path branches are currently untested or fail once the new assertions exist.
- Why this RED proves the right problem: the current reviewed test file only locks the GET path, so the public profile write contract can regress silently.
- GREEN target: the route contract is pinned for both read and write paths, including safe error shapes and the field-update contract.
- GREEN command: rerun the targeted route test file.
- Refactor boundary: no account UI, theme provider, or profile-sync cleanup in the same pass.
- Refactor proof command(s): rerun the same route tests after any minimal route change.
- Security impact: medium, because this is an authenticated public write surface.
- Required security assertions: unauthenticated requests stay `401`, rate-limited requests stay `429`, invalid JSON stays `400`, invalid data stays rejected, and null-clearing behavior remains explicit.
- E2E impact: none for the initial slice.
- E2E prerequisites (seed, auth state, env): none.
- Artifact paths (trace/video/screenshot), if E2E: none.
- Coverage impact: adds missing write-path coverage on an existing trust boundary.
- Verification commands: targeted Vitest route tests and `bunx tsc --noEmit`.
- RED evidence:
  - Command: `bunx vitest run tests/unit/account-profile-route.test.ts`
  - Tests added first: unauthorized PATCH, throttled PATCH, invalid JSON, schema rejection, omitted optional fields, explicit null-clearing fields, and successful update payload forwarding.
  - Why this RED target proved the right problem: before these tests existed, the PATCH write path had no focused contract coverage and could regress silently even though GET coverage was present.
- GREEN evidence:
  - Command: `bunx vitest run tests/unit/account-profile-route.test.ts`
  - Result: 12 tests passed in `web/tests/unit/account-profile-route.test.ts`, including the new PATCH cases.
- REFACTOR evidence:
  - No refactor or production route change was needed after GREEN; the route already matched the intended PATCH contract.
- Verification evidence:
  - Typecheck: `bunx tsc --noEmit` passed.
  - Lint: skipped for this slice because the change was a focused test-only update in an already typechecked file.
  - Build: skipped because no production or routing code changed.
  - Security review: authenticated write-surface assertions are now covered in the route test file for `401`, `429`, invalid JSON, invalid data, omitted-field preservation, explicit null-clearing, and success payload forwarding.
- Status: complete

### Batch: build and deploy contract guardrails
- Goal: protect the new build wrapper and duplicated cron config from silent drift before cleanup work starts.
- User journey or failure being protected: builds should sanitize `NODE_OPTIONS` predictably and deployment cron schedules should stay aligned between the repo root and `web/` config.
- Scope: `web/scripts/build.ts`, targeted tests, `web/vercel.json`, `vercel.json`, and only minimal supporting utilities.
- Files expected to change: the build wrapper test surface, possibly a small parity check, and duplicated Vercel config only if the source-of-truth decision changes.
- Tests to add or update first: wrapper tests for sanitized env handoff, spawned cwd/env, child exit-code propagation, and a parity/drift guard for duplicated cron schedules.
- RED command: targeted tests for `web/scripts/build.ts` and any new config parity check.
- Expected RED test(s): the wrapper contract is not yet directly covered and duplicated cron config can diverge without detection.
- Why this RED proves the right problem: helper-only tests do not protect the real build entrypoint, and duplicated JSON config invites silent deploy drift.
- GREEN target: the wrapper contract is pinned by tests and cron config drift is blocked by a parity check or a declared single source of truth.
- GREEN command: rerun the new targeted tests.
- Refactor boundary: do not consolidate cron route auth helpers in the same pass unless parity tests already exist and the work stays serialized.
- Refactor proof command(s): rerun the wrapper and config tests after any cleanup extraction.
- Security impact: low-medium, because cron drift and build-env handling affect deploy correctness and operational trust.
- Required security assertions: sanitized build env still strips inspector flags and cron schedule parity does not weaken cron-secret expectations.
- E2E impact: none.
- E2E prerequisites (seed, auth state, env): none.
- Artifact paths (trace/video/screenshot), if E2E: none.
- Coverage impact: adds missing coverage around ops-critical entrypoints.
- Verification commands: targeted Vitest/script tests and `bunx tsc --noEmit`.
- RED evidence:
  - Command: `bunx vitest run tests/unit/build-script.test.ts tests/unit/vercel-config-parity.test.ts`
  - Result: the newly added direct guardrail tests passed on the first run, proving the currently shipped build wrapper and duplicated cron schedules already satisfy the intended contract.
  - Why this still closed the right problem: the gap was missing direct protection around the real build entrypoint and duplicated Vercel cron config, so adding the tests first eliminated that blind spot even though no production bug surfaced.
- GREEN evidence:
  - Command: `bunx vitest run tests/unit/build-script.test.ts tests/unit/vercel-config-parity.test.ts tests/unit/build-node-options.test.ts`
  - Result: 6 focused tests passed after adding the real-entry build wrapper suite, the root/web cron parity guard, and the extra `NODE_OPTIONS` sanitizer coverage for space-separated inspector flags.
- REFACTOR evidence:
  - Refactor stayed minimal: only the `NODE_OPTIONS` sanitizer changed after the new edge-case test exposed the missing `--inspect-port 0` handling.
  - Refactor proof command: `bunx vitest run tests/unit/build-script.test.ts tests/unit/vercel-config-parity.test.ts tests/unit/build-node-options.test.ts`
- Verification evidence:
  - Typecheck: `bunx tsc --noEmit` passed.
  - Lint: `npx eslint "src/lib/build/sanitize-node-options.ts" "tests/unit/build-node-options.test.ts" "tests/unit/build-script.test.ts" "tests/unit/vercel-config-parity.test.ts"` passed.
  - Build: `bun run build` passed; existing Next/Turbopack warnings remain about deprecated middleware naming and an `env-loader` trace warning from `next.config.ts`, but the build completed successfully.
  - Security review: reviewed after the batch; no new security issues were found in the build/parity guardrail work.
- Status: complete

### Batch: public comment write-boundary hardening
- Goal: stop the public comment-create route from leaking raw validation details and pin the remaining write-path contract before further comment work.
- User journey or failure being protected: authenticated public users can submit comments safely while invalid payloads fail with a stable generic `400` response instead of exposing field-level validator internals.
- Scope: `TODO.md`, `web/src/app/api/posts/[postId]/comments/route.ts`, and focused route tests in `web/tests/unit/post-comments-route.test.ts`.
- Files expected to change: `TODO.md`, `web/src/app/api/posts/[postId]/comments/route.ts`, `web/tests/unit/post-comments-route.test.ts`.
- Tests to add or update first: unauthorized POST, invalid JSON, generic invalid-payload rejection, missing-parent reply rejection, and the existing success paths.
- RED command: `bunx vitest run tests/unit/post-comments-route.test.ts`
- Expected RED test(s): the new invalid-payload assertion fails because the route still returns `parse.error.flatten().fieldErrors`.
- Why this RED proves the right problem: it exercises the public comment trust boundary directly and shows validator structure is still exposed to callers.
- GREEN target: invalid comment payloads return only `{ error: "Invalid comment payload" }` while the existing unauthorized, rate-limit, parent-validation, and success behavior stays intact.
- GREEN command: `bunx vitest run tests/unit/post-comments-route.test.ts`
- Refactor boundary: no comment UI, DAL, notification, or moderation changes.
- Refactor proof command(s): `bunx vitest run tests/unit/post-comments-route.test.ts`
- Security impact: medium, because this is a public authenticated write surface.
- Required security assertions: unauthenticated requests stay `401`; invalid JSON stays `400`; parent-comment validation stays `404`; no field-level Zod details are returned publicly.
- E2E impact: none for this slice.
- E2E prerequisites (seed, auth state, env): none.
- Artifact paths (trace/video/screenshot), if E2E: none.
- Coverage impact: closes a remaining public error-shape gap and expands write-path contract coverage for comments.
- Verification commands: `bunx vitest run tests/unit/post-comments-route.test.ts`, `npx eslint "src/app/api/posts/[postId]/comments/route.ts" "tests/unit/post-comments-route.test.ts"`, `bunx tsc --noEmit`.
- RED evidence:
  - Command: `bunx vitest run tests/unit/post-comments-route.test.ts`
  - Result: the new invalid-payload test failed because the route still returned `{ error: { content: ["Comment is required"] } }` from `parse.error.flatten().fieldErrors`.
  - Why this RED proved the right problem: it showed the public comment POST route still leaked field-level validation structure across the API boundary.
- GREEN evidence:
  - Command: `bunx vitest run tests/unit/post-comments-route.test.ts`
  - Result: all 6 focused comment-route tests passed after the route switched to a generic invalid-payload response.
- REFACTOR evidence:
  - No broader refactor followed GREEN; the slice stayed inside the route response contract and new tests.
- Verification evidence:
  - Tests: included in the final focused route batch (`bunx vitest run tests/unit/post-comments-route.test.ts tests/unit/comment-delete-route.test.ts tests/unit/comment-like-route.test.ts tests/unit/admin-post-clone-route.test.ts tests/unit/admin-post-bulk-status-route.test.ts`) which passed with 26 tests across 5 files.
  - Lint: `npx eslint "src/app/api/posts/[postId]/comments/route.ts" "tests/unit/post-comments-route.test.ts" "tests/unit/comment-delete-route.test.ts" "tests/unit/comment-like-route.test.ts" "tests/unit/admin-post-clone-route.test.ts" "tests/unit/admin-post-bulk-status-route.test.ts"` passed.
  - Typecheck: `bunx tsc --noEmit` passed.
  - Build: skipped because this was a focused route/test change with no broader compilation or routing risk beyond typecheck.
  - Security review: reviewed during the slice; no new issues were introduced and the public response now leaks less validation detail.
- Status: complete

### Batch: public comment and admin post route contract coverage
- Goal: add direct tests for public comment deletion/like mutations and untested admin clone/bulk-status routes so future cleanup work is protected by focused route coverage.
- User journey or failure being protected: signed-in users and admins should keep receiving the same auth, throttle, validation, not-found, and success behavior on these mutation endpoints.
- Scope: `TODO.md` plus new focused route test files only unless they expose a real route bug.
- Files expected to change: `TODO.md`, `web/tests/unit/comment-delete-route.test.ts`, `web/tests/unit/comment-like-route.test.ts`, `web/tests/unit/admin-post-clone-route.test.ts`, `web/tests/unit/admin-post-bulk-status-route.test.ts`.
- Tests to add or update first: invalid-id, unauthorized, rate-limited, not-found, and success cases for the public comment endpoints; unauthorized, throttled, validation, not-found, and happy-path cases for the admin clone/bulk-status endpoints.
- RED command: `bunx vitest run tests/unit/comment-delete-route.test.ts tests/unit/comment-like-route.test.ts tests/unit/admin-post-clone-route.test.ts tests/unit/admin-post-bulk-status-route.test.ts`
- Expected RED test(s): the new suites fail if any route disagrees with the intended auth/validation contract, or the run passes immediately and closes the current direct-coverage gap.
- Why this RED proves the right problem: these routes had little or no direct contract coverage, so behavior-adjacent changes could regress silently.
- GREEN target: the new focused suites pin the current public/admin mutation route contracts without requiring unrelated production changes.
- GREEN command: `bunx vitest run tests/unit/comment-delete-route.test.ts tests/unit/comment-like-route.test.ts tests/unit/admin-post-clone-route.test.ts tests/unit/admin-post-bulk-status-route.test.ts`
- Refactor boundary: no production refactor unless one of the new tests surfaces a real route bug.
- Refactor proof command(s): rerun the same focused suites after any required route fix.
- Security impact: medium confidence gain, because these tests cover authenticated public and admin mutation surfaces.
- Required security assertions: invalid ids stay `400`; unauthenticated public/admin callers stay `401`; throttled requests return `429`; not-found and success contracts stay stable.
- E2E impact: none.
- E2E prerequisites (seed, auth state, env): none.
- Artifact paths (trace/video/screenshot), if E2E: none.
- Coverage impact: removes four direct route-coverage blind spots ahead of later refactor work.
- Verification commands: `bunx vitest run tests/unit/comment-delete-route.test.ts tests/unit/comment-like-route.test.ts tests/unit/admin-post-clone-route.test.ts tests/unit/admin-post-bulk-status-route.test.ts`, touched-file lint, `bunx tsc --noEmit`.
- RED evidence:
  - Command: `bunx vitest run tests/unit/comment-delete-route.test.ts tests/unit/comment-like-route.test.ts tests/unit/admin-post-clone-route.test.ts tests/unit/admin-post-bulk-status-route.test.ts`
  - Result: the newly added suites passed on the first run, proving the currently shipped route contracts already satisfy the intended auth/validation behavior.
  - Why this still closed the right problem: the gap was missing direct protection on these mutation endpoints, so adding focused route tests first eliminated that blind spot even without a production bug.
- GREEN evidence:
  - Command: `bunx vitest run tests/unit/comment-delete-route.test.ts tests/unit/comment-like-route.test.ts tests/unit/admin-post-clone-route.test.ts tests/unit/admin-post-bulk-status-route.test.ts`
  - Result: 20 focused route tests passed across the four new/expanded suites.
- REFACTOR evidence:
  - No refactor or production change followed GREEN; this slice stayed test-only by design.
- Verification evidence:
  - Tests: included in the final focused route batch (`bunx vitest run tests/unit/post-comments-route.test.ts tests/unit/comment-delete-route.test.ts tests/unit/comment-like-route.test.ts tests/unit/admin-post-clone-route.test.ts tests/unit/admin-post-bulk-status-route.test.ts`) which passed with 26 tests across 5 files.
  - Lint: `npx eslint "src/app/api/posts/[postId]/comments/route.ts" "tests/unit/post-comments-route.test.ts" "tests/unit/comment-delete-route.test.ts" "tests/unit/comment-like-route.test.ts" "tests/unit/admin-post-clone-route.test.ts" "tests/unit/admin-post-bulk-status-route.test.ts"` passed.
  - Typecheck: `bunx tsc --noEmit` passed.
  - Build: skipped because this slice only added focused route tests.
  - Security review: reviewed during the slice; no new issues were introduced and the new tests now pin the expected auth and validation behavior on these endpoints.
- Status: complete

## Ranked Remediation Backlog

1. Rerun the hardened public auth bootstrap live (`bun run seed:e2e`, `bun run e2e:capture-public-state`, targeted `public-authenticated.spec.ts`) once a loopback or explicitly approved non-production Supabase target is available in the shell.
2. Run the targeted bookmark save/remove Playwright slice against that safe fixture environment, then continue broader authenticated public smoke coverage.
3. Continue hardening remaining trust boundaries so they return safe failures instead of leaking uncaught validation errors; next candidates are selected admin server actions and any remaining public write routes not yet covered directly.
4. Confirm no remaining sensitive error leakage across public/admin write surfaces and operational endpoints.
5. Add consumer-level coverage where needed if any UI or client helper still depends on removed field-level validation payloads from the newly hardened public routes.

## Baseline Findings Snapshot

- Security: the highest remaining bootstrap risk is no longer unsafe seed targeting or implicit auth-artifact reuse; that lane now fails closed with managed-path, metadata-bound, origin-bound public auth artifacts plus explicit remote-capture opt-in.
- Correctness: public E2E helper preflight is now explicit, fixture-user lookup now paginates across Supabase auth pages, persisted public auth reuse now requires matching env/storage metadata, and authenticated public mutation flows now require the configured fixture email plus deterministic request-IP isolation instead of a built-in `429` retry.
- Cleanup: the duplicate public E2E env writes, duplicated capture env-loading loop, repeated public/admin storage-state path-hint logic, and cron-auth helper drift are now removed or shared behind focused tests.
- Security: the public newsletter signup route now returns generic validation and missing-config responses instead of exposing schema field maps or setup/env guidance.
- Security: the public comment-create route now returns a generic invalid-payload response instead of exposing raw field-level validation details.
- Correctness: direct route coverage now protects public comment deletion/like mutations plus admin post clone/bulk-status behavior, reducing mutation-surface blind spots before later refactors.
- E2E: admin shell coverage exists, public route smoke now includes `/about`, `/map`, discovered post detail, and unauthenticated `/bookmarks`, and admin route smoke now covers unauthenticated and authenticated `/admin/posts/new`; the next gating step before broader signed-in public expansion is still a live rerun of the hardened public bootstrap lane against a clearly safe target.

## Known Likely Blockers

- [ ] Local env variables may be required for deep auth, upload, and E2E validation.
- [ ] Admin Playwright state may need regeneration for authenticated smoke coverage.
- [ ] Some high-value flows may depend on local seed data or specific DB contents.
- [ ] Supabase project auto-pause behavior may still depend on plan limits, so cron traffic may reduce cold starts without fully eliminating pauses.
- [ ] The live public-auth bootstrap rerun is still blocked on environment safety: the current `web/.env` resolves `SUPABASE_URL` to `https://dklwwdsndzewxdpkkwif.supabase.co`, so `seed:e2e` should remain fail-closed until a loopback or explicitly approved non-production target is intentionally provided alongside `E2E_ALLOW_SUPABASE_SEED=1`.
- [x] `bun run seed:e2e` no longer trusts whichever Supabase project the active service-role env points at; it now requires `E2E_ALLOW_SUPABASE_SEED=1` plus a loopback or explicitly approved `SUPABASE_URL`, and non-loopback HTTP targets are refused.
- [x] Public E2E credential/session artifacts now persist only through an explicit managed policy: `seed:e2e` records public env metadata in `web/.env.test.local`, capture writes `playwright/.auth/public*.meta.json`, helper reuse is origin/fingerprint bound, implicit default overwrite is refused, unmanaged paths are ignored, and non-local capture requires `E2E_ALLOW_REMOTE_PUBLIC_CAPTURE=1`.
- [x] Public Playwright fixture support now exists, and `bun run e2e:capture-public-state` now runs with a clear precondition failure if no app server is reachable at `E2E_BASE_URL`.
- [x] `bun run seed:e2e` now provisions a real Supabase-backed public E2E user and persists `E2E_PUBLIC_EMAIL` / `E2E_PUBLIC_PASSWORD` / `E2E_PUBLIC_POST_SLUG` into `web/.env.test.local`.
- [x] With the local app server running, `bun run e2e:capture-public-state` now creates `web/playwright/.auth/public.json` successfully.
- [x] The first signed-in public flow now passes: authenticated bookmark save on the seeded fixture post and verification on `/bookmarks`.
- [x] A second signed-in public flow now passes: authenticated `/account` smoke coverage verifies the core account settings UI loads for the seeded public user.
- [x] A third signed-in public flow now passes: authenticated top-level comment creation on the seeded fixture post.
- [x] A fourth signed-in public flow now passes: authenticated nested reply creation on the seeded fixture post.
- [x] A fifth signed-in public flow now passes: authenticated comment like toggling on a freshly created comment on the seeded fixture post.
- [x] A sixth signed-in public flow now passes: authenticated deletion of the public user's own comment on the seeded fixture post.
- [x] A seventh signed-in public flow now passes: authenticated sign-out from `/account` returns the browser to `/` and restores logged-out header navigation.
- [x] An eighth signed-in public flow now passes: authenticated display-name updates on `/account` persist after reload and the test restores the original fixture value so the shared seeded user remains reusable.
- [x] A ninth signed-in public flow now passes: authenticated navigation from the seeded post detail page into the author's public profile verifies the public profile shell and recent-comments view load successfully.
- [x] Authenticated `/account` profile loading now repairs partial public-user records before failing, which removed the flaky `Failed to load profile` state exposed while verifying the new author-profile slice.
- [ ] The staged signed-in bookmark-removal Playwright flow is now isolated in serial mode to avoid shared bookmark-state races, but the live run is still pending the same safe local public-auth bootstrap environment.
- [ ] Remaining public signed-in flows still need coverage, with broader authenticated smoke coverage now the next likely slice.
- [x] Public Playwright storage state is origin-bound, and `bun run e2e:capture-public-state` now requires an explicit `E2E_PUBLIC_STORAGE_STATE` path for non-local `E2E_BASE_URL` values instead of implicitly reusing the default local artifact path.
- [x] The public helper no longer falls back to hardcoded email/post-slug values, so missing seed state now skips or fails fast during setup.
- [x] The authenticated public owned-comment deletion smoke test no longer tolerates a built-in `429` retry path; the mutating comment flows now isolate request IP state so the flow passes or fails in one attempt.
- [ ] Security and refactor work may intersect in the same files and require serialization.

## Update Protocol

After every meaningful batch, update:

1. `Master Backlog`
2. `Active Batch`
3. `Known Likely Blockers`
4. `Decision Log`

Do not create a second planning doc unless one of these is true:

1. The batch needs a durable artifact with unique technical content.
2. The content is too large for this file and would make this tracker unreadable.
3. The user explicitly asks for a deeper design or handoff document.

## Decision Log

- 2026-04-06: Created root `TODO.md` as the canonical model-facing tracker because `README.md` already references it and no equivalent file existed.
- 2026-04-06: Chose skills and direct agents as the primary workflow source; treat most `commands/` docs as legacy shims unless they contain unique maintained logic.
- 2026-04-06: Set the initial active batch to whole-project baseline assessment before remediation, with `tdd-guide` acting as the control layer for later implementation slices.
- 2026-04-06: Completed the whole-project baseline across security, code review, cleanup discovery, and E2E coverage; consolidated the first ranked remediation backlog in this tracker.
- 2026-04-06: Fixed a high-severity admin save-path bug by making `createAdminPostAction` and `updateAdminPostAction` fail fast on invalid `galleryEntries` payloads before any media-replacement transaction side effects run.
- 2026-04-06: Replaced regex-based rich-text sanitization in `web/src/lib/content.ts` with a `sanitize-html` allowlist policy so legacy HTML and other raw render paths normalize links, strip unsupported attributes, and discard disallowed elements before `dangerouslySetInnerHTML` sinks.
- 2026-04-06: Changed rate limiting to fail closed in deployed environments unless `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set, while preserving the in-memory fallback only for local development and test.
- 2026-04-07: Hardened `GET /api/admin/posts` so malformed query parameters now return a generic `400` instead of leaking uncaught Zod validation failures across the admin API boundary; kept unexpected non-validation failures unhandled so they still surface during debugging and test runs.
- 2026-04-07: Extracted shared public E2E env-file helpers and shared env-path resolution, then removed duplicate public fixture credential writes in `seed-e2e-fixtures.ts` and the duplicated dotenv path loop in `capture-public-storage-state.ts` without changing the script's current `.dev.vars` exclusion or managed-artifact behavior.
- 2026-04-07: Hardened the public newsletter route so invalid input and missing Resend config now return generic responses without exposing Zod field maps or setup/env guidance.
- 2026-04-07: Extracted a minimal shared Playwright storage-state helper for existing-path resolution and hint formatting, while intentionally keeping public metadata/fingerprint checks and admin remote-mutation policy separate.
- 2026-04-07: Expanded smoke coverage across `/about`, `/map`, discovered post detail, unauthenticated `/bookmarks`, and `/admin/posts/new`, and fixed the admin tag editor refresh bug by remounting each tag form when the persisted description changes so saved values do not append stale textarea state.
- 2026-04-06: Added shared server-side upload validation in `web/src/lib/cloudinary/uploads.ts` that checks allowed MIME type, byte size, and basic file signatures for JPEG, PNG, WebP, and GIF before avatar or editorial uploads are sent to Cloudinary.
- 2026-04-06: Normalized admin account identity helpers around the persisted GitHub `provider_user_id`; `githubLogin` now stays sourced from the live GitHub profile instead of incorrectly falling back to the numeric provider id.
- 2026-04-06: Added a reusable public Playwright auth helper plus `bun run e2e:capture-public-state`, and targeted the first signed-in public flow at bookmarking the seeded fixture post and verifying it appears on `/bookmarks`; the batch remains blocked pending real public E2E credentials and captured storage state.
- 2026-04-06: Fixed the public capture command so it now runs via `bunx tsx` and surfaces the real missing-credentials requirement; also extended `seed:e2e` to provision a Supabase public E2E user and persist public auth vars, but current progress is blocked by Supabase admin endpoint connectivity from this environment.
- 2026-04-06: Fixed public E2E fixture seeding to generate a Supabase-compliant password and confirmed `seed:e2e` now writes the public auth vars locally; the remaining step is to run the app server and capture `playwright/.auth/public.json` before rerunning the new authenticated bookmark flow.
- 2026-04-06: Hardened public storage-state capture against login form hydration/timing by waiting for the actual email/password input values and enabled submit state before clicking Sign in.
- 2026-04-06: Refined public storage-state capture again so post-login success no longer depends only on the `Account Settings` heading; it now accepts other signed-in account UI markers and throws a targeted error if the account page loads but `/api/account/profile` fails.
- 2026-04-06: Fixed `GET /api/account/profile` to provision the public app user on first authenticated fetch instead of returning `404 User not found`, which unblocked public storage-state capture and made the first signed-in bookmark E2E flow pass.
- 2026-04-06: Added an authenticated `/api/cron/keep-supabase-awake` route plus a lightweight Supabase auth health ping, covered it with focused route tests, and scheduled it in both `web/vercel.json` and the root `vercel.json` to reduce manual Supabase wake-ups while keeping duplicated Vercel config aligned.
- 2026-04-06: Added authenticated `/account` smoke coverage to the public Playwright spec and made the bookmark assertion idempotent so the shared seeded public user can be reused across reruns even when the fixture post is already bookmarked.
- 2026-04-06: Added authenticated top-level comment creation coverage to the public Playwright spec for the seeded fixture post, waiting on the comment POST response and scoping the success assertion to the comments section to keep the shared seeded-user flow stable.
- 2026-04-06: Added authenticated nested reply coverage to the public Playwright spec by creating a fresh parent comment, opening the inline reply composer for that exact comment, and asserting the reply renders inside the same parent thread so the test proves reply-specific behavior instead of generic comment creation.
- 2026-04-06: Added authenticated comment-like toggle coverage to the public Playwright spec by creating a fresh comment inside the test, anchoring the exact comment card by unique text, and asserting the same card transitions from `Like 0` to `Liked 1` and back to `Like 0` so the shared seeded user does not depend on mutable existing like state.
- 2026-04-06: Added authenticated owned-comment deletion coverage to the public Playwright spec by creating a unique comment, retrying once on route-level `429` using `Retry-After`, confirming deletion through the inline destructive confirmation UI, and asserting that exact comment text disappears after the matching delete request succeeds.
- 2026-04-06: Added authenticated account sign-out coverage to the public Playwright spec by signing out from `/account`, asserting the browser returns to `/`, and checking that logged-out header navigation is restored while signed-in account links disappear.
- 2026-04-06: Added authenticated display-name persistence coverage to the public Playwright spec by updating the seeded public user's display name on `/account`, verifying it survives a page reload, and restoring the original value in-test; also confirmed the public storage state must be captured against the same `E2E_BASE_URL` origin used for the Playwright run.
- 2026-04-06: Added authenticated author-profile navigation coverage to the public Playwright spec by following the seeded post's author card link into `/author/[id]` and asserting the public profile shell renders with the member metadata and recent-comments activity feed, keeping the slice read-only and stable for the shared seeded fixture.
- 2026-04-06: While verifying the author-profile slice, found that `/api/account/profile` could still fail for Supabase-linked users missing a `profiles` row; updated `ensurePublicAppUser()` and the GET route to repair that partial-record state on read, and added focused unit coverage for both the route-level repair path and the helper branch.
- 2026-04-06: Ran a planner/TDD review of the recent security, E2E, build, and auth batches; the targeted reviewed unit suite stayed green (`bun run test tests/unit/account-profile-route.test.ts tests/unit/cron-keep-supabase-awake-route.test.ts tests/unit/supabase-keepalive.test.ts tests/unit/admin-auth.test.ts tests/unit/admin-users.test.ts tests/unit/build-node-options.test.ts tests/unit/env.test.ts` => 20 tests across 7 files), and this tracker now carries follow-up batches for public E2E bootstrap safety/determinism, missing `/api/account/profile` PATCH coverage, build-wrapper/config guardrails, and admin-profile policy clarification.
- 2026-04-06: Added focused PATCH-route coverage for `/api/account/profile` in `web/tests/unit/account-profile-route.test.ts`, covering unauthorized, rate-limited, invalid JSON, schema rejection, omitted-field preservation, explicit null-clearing, and successful updates; the route already satisfied the contract so no production change was needed, and `bunx vitest run tests/unit/account-profile-route.test.ts` plus `bunx tsc --noEmit` both passed.
- 2026-04-06: Hardened the public E2E bootstrap lane in several small TDD slices: removed fallback `configuredPublicEmail` / `configuredPublicPostSlug` values, required the configured public fixture email before running authenticated public flows, added paginated exact-email Supabase fixture lookup, made `seed:e2e` fail closed unless `E2E_ALLOW_SUPABASE_SEED=1` and the `SUPABASE_URL` is loopback or explicitly approved over HTTPS, required explicit remote storage-state paths during `e2e:capture-public-state`, and removed the owned-comment delete smoke test's built-in `429` retry by isolating mutating comment flows behind deterministic loopback `x-forwarded-for` headers.
- 2026-04-07: Closed the remaining public E2E auth-artifact persistence-policy gap with focused TDD coverage: `seed:e2e` now writes hashed public env metadata and a fixture generation timestamp into `web/.env.test.local`, `e2e:capture-public-state` now writes managed `playwright/.auth/public*.meta.json` sidecars, implicit default overwrite is refused, persisted storage state is only reused when the managed path, captured origin, and public fixture fingerprint all match, unmanaged explicit paths are ignored by the Playwright helper, and non-local capture now requires `E2E_ALLOW_REMOTE_PUBLIC_CAPTURE=1` in addition to an explicit managed storage-state path.
- 2026-04-07: Added direct build/deploy guardrail coverage for `web/scripts/build.ts` and duplicated root/web Vercel cron config, then tightened `sanitizeNodeOptionsForBuild()` so space-separated inspector flags like `--inspect-port 0` are stripped safely before `next build` inherits `NODE_OPTIONS`.
- 2026-04-07: Clarified the admin GitHub profile attribution contract by making the signed-in admin session prefer the persisted shared avatar, preserving live `githubLogin` for operator attribution, strengthening unit coverage around the shared admin profile write, and documenting the intentional shared-branding policy in `README.md`.
- 2026-04-07: Hardened `PATCH /api/account/profile` and `GET /api/posts` so invalid public input now returns generic `400` responses instead of leaking raw Zod field maps, and added direct unit coverage for the public posts listing route.
- 2026-04-07: Unified cron auth enforcement in `web/src/lib/cron-auth.ts`, kept missing-secret failures generic, limited the unauthenticated bypass to loopback development, normalized bracketed IPv6 loopback hostnames, and added direct helper coverage plus expanded parity tests for both cron routes.
- 2026-04-07: Added the next authenticated public Playwright slice for bookmark removal and serialized the signed-in public flow block to avoid shared bookmark-state races; the live browser rerun is still blocked on a clearly safe local public-auth fixture environment.
- 2026-04-07: Hardened `POST /api/posts/[postId]/comments` so invalid public comment payloads now return a generic `400` response, and added focused route coverage for unauthorized, invalid JSON, parent-comment validation, and success paths.
- 2026-04-07: Added direct unit coverage for `DELETE /api/comments/[commentId]`, `POST /api/comments/[commentId]/like`, `POST /api/admin/posts/clone`, and `POST /api/admin/posts/bulk-status` so those public/admin mutation contracts are pinned before future cleanup work.

## Planned Feature Expansion

These are approved-for-planning, not yet approved-for-implementation, feature batches to append after the current remediation lanes. Do not start production code for these until the current session explicitly selects a batch and records RED evidence.

### Feature Program Summary

1. Make the homepage subscribe flow behave correctly for success, already-subscribed, rate-limited, invalid, and config-missing states.
2. Add a collapsible Tiptap "thoughts" block for side notes in posts, collapsed by default on the public site.
3. Add a travel wishlist domain with admin CRUD, a public wishlist map, and a public wishlist list view.
4. Add a route planner that suggests wishlist stops between a start and end location, with an include-visited toggle.
5. Add structured song metadata to posts and render that song association on the public post page.

### Feature Program Dependencies

1. Route planning requires an explicit geocoding and routing provider decision before implementation starts.
2. The collapsible thoughts block requires coordinated editor, sanitizer, and renderer changes; do not split that contract across unreviewed parallel edits.
3. Wishlist places and post-song support both require schema work; serialize migrations unless the contracts are fully separated.
4. Public map work should reuse existing map primitives where practical instead of forking another map stack.

### Feature Program Parallelism Plan

Parallel discovery lanes allowed once a specific feature batch is selected:

1. `architect` + `database-reviewer` on wishlist and route-planner contracts.
2. `tdd-guide` on RED target definition for the chosen feature slice.
3. `security-reviewer` on admin forms, public APIs, and renderer changes.
4. `code-reviewer` after any generated implementation diff.
5. `e2e-runner` only after the unit/integration path is GREEN for the selected user-facing flow.

Do not run in parallel:

1. Editor-extension work and sanitizer/renderer work before the HTML contract is fixed.
2. Multiple schema-changing edits touching `web/src/drizzle/schema.ts` or the same migration lane.
3. Route-planner API work and provider-abstraction refactors before the provider contract is written down.

### Phase 7: Planned Feature Intake

- [ ] Decide the routing/geocoding provider contract for the travel planner and record env/runtime constraints.
- [ ] Confirm whether wishlist links are a structured array field, a simple optional URL list, or a richer relation.
- [ ] Confirm the post-song metadata contract stays structured (`title`, `artist`, `url`, optional provider) and does not allow arbitrary embed HTML.
- [ ] Confirm the collapsible thoughts block uses a safe `details` / `summary`-style render contract or another allowlisted equivalent.

### Phase 8: Planned Feature Batches

- [ ] Plan and execute a newsletter subscribe correctness batch after the active remediation work is clear.
- [ ] Plan and execute a collapsible thoughts editor/rendering batch after the content HTML contract is rechecked.
- [ ] Plan and execute a wishlist-place schema and admin CRUD batch before any public wishlist map UI work.
- [ ] Plan and execute a public wishlist map batch after wishlist data contracts are stable.
- [ ] Plan and execute a route planner batch after provider selection and wishlist query contracts are stable.
- [ ] Plan and execute a post-song metadata batch after the post schema touch is scoped.

### Batch: homepage newsletter subscribe correctness
- Goal: make the homepage subscribe flow reflect the real API outcome instead of treating any non-error response as success.
- User journey or failure being protected: a visitor should see the correct state when subscribe succeeds, is skipped as already subscribed or unconfigured, is rate limited, or submits invalid input.
- Scope: homepage subscribe UI, newsletter API contract handling, and focused route/service tests.
- Files expected to change: `TODO.md`, `web/src/components/blog/newsletter-signup-form.tsx`, `web/src/app/api/newsletter/route.ts`, `web/src/server/services/newsletter.ts`, and targeted tests.
- Tests to add or update first: route/service coverage for success, skipped, invalid, rate-limited, and config-missing states plus a client-facing form-state test.
- RED command: targeted newsletter route/component tests.
- Expected RED test(s): the form treats `202` skipped responses as success or fails to distinguish non-success API statuses.
- Why this RED proves the right problem: it locks the current mismatch between the API contract and the homepage feedback state.
- GREEN target: the homepage subscribe UI matches the real backend status contract for all supported outcomes.
- GREEN command: rerun the targeted newsletter tests.
- Refactor boundary: no newsletter provider swap or unrelated homepage redesign.
- Refactor proof command(s): rerun the same targeted newsletter tests after any cleanup extraction.
- Security impact: medium, because this is a public write surface that needs safe validation, error shapes, and rate-limit behavior.
- Required security assertions: email input stays validated server-side, rate limiting remains enforced, and config-missing behavior does not leak secrets.
- E2E impact: medium; add a homepage subscribe journey after unit and route coverage is GREEN.
- E2E prerequisites (seed, auth state, env): test-safe newsletter env or provider mocking strategy.
- Artifact paths (trace/video/screenshot), if E2E: Playwright artifacts under `web/test-results/` or the configured report path.
- Coverage impact: adds coverage to an existing public conversion path.
- Verification commands: targeted newsletter tests, `bunx tsc --noEmit`, relevant lint, and focused Playwright if enabled.
- Status: pending

### Batch: collapsible post thoughts block
- Goal: add a toggleable side-thought block to the Tiptap post editor that renders collapsed by default on public posts.
- User journey or failure being protected: an admin can add optional side thoughts to a post without exposing unsafe or broken markup in the public renderer.
- Scope: editor extension, admin editor controls, content sanitization, public rendering, and focused accessibility/regression tests.
- Files expected to change: `TODO.md`, `web/src/components/admin/post-rich-text-editor.tsx`, new Tiptap extension files as needed, `web/src/lib/content.ts`, `web/src/components/blog/prose-content.tsx`, and targeted tests.
- Tests to add or update first: parser/renderer sanitizer tests for the new block, editor command tests if present, and public render assertions that default state is collapsed.
- RED command: targeted editor/content rendering tests.
- Expected RED test(s): the editor cannot create the block, the sanitizer strips it, or the public renderer fails to preserve the collapsed contract.
- Why this RED proves the right problem: the feature depends on one end-to-end content contract across authoring, storage, sanitization, and rendering.
- GREEN target: admins can author the block and public posts render it safely in the collapsed default state.
- GREEN command: rerun the targeted content/editor tests.
- Refactor boundary: no broader editor toolbar cleanup or raw HTML rendering overhaul.
- Refactor proof command(s): rerun the same targeted tests after any extension extraction.
- Security impact: high, because this touches rich-text HTML sanitization and public rendering.
- Required security assertions: only allowlisted tags/attributes survive, unsafe nested HTML is stripped, and keyboard interaction stays accessible.
- E2E impact: medium; add one admin authoring smoke test and one public post rendering smoke test after GREEN.
- E2E prerequisites (seed, auth state, env): admin auth fixture and a safe draft/publish path.
- Artifact paths (trace/video/screenshot), if E2E: Playwright artifacts under `web/test-results/` or the configured report path.
- Coverage impact: adds regression coverage to the editor-renderer pipeline.
- Verification commands: targeted editor/content tests, `bunx tsc --noEmit`, relevant lint, and focused Playwright if enabled.
- Status: pending

### Batch: wishlist places schema and admin CRUD
- Goal: establish the travel wishlist data model and admin management flow before building public travel experiences.
- User journey or failure being protected: an admin can create, edit, order, mark visited, and optionally link wishlist places with validated location data.
- Scope: schema, migration, server validation, data access, admin actions/pages, and focused tests.
- Files expected to change: `TODO.md`, `web/src/drizzle/schema.ts`, new migration files, wishlist form/query/action modules, admin wishlist pages, and targeted tests.
- Tests to add or update first: schema/form validation tests, admin action tests, and DAL/query tests for filtering and ordering.
- RED command: targeted wishlist form/action/query tests.
- Expected RED test(s): wishlist places are unsupported in schema/forms or admin actions do not validate/store the required fields correctly.
- Why this RED proves the right problem: all public wishlist and route-planner work depends on a stable data contract first.
- GREEN target: admins can manage wishlist places safely through validated server-side flows backed by the new schema.
- GREEN command: rerun the targeted wishlist tests.
- Refactor boundary: no public map UI or route planning in the same pass.
- Refactor proof command(s): rerun the same targeted wishlist tests after any query/helper extraction.
- Security impact: medium-high, because this adds admin write paths and optional outbound links.
- Required security assertions: admin auth remains enforced, links are validated/sanitized as data not raw HTML, and location input is validated before persistence.
- E2E impact: medium; add admin CRUD smoke coverage after GREEN.
- E2E prerequisites (seed, auth state, env): admin auth fixture and migration-ready local DB.
- Artifact paths (trace/video/screenshot), if E2E: Playwright artifacts under `web/test-results/` or the configured report path.
- Coverage impact: adds coverage around new schema-backed admin flows.
- Verification commands: targeted wishlist tests, migration sanity checks, `bunx tsc --noEmit`, relevant lint, and focused Playwright if enabled.
- Status: pending

### Batch: public wishlist travel map
- Goal: add a second public map page dedicated to wishlist places with both map and list presentations.
- User journey or failure being protected: a visitor can browse planned travel destinations on a USA-focused map and review the corresponding place list.
- Scope: public route, map/list UI, query wiring, and focused rendering tests.
- Files expected to change: `TODO.md`, new public route files, shared or existing map components, wishlist list components, and targeted tests.
- Tests to add or update first: query/view-model tests, rendering tests for empty/populated states, and map marker contract tests if available.
- RED command: targeted public wishlist map tests.
- Expected RED test(s): there is no public wishlist page, existing map primitives cannot render wishlist data, or empty/filter states are missing.
- Why this RED proves the right problem: it captures the missing public travel surface independently from admin CRUD or route planning.
- GREEN target: a public wishlist route renders the wishlist map and list using the stabilized wishlist-place contract.
- GREEN command: rerun the targeted public wishlist map tests.
- Refactor boundary: no route-planner logic in the same pass.
- Refactor proof command(s): rerun the same targeted public wishlist tests after any shared map extraction.
- Security impact: low-medium, because this is mostly read-only but still depends on safe link rendering.
- Required security assertions: only published/public wishlist data is exposed and optional links render safely.
- E2E impact: medium; add one public smoke flow after GREEN.
- E2E prerequisites (seed, auth state, env): seeded wishlist places with coordinates.
- Artifact paths (trace/video/screenshot), if E2E: Playwright artifacts under `web/test-results/` or the configured report path.
- Coverage impact: adds coverage around a new public route and map/list presentation.
- Verification commands: targeted public wishlist tests, `bunx tsc --noEmit`, relevant lint, and focused Playwright if enabled.
- Status: pending

### Batch: travel route planner over wishlist stops
- Goal: plan routes between a start and end location and suggest wishlist stops along the route, with a visited toggle.
- User journey or failure being protected: a visitor can enter realistic origin/destination text and get a best-effort route plus suggested wishlist stops without including unwanted visited places by default.
- Scope: provider abstraction, validated API contract, planning algorithm, planner UI, and focused tests.
- Files expected to change: `TODO.md`, new route-planner forms/services/API/page modules, wishlist queries as needed, and targeted tests.
- Tests to add or update first: provider abstraction tests, route-planner validation tests, algorithm tests for include/exclude visited behavior and no-result handling, plus UI contract tests.
- RED command: targeted route-planner service/API tests.
- Expected RED test(s): arbitrary location input is unsupported, wishlist places are not projected into route suggestions, or visited filtering is incorrect.
- Why this RED proves the right problem: it isolates the core planning contract before introducing external provider variability into broader UI work.
- GREEN target: validated start/end inputs produce a route response with ordered suggested wishlist stops and clear fallback states.
- GREEN command: rerun the targeted route-planner tests.
- Refactor boundary: no provider migration or map-stack rewrite beyond the minimal abstraction needed for v1.
- Refactor proof command(s): rerun the same targeted route-planner tests after any helper extraction.
- Security impact: medium-high, because this adds a new public API surface that accepts arbitrary user input and may call external providers.
- Required security assertions: all inputs validate with Zod, provider failures/timeouts are handled safely, rate limiting is considered, and server logs do not leak sensitive provider details.
- E2E impact: medium-high; add one planner smoke flow after unit and API coverage is GREEN.
- E2E prerequisites (seed, auth state, env): seeded wishlist places, chosen provider env or mocks, and deterministic test fixtures.
- Artifact paths (trace/video/screenshot), if E2E: Playwright artifacts under `web/test-results/` or the configured report path.
- Coverage impact: adds coverage around a new public API and public route.
- Verification commands: targeted route-planner tests, `bunx tsc --noEmit`, relevant lint, and focused Playwright if enabled.
- Status: pending

### Batch: post song metadata
- Goal: let each post carry structured song metadata and show the associated song on the public post page.
- User journey or failure being protected: an admin can associate a song with a post without relying on unsafe embed HTML, and readers can see that association consistently.
- Scope: post schema/data contracts, admin post form wiring, public post rendering, and focused tests.
- Files expected to change: `TODO.md`, `web/src/drizzle/schema.ts`, migration files, post form/actions/DAL/query files, public post page or supporting components, and targeted tests.
- Tests to add or update first: schema/form validation tests, admin save/update tests, query mapping tests, and public rendering tests.
- RED command: targeted post-song tests.
- Expected RED test(s): posts cannot persist song metadata or public post rendering ignores the new structured fields.
- Why this RED proves the right problem: it locks the desired metadata contract before any UI-only implementation can drift.
- GREEN target: posts can save structured song metadata and the public post page renders it safely.
- GREEN command: rerun the targeted post-song tests.
- Refactor boundary: no broader post editor redesign or media/embed feature expansion.
- Refactor proof command(s): rerun the same targeted post-song tests after any query/form extraction.
- Security impact: medium, because this adds user-visible outbound links and post-schema changes.
- Required security assertions: song URLs are validated, rendered links are safe, and no arbitrary embed HTML is accepted.
- E2E impact: medium; add one admin-create/public-view smoke flow after GREEN.
- E2E prerequisites (seed, auth state, env): admin auth fixture and a draft/publish or edit-existing-post path.
- Artifact paths (trace/video/screenshot), if E2E: Playwright artifacts under `web/test-results/` or the configured report path.
- Coverage impact: adds coverage around post persistence and presentation.
- Verification commands: targeted post-song tests, migration sanity checks, `bunx tsc --noEmit`, relevant lint, and focused Playwright if enabled.
- Status: pending

### Planned Feature Risks

- HIGH: the route planner depends on an external provider choice for geocoding and routing quality, quota, and testability.
- HIGH: the collapsible thoughts block touches the existing sanitized rich-text render path and needs careful allowlist review.
- HIGH: wishlist and post-song schema changes will touch shared post/data-access surfaces and can widen type/build fallout.
- MEDIUM: the homepage newsletter bug may be a mixed UI-plus-environment contract issue rather than a single component bug.
- MEDIUM: map reuse may require a small abstraction pass before wishlist and route-planner surfaces can share rendering cleanly.
- LOW: the public wishlist map and song-display batches are straightforward once the underlying data contracts are stable.

### Planned Feature Ordering Decision

Recommended implementation order once the current active remediation work allows feature delivery:

1. homepage newsletter subscribe correctness
2. collapsible post thoughts block
3. wishlist places schema and admin CRUD
4. public wishlist travel map
5. travel route planner over wishlist stops
6. post song metadata

Reasoning:

1. Newsletter is the smallest user-facing correction.
2. The thoughts block has a tight but self-contained editor/render contract.
3. Wishlist CRUD must exist before either the public wishlist map or route planner.
4. The public wishlist map is lower risk than the route planner and validates the data model visually.
5. The route planner is the highest-complexity feature and should build on stable wishlist data.
6. Post-song metadata is small, but it still touches the shared post schema and can be scheduled after the travel lane if desired.
