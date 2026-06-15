# Branch 5: `feat/admin-taxonomy-crud`

**Status:** 🟢 In Progress (PR pending)
**Estimated effort:** 4-5 hours
**Depends on:** Branch 3 (uses `createdAt`/`updatedAt` on categories/tags)

---

## Goal

Add admin CRUD for categories and tag create/delete. Currently categories can only be created/updated/deleted via inline code in `actions.ts`, and tags can only have their descriptions updated. This branch makes taxonomy management accessible to admins through the UI.

---

## Checklist

### 5.1 Category admin CRUD page
- [x] Create `web/src/app/admin/categories/page.tsx`
- [x] Display list of all categories (name, slug, post count, created/updated dates)
- [x] Add "Create category" form (name, slug, description)
- [x] Add "Edit category" inline form or modal
- [x] Add "Delete category" button (with confirmation, prevent delete if posts exist)
- [x] Server actions for create/update/delete
- [x] Use existing admin patterns from `web/src/app/admin/tags/page.tsx`
- [x] Add to admin nav: `web/src/lib/admin/navigation.ts`

**Files:**
- `web/src/app/admin/categories/page.tsx` (new)
- `web/src/app/admin/categories/actions.ts` (new)
- `web/src/lib/admin/navigation.ts`

---

### 5.2 Tag create + delete
- [x] Extend `web/src/app/admin/tags/page.tsx`
- [x] Add "Create tag" form (name, slug, description)
- [x] Add "Delete tag" button to existing tag list (with confirmation, prevent delete if posts exist)
- [x] Server actions for create/delete
- [x] Update existing `updateTagDescription` to also support create (or add separate `createTag`)
- [x] Add `createTag` and `deleteTag` to `web/src/server/dal/admin-tags.ts`

**Files:**
- `web/src/app/admin/tags/page.tsx`
- `web/src/app/admin/tags/actions.ts` (extended)
- `web/src/server/dal/admin-tags.ts`

---

### 5.3 Category DAL functions
- [x] Create `web/src/server/dal/categories.ts`
- [x] Add `listAllCategoriesWithCounts()` (returns categories + post counts)
- [x] Add `createCategory(data)` (sets createdAt/updatedAt)
- [x] Add `updateCategory(id, data)` (updates updatedAt)
- [x] Add `deleteCategory(id)` (prevent if posts exist, return error)
- [x] Add `getCategoryBySlug(slug)` for admin lookup

**Files:**
- `web/src/server/dal/categories.ts` (new)

---

### 5.4 Add unit tests
- [x] Test `createCategory()` sets timestamps correctly
- [x] Test `updateCategory()` updates timestamp
- [x] Test `deleteCategory()` prevents delete if posts exist
- [x] Test `createTag()` and `deleteTag()` similar
- [x] Test admin pages render with mock data

**Files:**
- `web/tests/unit/categories-dal.test.ts` (new)
- `web/tests/unit/admin-tags-dal.test.ts` (new)
- `web/tests/unit/admin-categories-actions.test.ts` (new)
- `web/tests/unit/admin-categories-page.test.tsx` (new)
- `web/tests/unit/admin-tag-create-delete-actions.test.ts` (new)
- `web/tests/unit/admin-tags-page.test.tsx` (extended)
- `web/tests/unit/admin-taxonomy-form.test.ts` (new)
- `web/tests/unit/admin-navigation.test.ts` (extended)

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

- [x] All checklist items complete
- [x] Admins can create, edit, and delete categories through UI
- [x] Admins can create and delete tags through UI
- [x] Deletion prevented when posts exist
- [ ] CI passes
- [ ] PR created and merged to main
- [ ] `docs/ROADMAP.md` status table updated to ✅ Merged
- [x] `docs/CHANGELOG.md` entry added
- [ ] Branch deleted
