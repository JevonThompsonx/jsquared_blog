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

## Verified baseline snapshot (2026-03-19 pass 6)

Use these as the latest verified command results:

- `bun run lint` — pass
- `bunx tsc --noEmit` — pass
- `bun run test` — pass (170 tests — +43 from exif.test.ts, +9 from post-revision-restore-route.test.ts)
- `bun run build` — pass (all routes including `/api/admin/posts/[postId]/revisions/[revisionId]/restore` present)
- `bun run test:e2e` — 12 passed, 7 skipped (authenticated admin specs skipped without seed/auth setup)

Current status to treat as true:

- PLAN `3.1`, `3.2`, `3.6` are **DEFERRED** — code improvements are in place; live browser QA and Lighthouse measurement are blocked until next week when a live environment is available.
- PLAN `4.2` backend implementation is **done in code but not fully verified operationally**.
- PLAN `4.3`, `4.4`, `4.7` are **done in code** and structurally verified; manual smoke tests still pending.
- PLAN `4.6` is **FULLY DONE** — backend + frontend shipped and reviewed.
- PLAN `V.9` (`as`/`any` cleanup) is **COMPLETE** — no unjustified type assertions remain in backend/shared code.
- PLAN Phase `4.5` (`V.1`...`V.10`) has several items still open (see below).
- PLAN **5.4** post revision history backend is **FULLY DONE** — schema, migration, DAL, API route (GET list + POST restore), and tests all shipped. Frontend diff viewer UI remains a future Gemini task.
- PLAN **5.6** EXIF metadata backend is **DONE** — schema (9 columns on `media_assets`), migration (`0009_media_asset_exif.sql`), EXIF parser utility (`web/src/lib/cloudinary/exif.ts`), upload update (`uploads.ts` requests `image_metadata=1` and returns `ParsedExif`), `actions.ts` stores EXIF in gallery `media_assets` inserts, 43 unit tests in `web/tests/unit/exif.test.ts`.

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
- [x] PLAN `V.9` — no `any` types, no unjustified `as` assertions in backend/shared code.
- [x] PLAN `4.6` newsletter frontend form reviewed and bug-fixed.
- [x] PLAN `5.4` revision capture wired in `updateAdminPostAction`.
- [x] PLAN `5.4` restore endpoint — `POST /api/admin/posts/[postId]/revisions/[revisionId]/restore` — with pre-restore undo snapshot, `derivePostContent()` recompute, and 9 unit tests.
- [x] PLAN `5.6` EXIF metadata backend — schema, migration, parser, upload integration, actions storage, 43 unit tests.

Do not audit or re-implement these unless a failing test proves a regression.

---

## Session summary from last pass (2026-03-19 pass 6)

### Restore endpoint (5.4 follow-up)
- `POST /api/admin/posts/[postId]/revisions/[revisionId]/restore` implemented at `web/src/app/api/admin/posts/[postId]/revisions/[revisionId]/restore/route.ts`.
- Before applying a historical revision, the route creates a "pre-restore" undo-point snapshot revision of the current post state, then calls `derivePostContent()` on the revision's `contentJson`, and updates `posts`.
- DAL extended in `web/src/server/dal/post-revisions.ts`: added `PostContentSnapshot` type, `getPostContentSnapshot()`, and `applyRevisionContentToPost()`.
- 9 unit tests in `web/tests/unit/post-revision-restore-route.test.ts` (401, 400 ×2, 404 ×2, 422, success flow, response body, pre-restore abort).

### Phase 5.6 EXIF metadata backend
- **Migration**: `web/drizzle/0009_media_asset_exif.sql` — 9 `ALTER TABLE media_assets ADD COLUMN` statements with `--> statement-breakpoint` delimiters.
- **Parser**: `web/src/lib/cloudinary/exif.ts` — exports `parseCloudinaryExif()`, `parseGpsRational()`, `parseExifDatetime()`, `parseFNumber()`, `parseIso()`, `parseShutterSpeed()`, and types `ParsedExif` / `CloudinaryRawExif`.
- **Upload**: `web/src/lib/cloudinary/uploads.ts` — `uploadEditorialImage()` now includes `image_metadata=1` in the signature string (alphabetically sorted: `folder=...&image_metadata=1&timestamp=...`) and in form data. Response schema extended to accept `image_metadata` object. Returns `exif: ParsedExif` in addition to existing fields.
- **Actions**: `web/src/app/admin/actions.ts` — `galleryEntrySchema` extended with 9 optional EXIF fields. `parseGalleryEntries()` converts `exifTakenAt` epoch ms to `Date`. `replacePostMediaTx()` parameter type updated; gallery `media_assets` inserts now store all 9 EXIF fields.
- **Tests**: `web/tests/unit/exif.test.ts` — 43 tests across `parseGpsRational` (9), `parseExifDatetime` (5), `parseFNumber` (7), `parseIso` (8), `parseShutterSpeed` (8), `parseCloudinaryExif` (6).
- **Total tests**: 170 (up from 127). All quality gates pass: lint ✓, tsc ✓, 170 tests ✓, build ✓.

