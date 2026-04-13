# Project TODO

**Last Updated:** 2026-04-12

This tracker keeps only shipped reality plus the next implementation slice for the live app in `web/`.

## Current Production Reality

- [x] The production app is the Next.js App Router app in `web/`.
- [x] Public wishlist is live at `/wishlist` with map-first rendering and an admin editor at `/admin/wishlist`.
- [x] Route planner is live at `/route-planner` with `POST /api/route-plans`.
- [x] Route planning already consumes public wishlist places.
- [x] Admin navigation already exposes the wishlist route from `/admin`.
- [x] Security runtime lives in `web/src/proxy.ts` and non-CSP headers still ship from `web/next.config.ts`.

## Wishlist Workflow Refresh — Shipped

### Product goals (all shipped)
- [x] Add admin wishlist inputs for place name, autocompleted location, optional info link, and short description.
- [x] Show every public wishlist item on `/wishlist` with map on top and list below.
- [x] Add a whimsical wishlist CTA near the end of the homepage.
- [x] Let admins "check off" a wishlist item into a post-creation flow without removing it from the wishlist until the related post is actually published.
- [x] Remove published converted items from wishlist surfaces and let them live only as normal posts/map entries after publication.
- [x] Validate all admin wishlist inputs server-side (description length, HTTPS-only URL, autocomplete payload shape, UUID IDs).
- [x] TypeScript: clean (`bunx tsc --noEmit` exits 0).
- [x] Tests: 752/752 passing.

### Still open
- [x] Make route-planner entry point accessible from `/admin` nav (wishlist is already there). — shipped in commit `951058f`
- [x] Add UUID validation to `checkOffWishlistPlaceAction` for `id` and `linkedPostId` fields. — shipped in commit `951058f`

## PHASE 8 Dead-Code / Refactor Cleanup — Shipped

- [x] Remove unused `export` keywords from `admin-flash.ts`, `runtime-env.ts`, `sentry.ts`, `route-planner.ts`, `publish.ts`, `newsletter.ts`, `content.ts`.
- [x] Delete dead `getNewsletterEnvSetupInstructions` function (zero callers).
- [x] Delete orphaned `web/src/lib/errors.ts` (`AppError` class, zero consumers).
- [x] Delete orphaned `web/src/components/blog/post-card.tsx` (`PostCard` component, zero import sites).
- [x] Extract `safeRedirectPath` into `web/src/lib/auth/redirect.ts` (stricter version with control-character check); update all three auth form callers.
- [x] Consolidate duplicate `formatCommentDate` into `web/src/lib/comment-utils.ts`; update `comments.tsx` and `admin-comment-card.tsx`.
- [x] Consolidate duplicate `getInitials` into `web/src/lib/display-utils.ts`; update `author-card.tsx` and `author/[id]/page.tsx`.
- [x] Add unit tests for both new utility modules (16 tests total).
- [x] TypeScript clean, 778/779 tests passing. Deployed commit `32d2ef1`.

## Spotify / Editor / Wishlist Stability Refresh — Shipped Locally

- [x] Fix Tiptap thoughts block renderer so ProseMirror content holes are wrapped correctly and no longer crash the admin editor.
- [x] Derive editor reading stats from serialized Tiptap JSON instead of `editor.getHTML()` during render.
- [x] Style thoughts blocks as closed-by-default disclosure panels with visible summary text and expandable body content.
- [x] Support Spotify embeds on public post pages for track, album, and playlist links.
- [x] Allow URL-only song metadata so posts can render a Spotify player or external audio link even without title/artist text.
- [x] Add admin-only `POST /api/admin/song-preview` for debounced song preview/autofill with rate limiting and Spotify oEmbed lookup.
- [x] Send admin song preview URLs in request bodies instead of query strings to avoid leaking pasted media URLs into logs/history.
- [x] Validate Spotify artwork URLs before returning them to the admin preview UI.
- [x] Update CSP `frame-src` to allow `https://open.spotify.com` embeds.
- [x] Remove redundant `allowFullScreen` usage so iframe `allow` policy is authoritative.
- [x] Make new wishlist entries default to public.
- [x] Exclude linked published posts from the public wishlist query itself.
- [x] Deactivate linked wishlist places during single-post publish flows and revalidate `/wishlist`.
- [x] README synced to current wishlist and song-preview behavior.
- [x] Focused verification clean: targeted tests, lint, and `bunx tsc --noEmit` all pass for touched flows.

## Deployment Follow-Ups

- [x] `src/app/(blog)/map/page.tsx` type error — fixed (`let allPosts: BlogPost[] = []` is explicitly typed, `bunx tsc --noEmit` is clean).
- [ ] Investigate production Vercel runtime log from `serverless-middleware` showing `Debugger listening on ws://127.0.0.1:...` on `GET /` despite a `200` response. **Diagnosis:** not in any repo file or `vercel.json`; likely a `NODE_OPTIONS=--inspect*` env var in the Vercel dashboard. Build-time sanitization already strips these for `next build` via `scripts/build.ts`, but the runtime env is separate. **Fix:** remove the flag from Vercel dashboard → Settings → Environment Variables. Requires dashboard access.

## Immediate Documentation To Keep In Sync

- [x] Update README and any route docs after wishlist behavior, admin IA, or new env/config requirements change.
- [ ] Keep this file aligned with shipped behavior and delete stale backlog items after each batch.

## Verification Default

Run from `web/` for implementation batches:

```bash
bun run lint
bunx tsc --noEmit
bun run test
bun run test:e2e
bun run build
```
