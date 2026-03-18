# GPT-5.4 Session Handoff

**Project**: J²Adventures (`web/` — Next.js 16 App Router, TailwindCSS 4, Turso/Drizzle, Supabase Auth, Auth.js admin)
**Role**: Review + targeted implementation across tests, automation, backend/frontend boundaries, and contained fixes.
**Read first**: `AGENTS.md`, `docs/handoff.md`, `docs/PLAN.md`, `TODO.md`, `prompt.md`

## Current state

The app is live and stable at `jsquaredadventures.com`. Phase 4 is active.

**Done items — verified and stable:**

- PLAN `4.1` comment moderation — fully done (backend + frontend, optimistic updates, inline delete confirmation, summary stats).
- PLAN `4.5` reading time — shared helpers in `web/src/lib/content.ts`, threaded through queries, post pages, preview, and editor.
- PLAN `4.8` admin desktop layout expansion — done and browser-QA'd.
- PLAN `3.5` mobile nav UX — done (Radix dialog drawer).
- PLAN `3.7`, `3.8`, `3.9`, `3.11`, `3.12`, `3.13`, `3.14` — all done.
- Playwright public smoke suite passes (`10 tests`). Authenticated admin smoke works with `playwright/.auth/admin.json`.
- CI pipeline exists in `.github/workflows/ci.yml`.
- HTTP security headers ship from `web/next.config.ts`.
- Rate limiting via Upstash Redis with in-memory fallback.
- Sentry error tracking is integrated.
- Canonical Tiptap JSON storage is live; legacy HTML is read-compatible only.

**In progress / open:**

- PLAN `4.4` JSON-LD — code is done, deployed Rich Results validation still pending.
- PLAN `3.1` + `3.2` — CWV and accessibility audits (Gemini is handling the frontend fixes).
- PLAN `3.6` — search improvements (Gemini is handling UI).
- Authenticated E2E coverage is partial — delete-confirm moderation still needs `E2E_ADMIN_POST_ID`.
- Older `as` assertions remain in files outside the latest cleanup pass.

## Session tasks — do these in order

### Task 1: Expand authenticated E2E coverage

This is the highest-leverage testing work right now.

1. **Ensure admin state capture works** — run `bun run e2e:capture-admin-state` from `web/` and verify `playwright/.auth/admin.json` is generated. If needed, fix the capture script.
2. **Add admin fixture seeding** — create or extend a script in `web/scripts/` that:
   - Creates a stable test post (draft or published) with a known slug/ID.
   - Adds at least 2 comments to it from a test user.
   - Writes the post ID to a `.env.test.local` or similar so `E2E_ADMIN_POST_ID` is no longer manual.
   - Must be idempotent (use `onConflictDoNothing` like `seed-series-categories.ts`).
3. **Expand smoke specs** — add authenticated admin tests in `web/tests/e2e/smoke.spec.ts` for:
   - Clone a post from the dashboard and verify the draft editor loads with `?cloned=1`.
   - Navigate to `/admin/tags`, verify tag list renders, edit a tag description inline.
   - Navigate to `/admin/posts/[postId]/comments`, verify moderation controls render.
   - Perform an inline delete-confirm flow on a comment (using the seeded fixture post).
4. **Keep compatibility** with:
   - The custom Radix `ThemeSelect` component (not native `<select>`) — use `.click()` + `.getByRole('option')` patterns.
   - Inline admin confirmations (not `page.on('dialog')`) — find and click the confirm button directly.
   - Remote `E2E_BASE_URL` behavior — tests must not assume localhost.

Files to touch:
- `web/scripts/seed-e2e-fixtures.ts` (new)
- `web/tests/e2e/smoke.spec.ts`
- `web/tests/e2e/helpers/admin.ts`
- `web/package.json` (add `"seed:e2e"` script if needed)

### Task 2: RSS per category and tag (PLAN 4.3)

Add category-specific and tag-specific RSS feeds:

1. **Route structure** — create:
   - `web/src/app/category/[category]/feed.xml/route.ts` — RSS for a single category
   - `web/src/app/tag/[slug]/feed.xml/route.ts` — RSS for a single tag
