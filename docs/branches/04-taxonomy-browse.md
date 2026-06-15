# Branch 4: `feat/taxonomy-browse`

**Status:** 🟡 Blocked on Branch 3
**Estimated effort:** 3-4 hours
**Depends on:** Branch 3 (uses `createdAt`/`updatedAt` on categories/tags for display)

---

## Goal

Add browse pages for tags and categories so users can discover content by exploring taxonomy. Both pages share the same UI pattern (grid/list with post counts) and ship together.

---

## Checklist

### 4.1 Create tag browse page (`/tags`)
- [ ] Create `web/src/app/(blog)/tags/page.tsx`
- [ ] Fetch all tags with post counts (use new DAL function)
- [ ] Display as grid of cards: tag name, slug, post count, description
- [ ] Each card links to `/tag/[slug]`
- [ ] Sort by post count (descending) or alphabetically
- [ ] Responsive: grid on desktop, stack on mobile
- [ ] Add loading skeleton: `web/src/app/(blog)/tags/loading.tsx`

**Files:**
- `web/src/app/(blog)/tags/page.tsx` (new)
- `web/src/app/(blog)/tags/loading.tsx` (new)

---

### 4.2 Create category browse page (`/categories`)
- [ ] Create `web/src/app/(blog)/categories/page.tsx`
- [ ] Fetch all categories with post counts
- [ ] Display as grid of cards: category name, description, post count
- [ ] Each card links to `/category/[slug]`
- [ ] Sort by post count (descending) or alphabetically
- [ ] Responsive: grid on desktop, stack on mobile
- [ ] Add loading skeleton: `web/src/app/(blog)/categories/loading.tsx`

**Files:**
- `web/src/app/(blog)/categories/page.tsx` (new)
- `web/src/app/(blog)/categories/loading.tsx` (new)

---

### 4.3 Add navigation links
- [ ] Edit `web/src/components/layout/site-header.tsx` or footer
- [ ] Add "Tags" and "Categories" links to nav
- [ ] Or: add to footer (if footer exists from Branch 2)
- [ ] Consider: add to mobile nav as well

**Files:**
- `web/src/components/layout/site-header.tsx` and/or `web/src/components/layout/site-footer.tsx`

---

### 4.4 Add DAL functions
- [ ] Add `listAllTagsWithCountsForBrowse()` to `web/src/server/dal/admin-tags.ts` (or create `web/src/server/dal/tags.ts`)
- [ ] Add `listAllCategoriesWithCounts()` to new `web/src/server/dal/categories.ts`
- [ ] Both functions return: name, slug, description, postCount, createdAt, updatedAt
- [ ] Both use existing patterns from `admin-tags.ts`

**Files:**
- `web/src/server/dal/admin-tags.ts` or `web/src/server/dal/tags.ts` (new)
- `web/src/server/dal/categories.ts` (new)

---

### 4.5 Add unit tests
- [ ] Test `listAllTagsWithCountsForBrowse()` returns correct counts
- [ ] Test `listAllCategoriesWithCounts()` returns correct counts
- [ ] Test `/tags` page renders with mock data
- [ ] Test `/categories` page renders with mock data

**Files:**
- `web/tests/unit/` (add new test files)

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
