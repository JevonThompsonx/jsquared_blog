# Branch 5: `feat/admin-taxonomy-crud`

**Status:** 🟡 Blocked on Branch 3
**Estimated effort:** 4-5 hours
**Depends on:** Branch 3 (uses `createdAt`/`updatedAt` on categories/tags)

---

## Goal

Add admin CRUD for categories and tag create/delete. Currently categories can only be created/updated/deleted via inline code in `actions.ts`, and tags can only have their descriptions updated. This branch makes taxonomy management accessible to admins through the UI.

---

## Checklist

### 5.1 Category admin CRUD page
- [ ] Create `web/src/app/admin/categories/page.tsx`
- [ ] Display list of all categories (name, slug, post count, created/updated dates)
- [ ] Add "Create category" form (name, slug, description)
- [ ] Add "Edit category" inline form or modal
- [ ] Add "Delete category" button (with confirmation, prevent delete if posts exist)
- [ ] Server actions for create/update/delete
- [ ] Use existing admin patterns from `web/src/app/admin/tags/page.tsx`
- [ ] Add to admin nav: `web/src/lib/admin/navigation.ts`

**Files:**
- `web/src/app/admin/categories/page.tsx` (new)
- `web/src/app/admin/categories/actions.ts` (new)
- `web/src/lib/admin/navigation.ts`

---

### 5.2 Tag create + delete
- [ ] Extend `web/src/app/admin/tags/page.tsx`
- [ ] Add "Create tag" form (name, slug, description)
- [ ] Add "Delete tag" button to existing tag list (with confirmation, prevent delete if posts exist)
- [ ] Server actions for create/delete
- [ ] Update existing `updateTagDescription` to also support create (or add separate `createTag`)
- [ ] Add `createTag` and `deleteTag` to `web/src/server/dal/admin-tags.ts`

**Files:**
- `web/src/app/admin/tags/page.tsx`
- `web/src/app/admin/tags/actions.ts` (new, or extend existing)
- `web/src/server/dal/admin-tags.ts`

---

### 5.3 Category DAL functions
- [ ] Create `web/src/server/dal/categories.ts`
- [ ] Add `listAllCategoriesWithCounts()` (returns categories + post counts)
- [ ] Add `createCategory(data)` (sets createdAt/updatedAt)
- [ ] Add `updateCategory(id, data)` (updates updatedAt)
- [ ] Add `deleteCategory(id)` (prevent if posts exist, return error)
- [ ] Add `getCategoryBySlug(slug)` for admin lookup

**Files:**
- `web/src/server/dal/categories.ts` (new)

---

### 5.4 Add unit tests
- [ ] Test `createCategory()` sets timestamps correctly
- [ ] Test `updateCategory()` updates timestamp
- [ ] Test `deleteCategory()` prevents delete if posts exist
- [ ] Test `createTag()` and `deleteTag()` similar
- [ ] Test admin pages render with mock data

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
feat: add category admin CRUD page
feat: add tag create and delete to admin
feat: add category DAL functions with timestamps
test: add unit tests for admin taxonomy CRUD
```

---

## Acceptance Criteria

- [ ] All checklist items complete
- [ ] Admins can create, edit, and delete categories through UI
- [ ] Admins can create and delete tags through UI
- [ ] Deletion prevented when posts exist
- [ ] CI passes
- [ ] PR created and merged to main
- [ ] `docs/ROADMAP.md` status table updated to ✅ Merged
- [ ] `docs/CHANGELOG.md` entry added
- [ ] Branch deleted
