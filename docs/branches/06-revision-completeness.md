# Branch 6: `feat/revision-completeness`

**Status:** ✅ Merged (PR #47, 2026-06-15)
**Estimated effort:** 4-5 hours
**Depends on:** Branch 3 (schema conventions)

---

## Goal

Expand what post revisions capture and what restore can recover. Currently revisions only save title, content, excerpt, and song metadata. After this branch, revisions will also save layout, category, featured image, and location — making full revision restore possible.

---

## Checklist

### 6.1 Add columns to `postRevisions`
- [ ] Edit `web/src/drizzle/schema.ts:298-318`
- [ ] Add columns:
  - `layoutType: text("layout_type", { enum: ["standard", "split-horizontal", "split-vertical", "hover"] })`
  - `categoryId: text("category_id").references(() => categories.id)`
  - `featuredImageId: text("featured_image_id").references(() => mediaAssets.id)`
  - `locationName: text("location_name")`
  - `locationLat: real("location_lat")`
  - `locationLng: real("location_lng")`
  - `locationZoom: integer("location_zoom")`
- [ ] Generate migration
- [ ] Apply to local DB (all new columns nullable, no data migration needed)

**Files:**
- `web/src/drizzle/schema.ts`
- `web/src/drizzle/migrations/` (new migration)

---

### 6.2 Update revision creation
- [ ] Edit `web/src/server/dal/post-revisions.ts`
- [ ] Update `createRevision()` to save new columns
- [ ] Update `listRevisionsForPost()` to return new columns
- [ ] Update `getRevision()` to return new columns
- [ ] Update TypeScript types

**Files:**
- `web/src/server/dal/post-revisions.ts`

---

### 6.3 Update column capabilities
- [ ] Edit `web/src/server/dal/post-column-capabilities.ts`
- [ ] Add new columns to the diff/merge logic for restore
- [ ] Ensure restore correctly applies all captured fields

**Files:**
- `web/src/server/dal/post-column-capabilities.ts`

---

### 6.4 Update admin UI
- [ ] Edit `web/src/components/admin/revision-history.tsx`
- [ ] Display new fields in revision detail view (layout, category, featured image, location)
- [ ] Verify restore button works end-to-end

**Files:**
- `web/src/components/admin/revision-history.tsx`

---

### 6.5 Add unit tests
- [ ] Test `createRevision()` saves all new columns
- [ ] Test restore correctly applies all captured fields
- [ ] Test `getPostColumnCapabilities()` includes new columns in diff

**Files:**
- `web/tests/unit/` (extend existing revision tests)

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
chore: add metadata columns to postRevisions schema
feat: capture layout, category, featured image, and location in revisions
feat: update revision restore to apply all captured fields
feat: show new revision fields in admin UI
test: add unit tests for expanded revision system
```

---

## Acceptance Criteria

- [ ] All checklist items complete
- [ ] Revisions capture all post metadata
- [ ] Restore correctly applies all captured fields
- [ ] Admin UI shows new fields
- [ ] CI passes
- [ ] PR created and merged to main
- [ ] `docs/ROADMAP.md` status table updated to ✅ Merged
- [ ] `docs/CHANGELOG.md` entry added
- [ ] Branch deleted