### Handoff note for Gemini (frontend)
The `uploadEditorialImage()` return type now includes `exif: ParsedExif`. When Gemini's upload handler receives this response, it should populate the relevant EXIF fields in the `galleryEntries` JSON string that is submitted with the post save form. The EXIF fields to pass are:
- `exifTakenAt`: `exif.takenAt ? exif.takenAt.getTime() : null` (epoch ms)
- `exifLat`, `exifLng`: `exif.lat`, `exif.lng`
- `exifCameraMake`, `exifCameraModel`, `exifLensModel`
- `exifAperture`, `exifShutterSpeed`, `exifIso`

---

## Primary mission for next session

Your priority order:

### Task 1 — Authenticated E2E pipeline closure (PLAN V.5) — blocked until Jevon provides interactive access

Steps:
1. Run `bun run seed:e2e` (safe; idempotent fixture seeding into dev/test DB only)
2. Run `E2E_CAPTURE_LAUNCH_TIMEOUT_MS=600000 bun run e2e:capture-admin-state` — this opens a browser for interactive GitHub sign-in
3. Complete the interactive GitHub OAuth sign-in when prompted
4. Run `bun run test:e2e`
5. Confirm previously skipped authenticated admin tests now execute and pass

Report exactly which tests move from skipped to passed.

---

### Task 2 — Newsletter real-provider verification (PLAN 4.6) — blocked until Jevon provides credentials

The backend newsletter route is shipped. Verify the backend behaves correctly against a real Resend Segment.

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

### Task 3 — Apply migration 0009 to production (PLAN V.1 follow-up)

**DONE** — migrations `0007`, `0008`, and `0009` were all applied to production on 2026-03-19. No action needed.

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
- `web/src/server/services/comment-notifications.ts` — comment notification service (smoke test steps in header)
- `web/src/server/services/newsletter.ts` — newsletter subscribe service
- `web/src/app/api/newsletter/route.ts` — newsletter API route
- `web/src/lib/cloudinary/exif.ts` — EXIF parser utility (new)
- `web/src/lib/cloudinary/uploads.ts` — Cloudinary upload helpers (now returns EXIF)
- `web/src/server/dal/post-revisions.ts` — revision DAL (includes restore helpers)

---

## Important notes

- PLAN `V.9` is complete. Do not re-audit `as`/`any` usage — it's clean.
- Do not regress inline admin confirmations back to native `confirm()` dialogs.
- Do not assume remote Playwright targets are local; keep `E2E_BASE_URL` behavior intact.
- Drizzle migrations are append-only. Never edit already-applied migration files (`0000`–`0009`).
- Migration format: use `--> statement-breakpoint` **between** statements only — do NOT add a trailing breakpoint after the last statement. Libsql rejects the empty string that results from splitting on a trailing breakpoint. Compare `0006` (last line is SQL) vs the buggy `0007`/`0008` pattern (last line was `--> statement-breakpoint`) — the trailing breakpoints were removed and migrations applied cleanly.
- All migrations through `0009` have been applied to production.

---

## Report back with

1. E2E test results after authenticated pipeline closure (once admin storage state is captured)
2. Newsletter real-provider verification results (or blocker if credentials unavailable)
3. Confirmation that `0009_media_asset_exif.sql` has been applied to production (or blocker)
4. `bun run lint`, `bunx tsc --noEmit`, `bun run build`, `bun run test` results
5. If run: `bun run test:e2e` results

---

## Open manual tasks (not executable by any AI model without user action)

These require Jevon (manual):

| Task | What's Needed | Blocks |
|------|---------------|--------|
| V.1 | `bun run db:migrate` on production DB | **DONE 2026-03-19** — 0007, 0008, 0009 all applied |
| V.2 | Visit `/feed.xml`, `/category/*/feed.xml`, `/tag/*/feed.xml` in browser | PLAN 4.3 closure |
| V.3 | Verify view counter increments once per session in dev browser | PLAN 4.7 closure |
| V.4 | Google Rich Results Test on a deployed post URL | PLAN 4.4 closure |
| V.5 | Run authenticated E2E suite (`bun run seed:e2e` + `bun run e2e:capture-admin-state` + `bun run test:e2e`) | Full E2E coverage |
| V.7 | Delete legacy Cloudflare Worker | Cleanup |
| V.8 | Set `RESEND_API_KEY` + `RESEND_NEWSLETTER_SEGMENT_ID` in `.env.local` | Newsletter real-provider verification |
| V.10 | Enable email confirmation in Supabase dashboard | Security |
