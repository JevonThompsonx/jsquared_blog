# GPT-5.4 Future Iteration Handoff

**Project**: J²Adventures (`web/` — Next.js 16 App Router, TailwindCSS 4, Turso/Drizzle, Supabase Auth, Auth.js admin)
**Role**: Review + targeted implementation pass across tests, docs, backend/frontend boundaries, and contained fixes.
**Read first**: `AGENTS.md`, `docs/handoff.md`, `docs/PLAN.md`, `TODO.md`, `prompt.md`

## Current state

The app is live and stable. Phase 4 is active.

- PLAN `4.1` comment moderation is done.
- PLAN `4.8` widened admin layouts are done and browser-QA'd.
- PLAN `4.4` JSON-LD is implemented in code but still needs deployed Rich Results validation.
- PLAN `4.5` reading time is now done in shared code.

## Latest GPT-5.4 review/fix pass

- Verified the recent GPT/Gemini work instead of trusting it blindly.
- Fixed the Playwright admin smoke regression caused by using native `selectOption()` against the Radix admin filter select in `web/tests/e2e/smoke.spec.ts`.
- Fixed `web/playwright.config.ts` so remote `E2E_BASE_URL` runs do not start a local dev server.
- Hardened admin media accessibility in `web/src/components/admin/post-media-manager.tsx` so uploads no longer default to filename alt text and the review state stays honest.
- Replaced the post-editor clone `confirm()` with an inline themed confirmation in `web/src/components/admin/post-editor-form.tsx`.
- Updated `web/src/app/layout.tsx` metadata copy to describe the live site instead of the migration.
- Cleaned the recent unsafe cast from `web/src/lib/auth/session.ts`.
- Re-aligned the key docs so they no longer claim transitional Tiptap storage or outdated model names.
- Added reusable authenticated Playwright helpers in `web/tests/e2e/helpers/admin.ts` and an interactive storage-state capture script in `web/scripts/capture-admin-storage-state.ts`.
- Finished the homepage seasonal cleanup in `web/src/app/(blog)/page.tsx` and `web/src/app/globals.css`.
- Centralized reading-time calculation in `web/src/lib/content.ts` and threaded it through `web/src/server/queries/posts.ts`, the live post page, and preview page.
- Improved JSON-LD metadata in `web/src/app/(blog)/posts/[slug]/head.tsx` to use published/updated timestamps, publisher metadata, and fuller image arrays.

## Verified commands from this pass

Run from `web/`:

- `bun run lint` — passed
- `bunx tsc --noEmit` — passed
- `bun run build` — passed
- `bun run test` — passed
- `bun run test:e2e` — public smoke passed; authenticated admin smoke now also works with `playwright/.auth/admin.json`, while the inline delete-confirm moderation check still needs `E2E_ADMIN_POST_ID`

## Best next tracks for GPT-5.4

### 1. Strengthen authenticated E2E coverage

- Use `bun run e2e:capture-admin-state` to generate a local reusable Auth.js session file, then run the authenticated smoke paths against a real local or remote target.
- Add a stable seeded/admin fixture for a post with comments so `E2E_ADMIN_POST_ID` is no longer manual for delete-confirm coverage.
- Expand smoke coverage to exercise clone/preview/moderation/tag-edit flows under auth.
- Keep tests compatible with the custom Radix select controls and inline admin confirmations.

### 2. Close the structured-data loop honestly

- Validate a deployed published post URL in Google Rich Results Test.
- Only mark PLAN `4.4` done after that deployed verification.

### 3. Pick the next contained implementation task

The cleanest options at pickup time are:
- PLAN `4.7` privacy-respecting post views
- targeted strict-TypeScript cleanup in touched files while preserving behavior
- README modernization, because the root README still documents the retired React/Hono/Supabase stack

## Important notes

- Do not claim the repo is fully free of `as` assertions; older ones still exist outside this pass.
- Do not regress inline admin confirmations back to native dialogs.
- Do not assume remote Playwright targets are local; keep `E2E_BASE_URL` behavior intact.
- This environment could not reach `https://jsquaredadventures.com`, so deployed Rich Results validation remains unverified and manual/external.
- The worktree may be dirty with unrelated edits. Avoid broad cleanup and do not revert work you did not make.

## Files that matter most now

- `web/playwright.config.ts`
- `web/tests/e2e/smoke.spec.ts`
- `web/tests/e2e/helpers/admin.ts`
- `web/scripts/capture-admin-storage-state.ts`
- `web/src/components/admin/post-media-manager.tsx`
- `web/src/components/admin/post-editor-form.tsx`
- `web/src/components/admin/admin-dashboard.tsx`
- `web/src/components/admin/admin-comments-panel.tsx`
- `web/src/components/admin/admin-comment-card.tsx`
- `web/src/lib/content.ts`
- `web/src/server/queries/posts.ts`
- `web/src/app/(blog)/posts/[slug]/head.tsx`
- `web/src/app/(blog)/page.tsx`
- `docs/handoff.md`
- `docs/gemini_3_flash_frontend_prompt.md`

## Suggested order next time

1. Re-read `docs/handoff.md`, `TODO.md`, and `docs/PLAN.md`.
2. Decide whether the next pass is verification-heavy (tests/docs) or a contained feature.
3. Re-run `bun run lint`, `bunx tsc --noEmit`, and `bun run build` after any edits.
4. Update the handoff docs again with actual results, not assumptions.
