# Branch 4: `feat/taxonomy-browse`

**Status:** ✅ Merged (PR #48, 2026-06-15)
**Estimated effort:** 3-4 hours
**Depends on:** Branch 3 (uses `createdAt`/`updatedAt` on categories/tags for display)

---

## Goal

Add browse pages for tags and categories so users can discover content by exploring taxonomy. Both pages share the same UI pattern (grid/list with post counts) and ship together.

---

## Checklist

### 4.1 Create tag browse page (`/tags`)
- [x] Create `web/src/app/(blog)/tags/page.tsx`
- [x] Fetch all tags with post counts (use new DAL function)
- [x] Display as grid of cards: tag name, slug, post count, description
- [x] Each card links to `/tag/[slug]`
- [x] Sort by post count (descending) or alphabetically
- [x] Responsive: grid on desktop, stack on mobile
- [x] Add loading skeleton: `web/src/app/(blog)/tags/loading.tsx`

**Files:**
- `web/src/app/(blog)/tags/page.tsx` (new)
- `web/src/app/(blog)/tags/loading.tsx` (new)

---

### 4.2 Create category browse page (`/categories`)
- [x] Create `web/src/app/(blog)/categories/page.tsx`
- [x] Fetch all categories with post counts
- [x] Display as grid of cards: category name, description, post count
- [x] Each card links to `/category/[slug]`
- [x] Sort by post count (descending) or alphabetically
- [x] Responsive: grid on desktop, stack on mobile
- [x] Add loading skeleton: `web/src/app/(blog)/categories/loading.tsx`

**Files:**
- `web/src/app/(blog)/categories/page.tsx` (new)
- `web/src/app/(blog)/categories/loading.tsx` (new)

---

### 4.3 Add navigation links
- [x] Edit `web/src/components/layout/site-header.tsx` or footer
- [x] Add "Tags" and "Categories" links to nav
- [x] Or: add to footer (if footer exists from Branch 2)
- [x] Consider: add to mobile nav as well

**Files:**
- `web/src/components/layout/site-header.tsx` (updated)
- `web/src/components/layout/mobile-nav.tsx` (updated)
- `web/src/components/layout/site-footer.tsx` (already covered by Branch 2)

---

### 4.4 Add DAL functions
- [x] Add `listAllTagsForBrowse()` to new `web/src/server/dal/taxonomy-browse.ts`
- [x] Add `listAllCategoriesForBrowse()` to new `web/src/server/dal/taxonomy-browse.ts`
- [x] Both functions return: name, slug, description, postCount, createdAt, updatedAt
- [x] Both use existing patterns from `admin-tags.ts`

**Files:**
- `web/src/server/dal/taxonomy-browse.ts` (new)

---

### 4.5 Add unit tests
- [x] Test `listAllTagsForBrowse()` returns correct counts
- [x] Test `listAllCategoriesForBrowse()` returns correct counts
- [x] Test `/tags` page renders with mock data
- [x] Test `/categories` page renders with mock data

**Files:**
- `web/tests/unit/taxonomy-browse-dal.test.ts` (new)
- `web/tests/unit/tags-page.test.tsx` (new)
- `web/tests/unit/categories-page.test.tsx` (new)
- `web/tests/unit/site-header.test.tsx` (updated)
- `web/tests/unit/mobile-nav.test.tsx` (updated)
- `web/tests/unit/sitemap.test.ts` (updated)

---

## Pre-Commit Verification

```bash
cd web
pnpm run test
pnpm dlx tsc --noEmit
pnpm run lint
```

---

## Commit Strategy

```
feat: add tag browse page with post counts
feat: add category browse page with post counts
feat: add navigation links to taxonomy browse pages
feat: add DAL functions for taxonomy listing with counts
test: add unit tests for taxonomy browse pages
```

---

## Acceptance Criteria

- [ ] All checklist items complete
- [ ] Both pages render correctly
- [ ] Navigation links work
- [ ] CI passes
- [ ] PR created and merged to main
- [ ] `docs/ROADMAP.md` status table updated to ✅ Merged
- [ ] `docs/CHANGELOG.md` entry added
- [ ] Branch deleted
