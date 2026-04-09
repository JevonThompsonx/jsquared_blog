# Agent Memory

## Status
- Active checklist source: `TODO.md`
- Repo is in a dirty worktree; do not disturb unrelated in-flight edits
- Current focus: authenticated public E2E remains the smallest explicit open batch, but the live rerun is still blocked by missing managed fixture metadata rather than missing test code

## Completed
- Read `CLAUDE.md`, `README.md`, `prompt.md`, `WORKING-CONTEXT.md`, and `TODO.md`
- Confirmed `TODO.md` is the canonical execution tracker
- Identified remaining open checklist lanes: trust-boundary coverage follow-ups, correctness/cleanup backlog, and E2E confidence items
- Added Playwright smoke coverage for `/signup` and discovered public `/tag/[slug]` route shells in `web/tests/e2e/smoke.spec.ts`
- Verified new smoke slice green: targeted Playwright run passed for signup and tag; series discovery still skips when no public series link is discoverable from current content
- Confirmed live authenticated bookmark-removal rerun is blocked by missing managed public storage-state metadata, not by a failing test
- Removed unused auth helper shims `web/src/lib/auth/identities.ts` and `web/src/lib/auth/public.ts`
- Removed unused `getSupabaseServerClient()` export from `web/src/lib/supabase/server.ts`
- Verified cleanup batch green: 71 focused auth/public-route tests passed, `bunx tsc --noEmit` passed, and `bun run build` passed
- Centralized the homepage infinite-feed Playwright skip gate behind one explicit dataset-precondition helper and confirmed the spec still quarantines cleanly when `/` already renders the end-of-feed shell on first load
- Verified the quarantine sync with `bunx playwright test "tests/e2e/homepage-infinite-feed.spec.ts" --project=chromium`, `npx eslint "tests/e2e/homepage-infinite-feed.spec.ts"`, and `bunx tsc --noEmit`
- Reconfirmed the authenticated public E2E blocker: `bunx playwright test "tests/e2e/public-authenticated.spec.ts" --project=chromium` skipped all 13 tests because managed public fixture metadata is still missing locally
- Removed the handled `console.error("[wishlist] Failed to load public wishlist places")` noise from the public `/wishlist` page and tightened the unit test to prove the fallback shell stays silent while still rendering correctly
- Verified the wishlist batch with `bunx vitest run tests/unit/wishlist-page.test.ts` and touched-file eslint; also removed the touched route's local implicit-`any[]` issue by typing `places` as `PublicWishlistPlace[]`

## Remaining
- Expand critical route smoke coverage where still missing
- Expand authenticated admin/public flow coverage where safely possible
- Reduce or document flaky E2E behavior
- Continue backlog items in `TODO.md` without overlapping unrelated active edits
- Revisit repo-wide typecheck cleanup later: remaining failures now sit in `src/app/(blog)/map/page.tsx` and `tests/e2e/smoke.spec.ts`, not the wishlist route

## Active Task
- Return to the next safe unchecked TODO batch now that the `/wishlist` handled-failure console regression is closed

## Blockers
- Live managed public-fixture reruns remain safety-gated if they require remote seeding or unsafe env changes
- `bun run e2e:capture-public-state` currently fails because `E2E_PUBLIC_FIXTURE_GENERATED_AT` is absent from local managed fixture env metadata; reseeding remains intentionally blocked against the current remote Supabase target
- Homepage infinite-feed live pagination assertions remain dataset-blocked until the managed public fixture guarantees more than one feed page
- Confirmed again in the current shell: `web/.env.test.local` still lacks `E2E_PUBLIC_FIXTURE_GENERATED_AT`, no `web/playwright/.auth/*.meta.json` sidecar exists, and `web/tests/e2e/helpers/public.ts` therefore resolves `hasPublicStorageState` to `false`, keeping `bunx playwright test "tests/e2e/public-authenticated.spec.ts" --project=chromium` blocked before browser execution and causing all 13 authenticated-public tests to skip
- A new clean-file Playwright smoke attempt for `/wishlist` is also blocked for now: the dedicated probe `bunx playwright test "tests/e2e/wishlist-page.spec.ts" --project=chromium` reached the global `Trail interrupted` / `Something went sideways.` shell instead of the route heading, which suggests unrelated instability in already-dirty shared app surfaces rather than an isolated missing-route contract.

## Decisions
- Use `TODO.md` as canonical checklist; `agent.md` is only the concise execution memory
- Avoid files already showing unrelated active edits unless the batch requires them
- Prefer unblocked test-only or deletion-only slices while the managed public-auth lane lacks safe local fixture metadata
- Favor verified dead-code removal when grep confirms zero references and existing route/auth suites cover the surviving live surfaces
- Treat homepage feed page-two assertions as fixture-dependent coverage, not a browser-timing failure, until the managed dataset guarantees pagination

## Next Action
- Wait for safe public-fixture metadata regeneration, a stabilized shared app shell, or a newly identified clean-file batch that does not overlap the current in-flight app edits
