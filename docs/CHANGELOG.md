# J² Adventures — Changelog

> **For any agent opening this repo:** This file logs completed work. When you finish a branch, add an entry here. Format follows [Keep a Changelog](https://keepachangelog.com/).

**Format:** Each entry groups changes by branch. Within a branch, items are grouped by type (Added, Changed, Fixed, Removed, Security).

---

## [Unreleased]

### Branch: `feat/admin-taxonomy-crud` (PR #49)

#### Admin UI

- **`/admin/categories` page** — New admin surface for category CRUD. Lists every category with name, slug, post count, description, and creation/update timestamps. Inline rename and description form per row, plus a "Create category" form on the left. "Delete" button is disabled and tooltipped when the category still has posts attached.
- **`/admin/tags` page extended** — Added "Create tag" form and per-row "Delete tag" button. Existing tag description editing is preserved. The delete button is disabled and tooltipped when the tag still has posts attached.
- **Admin nav** — New "Manage categories" entry placed before "Manage tags" in the admin nav.

#### Server actions

- `web/src/app/admin/categories/actions.ts` — `createCategoryAction`, `updateCategoryAction`, `deleteCategoryAction`. All validate with Zod, surface stable redirects for `InvalidCategory`, `SlugTaken`, and `CategoryInUse`, and revalidate `/admin/categories` + `/categories`.
- `web/src/app/admin/tags/actions.ts` — Added `createTagAction` and `deleteTagAction` alongside the existing `updateTagDescriptionAction`. Same stable-redirect error model.

#### Data layer

- **`web/src/server/dal/categories.ts`** (new) — `listAllCategoriesWithCounts`, `getCategoryBySlug`, `getCategoryById`, `categorySlugExists`, `createCategory`, `updateCategory`, `deleteCategory`. `createCategory` and `updateCategory` set/refresh `created_at` and `updated_at` (Branch 3 audit columns). `deleteCategory` counts posts that reference the category and throws `CategoryInUseError` if any exist; this is surfaced as a friendly redirect rather than a 500.
- **`web/src/server/dal/admin-tags.ts`** — Added `createTag`, `updateTag`, `deleteTag`, `tagSlugExists`, and the `TagInUseError` / `TagSlugConflictError` sentinels. `createTag` populates both audit timestamps; `updateTag` refreshes `updated_at`. `deleteTag` blocks deletion when posts still reference the tag.

#### Forms

- **`web/src/server/forms/admin-taxonomy.ts`** (new) — Zod schemas for category create/update/id and tag create/id. Slugs are auto-normalised to `^[a-z0-9]+(?:-[a-z0-9]+)*$` and descriptions capped at 500 chars.

#### Tests

- `web/tests/unit/categories-dal.test.ts` — `listAllCategoriesWithCounts` (timestamp coercion, null description), `getCategoryBySlug/Id`, `categorySlugExists`, `createCategory` (timestamp parity, blank-name rejection, slug-conflict), `updateCategory` (updatedAt refresh, slug-conflict), `deleteCategory` (in-use prevention, string-coerced counts).
- `web/tests/unit/admin-tags-dal.test.ts` — `createTag` (timestamp parity, slug conflict), `updateTag` (timestamp refresh, same-slug re-save), `updateTagDescription` (null passthrough), `deleteTag` (in-use prevention), `tagSlugExists`, plus a sanity check on `listAllTagsWithCounts`.
- `web/tests/unit/admin-categories-actions.test.ts` — Auth gate, validation gate, slug conflict redirect, in-use redirect, generic save-failure surface, revalidation on success.
- `web/tests/unit/admin-tag-create-delete-actions.test.ts` — Same auth/validation/conflict coverage for the new tag actions.
- `web/tests/unit/admin-categories-page.test.tsx` — Redirect on missing auth, redirect on non-admin, row render, empty state, SlugTaken + CategoryInUse error surfaces, disabled delete when posts exist, create-form render, load-failure path.
- `web/tests/unit/admin-tags-page.test.tsx` — Extended to cover the new create form, error banner for SlugTaken/TagInUse, and the disabled delete state.
- `web/tests/unit/admin-taxonomy-form.test.ts` — Direct Zod schema coverage (create, update, id, slug normalization, description length cap).
- `web/tests/unit/admin-navigation.test.ts` — Asserts the new "Manage categories" link.

### Branch: `feat/revision-completeness` (PR #47)

#### Database schema
- **post_revisions metadata columns** — Added nullable columns to capture the full post state in every revision:
  - `layout_type` (enum: standard | split-horizontal | split-vertical | hover)
  - `category_id` (FK → `categories.id`)
  - `featured_image_id` (FK → `media_assets.id`)
  - `location_name`, `location_lat`, `location_lng`, `location_zoom`
- **Migration** `0023_post_revisions_metadata.sql` — adds the new columns and FKs. All columns nullable so existing revisions remain valid; no data backfill required.

#### Application code
- **DAL** `web/src/server/dal/post-revisions.ts`:
  - `PostRevisionRecord` and `createPostRevision` extended to accept/persist the new metadata fields.
  - `listPostRevisions` and `getPostRevisionById` return the expanded record.
  - `restorePostRevisionAtomically` snapshots the live post's expanded fields into a pre-restore revision, then writes every captured field (layout, category, featured image, location, song) back onto the post. Defensive against missing columns via `getPostColumnCapabilities()`.
- **Column capabilities** `web/src/server/dal/post-column-capabilities.ts` — new `categoryId` and `featuredImageId` flags.
- **Admin actions** `web/src/app/admin/actions.ts` — `updateAdminPostAction` now selects and forwards the expanded post fields to `createPostRevision`.
- **API routes**:
  - `GET /api/admin/posts/[postId]/revisions` returns `layoutType`, `categoryId`, `featuredImageId`, `locationName` per row.
  - `GET /api/admin/posts/[postId]/revisions/[revisionId]` returns the expanded revision plus resolved `categoryName`, `featuredImageUrl`, `featuredImageAlt`, location lat/lng/zoom, and song fields.
- **Admin UI** `web/src/components/admin/revision-history.tsx` — the detail panel now shows layout, category, featured image preview, location, and song metadata.

#### Tests
- New `web/tests/unit/post-revisions-dal-expanded.test.ts` — verifies `restorePostRevisionAtomically` snapshots and restores every expanded field, plus capability-based omission when columns are missing.
- Updated `post-column-capabilities.test.ts`, `post-revisions-route.test.ts`, `post-revision-route.test.ts`, and `update-post-revision-capture.test.ts` to cover the expanded record shape and the new columns in capabilities / restore inputs.

---

## [0.4.3] — 2026-06-15

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
