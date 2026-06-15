# Branch 1: `feat/seo-and-discovery`

**Status:** 🔵 Ready to start
**Estimated effort:** 2-3 hours
**Depends on:** Nothing

---

## Goal

Improve how search engines and social platforms see the site. No schema changes. Ships fast.

---

## Checklist

### 1.1 Add `robots.ts`
- [ ] Create `web/src/app/robots.ts`
- [ ] Allow crawling of public pages (`/`, `/posts/*`, `/tag/*`, `/category/*`, `/series/*`, `/author/*`, `/wishlist/*`, `/map`, `/about`)
- [ ] Disallow `/admin/*`, `/api/*`, `/account/*`, `/settings/*`, `/preview/*`, `/login`, `/signup`, `/callback`
- [ ] Reference sitemap: `${SITE_URL}/sitemap.xml`
- [ ] Test: `curl http://localhost:3000/robots.txt` returns expected output

**Files:**
- `web/src/app/robots.ts` (new)

**Reference:** Next.js docs on `robots.ts` metadata file

---

### 1.2 Replace hardcoded `SITE_URL` with env var
- [ ] Edit `web/src/lib/utils.ts:4`
- [ ] Change: `export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jsquaredadventures.com";`
- [ ] Verify all existing usages still work (canonical URLs, RSS feeds, sitemap)
- [ ] Run `pnpm run test` to check no broken references

**Files:**
- `web/src/lib/utils.ts`

---

### 1.3 Add `twitter.images` to post metadata
- [ ] Edit `web/src/app/(blog)/posts/[slug]/page.tsx` in `generateMetadata()`
- [ ] Add `twitter` object alongside `openGraph`:
  ```typescript
  twitter: {
    card: "summary_large_image",
    title: post.title,
    description,
    images: post.imageUrl ? [post.imageUrl] : undefined,
  },
  ```
- [ ] Test: View page source on a post, verify `<meta name="twitter:image">` tag exists

**Files:**
- `web/src/app/(blog)/posts/[slug]/page.tsx`

---

### 1.4 Expand sitemap
- [ ] Edit `web/src/app/sitemap.ts`
- [ ] Add tag pages (query `tags` table for all slugs)
- [ ] Add category pages (query `categories` table for all slugs)
- [ ] Add series pages (query `series` table for all slugs)
- [ ] Add static pages: `/about`, `/map`, `/wishlist`
- [ ] Test: `curl http://localhost:3000/sitemap.xml` returns all expected URLs

**Files:**
- `web/src/app/sitemap.ts`

**New DAL queries needed:**
- `listAllTagSlugs()` in `web/src/server/dal/admin-tags.ts` or `web/src/server/queries/posts.ts`
- `listAllCategorySlugs()` in new `web/src/server/dal/categories.ts` or `web/src/server/queries/posts.ts`
- `listAllSeriesSlugs()` in `web/src/server/dal/series.ts` (may already exist)

---

### 1.5 Populate seasonal hero
- [ ] Edit `web/src/app/(blog)/page.tsx:24-32`
- [ ] Fill in meaningful content:
  - `kicker`: "Travel stories from the road"
  - `title`: "J²Adventures" (keep)
  - `subtitle`: "Field notes, maps, and photo-led stories from the places we wander"
  - `note`: (optional, leave empty or add seasonal note)
- [ ] Test: View homepage, verify hero shows subtitle

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

---

## PR Description Template

```markdown
## SEO and Discovery Improvements

Closes #N (or describes: addresses gap in SEO coverage)

### Changes
- Adds `robots.txt` with proper crawl directives
- Replaces hardcoded `SITE_URL` with env var
- Adds `twitter:image` meta tags for better social sharing
- Expands sitemap to include all public pages (tags, categories, series, about, map, wishlist)
- Populates seasonal hero with meaningful subtitle

### Testing
- [ ] `curl /robots.txt` returns expected output
- [ ] `curl /sitemap.xml` includes all public pages
- [ ] View post page source, verify `twitter:image` meta tag
- [ ] View homepage, verify hero shows subtitle

### Checklist
- [ ] CI passes (lint, typecheck, test)
- [ ] No breaking changes
- [ ] Documentation updated if needed
```

---

## Acceptance Criteria

- [ ] All 5 checklist items complete
- [ ] CI passes
- [ ] PR created and merged to main
- [ ] `docs/ROADMAP.md` status table updated to ✅ Merged
- [ ] `docs/CHANGELOG.md` entry added
- [ ] Branch deleted
