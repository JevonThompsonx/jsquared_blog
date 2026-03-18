# GPT-5.4 Session Handoff

**Project**: J²Adventures (`web/` — Next.js 16 App Router, TailwindCSS 4, Turso/Drizzle, Supabase Auth, Auth.js admin)
**Role**: Review + targeted implementation across tests, automation, backend/frontend boundaries, and contained fixes.
**Read first**: `AGENTS.md`, `docs/handoff.md`, `docs/PLAN.md`, `TODO.md`, `prompt.md`

## Current state

The app is live and stable at `jsquaredadventures.com`. Phases 1-2 are complete. Phase 3 is nearly complete (Gemini is finishing 3.1, 3.2, 3.6). Phase 4 is mostly complete. A new Phase 4.5 (verification tasks) has been added to `docs/PLAN.md`.

### What's done and verified

- PLAN 4.1 comment moderation — fully done (backend + frontend, optimistic updates, inline delete confirmation, summary stats).
- PLAN 4.3 RSS per category/tag — code shipped. Manual smoke pending.
- PLAN 4.5 reading time — shared helpers in `web/src/lib/content.ts`, threaded through queries, post pages, preview, and editor.
- PLAN 4.7 post view counter — code shipped. Migration 0007 not yet applied to prod.
- PLAN 4.8 admin desktop layout expansion — done and browser-QA'd.
- PLAN 3.5 mobile nav UX — done (Radix dialog drawer).
- PLAN 3.7, 3.8, 3.9, 3.11, 3.12, 3.13, 3.14 — all done.
- Playwright public smoke suite passes (10 tests). Authenticated admin smoke exists but depends on fixtures.
- CI pipeline exists in `.github/workflows/ci.yml`.
- HTTP security headers, rate limiting, Sentry, Plausible — all in place.
- Canonical Tiptap JSON storage is live; legacy HTML is read-compatible only.

### What's in progress

- PLAN 3.1 + 3.2 + 3.6 — Gemini is handling frontend CWV/accessibility/search fixes. **Awaiting review for validity and code quality.**
- PLAN 4.4 JSON-LD — code is done, deployed Rich Results validation still pending.

---

## Your next session priorities (in order)

### Task 1: Strict TypeScript cleanup pass (PLAN V.9)

The repo still contains older `as` assertions in files outside the latest cleanup pass. Sweep and fix them.

Find them:
```bash
cd web && grep -rn "\bas\b\s" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".next"
cd web && grep -rn ": any" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".next"
```

For each occurrence:
- If the fix is safe and obvious, fix it with proper type narrowing, generics, or Zod parsing.
- If the fix requires behavioral changes, document it in your report but don't change it.
- Never use `as` to silence errors.
- Never introduce `any` to work around a type issue.

### Task 2: Review Gemini's frontend work

After Gemini's current session completes, review the changes for:
- Hardcoded Tailwind colors instead of CSS variables
- `any` or loose types
- Missing `"use client"` justification or excessive `"use client"`
- String literal routes instead of typed helpers
- Raw `<img>` instead of `next/image`
- Broken dark mode (works in light only)
- Missing loading/error states

Report format: `file_path:line — severity (error|warning|suggestion) — description — fix`

### Task 3: Authenticated E2E hardening (PLAN V.5)

Verify the full authenticated E2E pipeline:
1. Run `bun run seed:e2e` against a safe dev/test database target
2. Capture admin auth with `bun run e2e:capture-admin-state`
3. Run `bun run test:e2e` and confirm authenticated flows pass
4. Remote mutation suites stay gated unless `E2E_ALLOW_REMOTE_ADMIN_MUTATIONS=1` is explicitly set

### Task 4: Verification follow-through

Help close out the manual verification tasks in PLAN Phase 4.5:
- Smoke `/feed.xml`, `/category/<name>/feed.xml`, `/tag/<slug>/feed.xml` in a running app
- Validate that post views increment once per session in dev
- Check JSON-LD output on a post page (view source or dev tools)

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
- `bun run test:e2e` — public smoke passes; authenticated coverage depends on fixtures

## Quality gate

Run from `web/` after every task:

```bash
bun run lint
bunx tsc --noEmit
bun run build
bun run test
```

All must pass with zero errors/warnings.

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
- E2E test results after Task 3
- Verification results from Task 4
- `bun run lint`, `bunx tsc --noEmit`, `bun run build`, `bun run test` results
