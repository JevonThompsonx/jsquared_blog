# Backend Engineer / Review Brief (Canonical Next Task Prompt)

**Project**: J²Adventures (`web/` — Next.js 16 App Router, TailwindCSS 4, Turso/Drizzle, Supabase Auth, Auth.js admin)
**Role**: Backend + review + verification closure (tests, automation, strict typing cleanup, and cross-checks).
**Likely executor**: Claude Sonnet 4.6 (via Claude Code or OpenCode)

Read first, in this order:
1. `AGENTS.md`
2. `docs/PLAN.md`
3. `docs/handoff.md`
4. `TODO.md`
5. `prompt.md`
6. This file

---

## Verified baseline snapshot (2026-03-19)

Use these as the latest verified command results:

- `bun run lint` — pass
- `bunx tsc --noEmit` — pass
- `bun run test` — pass (107 tests)
- `bun run build` — pass
- `bun run test:e2e` — 12 passed, 7 skipped (authenticated admin specs skipped without seed/auth setup)

Current status to treat as true:

- PLAN `3.1`, `3.2`, `3.6` are **DEFERRED** — code improvements are in place; live browser QA and Lighthouse measurement are blocked until next week when a live environment is available.
- PLAN `4.2` backend implementation is **done in code but not fully verified operationally**.
- PLAN `4.3`, `4.4`, `4.7` are **done in code** and structurally verified; manual smoke tests still pending.
- PLAN `4.6` backend scaffolding is **fully shipped** — Gemini is now building the frontend signup form.
- PLAN `V.9` (`as`/`any` cleanup) is **COMPLETE** — no unjustified type assertions remain in backend/shared code.
- PLAN Phase `4.5` (`V.1`...`V.10`) has several items still open (see below).

---

## Already completed — do not redo

- [x] RSS backend exists (`/feed.xml`, `/category/*/feed.xml`, `/tag/*/feed.xml`) with unit + Playwright smoke coverage.
- [x] Post view counter route exists (`POST /api/posts/[postId]/view`) with once-per-session cookie behavior and unit coverage.
- [x] JSON-LD structure has unit coverage — `BlogPosting` schema rendered correctly per `tests/unit/post-head.test.ts`.
- [x] `web/scripts/import-supabase.ts` received a strict-typing cleanup pass with Zod-backed parsing.
- [x] `web/src/lib/content.ts` now decodes HTML entities before plain-text extraction.
- [x] `web/src/app/sitemap.ts` typed through `MetadataRoute.Sitemap`; no `as const` workaround needed.
- [x] `web/scripts/capture-admin-storage-state.ts` has browser-launch fallbacks and configurable timeouts.
- [x] PLAN `4.2` backend slice shipped with comment notifications via Resend.
- [x] PLAN `4.6` backend foundation shipped (`POST /api/newsletter`, service, forms, tests).
- [x] PLAN `V.9` — no `any` types, no unjustified `as` assertions in backend/shared code. Only legitimate `as const` for GeoJSON type discrimination in `world-map.tsx` (frontend-owned, intentional).

Do not audit or re-implement these unless a failing test proves a regression.

---

## Session summary from last pass

From the previous backend/review session (2026-03-19 state):

- `bun run test` now passes with **107 tests** (up from 99; newsletter + comment notification coverage added).
- V.9 type cleanup is complete: no `as`/`any` in backend/shared. Only GeoJSON `as const` in `world-map.tsx` (correct).
- RSS routes structurally verified: all three feed routes (`global`, `category`, `tag`) are clean, Zod-validated, and match the RSS helper tests.
- View counter route structurally verified: once-per-session behavior, rate-limited, cookie-scoped correctly.
- JSON-LD unit tests confirm `BlogPosting` schema, `datePublished`, `dateModified`, and `image[]` output.
- Gemini completed `home-post-card.tsx` SVG fallback fix; 107 tests still pass after that change.
- PLAN `3.1`/`3.2`/`3.6` deferred to next week (not a backend concern).

---

## Primary mission for this session

Your priority order:

### Task 1 — Authenticated E2E pipeline closure (PLAN V.5)

This is the highest-value unblocked task.

The public E2E smoke suite passes. The authenticated admin tests are skipped only because admin storage state is missing.

Steps:
1. Run `bun run seed:e2e` (safe; idempotent fixture seeding into dev/test DB only)
2. Run `E2E_CAPTURE_LAUNCH_TIMEOUT_MS=600000 bun run e2e:capture-admin-state` — this opens a browser for interactive GitHub sign-in
3. Complete the interactive GitHub OAuth sign-in when prompted
4. Run `bun run test:e2e`
5. Confirm previously skipped authenticated admin tests now execute and pass

If the browser launch fails, check:
- `web/scripts/capture-admin-storage-state.ts` for the launch fallback order (Chromium → Chrome → Edge)
- Set `E2E_CAPTURE_LAUNCH_TIMEOUT_MS=600000` to avoid timeout during launch
- The script logs detailed diagnostics when each launch profile fails

Report exactly which tests move from skipped to passed.

---

### Task 2 — Newsletter real-provider verification (PLAN 4.6)

The backend newsletter route is shipped. Before Gemini ships the UI, verify the backend behaves correctly against a real Resend Segment.

Requirements:
1. Set in `web/.env.local`:
   - `RESEND_API_KEY` — a real Resend server-side API key
   - `RESEND_NEWSLETTER_SEGMENT_ID` — a real Resend Segment ID
