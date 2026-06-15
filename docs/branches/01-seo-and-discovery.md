# Branch 1: `feat/seo-and-discovery`

**Status:** ✅ Merged (PR #42, 2026-06-15)
**Estimated effort:** 2-3 hours
**Depends on:** Nothing

---

## Goal

Improve how search engines and social platforms see the site. No schema changes. Ships fast.

---

## Checklist

### 1.1 Add `robots.ts`
- [x] Create `web/src/app/robots.ts`
- [x] Allow crawling of public pages (`/`, `/posts/*`, `/tag/*`, `/category/*`, `/series/*`, `/author/*`, `/wishlist/*`, `/map`, `/about`)
- [x] Disallow `/admin/*`, `/api/*`, `/account/*`, `/settings/*`, `/preview/*`, `/login`, `/signup`, `/callback`
- [x] Reference sitemap: `${SITE_URL}/sitemap.xml`
- [x] Test: `curl http://localhost:3000/robots.txt` returns expected output

**Files:**
- `web/src/app/robots.ts` (new)

**Reference:** Next.js docs on `robots.ts` metadata file

---

### 1.2 Replace hardcoded `SITE_URL` with env var
- [x] Edit `web/src/lib/utils.ts:4`
- [x] Change: `export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jsquaredadventures.com";`
- [x] Verify all existing usages still work (canonical URLs, RSS feeds, sitemap)
- [x] Run `pnpm run test` to check no broken references
- [x] Add `env: { NEXT_PUBLIC_SITE_URL }` to vitest config for consistent test runs

**Files:**
- `web/src/lib/utils.ts`
- `web/vitest.config.ts`

---

### 1.3 Add `twitter.images` to post metadata
- [x] Edit `web/src/app/(blog)/posts/[slug]/page.tsx` in `generateMetadata()`
- [x] Add `twitter` object alongside `openGraph`:
  ```typescript
  twitter: {
    card: "summary_large_image",
    title: post.title,
    description,
    images: post.imageUrl ? [post.imageUrl] : undefined,
  },
  ```
- [x] Test: View page source on a post, verify `<meta name="twitter:image">` tag exists

**Files:**
- `web/src/app/(blog)/posts/[slug]/page.tsx`

---

### 1.4 Expand sitemap
- [x] Edit `web/src/app/sitemap.ts`
- [x] Add tag pages (query `tags` table for all slugs)
- [x] Add category pages (query `categories` table for all slugs)
- [x] Add series pages (query `series` table for all slugs)
- [x] Add static pages: `/about`, `/map`, `/wishlist`
- [x] Test: `curl http://localhost:3000/sitemap.xml` returns all expected URLs
- [x] Add unit tests for sitemap (4 tests covering all code paths)

**Files:**
- `web/src/app/sitemap.ts`
- `web/tests/unit/sitemap.test.ts` (new)

**New DAL queries used:**
- `listAdminCategories()` in `web/src/server/dal/admin-posts.ts` (already existed)
- `listAllTagsWithCounts()` in `web/src/server/dal/admin-tags.ts` (already existed)
- `listAllSeries()` in `web/src/server/dal/series.ts` (already existed)

---

### 1.5 Populate seasonal hero
- [x] Edit `web/src/app/(blog)/page.tsx:24-32`
- [x] Fill in meaningful content:
  - `kicker`: "Travel stories from the road"
  - `title`: "J²Adventures" (keep)
  - `subtitle`: "Field notes, maps, and photo-led stories from the places we wander"
  - `note`: (optional, leave empty or add seasonal note)
- [x] Test: View homepage, verify hero shows subtitle

**Files:**
- `web/src/app/(blog)/page.tsx`

---

## Pre-Commit Verification

```bash
cd web
pnpm run test
pnpm dlx tsc --noEmit
pnpm run lint
```

All three must pass. If `pnpm run build` is available locally, also run that to catch build-time errors.

---

## Commit Strategy

One PR with one commit per checklist item (5 commits total), or one squash-merge commit. Use conventional commits:

```
feat: add robots.txt with crawl directives
refactor: use NEXT_PUBLIC_SITE_URL env var instead of hardcoded URL
feat: add twitter:image meta tags to post pages
feat: expand sitemap to include taxonomy and static pages
feat: populate seasonal hero with meaningful content
```

**Actual commits (6 total — one extra for vitest config fix):**
- `d5f561e` feat: add robots.txt with crawl directives
- `7521263` refactor: use NEXT_PUBLIC_SITE_URL env var instead of hardcoded URL
- `f310fc2` feat: add twitter:image meta tags to post pages
- `ede4483` feat: expand sitemap to include taxonomy and static pages
- `4e3e854` feat: populate seasonal hero with meaningful content
- `2bc6780` test: stub NEXT_PUBLIC_SITE_URL in vitest config for consistent test runs

---

## PR Description

```markdown
## SEO and Discovery Improvements

Closes gaps in SEO coverage and social sharing metadata.

### Changes
- robots.txt with proper crawl directives
- Replaces hardcoded SITE_URL with env var
- Adds twitter:image meta tags for better social sharing
- Expands sitemap to include all public pages
- Populates seasonal hero with meaningful content

### Testing
- [x] All 868 unit tests pass
- [x] TypeScript type check passes
- [x] ESLint clean
```

**PR:** [#42](https://github.com/JevonThompsonx/jsquared_blog/pull/42)

---

## Acceptance Criteria

- [x] All 5 checklist items complete
- [x] CI passes
- [x] PR created and merged to main
- [x] `docs/ROADMAP.md` status table updated to ✅ Merged
- [x] `docs/CHANGELOG.md` entry added
- [x] Branch deleted
