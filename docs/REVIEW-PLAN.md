# Review Plan — Phase 1.1 Bug Bash

> **Purpose:** Track bugs found in the first user review of the 10-branch rollout, the fix branches, and verification results.
> **Created:** 2026-06-15
> **Base:** `main` @ `5a39ecd`

---

## Status Legend

- ⏳ Pending — not started
- 🔵 In Progress — agent working
- ✅ Done — fix committed, tests pass, branch pushed
- ❌ Blocked — blocker noted in Phase Notes
- ⚠️ Regressed — fix caused a regression (see Phase Notes)

---

## Phase 0 — Investigation (DONE)

Three issues were reported by the user. Each was confirmed and root-caused via parallel explore agents.

| # | User Report | Root Cause | Severity |
|---|------------|-----------|----------|
| 1 | `/categories/van-life` shows "0 adventures" | DAL queries `categories.name` but URL passes slug | HIGH |
| 2 | "2 adventures total" with 1 visible post | `listAllTagsForBrowse()` counts drafts | HIGH |
| 3 | Awkward gap between "Next up" section and footer | Section has no `pb-*`; footer `mt-20` + 100px gradient = ~229px | MEDIUM |

A full audit of all 10 branches was also performed. Findings below.

---

## Audit Summary — All MEDIUM+ Issues Found

| # | Branch | Issue | Severity | File:Line |
|---|--------|-------|----------|-----------|
| A1 | Branch 4 (Taxonomy) | Category DAL queries by `name` not `slug` | HIGH | `dal/posts.ts:253,265` |
| A2 | Branch 4 (Taxonomy) | Tag count includes non-published posts | HIGH | `dal/taxonomy-browse.ts:54` |
| A3 | Branch 2 (Footer) | BackToTop keyboard-focusable when invisible | MEDIUM | `ui/back-to-top.tsx` |
| A4 | Branch 7 (Perf) | Search fetches ALL posts, filters in JS (O(n)) | MEDIUM | `server/queries/posts.ts` |
| A5 | Branch 10 (Polish) | Print styles hide ALL buttons globally | MEDIUM | `app/globals.css` |
| A6 | Branch 5 (Admin) | Tags admin page crashes on DB error (no try/catch) | MEDIUM | `app/admin/tags/page.tsx` |
| A7 | Branch 9 (Cleanup) | Post delete orphans `post_links` and `seasons` | MEDIUM | `server/posts/delete.ts` |
| A8 | Branch 6 (Revision) | `max(revision_num)` race → duplicate numbers | MEDIUM | `dal/post-revisions.ts` |
| A9 | Homepage footer | ~229px visual gap between "Next up" and footer | MEDIUM | `app/(blog)/page.tsx:136`, `site-footer.tsx:56` |
| A10 | Branch 1 (SEO) | `SITE_URL` fallback bypasses Zod validation | LOW-MEDIUM | `lib/utils.ts:4` |

**Skipped (LOW only, not worth fixing now):**
- Twitter card missing `site`/`creator` (Branch 1)
- `force-dynamic` on post pages (Branch 1) — performance trade-off, intentional
- robots.ts `host` field non-standard (Branch 1) — Google ignores, dead code
- Schema `comments.parentId` no FK (Branch 3) — intentional, soft-delete pattern
- `getTotalTagCount` double-counts multi-tagged posts — display label only, not a query bug
- TOCTOU race on `categorySlugExists` (Branch 5) — caught by unique index, acceptable
- `revalidateTag` audit concern (Branch 7) — verified present in `admin/actions.ts`, false positive

---

## Phase Plan

8 fix branches, sequential phases. Each phase: create branch → fix → test → verify → commit → push.

### Phase 1 — `fix/branch-4-taxonomy-queries` ✅

**Fixes:** A1, A2
**Commit:** `ad1a274`
**Branch:** pushed to `origin/fix/branch-4-taxonomy-queries`

**Files changed:**
- `web/src/server/dal/posts.ts` — renamed `category` → `categorySlug` in `listPublishedPostRecordsByCategory` and `countPublishedPostsByCategory`; changed `eq(categories.name, category)` → `eq(categories.slug, categorySlug)` (2 lines)
- `web/src/server/dal/taxonomy-browse.ts` — replaced `count(postTags.postId)` with `COUNT(CASE WHEN posts.status = 'published' THEN posts.id END)`; added `leftJoin(posts, eq(postTags.postId, posts.id))`; removed unused `count` import

**Tests added (6 new):**
- `posts-dal.test.ts` (new file, 5 tests) — list by slug, count by slug
- `taxonomy-browse-dal.test.ts` (1 new test) — "only counts published posts in the post count (excludes drafts and scheduled)"

