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

## TDD Batch Template

Use this template before changing production code:

```md
### Batch: <name>
- Goal:
- Scope:
- Files expected to change:
- RED target:
- GREEN target:
- Refactor boundary:
- Security impact:
- E2E impact:
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
- [ ] Keep this file updated after each meaningful batch.
- [ ] Add links from future handoff or session notes only when they provide unique value.

### Phase 1: Baseline Assessment

- [x] Run security baseline across auth, APIs, uploads, and content rendering.
- [x] Run code-quality baseline across `web/src`, tests, and config surfaces.
- [x] Run refactor-clean discovery for dead code and duplicate logic.
- [x] Run E2E coverage audit for critical user journeys.
- [x] Consolidate findings into one ranked remediation backlog.

### Phase 2: Security Hardening

- [ ] Close any CRITICAL or HIGH security findings first.
- [ ] Ensure all trust boundaries use Zod validation.
- [ ] Verify authorization checks across public and admin flows.
- [ ] Verify upload and media routes are constrained and logged safely.
- [ ] Confirm no sensitive error leakage.

### Phase 3: Correctness and Maintainability

- [ ] Fix HIGH correctness findings from code review.
- [ ] Reduce typing risk in high-churn modules.
- [ ] Add tests around fragile logic before restructuring.
- [ ] Normalize error-handling patterns in touched areas.

Completed slice:

- [x] Prevent malformed admin `galleryEntries` payloads from silently erasing existing post media during save/update.

### Phase 4: Refactor and Cleanup

- [ ] Remove safe dead code with tests green before and after.
- [ ] Consolidate duplicate utilities and types where behavior is identical.
- [ ] Break up oversized modules only after protective tests exist.
- [ ] Leave behavior-adjacent refactors serialized and reviewed.

### Phase 5: E2E Confidence

- [ ] Add smoke coverage for all critical user-facing routes.
- [ ] Add authenticated admin flow coverage.
- [ ] Reduce or quarantine flaky tests with clear follow-up notes.
- [ ] Ensure CI-ready artifact capture and failure diagnosis.

### Phase 6: Ongoing Execution

- [ ] Run all future implementation through TDD slices.
- [ ] Re-review sensitive changes with security and code-review lanes.
- [ ] Keep docs aligned with shipped behavior, not speculative plans.

## Active Batch

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
- Status: in_progress

## Ranked Remediation Backlog

1. Replace regex HTML sanitization in `web/src/lib/content.ts` and all raw HTML sinks with a vetted allowlist sanitizer.
2. Make deployed rate limiting fail closed or explicitly dev-only when Upstash credentials are missing.
3. Harden upload/media validation with server-side content checks instead of trusting only client MIME and size.
4. Fix admin identity mapping inconsistencies in `web/src/server/auth/admin-users.ts` and related auth consumers.
5. Add a reusable public-user Playwright fixture, then cover post detail, comments, bookmarks, and account settings flows.
6. Land safe cleanup items only after tests protect behavior-sensitive auth, theme, admin, comments, PWA, and map surfaces.

## Baseline Findings Snapshot

- Security: high-risk issue is regex-based HTML sanitization feeding raw HTML rendering; medium-risk issues include silent production rate-limit fallback and upload validation trusting client metadata.
- Correctness: high-risk issue was malformed admin gallery payloads deleting existing media; this slice is now fixed. Additional high-risk findings remain around the HTML sanitizer contract and admin identity mapping.
- Cleanup: safe removals include unused `web/src/lib/errors.ts`, `web/src/components/blog/post-card.tsx`, `web/src/lib/auth/identities.ts`, and `web/src/lib/auth/public.ts`; defer cleanup in auth, theme, admin, comments, map, and PWA surfaces until covered by tests.
- E2E: admin shell coverage exists, but public signed-in flows are the main gap. Missing critical journeys include post detail, comments, bookmarks, successful public auth, account settings, media workflows, map, tag page UI, and mobile smoke coverage.

## Known Likely Blockers

- [ ] Local env variables may be required for deep auth, upload, and E2E validation.
- [ ] Admin Playwright state may need regeneration for authenticated smoke coverage.
- [ ] Some high-value flows may depend on local seed data or specific DB contents.
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
