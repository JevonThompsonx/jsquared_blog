# GPT-5.4 Backend & Verification Prompt (Next Task)

**Project**: J²Adventures (`web/` — Next.js 16 App Router, TailwindCSS 4, Turso/Drizzle, Supabase Auth, Auth.js admin)
**Role**: Backend + review + verification closure (tests, automation, strict typing cleanup, and cross-checks).
**Read first**: `AGENTS.md`, `docs/handoff.md`, `docs/PLAN.md`, `TODO.md`, `prompt.md`, then this file.

## Verified baseline snapshot (2026-03-19)

Use these as the latest verified command results:

- `bun run lint` — pass
- `bunx tsc --noEmit` — pass
- `bun run test` — pass (85 tests)
- `bun run build` — pass
- `bun run test:e2e` — pass with **12 passed, 7 skipped** (authenticated admin specs skipped without seed/auth setup)

Current status to treat as true:

- PLAN `3.1`, `3.2`, `3.6` remain **awaiting review** (Gemini work not yet closed).
- PLAN `4.3`, `4.4`, `4.7` are **done in code but not fully verified operationally**.
- PLAN `4.2` and `4.6` are **not started** feature work.
- PLAN Phase `4.5` (`V.1`...`V.10`) remains open.

---

## Primary mission

Your next session should close the highest-value backend/review gaps without stepping into speculative frontend redesign.

Prioritize in this order.

### Task 1 — Strict TypeScript cleanup (PLAN V.9)

Perform a safe cleanup pass for remaining legacy `as`/`any` usage in backend/shared code.

Search with:

```bash
cd web
rg "\bas\b" src --glob "*.ts" --glob "*.tsx"
rg ": any" src --glob "*.ts" --glob "*.tsx"
```

Rules:

- Prefer narrowing, schema validation, and explicit interfaces.
- Do not use new `as` assertions as escape hatches.
- Do not introduce `any`.
- If a case needs behavioral redesign, document it as remaining work instead of forcing a risky fix.

### Task 2 — Review Gemini's 3.1/3.2/3.6 output (PLAN V.6)

Review frontend changes after Gemini's latest pass using this required format:

`file_path:line — severity (error|warning|suggestion) — description — fix`

Review checklist:

- hardcoded Tailwind palette classes vs CSS variable theming
- typed route helper usage for dynamic links
- unnecessary/excessive `"use client"`
- raw `<img>` regressions vs `next/image`
- focus/keyboard/accessibility regressions
- missing loading/empty/error states
- unsupported completion claims without measured evidence

### Task 3 — Authenticated E2E pipeline closure (PLAN V.5)

Move from partial E2E coverage to authenticated admin coverage:

1. `bun run seed:e2e` (safe dev/test target only)
2. `bun run e2e:capture-admin-state`
3. `bun run test:e2e`
4. confirm remote mutation guards still require explicit `E2E_ALLOW_REMOTE_ADMIN_MUTATIONS=1`

Capture exactly which previously skipped tests become active and pass.

### Task 4 — Verification assist for 4.3 / 4.4 / 4.7

Use local/dev checks to reduce manual closure risk:

- validate RSS endpoints respond and include expected XML shape
- validate view counter behavior in dev (single-session increment behavior)
- verify JSON-LD output structure from post head content

Do not claim deployed Rich Results validation unless a real deployed URL is tested externally.

---

## Guardrails

- Never edit applied Drizzle migrations.
- Respect existing dirty worktree changes; do not revert unrelated work.
- Keep auth systems separate (Supabase public vs Auth.js admin).
- Treat manual production operations (`db:migrate` on prod, dashboard toggles) as out-of-band unless explicitly requested.

---

## Important notes

- Do not claim the repo is fully free of `as` assertions; document what you fixed and what remains.
- Do not regress inline admin confirmations back to native `confirm()` dialogs.
- Do not assume remote Playwright targets are local; keep `E2E_BASE_URL` behavior intact.
- Drizzle migrations are append-only. Never edit already-applied migration files (0000-0006).
- `web/drizzle/0007_post_view_count.sql` was added manually to preserve append-only behavior.
- The working tree may contain uncommitted changes from Gemini's active frontend work. Do not revert work you did not make.

---

## Latest verification snapshot

- `bun run lint` — pass
- `bunx tsc --noEmit` — pass
- `bun run build` — pass
- `bun run test` — pass (85 tests)
- `bun run test:e2e` — 12 passed, 7 skipped (authenticated coverage still fixture/auth dependent)

## Quality gate

Run from `web/` after every task:

```bash
bun run lint
bunx tsc --noEmit
bun run build
bun run test
```

If working in E2E/auth paths, also run:

```bash
bun run test:e2e
```

All required commands must pass with zero errors/warnings.

## Files that matter most

- `web/playwright.config.ts` — local vs remote E2E behavior
- `web/tests/e2e/smoke.spec.ts` — smoke coverage and admin env-gated tests
- `web/tests/e2e/helpers/admin.ts` — shared authenticated Playwright helpers
- `web/scripts/capture-admin-storage-state.ts` — admin storage-state capture
- `web/scripts/seed-e2e-fixtures.ts` — stable admin E2E fixture seed
- `web/src/drizzle/schema.ts` — Drizzle schema
- `web/src/server/queries/posts.ts` — post queries
- `web/src/lib/content.ts` — reading time helpers
- `web/src/lib/rate-limit.ts` — rate limiting
- `web/src/components/admin/admin-dashboard.tsx` — admin post list
- `web/src/app/(blog)/posts/[slug]/page.tsx` — post detail page
- `web/src/app/(blog)/posts/[slug]/head.tsx` — JSON-LD

## Report back with

- List of `as`/`any` occurrences fixed and any that remain
- Review findings from Gemini's frontend work (if applicable)
- E2E test results after Task 3 (including skipped vs executed counts)
- Verification results from Task 4
- `bun run lint`, `bunx tsc --noEmit`, `bun run build`, `bun run test`, and if run `bun run test:e2e` results
