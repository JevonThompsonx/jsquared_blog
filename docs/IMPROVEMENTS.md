# Improvement & Feature Backlog

**Created:** 2026-06-15
**Status:** Project is at a stable place; this is the prioritized backlog of future work.

This document lists concrete improvements, refactors, and feature work that has been identified for the J² Adventures blog. Items are grouped by area and roughly prioritized within each group.

---

## Tech Debt / Maintenance

### M1. Bump ESLint to 10 when plugin ecosystem catches up
- **Why:** ESLint 10 was attempted but blocked because `eslint-plugin-react@7.37.5` (bundled with `eslint-config-next@16.2.9`) calls `context.getFilename()`, which was removed in ESLint 10.
- **Action:** Watch for `eslint-config-next` to ship with `eslint-plugin-react@8.x`. Re-attempt the bump then. PR #17 documents the blocker.
- **Effort:** Low (dependency bump + config review)

### M2. Migrate to ESLint 10 / eslint-plugin-react 8.x plugin compat
- **Why:** The current pinned combo (`eslint@9.39.4` + `eslint-plugin-react@7.37.5`) is two major versions behind. Newer plugin versions support the new `meta.languages` API and drop deprecated rule internals.
- **Action:** Track upstream; revisit when the Next.js team's flat config catches up.
- **Effort:** Low

### M3. Adopt TypeScript 7.0 (native) when available
- **Why:** TypeScript 6.0 is a transition release. TS 7.0 (native Go port) is "extremely close to completion" per Microsoft. It will be a major perf win for `tsc`.
- **Action:** Test against `@typescript/native-preview`; switch once stable.
- **Effort:** Medium (need to validate all build tooling)

### M4. Add a separate `lint:fix` script
- **Why:** Currently only `pnpm run lint` exists. Some projects benefit from a `lint:fix` script that runs `eslint --fix`.
- **Action:** Add `web/package.json` script and document in SETUP.md.
- **Effort:** Trivial

### M5. Add a `test:watch` script
- **Why:** Currently `vitest` runs once. Devs iterating on tests benefit from watch mode.
- **Action:** Add `vitest` (no `run`) as `test:watch` in `web/package.json`.
- **Effort:** Trivial

### M6. Bump `@types/node` to match runtime
- **Why:** Currently pinned at `25.x` while running Node 24. Not strictly broken, but the gap will widen.
- **Action:** Bump when convenient; or loosen to `^24`.
- **Effort:** Trivial

---

## Security

### S1. Add `web/.env.test.local` to repo as `web/.env.test.example`
- **Why:** Test env file is generated ad-hoc. A checked-in example would let new contributors run tests without reading README.
- **Action:** Add example file with dummy values matching what the Zod schema accepts.
- **Effort:** Low

### S2. Add Sentry release tagging in CI
- **Why:** Sentry source maps are uploaded during build, but releases aren't tagged with git SHAs, so stack traces can't be linked to commits.
- **Action:** Set `SENTRY_RELEASE=${{ github.sha }}` in build env. Use `Sentry-Auth` header or CLI `--release` flag.
- **Effort:** Low

### S3. Consider `@upstash/ratelimit` strict mode toggle
- **Why:** Production fails closed without Upstash. But local tests still get the in-memory fallback. The fail-closed check is in `assertRateLimitConfiguration` — verify it's covered by a unit test.
- **Action:** Add a unit test that asserts production-mode missing Upstash throws at module load.
- **Effort:** Low

### S4. Audit admin auth — GitHub ID allowlist ergonomics
- **Why:** `AUTH_ADMIN_GITHUB_IDS` is a comma-separated string. Easy to typo. Consider a Zod-validated array schema (with splitting transform) so invalid IDs fail at boot.
- **Action:** Add Zod transform; surface clear error if a non-numeric ID is present.
- **Effort:** Low

### S5. CSP report-uri / report-to
- **Why:** CSP is set per-request via nonce but there's no `report-uri` or `report-to` so violations are invisible.
- **Action:** Add a `report-to` directive pointing to a Sentry/Cloudflare endpoint, or a simple `/api/csp-report` route that logs.
- **Effort:** Low–Medium

---

## Performance

### P1. Image optimization audit
- **Why:** Cloudinary `f_auto,q_auto` is used, but no width/height hints in the `<img>` markup may cause CLS.
- **Action:** Audit `next/image` usage; ensure `width`/`height` are set or `fill` with sized parent.
- **Effort:** Medium

### P2. Bundle size analysis
- **Why:** No current bundle analysis. Risk of accidental heavy imports (e.g., `maplibre-gl` is ~700KB).
- **Action:** Add `@next/bundle-analyzer` and a `build:analyze` script.
- **Effort:** Low