2. Start the dev server (`bun run dev`)
3. Test these three scenarios with `curl` or a REST client:
   ```bash
   # New subscriber (should return 201, status: "subscribed", source: "created")
   curl -X POST http://localhost:3000/api/newsletter \
     -H "Content-Type: application/json" \
     -d '{"email": "test+new@example.com", "firstName": "Test"}'

   # Already subscribed (should return 200, status: "already-subscribed")
   curl -X POST http://localhost:3000/api/newsletter \
     -H "Content-Type: application/json" \
     -d '{"email": "test+new@example.com", "firstName": "Test"}'

   # Missing config (when env vars are unset, should return 202, status: "skipped")
   # — test by temporarily removing the env vars
   ```
4. If Resend's contact/segment API behavior differs from the implementation assumptions in `web/src/server/services/newsletter.ts`, update the service and tests to match reality.
5. Document any provider-specific behavior differences as code comments.

If real Resend credentials are not available, document this as a blocker in your report and skip this task. Do not paper over it.

---

### Task 3 — Comment notification smoke test documentation (PLAN 4.2)

The notification code is correct. What remains is documenting the exact manual steps for operational verification.

Add a comment block at the top of `web/src/server/services/comment-notifications.ts` (or create `docs/context/comment-notifications-smoke-test.md`) that documents:

```
MANUAL SMOKE TEST STEPS for PLAN 4.2:

1. Set these env vars in web/.env.local:
   - RESEND_API_KEY=<your Resend API key>
   - RESEND_FROM_EMAIL=<verified sender address in Resend>
   - COMMENT_NOTIFICATION_TO_EMAIL=<address to receive notifications>

2. Start the dev server: bun run dev

3. Create a test post (or use an existing one)

4. Post a comment as a logged-in Supabase user
   → Expect: notification email sent to COMMENT_NOTIFICATION_TO_EMAIL

5. Reply to that comment as the same or different user
   → Expect: notification email sent for the reply

6. Remove or comment out RESEND_API_KEY
   → Expect: comment still succeeds; notification silently skipped
```

This closes the documentation gap for PLAN 4.2 operational verification.

---

### Task 4 — Structural review of Gemini's newsletter form (after Gemini ships)

Once Gemini ships the PLAN 4.6 newsletter signup form, review it using this required format:

`file_path:line — severity (error|warning|suggestion) — description — fix`

Review checklist:
- hardcoded Tailwind palette classes vs CSS variable theming
- typed route helper usage for dynamic links
- unnecessary/excessive `"use client"`
- raw `<img>` regressions vs `next/image`
- focus/keyboard/accessibility regressions
- missing loading/empty/error/success states
- form accessible without JavaScript (graceful degradation or at minimum clear error)

If Gemini hasn't shipped yet when you start, skip this task and note it as pending.

---

## Guardrails

- Never edit applied Drizzle migrations.
- Respect existing dirty worktree changes; do not revert unrelated work.
- Keep auth systems separate (Supabase public vs Auth.js admin).
- Treat manual production operations (`db:migrate` on prod, dashboard toggles) as out-of-band unless explicitly requested.
- Do not start speculative frontend UI work.

---

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

All required commands must pass with zero errors/warnings before declaring a task done.

---

## Files that matter most

- `web/playwright.config.ts` — local vs remote E2E behavior
- `web/tests/e2e/smoke.spec.ts` — smoke coverage and admin env-gated tests
- `web/tests/e2e/helpers/admin.ts` — shared authenticated Playwright helpers
- `web/scripts/capture-admin-storage-state.ts` — admin storage-state capture (has launch fallback order)
- `web/scripts/seed-e2e-fixtures.ts` — stable admin E2E fixture seed
- `web/src/drizzle/schema.ts` — Drizzle schema
- `web/src/server/queries/posts.ts` — post queries
- `web/src/lib/email/resend.ts` — Resend transport helper
- `web/src/server/services/comment-notifications.ts` — comment notification service
- `web/src/server/services/newsletter.ts` — newsletter subscribe service
- `web/src/app/api/newsletter/route.ts` — newsletter API route

---

## Important notes

- PLAN `V.9` is complete. Do not re-audit `as`/`any` usage — it's clean.
- Do not regress inline admin confirmations back to native `confirm()` dialogs.
- Do not assume remote Playwright targets are local; keep `E2E_BASE_URL` behavior intact.
- Drizzle migrations are append-only. Never edit already-applied migration files (`0000`–`0006`).
- `web/drizzle/0007_post_view_count.sql` was added manually to preserve append-only behavior. It has **not** been applied to production — that's a manual step.
- The working tree may contain uncommitted changes from Gemini's active frontend work. Do not revert work you did not make.

---

## Report back with

1. E2E test results after Task 1 (including previously skipped vs now passing counts)
2. Newsletter real-provider verification results (or blocker if credentials unavailable)
3. Comment notification documentation added (link or file path)
4. Gemini newsletter form review findings (if Gemini has shipped)
5. `bun run lint`, `bunx tsc --noEmit`, `bun run build`, `bun run test` results
6. If run: `bun run test:e2e` results

---

## Open manual tasks (not executable by any AI model without user action)

These require Jevon (manual):

| Task | What's Needed | Blocks |
|------|---------------|--------|
| V.1 | `bun run db:migrate` on production DB | View counter on prod |
| V.2 | Visit `/feed.xml`, `/category/*/feed.xml`, `/tag/*/feed.xml` in browser | PLAN 4.3 closure |
| V.3 | Verify view counter increments once per session in dev browser | PLAN 4.7 closure |
| V.4 | Google Rich Results Test on a deployed post URL | PLAN 4.4 closure |
| V.7 | Delete legacy Cloudflare Worker | Cleanup |
| V.10 | Enable email confirmation in Supabase dashboard | Security |
