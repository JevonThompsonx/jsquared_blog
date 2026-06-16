# J² Adventures — Changelog

> **For any agent opening this repo:** This file logs completed work. When you finish a branch, add an entry here. Format follows [Keep a Changelog](https://keepachangelog.com/).

**Format:** Each entry groups changes by branch. Within a branch, items are grouped by type (Added, Changed, Fixed, Removed, Security).

---

## [0.4.5] — 2026-06-15

### Branches: `feat/performance-and-reliability` (PR #50), `feat/site-search` (PR #51), `chore/cleanup-and-hardening` (PR #52), `feat/polish` (PR #53)

#### Branch: `feat/performance-and-reliability` (PR #50)

- **Public post query caching** — `listPublishedPosts()` in `web/src/server/queries/posts.ts` is now wrapped with Next.js `unstable_cache()` (30s TTL, tag `['posts']`). The cache invalidates via `revalidateTag('posts', 'max')` on bulk publish/unpublish, create/update post, and delete post actions. Note: Next.js 16's `revalidateTag` requires a second `profile` argument; `"max"` is used throughout.
- **Wishlist images → `next/image`** — The raw `<img>` (with eslint-disable) on `web/src/app/(blog)/wishlist/page.tsx` is now a `<Image>` from `next/image` with `width=1200 height=192 sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"`. The eslint-disable comment was removed.
- **Sentry in 500 catch blocks** — `captureException(error, { route, ...context })` from `@/lib/sentry` is now wired into 7 public 500 paths: posts list, bookmarks, post-view, post-comments (GET+POST), post-bookmark (GET+POST), comment-delete, comment-like. Error context is forwarded to Sentry.
- **Related posts: date + reading time** — Each related post card now renders the `PostDate` component and a reading-time string, matching the `HomePostCard` style.
- **Rate limit fails hard in production** — `web/src/lib/rate-limit.ts` now `throw new Error(...)` instead of `console.warn` when `isDeployedEnvironment` is true and Upstash env vars are missing. Dev still warns so the dev experience is preserved.

#### Branch: `feat/site-search` (PR #51)

- **`/search` page** — New route at `web/src/app/(blog)/search/page.tsx`. Reads the `q` query param (Zod-validated, trimmed, max 200 chars), calls `listPublishedPosts(20, 0, q)` for the first page, and renders the existing `FilteredFeed` for pagination via `/api/posts?search=...`. Pre-fills the `SearchInput` and shows a "No results for `q`" empty state (with suggestions) when no posts match.
- **Search page loading skeleton** — `web/src/app/(blog)/search/loading.tsx` mirrors the page layout with an animated hero placeholder and 8 `PostCardSkeleton` cards.
- **Header search routes to `/search`** — `site-header.tsx` and `mobile-nav.tsx` form actions are now `/search`, the input name is `q`, and `navigateToSearch` builds `/search?q=…` URLs. The pathname guard now keys off `/search` so the live debounce is consistent on the new page.
- **Cmd+K / Ctrl+K shortcut** — `site-header.tsx` registers a `window` keydown listener that prevents default and focuses the desktop search input when `metaKey` (macOS) or `ctrlKey` (Windows/Linux) is held with `K`. The shortcut works from any page. The placeholder was updated to `"Search stories… (⌘K)"` on both desktop and mobile. The listener is removed on unmount.

#### Branch: `chore/cleanup-and-hardening` (PR #52)

- **Song preview endpoint uses Zod** — `POST /api/admin/song-preview` now validates the request body with `z.object({ url: z.string().url().max(2048) })` via `safeParse`. Invalid payloads return **400** with a `details` array of Zod issues; bad JSON also returns 400. Valid Spotify and other HTTPS URLs continue to return 200 with the same `{ song, source, artworkUrl? }` payload.
- **Retired route planner is rate-limited** — `POST /api/route-plans` runs a per-IP rate limit (10 req/min) before the 410 reply, so the endpoint is throttled like every other public route. The 410 response and the nodejs runtime are preserved.
- **Cloudinary orphans cleaned up on post delete** — `web/src/server/posts/delete.ts` now collects every `mediaAssets` row referenced by the deleted posts' gallery and featured image before the transaction commits, then issues a best-effort `uploader.destroy` for each Cloudinary-hosted asset after the transaction succeeds. Supabase-hosted assets are skipped. Failures are logged via `captureException` and `console.error` but do not undo the post deletion, so partial Cloudinary outages can't strand rows.
- **Proxy request logging** — `web/src/proxy.ts` now logs `[proxy] <METHOD> <PATH> <STATUS> <DURATIONms>` to `console.info` in production only. The 403 short-circuit (cross-site admin mutations) and the 200 fall-through both go through the same logger. Env is read at call time so tests can flip it per-case.
- **Cron health observability** — `GET /api/cron/publish-scheduled` now emits a Sentry breadcrumb tagged `cron` after every run with `{ scanned, published, errors, nowIso }`. `errors` is the count of revalidation / wishlist-deactivation failures observed during the run. `web/src/lib/sentry.ts` gained an `addBreadcrumb(message, data?, category?)` helper alongside the existing `captureException`.
- **New `web/src/server/cloudinary/destroy-asset.ts`** — `destroyCloudinaryAsset({ publicId, resourceType })` (HMAC-signed `POST /image/destroy` against the Cloudinary REST API) and `logCloudinaryCleanupError` (Sentry capture + console.error) keep the route handler thin and let tests mock the destroy call without stubbing global `fetch`.

#### Branch: `feat/polish` (PR #53)

- **Print styles** — Extended the `@media print` block in `globals.css` to explicitly hide the comments section, share buttons, copy-link button, bookmark button, newsletter signup form, skip link, back-to-top, and post map (in addition to the existing header/nav/footer/reading-progress-bar/table-of-contents/related-posts-section). Author card and post meta now have explicit `page-break-inside: avoid` so they survive across page breaks.
- **Reading progress a11y** — `<ReadingProgressBar />` now renders a visually hidden `role="status"` `aria-live="polite"` region that announces "Reading progress: 25%/50%/75%" at each milestone and "Reading complete. 100% scrolled." at 100%. Announcement is derived directly from `progress` so React keeps the live region stable between same-milestone scrolls and the screen reader does not re-announce.
- **Social media section on /about** — New "Follow along on the trail" section lists Instagram, YouTube, and TikTok with placeholder URLs marked `TODO`. Each link is a labelled icon button inside `<nav aria-label="Social media links">`, opens in a new tab with `rel="noopener noreferrer"`, and ships with descriptive `aria-label` text.
- **PWA manifest completeness** — `app/manifest.ts` now sets `lang: "en"`, declares `categories: ["travel", "blog", "lifestyle"]`, and includes a `screenshots` array with desktop and mobile placeholder entries (file paths marked `TODO` until the captures land in `/public/screenshots/`). The SVG icon now carries an explicit `purpose: "any"`.
- **Accessibility statement page** — New `/accessibility` route (`app/(blog)/accessibility/page.tsx`) with WCAG 2.2 AA commitment statement, eight documented accessibility features (skip link, landmarks, keyboard nav, ARIA, contrast, live regions, reduced motion, print), a known-limitations list, and an `accessibility@jsquaredadventures.com` contact mailto. Linked from the site footer.
- **Footer accessibility link** — `site-footer.tsx` now exposes "Accessibility" alongside Home / Map / About / Wishlist in the Explore column.

#### Tests

- **+66 tests** across 12 new test files and 8 extended files. Total test count: **1008 → 1074**.
- New unit tests cover: post-query cache invalidation, related-posts date+reading-time, wishlist `<Image>` rendering, `/search` page (4 cases), site-header Cmd+K shortcut (11 cases), admin song preview Zod (4 cases), `/api/route-plans` rate limiting, post delete Cloudinary cleanup (5 cases), proxy request logging (3 cases), cron health breadcrumb, print styles block structure, reading progress a11y live region (11 cases), about-page social links, PWA manifest, accessibility page, and footer accessibility link.

---

## [0.4.4] — 2026-06-15

### Branches: `feat/taxonomy-browse` (PR #48), `feat/admin-taxonomy-crud` (PR #49), `feat/revision-completeness` (PR #47), `fix/footer-polish` (PR #46), `docs/knowledge-base` (PR #45)

#### Branch: `feat/taxonomy-browse` (PR #48)

- **/tags and /categories browse pages** — New public landing pages listing all tags and categories with post counts. Cards link through to the existing per-taxonomy feeds.
- **Sitemap entries** — `/tags` and `/categories` added as static entries (weekly change frequency, priority 0.6).
- **Navigation** — `site-header.tsx` and `mobile-nav.tsx` now expose Tags and Categories with active-state highlighting.
- **DAL** — New `web/src/server/dal/taxonomy-browse.ts` exposing `listAllTagsForBrowse()` and `listAllCategoriesForBrowse()` (uses `COUNT(CASE WHEN posts.status = 'published')` so unpublished posts don't inflate counts).
- **Tests** — 19 new tests across 5 files (DAL, /tags page, /categories page, header nav, mobile nav, sitemap update).

#### Branch: `feat/admin-taxonomy-crud` (PR #49)

- **/admin/categories page** — New admin surface for category CRUD. Lists every category with name, slug, post count, description, and creation/update timestamps. Inline rename and description form per row, plus a "Create category" form. "Delete" button is disabled and tooltipped when the category still has posts attached.
- **/admin/tags page extended** — Added "Create tag" form and per-row "Delete tag" button. Existing tag description editing is preserved. Delete is disabled when posts still reference the tag.
- **Admin nav** — New "Manage categories" entry placed before "Manage tags".
- **Server actions** — `createCategoryAction`, `updateCategoryAction`, `deleteCategoryAction` in `web/src/app/admin/categories/actions.ts`; `createTagAction`, `deleteTagAction` in `web/src/app/admin/tags/actions.ts`. All validate with Zod and surface stable redirects for `InvalidCategory`, `SlugTaken`, `CategoryInUse`, etc.
- **DAL** — New `web/src/server/dal/categories.ts` (`listAllCategoriesWithCounts`, `getCategoryBySlug`, `getCategoryById`, `categorySlugExists`, `createCategory`, `updateCategory`, `deleteCategory`). `admin-tags.ts` extended with `createTag`, `updateTag`, `deleteTag`, `tagSlugExists`, plus `TagInUseError` / `TagSlugConflictError` sentinels. Audit timestamps populated/refreshed.
- **Forms** — New `web/src/server/forms/admin-taxonomy.ts` Zod schemas. Slugs auto-normalised to `^[a-z0-9]+(?:-[a-z0-9]+)*$`, descriptions capped at 500 chars.
- **Tests** — ~70 new test cases across 8 files covering DAL, actions, page rendering, error surfaces, and disabled-delete states.

#### Branch: `feat/revision-completeness` (PR #47)

- **post_revisions metadata columns** — Added nullable columns to capture the full post state in every revision: `layout_type`, `category_id` (FK → `categories.id`), `featured_image_id` (FK → `media_assets.id`), `location_name`, `location_lat`, `location_lng`, `location_zoom`. Migration `0023_post_revisions_metadata.sql`.
- **DAL** — `web/src/server/dal/post-revisions.ts` extended: `createPostRevision`, `listPostRevisions`, `getPostRevisionById` now handle the new fields. `restorePostRevisionAtomically` snapshots the live post's expanded fields into a pre-restore revision, then writes every captured field (layout, category, featured image, location, song) back onto the post. Defensive against missing columns via `getPostColumnCapabilities()`.
- **Column capabilities** — `web/src/server/dal/post-column-capabilities.ts` extended with `categoryId` and `featuredImageId` flags.
- **Admin actions** — `updateAdminPostAction` now selects and forwards the expanded post fields to `createPostRevision`.
- **API routes** — List and detail routes return the expanded record plus resolved `categoryName`, `featuredImageUrl`, `featuredImageAlt`, location lat/lng/zoom, and song fields.
- **Admin UI** — `revision-history.tsx` detail panel now shows layout, category, featured image preview, location, and song metadata.
- **Tests** — New `web/tests/unit/post-revisions-dal-expanded.test.ts` (7 cases) covers snapshot+restore of every expanded field, capability-based omission, and the post-not-found path. Updated 4 existing tests for the new record shape.

#### Branch: `fix/footer-polish` (PR #46)

- **Removed "All rights reserved"** from the footer copyright line. Now just `© {year} J² Adventures`.
- **Improved page-to-footer transition** — `mt-20` (80px) breathing room + a 100px `::before` gradient fade on the footer's top edge. The gradient uses a new `--footer-fade-color` CSS variable (light: `#d7dfd2`, dark: `#111812`) that matches the bottom tone of the page background, so the sage/cream blend flows smoothly into the card-bg footer body instead of starting with a hard border.
- **Tests** — Footer test updated to match the new copyright copy and verify the gradient class.

#### Branch: `docs/knowledge-base` (PR #45)

- **Created `docs/KNOWLEDGE_BASE.md`** — 28 entries across 8 categories (SQLite/Drizzle, Turso, React 19 Testing, Next.js App Router, Vitest, Tooling, Security/CSP, Code Quality). Every entry has `Discovered in`, `Last verified`, `Problem`, `Gotcha`, `Solution`, `Verified` fields. Future agents must add entries for non-obvious gotchas and update entries in place (with date change) when proven wrong.
- **Deleted `docs/LESSONS.md`** — its 9 entries from the bun→pnpm migration were merged into KNOWLEDGE_BASE.md in the new entry format.
- **Updated `AGENTS.md`** — new "Knowledge Base" section pointing to the file and explaining the agent's responsibilities (consult, add, update, challenge).
- **Updated `docs/ARCHITECTURE.md`** and `README.md` — point to KNOWLEDGE_BASE.md.

---

## [0.4.3] — 2026-06-15

### Branch: `chore/schema-hardening` (PR #44)

#### Database schema

- **wishlist_places.linked_post_id FK** — Added foreign key to `posts.id` (rebuilt table to actually enforce the constraint; original migration 0014's inline `REFERENCES` was parsed but not enforced by SQLite on `ALTER TABLE ADD COLUMN`). Invalid inserts now fail with FOREIGN KEY constraint error.
- **wishlist_places.parent_id FK** — Drizzle schema updated with `.references()` to match the existing FK in the DB (no migration needed).
- **wishlist_places.linked_post_id index** — Added for join performance.
- **post_tags.tag_id index** — Added to speed up tag-listing queries.
- **series.updated_at** — Added (rebuilt for NOT NULL constraint). Existing rows populated from `created_at`.
- **categories.created_at, categories.updated_at** — Added (rebuilt for NOT NULL). Existing rows populated with current time.
- **tags.created_at, tags.updated_at** — Added (rebuilt for NOT NULL). Existing rows populated with current time.

#### Application code

- **DAL inserts** — All insert paths for series, categories, and tags now set `created_at`/`updated_at`:
  - `src/server/dal/series.ts`
  - `src/app/admin/actions.ts` (category and tag upsert)
  - `scripts/seed-series-categories.ts`
  - `scripts/import-supabase.ts`

#### Migrations

- `0021_wishlist_linked_post_fk.sql` — rebuild wishlist_places with FK on linked_post_id
- `0022_schema_hardening_timestamps.sql` — rebuild series/categories/tags with audit timestamps, add post_tags index

#### UI cleanup (companion)

- **Homepage newsletter section removed** — The "Stay on the trail" section above the footer was redundant. Footer (added in 0.4.2) is the preferred location for newsletter signup.

#### Data integrity verified

All row counts preserved before/after migration: 18 categories, 13 tags, 5 series, 9 wishlist_places, 2 post_tags. FK constraint on `linked_post_id` verified by attempting invalid insert (rejected with FOREIGN KEY constraint error).

---

## [0.4.2] — 2026-06-15

### Branch: `feat/layout-footer-and-nav` (PR #43)

#### Added
- **Site footer** — New `<SiteFooter />` component renders on every page with brand, navigation (Home, Map, About, Wishlist), discovery (Tags, Categories, Series, RSS), newsletter re-CTA, back-to-top anchor, copyright, and social media links (Instagram, YouTube)
- **Back-to-top button** — New `<BackToTop />` floating button appears after scrolling 500px, smooth scroll to top, respects `prefers-reduced-motion`
- **Footer unit tests** — 7 new tests covering brand, navigation links, discovery links, newsletter form, back-to-top anchor, copyright year, and accessible landmark
- **Back-to-top unit tests** — 6 new tests covering accessibility label, initial hidden state, visibility after scroll, scroll-to-top behavior, and `prefers-reduced-motion` handling

#### Changed
- **Global error page** — Now uses `@media (prefers-color-scheme: dark)` to show appropriate colors, eliminating the jarring light-mode flash dark-mode users experienced

#### Fixed
- **Dark mode global error** — Page no longer renders with hardcoded light colors when user prefers dark mode

---

## [0.4.1] — 2026-06-15

### Branch: `feat/seo-and-discovery` (PR #42)

#### Added
- **`robots.txt`** with crawl directives — allows public pages (posts, tags, categories, series, authors, wishlist, map, about), disallows admin/api/account/preview/auth routes, references sitemap.xml, declares canonical host
- **Twitter card meta tags** on post pages — adds `twitter.images` so shared links on Twitter/X show the post's featured image
- **Expanded sitemap** — now includes static pages (`/map`, `/about`, `/wishlist`), all category pages, all tag pages, and all series pages (not just homepage and posts)
- **Sitemap unit tests** — 4 new tests covering base entry, static pages, taxonomy entries, and database failure fallback

#### Changed
- **`SITE_URL` is now env-driven** — reads from `NEXT_PUBLIC_SITE_URL` env var with fallback to production URL, allowing the same code to work across dev/staging/prod
- **Seasonal hero** — populated with kicker ("Travel stories from the road") and subtitle ("Field notes, maps, and photo-led stories from the places we wander.") instead of empty strings
- **Vitest config** — stubs `NEXT_PUBLIC_SITE_URL=https://jsquaredadventures.com` for consistent test runs across environments

---

## [0.4.0] — 2026-06-15

### Changed
- **CI/CD infrastructure** — Added `.github/workflows/ci.yml` with 3 parallel jobs (lint, typecheck, test) on Node 24 with pnpm caching
- **Dependabot configuration** — Lowered open PR limits (npm: 5, github-actions: 3) to reduce noise
- **TypeScript** — Upgraded to 6.0.2 with config fixes (removed deprecated `baseUrl`, dropped `dom.iterable`, bumped target to ES2020)
- **Documentation** — Fixed sanitize-html version drift (2.17.2 → 2.17.5), corrected package manager line in AGENTS.md, deduplicated wishlist section in SETUP.md, documented pnpm-workspace.yaml security overrides

### Security
- **CI hardening** — Added `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` to opt in to Node 24 before GitHub's forced upgrade

### Added
- **Improvement tracking** — Created `docs/IMPROVEMENTS.md` (M/S/P/F/R/D/O sections) and `docs/ROADMAP.md` (10-branch plan) for systematic feature work

---

## [0.3.1] — 2026-06-15

### Changed
- **Dependencies** — Merged 29 minor/patch updates via dependabot group PR #35
- **Node.js** — Bumped to 24.0.0 in `.tool-versions` and `package.json` engines (stays `>=22.13` for backward compat)

### Fixed
- **Test isolation** — Stubbed `CI=""` in `playwright-config.test.ts` for two webServer tests that depend on local behavior

---

## Format Guide for Future Entries

```markdown
## [X.Y.Z] — YYYY-MM-DD

### Branch: `feat/branch-name` (PR #N)

#### Added
- New feature or capability

#### Changed
- Changes to existing functionality

#### Fixed
- Bug fixes

#### Removed
- Removed features or code

#### Security
- Security improvements
```

---

## See Also

- [`docs/ROADMAP.md`](ROADMAP.md) — Active branch plan and status
- [`docs/IMPROVEMENTS.md`](IMPROVEMENTS.md) — High-level feature backlog