### P3. Database query review — N+1 risk
- **Why:** Drizzle queries look correct but worth a focused audit for the homepage feed (published posts + author + featured image + tags).
- **Action:** Trace the homepage query, ensure joins are used where it matters.
- **Effort:** Medium

### P4. ISR revalidation tuning
- **Why:** `revalidate` values across public pages may not be tuned. A blog post comment that just got added can take a long time to appear on the page.
- **Action:** Audit `revalidate` / `revalidatePath` calls; tune for the "post → first paint" path.
- **Effort:** Medium

### P5. Tiptap editor bundle split
- **Why:** Tiptap is heavy. If it's only used in admin, ensure it's lazy-loaded and not part of the public bundle.
- **Action:** Verify admin routes don't import Tiptap into the public chunks via shared `web/src/components/`.
- **Effort:** Medium

---

## Features

### F1. Full-text search
- **Why:** Current search is title/description/category/tags only. Real travel blogs benefit from full-text across post body.
- **Action:** Either: (a) SQLite FTS5 in Turso, (b) embed-based semantic search via OpenAI/Cohere + Upstash Vector. (a) is simpler.
- **Effort:** Medium–High

### F2. RSS feed per category / per tag
- **Why:** Master feed exists at `/feed.xml`. Per-category RSS would help power-users follow only the trips they care about.
- **Action:** Add `category/[category]/feed.xml` and `tag/[slug]/feed.xml` route handlers.
- **Effort:** Low

### F3. Newsletter segmentation UI
- **Why:** Resend segment ID is set via env. Admins can't see how many subscribers are in the segment without going to Resend.
- **Action:** Add an admin route that calls Resend's `GET /segments/{id}` and shows count + last sync.
- **Effort:** Low

### F4. Comments — threading depth cap
- **Why:** Comment replies are unboundedly nested. Long threads can become unwieldy on mobile.
- **Action:** Cap visual nesting at depth 3 and flatten deeper replies ("/u/someone replied to /u/someoneelse").
- **Effort:** Low

### F5. Wishlist — "iOverlander" import
- **Why:** `ioverlander_url` is stored on posts but not surfaced as a quick-add path for wishlist entries.
- **Action:** Admin "Add to wishlist from iOverlander URL" — fetch the page, parse place name, prefill the form.
- **Effort:** Medium

### F6. Map — public read-only toggle
- **Why:** Public `/map` only shows geotagged posts. Wishlist places also have location data. A toggle to overlay wishlist on the map would be useful for "where I want to go vs where I've been".
- **Action:** Add `?show=wishlist` query param to the map page; pass through to the data layer.
- **Effort:** Low

### F7. Image focal point — drag-to-set UI
- **Why:** Focal point is stored numerically (x, y 0–1). Admin can currently only set it via a number input.
- **Action:** Replace the number inputs with a clickable image preview that stores the click point.
- **Effort:** Medium

### F8. Scheduled post — admin preview before publish
- **Why:** Admins can schedule a post but can't see what it will look like until it actually publishes (or via a manually generated preview link).
- **Action:** Generate a one-off preview link from the schedule form.
- **Effort:** Low

### F9. Bookmarks — collections / folders
- **Why:** Bookmarks is a flat list. As the post count grows, users will want to organize.
- **Action:** Add a `bookmark_collections` table; UI to create / move / delete.
- **Effort:** High

### F10. PWA — push notifications
- **Why:** PWA manifest exists but no push. New post notifications would drive return visits.
- **Action:** Add a push service worker + Supabase edge function. Requires user consent UI.
- **Effort:** High

### F11. Admin dashboard — engagement metrics
- **Why:** Admin dashboard lists posts but doesn't show views / likes / comments per post.
- **Action:** Add a "metrics" column with view count and engagement.
- **Effort:** Low

### F12. Comments — moderation queue with bulk actions
- **Why:** Comments are moderated one at a time. Bulk approve/reject would be useful.
- **Action:** Add bulk action bar to admin comments list (similar to bulk status on posts).
- **Effort:** Low

---

## Responsive Design (from `docs/responsive-design-plan.md`)

The full plan lives in `docs/responsive-design-plan.md`. Phases are roughly:

### R1. Admin post editor — mobile polish
- Sticky action bar `top-24` is too tall on short mobile
- External links row `flex gap-2` should `flex-wrap`
- Toolbar `top: 5rem` assumes fixed header height
- Emoji picker `width={300}` overflows on mobile
- **Effort:** Low–Medium

