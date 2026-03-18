# J²Adventures – Next.js Handoff

Last updated: 2026-03-18

## Where the project stands

The Next.js app in `web/` is the production codebase. Core reading, auth, comments,
admin flows, maps, and SEO are live. The current focus is verification, polish, and
contained Phase 4 follow-up work rather than migration.

The source-of-truth trackers are:
- `TODO.md` for the practical backlog
- `docs/PLAN.md` for phase/task status
- `docs/nextjs-cutover-checklist.md` for cutover/readiness notes

## What the latest pass reviewed and fixed

- Reviewed the recent GPT-5.4 and Gemini admin/testing/docs work instead of assuming it was correct.
- Fixed the authenticated Playwright smoke regression in `web/tests/e2e/smoke.spec.ts` by using the Radix select interaction instead of native `selectOption()`.
- Fixed Playwright environment handling in `web/playwright.config.ts` so remote `E2E_BASE_URL` runs do not start a stray local dev server.
- Tightened admin media accessibility in `web/src/components/admin/post-media-manager.tsx`: new uploads no longer inherit filename alt text, and the accessibility summary stays in review until descriptive copy exists.
- Replaced the post-editor clone `confirm()` with an inline themed confirmation in `web/src/components/admin/post-editor-form.tsx` so admin destructive/branching actions stay consistent.
- Updated site metadata copy in `web/src/app/layout.tsx` so the live site no longer describes itself as a migration.
- Removed the unsafe cast in `web/src/lib/auth/session.ts` from the latest pass.
- Added a reusable admin Playwright path in `web/tests/e2e/helpers/admin.ts`, including a default `playwright/.auth/admin.json` fallback and a non-committed capture helper at `web/scripts/capture-admin-storage-state.ts`.
- Expanded authenticated smoke coverage so moderation summary/state checks can run from the dashboard even without `E2E_ADMIN_POST_ID`, while the inline delete-confirm flow stays gated to a known comment-bearing post.
- Finished the homepage seasonal cleanup in `web/src/app/(blog)/page.tsx` and `web/src/app/globals.css`: removed the placeholder spring copy, kept `J²Adventures` as the primary title, and added a more intentional seasonal note panel.
- Landed the mobile nav drawer in `web/src/components/layout/mobile-nav.tsx` and `web/src/components/layout/site-header.tsx`, then tightened it so link clicks close the drawer reliably.
- Centralized reading-time calculation in `web/src/lib/content.ts` and exposed it through `web/src/server/queries/posts.ts`; editor estimates now use the same shared helpers, and empty content no longer reports placeholder words.
- Improved JSON-LD output in `web/src/app/(blog)/posts/[slug]/head.tsx` to use published/updated timestamps, publisher metadata, and a fuller image list.
- Fixed a stale public smoke test in `web/tests/e2e/smoke.spec.ts` so search coverage follows the real `?search=` query param.
- Refined filename-alt detection in `web/src/components/admin/post-media-manager.tsx` so obviously generated alt text is flagged without penalizing normal descriptive copy.

## Verification completed in this pass

- `bun run lint` from `web/` — passed
- `bunx tsc --noEmit` from `web/` — passed
- `bun run build` from `web/` — passed
- `bun run test` from `web/` — passed (`85` tests)
- `bun run test:e2e` from `web/` — passed for the public smoke suite (`10` passed); authenticated admin smoke now looks for `E2E_ADMIN_STORAGE_STATE` or `playwright/.auth/admin.json`, with only the delete-confirm moderation path still requiring `E2E_ADMIN_POST_ID`

## What is done

- PLAN `4.1` comment moderation is live with optimistic updates, inline errors, summary stats, themed states, and inline delete confirmation.
- PLAN `4.8` widened admin layouts are done and browser-QA'd on `/admin`, `/admin/tags`, and `/admin/posts/[postId]/comments`.
- PLAN `4.4` JSON-LD is implemented in `web/src/app/(blog)/posts/[slug]/head.tsx`, and the payload is now stronger, but deployed Rich Results validation is still pending.
- PLAN `4.5` reading time is now effectively done in code: shared helpers power post pages, previews, and editor estimates from one content-derived path.
- PLAN `3.5` mobile nav UX improvements are now in place with a dedicated drawer component and search/account parity.
- Canonical Tiptap JSON storage is live; legacy HTML remains read-compatible only.
- Public smoke coverage is working locally, and the Playwright config is now safe for local and remote targets.

## What is still open

### 1. Verification follow-through

- Capture and store a real admin state file with `bun run e2e:capture-admin-state`, then use it to run the authenticated smoke suite for `/admin`, `/admin/tags`, and `/admin/posts/[postId]/comments`.
- Add one stable seeded/admin fixture post with comments so the inline delete-confirm smoke path can run without manual `E2E_ADMIN_POST_ID` setup.
- Validate a deployed published post in Google Rich Results Test before closing PLAN `4.4`.
- Keep browser QA tied to real changes instead of speculative layout churn.

### 2. Product/UX follow-up

- Continue Phase 3 polish items that still need real audits, especially accessibility/CWV cleanup backed by real browser checks.

### 3. Operational cleanup

- Decommission the legacy Cloudflare Worker and remove stale dashboard/build settings.
- Optionally add custom SMTP for Supabase if shared email becomes unreliable.

## Important caveats

- Do not claim Google Rich Results validation is complete without a deployed URL check.
- Do not regress admin confirmation patterns back to browser-native dialogs.
- The network in this environment could not reach `jsquaredadventures.com`, so deployed JSON-LD validation is still blocked on an external/manual check.
- The strict quality gate passes, but the repo still contains older `as` assertions outside this latest pass; keep docs honest about that.
- The worktree may contain unrelated in-progress changes. Do not revert work you did not make.

## Key files right now

- `web/playwright.config.ts` — local vs remote E2E behavior
- `web/tests/e2e/smoke.spec.ts` — smoke coverage and admin env-gated tests
- `web/tests/e2e/helpers/admin.ts` — shared authenticated Playwright helpers and storage-state fallback
- `web/scripts/capture-admin-storage-state.ts` — interactive Auth.js storage-state capture helper
- `web/src/components/admin/admin-dashboard.tsx` — verified admin layout baseline
- `web/src/app/admin/tags/page.tsx` — verified tags layout baseline
- `web/src/components/admin/admin-comments-panel.tsx` — moderation summary/sort baseline
- `web/src/components/admin/admin-comment-card.tsx` — inline delete-confirm baseline
- `web/src/components/admin/post-editor-form.tsx` — inline clone confirmation and editor shell
- `web/src/components/admin/post-media-manager.tsx` — alt-text review behavior
- `web/src/lib/content.ts` — shared word-count / reading-time helpers
- `web/src/server/queries/posts.ts` — reading-time and post metadata shaping
- `web/src/app/(blog)/posts/[slug]/head.tsx` — JSON-LD source of truth
- `web/src/app/(blog)/page.tsx` — refreshed seasonal homepage hero
- `web/src/app/layout.tsx` — live-site metadata and analytics script

## Future handoffs

- GPT-5.4 follow-up brief: `docs/gpt54_future_iteration_handoff.md`
- Gemini 3 Flash frontend brief: `docs/gemini_3_flash_frontend_prompt.md`