2. **Reuse existing RSS logic** — the main RSS feed lives at `web/src/app/feed.xml/route.ts`. Extract the shared XML generation into a helper (or import the existing one) and filter by category/tag.
3. **Query layer** — the existing `getPublishedPosts()` in `web/src/server/queries/posts.ts` already supports category and tag filtering. Reuse that.
4. **Link discovery** — add `<link rel="alternate" type="application/rss+xml">` tags to the category and tag page `<head>` so feed readers can auto-discover them.
5. **Sitemap** — ensure the new feed URLs are discoverable (they don't need to be in `sitemap.xml`, but can be linked from the main feed).

Backend rules:
- Every DAL/query file starts with `import "server-only"`.
- Zod validation on any route params.
- No `any`, `as`, or `!`.
- Explicit column selection in queries (no `SELECT *`).

### Task 3: Privacy-respecting post view counter (PLAN 4.7)

Implement a lightweight view counter that respects user privacy:

1. **Schema** — add a `view_count` integer column to the `posts` table (default 0). Generate a Drizzle migration.
   - Migration must use `--> statement-breakpoint` delimiter.
   - Migration file is append-only — never edit applied migrations.
2. **Increment logic** — create a server action or API route that increments the count:
   - Fire-and-forget from the post detail page (don't block rendering).
   - Debounce/deduplicate: use a session-scoped approach (e.g., cookie or in-memory set per request) to avoid counting repeated views from the same visitor.
   - Do NOT store IP addresses, user IDs, or any PII in the view tracking — just increment the counter.
   - Rate limit the increment endpoint.
3. **Display** — add `viewCount` to the post detail query response. Show it on the post detail page (e.g., "X views" near the date or reading time). Also show it on admin post rows.
4. **Admin dashboard** — add view count as a sortable column on the admin post list.

Files to touch:
- `web/src/drizzle/schema.ts` — add column
- `web/drizzle/0007_*.sql` — generated migration
- `web/src/server/dal/posts.ts` or new DAL — increment logic
- `web/src/app/api/posts/[postId]/view/route.ts` (new) — increment endpoint
- `web/src/server/queries/posts.ts` — include `view_count` in queries
- `web/src/components/blog/post-detail.tsx` or post page — display
- `web/src/components/admin/admin-dashboard.tsx` — admin display

### Task 4: Strict TypeScript cleanup pass

Scan for remaining `as` assertions and `any` types in touched files:

```bash
cd web && grep -rn "\bas\b\s" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".next"
cd web && grep -rn ": any" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".next"
```

For each occurrence:
- If in a file you touched this session, fix it properly with correct types.
- If in an untouched file and the fix is safe/obvious, fix it.
- If the fix requires behavioral changes, document it but don't change it.
- Never use `as` to silence errors — use proper type narrowing, generics, or Zod parsing.

## Important notes

- Do not claim the repo is fully free of `as` assertions; document what you fixed and what remains.
- Do not regress inline admin confirmations back to native `confirm()` dialogs.
- Do not assume remote Playwright targets are local; keep `E2E_BASE_URL` behavior intact.
- The deployed site may not be reachable from this environment — deployed Rich Results validation remains a manual/external check.
- The worktree may be dirty with unrelated edits. Do not revert work you did not make.
- Drizzle migrations are append-only. Never edit already-applied migration files (0000–0006).

## Quality gate

Run from `web/` after every task:

```bash
bun run lint
bunx tsc --noEmit
bun run build
bun run test
```

All must pass. Run `bun run test:e2e` after Task 1 to verify the expanded smoke suite.

## Files that matter most

- `web/playwright.config.ts`
- `web/tests/e2e/smoke.spec.ts`
- `web/tests/e2e/helpers/admin.ts`
- `web/scripts/capture-admin-storage-state.ts`
- `web/src/app/feed.xml/route.ts` — existing RSS (reference for Task 2)
- `web/src/server/queries/posts.ts` — post queries
- `web/src/drizzle/schema.ts` — Drizzle schema
- `web/src/lib/rate-limit.ts` — rate limiting (reference for Task 3)
- `web/src/lib/content.ts` — reading time helpers
- `web/src/components/admin/admin-dashboard.tsx` — admin post list
- `web/src/app/(blog)/posts/[slug]/page.tsx` — post detail page
- `web/src/app/(blog)/posts/[slug]/head.tsx` — JSON-LD

## Suggested order

1. Start with Task 1 (E2E fixtures + tests) — it's the highest-leverage item and unblocks future quality gates.
2. Then Task 2 (RSS) — clean backend feature, contained scope.
3. Then Task 3 (view counter) — involves a migration so save it for when you're confident.
4. End with Task 4 (TypeScript cleanup) — low-risk sweep to tighten the codebase.

## Report back with

- What you implemented and what tests pass now
- Any migration files generated (filename + description)
- `bun run lint`, `bunx tsc --noEmit`, `bun run build`, `bun run test` results
- `bun run test:e2e` results after Task 1
- List of `as`/`any` occurrences fixed in Task 4 and any that remain
- Updated handoff notes for the next session