### R2. Admin dashboard & sub-pages
- Search input `gap-3` grid is tight on tablet
- Tag/season/wishlist admin pages all use `lg:grid-cols-[Xrem_1fr]`
- Add `sm:px-6` consistent padding where missing
- **Effort:** Low

### R3. Account settings
- Zero responsive breakpoints in 741 lines
- `flex gap-3` rows (name/email/URL + button) overflow at <360px
- Account `layout.tsx` `pt-28` wastes space on short mobile
- **Effort:** Low

### R4. Auth forms
- Operationally mobile-safe, but zero breakpoints
- Card `p-8` is generous on <360px
- **Effort:** Low

### R5. Public blog pages
- Category/tag/series `pt-28` should be responsive
- 404/error `min-h-[70vh]` should be checked
- **Effort:** Trivial

### R6. globals.css polish
- `scroll-padding-top: 5rem` hardcoded for navbar height
- Card overlay `min-height: 10.5rem` only at 768px+
- `landing-page { min-height: 38rem }` is taller than short viewports
- **Effort:** Trivial

### R7. QA pass
- Emulate 320px / 375px / 768px / 1024px / 1920px
- Touch target audit
- Tiptap on mobile
- **Effort:** Medium

---

## Documentation

### D1. Add a `docs/CHANGELOG.md`
- **Why:** Releases aren't tracked. Useful for migration notes.
- **Action:** Add CHANGELOG, follow Keep a Changelog format.
- **Effort:** Low (one-time), Medium (ongoing)

### D2. Document `testImages/` and `test-api.sh`
- **Why:** Both are committed but undocumented.
- **Action:** Mention them in README. If `test-api.sh` is obsolete, archive it.
- **Effort:** Trivial

### D3. Add a `docs/STYLEGUIDE.md`
- **Why:** Lots of design decisions are scattered. A single design source of truth would help.
- **Action:** Extract design tokens (colors, spacing) and component patterns into one doc.
- **Effort:** Medium

### D4. Document the responsive plan in this backlog
- **Why:** `responsive-design-plan.md` duplicates the R1–R7 list above.
- **Action:** Add a pointer at the top of `responsive-design-plan.md` to this section.
- **Effort:** Trivial

---

## Operational

### O1. Get the forgejo tunnel back online
- **Why:** Forgejo remote returns 530 (Argo Tunnel down). Local/origin/forgejo are out of sync.
- **Action:** Restore Argo Tunnel, push the 4 missing commits to forgejo.
- **Effort:** External (infrastructure)

### O2. Add E2E tests to CI
- **Why:** E2E suite exists but isn't run on PR. Risk of regressions in user-facing flows.
- **Action:** Add a 4th CI job that installs Playwright browsers and runs `pnpm run test:e2e` against a built app.
- **Effort:** Medium

### O3. Add bundle size budget check
- **Why:** Easy to accidentally bloat. A budget catches it.
- **Action:** Add `bundlesize` or `size-limit` job to CI.
- **Effort:** Low

### O4. Vercel deploy previews
- **Why:** Vercel auto-deploys on push, but PRs from forks don't get previews by default.
- **Action:** Configure Vercel to comment with preview URL on PRs.
- **Effort:** Trivial (Vercel dashboard config)

### O5. Dependabot auto-merge
- **Why:** Dependabot minor/patch PRs are noisy once you have CI green. Auto-merge once CI passes.
- **Action:** Add `gh pr merge --auto` bot or configure Dependabot `auto-merge` option in `.github/dependabot.yml`.
- **Effort:** Low

---

## Prioritization Recommendation

**Next sprint (1–2 weeks):**
- M4, M5 (trivially useful dev scripts)
- R3, R4 (mobile breakage in account/auth)
- D2, D4 (doc cleanup)
- O5 (Dependabot auto-merge — will reduce noise)

**Next month:**
- F2, F4, F8, F11, F12 (low-effort, high-value features)
- P2, P5 (perf hygiene)
- S1, S2 (security polish)

**Next quarter:**
- F1 (full-text search — the biggest UX win)
- F3, F6, F7 (map / wishlist / focal point polish)
- R1, R2, R7 (admin responsive)

**Backlog / nice-to-have:**
- F9, F10 (collections, push)
- P1, P3, P4 (perf deep-dive)
- M1, M2, M3, M6 (tooling upgrades)
- D1, D3 (doc expansions)
- O1, O2, O3, O4 (ops)

---

## How to pick up an item

1. Create a branch: `git checkout -b feat/<id>-<short-name>` (e.g., `feat/r3-account-responsive`)
2. Open a draft PR with the title `WIP: <id> <name>` so the CI can run
3. Mark the item with the in-progress PR link
4. When done, mark `[x]` in this file and link the merged PR