**Verification:**
- `pnpm run test` — **1080/1080 pass** (was 1074, +6 tests)
- `pnpm dlx tsc --noEmit` — clean
- `pnpm run lint` — clean
- Logic check: page passes `label` (URL-decoded slug) to DAL → DAL now queries by `categories.slug` → match ✓
- Logic check: `listAllTagsForBrowse` now joins `posts` table and conditionally counts published only → draft exclusion ✓

### Phase 2 — `fix/branch-2-backtop-a11y` ⏳

**Fixes:** A3
**Files to change:**
- `web/src/components/ui/back-to-top.tsx` — add `aria-hidden={!visible}` and `tabIndex={visible ? 0 : -1}`

**Tests to add:**
- Button is not focusable when `!visible`
- Button is focusable when `visible`

**Verification:** test + typecheck + lint

### Phase 3 — `fix/branch-7-search-perf` ⏳

**Fixes:** A4
**Files to change:**
- `web/src/server/queries/posts.ts` — replace JS filtering with Drizzle `like` query; remove `listAllPublishedPostRecords()` call from search path

**Tests to add:**
- Search returns filtered results
- Empty query returns all published posts
- Search is case-insensitive

**Verification:** test + typecheck + lint

### Phase 4 — `fix/branch-10-print-scope` ⏳

**Fixes:** A5
**Files to change:**
- `web/src/app/globals.css` — scope `button:not([data-print-show])` to header/nav/footer only

**Tests to add:**
- Print media query hides nav buttons
- Print media query does not hide article buttons

**Verification:** test + typecheck + lint

### Phase 5 — `fix/branch-5-tags-admin-error` ⏳

**Fixes:** A6
**Files to change:**
- `web/src/app/admin/tags/page.tsx` — add try/catch with `loadFailed` state (same pattern as categories page)

**Tests to add:**
- Tags page renders successfully
- Tags page shows error state on DB failure

**Verification:** test + typecheck + lint

### Phase 6 — `fix/branch-9-orphan-cleanup` ⏳

**Fixes:** A7
**Files to change:**
- `web/src/server/posts/delete.ts` — delete from `postLinks` and `seasons` before/within post delete transaction

**Tests to add:**
- Post delete removes related `postLinks`
- Post delete removes related `seasons`

**Verification:** test + typecheck + lint

### Phase 7 — `fix/homepage-footer-spacing` ⏳

**Fixes:** A9
**Files to change:**
- `web/src/app/(blog)/page.tsx:136` — add `pb-8` to the "Next up" section
- `web/src/components/layout/site-footer.tsx:56` — reduce `mt-20` to `mt-16`

**Tests to add:**
- Homepage layout renders with correct spacing (visual/snapshot)
- Responsive: works on mobile through desktop

**Verification:** test + typecheck + lint + visual check

### Phase 8 — `fix/branch-6-revision-race` ⏳

**Fixes:** A8
**Files to change:**
- `web/src/server/dal/post-revisions.ts` — replace `max(revision_num)` with sequential read within transaction

**Tests to add:**
- Revision creation uses correct next number
- Concurrent revision creation does not produce duplicates

**Verification:** test + typecheck + lint

---

## Phase 9 — Final Merge ⏳

After all 8 fix branches pass:
1. Create one consolidated PR per fix branch (8 PRs) OR one mega-PR
2. Merge all to main
3. Final verification on main

**TBD:** Decide PR strategy based on number of changes.

---

## Tracking Table

| Phase | Branch | Status | Commit | PR | Tests Added | Notes |
|-------|--------|--------|--------|-----|-------------|-------|
| 1 | `fix/branch-4-taxonomy-queries` | ✅ | `ad1a274` | — (deferred to Phase 9) | +6 | Pushed. Fixes user-reported bugs. |
| 2 | `fix/branch-2-backtop-a11y` | ⏳ | — | — | — | — |
| 3 | `fix/branch-7-search-perf` | ⏳ | — | — | — | — |
| 4 | `fix/branch-10-print-scope` | ⏳ | — | — | — | — |
| 5 | `fix/branch-5-tags-admin-error` | ⏳ | — | — | — | — |
| 6 | `fix/branch-9-orphan-cleanup` | ⏳ | — | — | — | — |
| 7 | `fix/homepage-footer-spacing` | ⏳ | — | — | — | — |
| 8 | `fix/branch-6-revision-race` | ⏳ | — | — | — | — |
| 9 | Merge to main | ⏳ | — | — | — | — |

---

## Agent Assignment Strategy

Each phase uses one `@general` sub-agent. The agent receives:
- Phase-specific issue description
- File paths to change
- Test requirements
- Verification commands

Agents work in isolated worktrees to avoid conflicts. Verification is run after each agent completes before proceeding to the next phase.

---

## Notes

- **No file conflicts** between fix branches — each touches different files
- **Test count expected:** 1074 → ~1100 (approximately 3-4 new tests per fix)
- **Merge order:** Independent, can be merged in any order
- **Rollback:** Each fix branch can be reverted independently
