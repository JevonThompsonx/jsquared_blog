# Branch 3: `chore/schema-hardening`

**Status:** ✅ Merged (PR #44, 2026-06-15)
**Estimated effort:** 2-3 hours
**Depends on:** Nothing

> ⚠️ **This branch modifies the database schema. It requires Drizzle migrations. Test carefully on a local database first, then apply to production.**

### Companion cleanup

The branch also picks up a small UI cleanup: the homepage had a redundant
"Stay on the trail" newsletter section just above the footer. The user
asked to keep the footer newsletter form and remove the homepage one.
That cleanup is committed alongside this branch (the footer fix was
misclassified on Branch 2).

### Results

| Check | What was done | Outcome |
|-------|---------------|---------|
| 3.1 FK + index on `wishlistPlaces.linkedPostId` | Migration 0021 rebuilds `wishlist_places` with the FK; index added | ✅ FK verified — invalid inserts now fail |
| 3.2 FK on `wishlistPlaces.parentId` | Already in DB; Drizzle schema updated for consistency | ✅ Schema synced, no migration needed |
| 3.3 `updatedAt` on `series` | Migration 0022 rebuilds `series` with `updated_at NOT NULL` | ✅ Existing 5 rows populated from `created_at` |
| 3.4 `createdAt`/`updatedAt` on `categories` | Migration 0022 rebuilds `categories` | ✅ Existing 18 rows populated with current time |
| 3.5 `createdAt`/`updatedAt` on `tags` | Migration 0022 rebuilds `tags` | ✅ Existing 13 rows populated with current time |
| 3.6 Index on `postTags.tagId` | Added via `CREATE INDEX post_tags_tag_id_idx` | ✅ Index present |

### Application code updates

- `src/server/dal/series.ts:128-131` — series insert + onConflictDoUpdate set `updatedAt`
- `src/app/admin/actions.ts:102-116` — category upsert sets timestamps
- `src/app/admin/actions.ts:337-343` — tag insert sets timestamps
- `scripts/seed-series-categories.ts:35-48` — seed data includes timestamps
- `scripts/import-supabase.ts:554-572` — import batch includes timestamps

### Migration approach

SQLite does not support `ALTER TABLE ADD COLUMN` with non-constant defaults, so affected tables are rebuilt via the `__new_*` pattern. `PRAGMA foreign_keys=OFF` is used during rebuilds to allow `DROP TABLE` on tables referenced by FKs in other tables.

### Companion UI cleanup

- `web/src/app/(blog)/page.tsx:155-167` — Removed the homepage "Stay on the trail" section
- `web/src/components/layout/site-footer.tsx` — Re-added the "Stay on the trail" footer newsletter (was incorrectly removed in Branch 2)
- `web/tests/unit/home-page.test.tsx:78` — Updated test to expect no inline newsletter

---

## Checklist (all complete)

### 3.1 Add FK + index on `wishlistPlaces.linkedPostId`
- [x] Edit `web/src/drizzle/schema.ts:194` — add `.references(() => posts.id)`
- [x] Add `linkedPostIdIdx` index in table config
- [x] Generate migration: hand-written 0021 (drizzle-kit CLI broken in this env)
- [x] Review generated SQL (rebuild pattern)
- [x] Apply to production DB via libsql client
- [x] Verify FK by attempting invalid insert — rejected ✅

### 3.2 Add FK on `wishlistPlaces.parentId`
- [x] Drizzle schema updated with `.references(() => wishlistPlaces.id)` cast
- [x] FK already exists in DB; no migration needed
- [x] Drizzle schema now matches DB state

### 3.3 Add `updatedAt` to `series`
- [x] Edit `web/src/drizzle/schema.ts:9`
- [x] Hand-written migration 0022 rebuilds series with `updated_at NOT NULL`
- [x] Applied to production DB
- [x] Updated `web/src/server/dal/series.ts` to set `updatedAt`
- [x] Existing 5 rows populated from `created_at`

### 3.4 Add `createdAt`/`updatedAt` to `categories`
- [x] Edit `web/src/drizzle/schema.ts:48-49`
- [x] Migration 0022 rebuilds categories
- [x] Applied to production DB
- [x] Updated `web/src/app/admin/actions.ts` to set timestamps
- [x] Updated import-supabase.ts script
- [x] Existing 18 rows populated with current time

### 3.5 Add `createdAt`/`updatedAt` to `tags`
- [x] Edit `web/src/drizzle/schema.ts:175-176`
- [x] Migration 0022 rebuilds tags
- [x] Applied to production DB
- [x] Updated `web/src/app/admin/actions.ts` to set timestamps
- [x] Updated import-supabase.ts script
- [x] Existing 13 rows populated with current time

### 3.6 Add index on `postTags.tagId`
- [x] Edit `web/src/drizzle/schema.ts:222` — add `tagIdIdx` in table config
- [x] Migration 0022 includes `CREATE INDEX post_tags_tag_id_idx`
- [x] Applied to production DB — index present ✅

---

## Commits

```
91ca73f  test: update home-page test to expect no inline newsletter
e22f609  chore: set audit timestamps on series/categories/tags inserts
1034675  docs: mark Branch 3 in progress with companion cleanup note
[earlier] chore: add FK and audit timestamps to taxonomy and wishlist tables
[earlier] fix: keep footer newsletter, remove homepage newsletter section
[earlier] fix: remove newsletter and social sections from footer
```

(Squash-merged into main as PR #44; branch deleted.)

---

## PR

[#44](https://github.com/JevonThompsonx/jsquared_blog/pull/44)

---

## Acceptance Criteria

- [x] All 6 checklist items complete
- [x] Migrations generated and committed
- [x] Migrations applied to production DB successfully
- [x] CI passes
- [x] PR created and merged to main
- [x] `docs/ROADMAP.md` status table updated to ✅ Merged
- [x] `docs/CHANGELOG.md` entry added (v0.4.3)
- [x] Branch deleted

---

## Post-Merge Actions

After this branch merges, the following branches become unblocked:
- Branch 4: `feat/taxonomy-browse` (uses timestamps on categories/tags) — 🔵 Ready
- Branch 5: `feat/admin-taxonomy-crud` (uses timestamps) — 🔵 Ready
- Branch 6: `feat/revision-completeness` (schema conventions established) — 🔵 Ready

All three have been marked 🔵 Ready in `docs/ROADMAP.md`.

## Goal

Fix data integrity issues: missing foreign key constraints, missing indexes on frequently-queried columns, and missing audit timestamps on taxonomy tables. All changes are additive (no breaking changes).

---

## Checklist

### 3.1 Add FK + index on `wishlistPlaces.linkedPostId`
- [ ] Edit `web/src/drizzle/schema.ts:194`
- [ ] Add `.references(() => posts.id)` to `linkedPostId` column
- [ ] Add index in the table config:
  ```typescript
  linkedPostIdIdx: index("wishlist_places_linked_post_id_idx").on(table.linkedPostId),
  ```
- [ ] Generate migration: `pnpm drizzle-kit generate`
- [ ] Review generated SQL (ensure no destructive changes)
- [ ] Apply to local DB: `pnpm drizzle-kit migrate` or `turso db shell < db.sql`
- [ ] Verify no existing data violates the FK (check for orphaned `linkedPostId` values)

**Files:**
- `web/src/drizzle/schema.ts`
- `web/src/drizzle/migrations/` (new migration)

**Test:**
- [ ] Try to insert wishlist place with invalid `linkedPostId` → should fail
- [ ] Verify index exists: `.schema wishlist_places` shows `linked_post_id_idx`

---

### 3.2 Add FK on `wishlistPlaces.parentId`
- [ ] Edit `web/src/drizzle/schema.ts:198`
- [ ] Add `.references((): AnySQLiteColumn => wishlistPlaces.id)` (self-reference requires AnySQLiteColumn cast)
- [ ] Generate migration
- [ ] Apply to local DB
- [ ] Verify no circular dependency errors

**Files:**
- `web/src/drizzle/schema.ts`
- `web/src/drizzle/migrations/` (new migration)

**Test:**
- [ ] Try to insert wishlist place with invalid `parentId` → should fail

---

### 3.3 Add `updatedAt` to `series`
- [ ] Edit `web/src/drizzle/schema.ts:3-9`
- [ ] Add `updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull()`
- [ ] Generate migration
- [ ] Apply to local DB (migration must set default value for existing rows, e.g., `updated_at = created_at`)
- [ ] Update `web/src/server/dal/series.ts` to set `updatedAt` on insert/update
- [ ] Update any code that reads `series` to include `updatedAt` if needed

**Files:**
- `web/src/drizzle/schema.ts`
- `web/src/drizzle/migrations/` (new migration)
- `web/src/server/dal/series.ts`

**Test:**
- [ ] Create new series, verify `updatedAt` is set
- [ ] Update series, verify `updatedAt` changes
- [ ] Run `pnpm run test` to check no broken references

---

### 3.4 Add `createdAt`/`updatedAt` to `categories`
- [ ] Edit `web/src/drizzle/schema.ts:44-49`
- [ ] Add both columns with `.notNull()`
- [ ] Generate migration
- [ ] Apply to local DB (migration must set default values for existing rows)
- [ ] Update `web/src/server/dal/` (create new `categories.ts` DAL file) to set timestamps
- [ ] Update `web/src/app/admin/actions.ts` (or wherever category CRUD lives) to set timestamps
- [ ] Check for any code that reads categories and update types

**Files:**
- `web/src/drizzle/schema.ts`
- `web/src/drizzle/migrations/` (new migration)
- `web/src/server/dal/categories.ts` (new)
- `web/src/app/admin/actions.ts` or wherever category writes happen

**Test:**
- [ ] Run `pnpm run test` to catch any type errors
- [ ] Verify existing categories have `createdAt`/`updatedAt` populated

---

### 3.5 Add `createdAt`/`updatedAt` to `tags`
- [ ] Edit `web/src/drizzle/schema.ts:170-175`
- [ ] Add both columns with `.notNull()`
- [ ] Generate migration
- [ ] Apply to local DB
- [ ] Update `web/src/server/dal/admin-tags.ts` to set timestamps
- [ ] Update tag creation logic (likely in `web/src/app/admin/actions.ts` or `web/src/server/posts/`)

**Files:**
- `web/src/drizzle/schema.ts`
- `web/src/drizzle/migrations/` (new migration)
- `web/src/server/dal/admin-tags.ts`

**Test:**
- [ ] Run `pnpm run test` to catch type errors
- [ ] Verify existing tags have timestamps

---

### 3.6 Add index on `postTags.tagId`
- [ ] Edit `web/src/drizzle/schema.ts:212-221`
- [ ] Add index in table config:
  ```typescript
  tagIdIdx: index("post_tags_tag_id_idx").on(table.tagId),
  ```
- [ ] Generate migration
- [ ] Apply to local DB

**Files:**
- `web/src/drizzle/schema.ts`
- `web/src/drizzle/migrations/` (new migration)

**Test:**
- [ ] Verify index exists: `.schema post_tags` shows `tag_id_idx`
- [ ] Run a query that joins `post_tags` on `tagId`, verify it uses the index (`EXPLAIN QUERY PLAN`)

---

## Pre-Commit Verification

```bash
cd web
pnpm run test
pnpm dlx tsc --noEmit
pnpm run lint
```

**Extra for schema branches:**
- [ ] Drizzle migration generated and committed
- [ ] Migration applied to local DB without errors
- [ ] No data loss (verify row counts before/after)
- [ ] No broken foreign keys in existing data

---

## Commit Strategy

One commit per schema change (6 commits total), or one squash-merge commit:

```
chore: add FK constraint and index to wishlistPlaces.linkedPostId
chore: add FK constraint to wishlistPlaces.parentId
chore: add updatedAt timestamp to series
chore: add createdAt/updatedAt timestamps to categories
chore: add createdAt/updatedAt timestamps to tags
chore: add index on postTags.tagId
```

---

## PR Description Template

```markdown
## Schema Hardening — Data Integrity and Audit Trail

### Changes
- Adds foreign key constraint + index to `wishlistPlaces.linkedPostId` (prevents orphaned references)
- Adds foreign key constraint to `wishlistPlaces.parentId` (prevents orphaned hierarchy)
- Adds `updatedAt` timestamp to `series` table
- Adds `createdAt`/`updatedAt` timestamps to `categories` table
- Adds `createdAt`/`updatedAt` timestamps to `tags` table
- Adds index on `postTags.tagId` (improves tag listing query performance)

### Migration
- Generated via `pnpm drizzle-kit generate`
- Applied to local DB successfully
- All existing rows populated with default timestamps

### Testing
- [ ] Migration applies cleanly on a fresh database
- [ ] Migration applies cleanly on a database with existing data
- [ ] FK constraints reject invalid inserts
- [ ] Indexes are created and used by queries
- [ ] All existing tests pass
- [ ] No data loss (row counts unchanged)

### Risk Assessment
- **Low risk** — all changes are additive (new columns with defaults, new constraints that don't affect existing valid data)
- **Rollback plan** — migration can be reversed; FK constraints can be dropped if needed
```

---

## Acceptance Criteria

- [ ] All 6 checklist items complete
- [ ] Migration generated and committed
- [ ] Migration applied to local DB successfully
- [ ] CI passes
- [ ] PR created and merged to main
- [ ] Production migration applied (coordinate with deployment)
- [ ] `docs/ROADMAP.md` status table updated to ✅ Merged
- [ ] `docs/CHANGELOG.md` entry added
- [ ] Branch deleted

---

## Post-Merge Actions

After this branch merges, the following branches become unblocked:
- Branch 4: `feat/taxonomy-browse` (uses timestamps on categories/tags)
- Branch 5: `feat/admin-taxonomy-crud` (uses timestamps)
- Branch 6: `feat/revision-completeness` (schema conventions established)

Update `docs/ROADMAP.md` to mark these as 🔵 Ready after merge.
