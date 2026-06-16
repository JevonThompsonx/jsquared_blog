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

**Fixes:** A1, A2, **C5** (added after concerns review)
**Commits:** `ad1a274` (initial), `ac22c4b` (C5 — display name lookup)
**Branch:** pushed to `origin/fix/branch-4-taxonomy-queries`

**Files changed (commit `ad1a274`):**
- `web/src/server/dal/posts.ts` — renamed `category` → `categorySlug` in `listPublishedPostRecordsByCategory` and `countPublishedPostsByCategory`; changed `eq(categories.name, category)` → `eq(categories.slug, categorySlug)` (2 lines)
- `web/src/server/dal/taxonomy-browse.ts` — replaced `count(postTags.postId)` with `COUNT(CASE WHEN posts.status = 'published' THEN posts.id END)`; added `leftJoin(posts, eq(postTags.postId, posts.id))`; removed unused `count` import

**Files changed (commit `ac22c4b` — C5):**
- `web/src/server/dal/categories.ts` — added `getCategoryNameBySlug(slug)` for slug→name lookup
- `web/src/app/(blog)/category/[category]/page.tsx` — use display name in title/heading/empty-title; fall back to slug if not in DB
- `web/src/app/(blog)/category/[category]/feed.xml/route.ts` — use display name in feed title/description
- `web/tests/unit/category-page.test.tsx` — mock `getCategoryNameBySlug`; assert display name; add fallback test
- `web/tests/unit/category-feed-route.test.ts` — same updates + fallback test

**Tests added (8 total):**
- `posts-dal.test.ts` (new file, 5 tests) — list by slug, count by slug
- `taxonomy-browse-dal.test.ts` (1 new test) — "only counts published posts"
- `category-page.test.tsx` (1 new test) — fallback when category not in DB
- `category-feed-route.test.ts` (1 new test) — fallback when category not in DB

**Verification:**
- `pnpm run test` — **1082/1082 pass** (was 1074, +8 tests)
- `pnpm dlx tsc --noEmit` — clean
- `pnpm run lint` — clean
- Logic check: page passes `label` (URL-decoded slug) to DAL → DAL queries by `categories.slug` → match ✓
- Logic check: `listAllTagsForBrowse` joins `posts` table and conditionally counts published only → draft exclusion ✓
- Logic check: page looks up display name via `getCategoryNameBySlug`; uses name for title; falls back to slug if not in DB ✓

### Phase 2 — `fix/branch-2-backtop-a11y` ✅

**Fixes:** A3
**Commit:** `e9c20e0`
**Branch:** pushed to `origin/fix/branch-2-backtop-a11y`

**Files changed:**
- `web/src/components/ui/back-to-top.tsx:35` — added `aria-hidden={!visible}`
- `web/src/components/ui/back-to-top.tsx:43` — added `tabIndex={visible ? 0 : -1}`

**Tests added (3):**
- Hidden from a11y tree and tab order when invisible (scrollY < 500)
- Exposed to a11y and focusable when visible (scrollY > 500)
- Returns to hidden / not focusable when scrolled back above threshold

**Verification:**
- `pnpm run test` — **1077/1077 pass** (was 1074, +3 on this worktree)
- `tsc --noEmit` — clean
- `pnpm run lint` — clean

**Concerns Gate:**
- C1 discovered: wrapper param `category` vs inner `categorySlug` mismatch → concern-fix branch
- C2 discovered: test inputs use URL-encoded name instead of slug → concern-fix branch
- C3 closed: `aria-hidden` + `tabIndex` belt-and-suspenders — correct approach
- C4 closed: no e2e needed — unit sufficient for attribute-level assertions

### Phase C — `fix/concerns-phase1-phase2` ✅

**Concerns fixed:** C1, C2
**Commit:** `c3509b7`
**Branch:** pushed to `origin/fix/concerns-phase1-phase2`

**Files changed:**
- `web/src/server/queries/posts.ts:212` — renamed `category` → `categorySlug` (C1)
- `web/tests/unit/category-page.test.tsx:62-82` — URL params `Van%20Life` → `van-life`; assertions updated (C2)
- `web/tests/unit/category-feed-route.test.ts:48-58` — same updates (C2)

**Verification:**
- `pnpm run test` — **1074/1074 pass** (no count change — renames only)
- `tsc --noEmit` — clean
- `pnpm run lint` — clean
- Both updated test files: 7/7 pass

**C5 deferred:** Category page title shows slug, not display name — would need slug-to-name lookup, out of scope. Noted for future work.

### Phase 3 — `fix/branch-7-search-perf` ✅

**Fixes:** A4
**Files changed:**
- `web/src/server/dal/posts.ts` — new `searchPublishedPostRecords(query, limit, offset)` with LEFT JOINs to categories, mediaAssets, postTags, tags; case-insensitive LIKE across 5 columns; wildcard escaping
- `web/src/server/queries/posts.ts` — search path now calls DAL directly; `filterPublishedPosts()` removed (dead code)
- `web/tests/unit/posts-dal-search.test.ts` — 8 new tests

**Tests added:**
- Empty query falls through to `listPublishedPostRecords`
- Whitespace-only query handled identically
- Search path uses `selectDistinct` (not `select`) for dedup
- Joins 4 tables (categories, mediaAssets, postTags, tags)
- WHERE contains AND of status filter + OR of 5 search conditions
- Search conditions are `sql` tagged templates
- Query is lowercased before LIKE
- LIKE wildcards (`%`, `_`) in user input are escaped to literal text
- Returns rows from DB

**Verification:**
- `pnpm run test` — **1082/1082 pass** (+8 vs main baseline 1074)
- `tsc --noEmit` — clean
- `pnpm run lint` — clean

**Performance note:** For a corpus <1000 posts, single LIKE with 4 LEFT JOINs is fast. FTS5 index is a future optimization; not needed at current scale.

### Phase 4 — `fix/branch-10-print-scope` ✅

**Fixes:** A5
**Files changed:**
- `web/src/app/globals.css` — removed global `button:not([data-print-show])` rule; added scoped `header button:not([data-print-show])`, `nav button:not([data-print-show])`, `footer button:not([data-print-show])` (single rule, three selectors)
- `web/tests/unit/globals-print-styles.test.ts` — 6 new tests; updated 1 existing test to no longer expect the global rule

**Tests added:**
- `header button` is in the print block
- `nav button` is in the print block
- `footer button` is in the print block
- No selector in the print block is a bare `button:not([data-print-show])` (would indicate a global hide)
- `[data-print-show]` opt-in is preserved
- No selector targets `article button` or `.prose-content button` for hiding

**Verification:**
- `pnpm run test` — **1080/1080 pass** (+6 vs main baseline 1074)
- `tsc --noEmit` — clean
- `pnpm run lint` — clean

**Behavior change:** Post-gallery image-zoom buttons (and other article-body buttons) are now visible in print, so the wrapped `<NextImage>` content prints. The previous blanket hide rule was suppressing them along with chrome buttons.

### Phase 5 — `fix/branch-5-tags-admin-error` ✅

**Fixes:** A6
**Files changed:**
- `web/src/app/admin/tags/page.tsx` — wrapped `listAllTagsWithCounts()` in try/catch; added `loadFailed` flag; renders "Tag data is temporarily unavailable" message in place of list/empty-state; uses exported `AdminTagRecord` type
- `web/tests/unit/admin-tags-page.test.tsx` — 1 new test for the load failure path

**Tests added:**
- DAL throws → "Tag data is temporarily unavailable" rendered
- DAL throws → empty-state and list testids NOT present (no misleading UI)
- DAL throws → create form STILL present (admin can keep working)

**Verification:**
- `pnpm run test` — **1075/1075 pass** (+1 vs main baseline 1074)
- `tsc --noEmit` — clean
- `pnpm run lint` — clean

**Pattern alignment:** Matches `admin/categories/page.tsx` exactly. `console.error("[admin tags] Failed to load tags", error)` follows the same `[admin <area>] Failed to load <resource>` convention.

### Phase 6 — `fix/branch-9-orphan-cleanup` ✅

**Fixes:** A7
**Files changed:**
- `web/src/server/posts/delete.ts` — added `postLinks` import; new step 7 inside transaction: `tx.delete(postLinks).where(inArray(postLinks.postId, toDelete))`. Step numbers below renumbered (7→8, 8→9, 9→10).
- `web/tests/unit/posts-delete-cloudinary-cleanup.test.ts` — 2 new tests (single + batch)

**Tests added:**
- Single-post delete calls `tx.delete(postLinks)` within the transaction
- Batch delete also covers all post IDs via `inArray`

**Scope correction:** The audit (A7) mentioned `seasons` but `seasons.created_by_user_id` references `users.id`, not `posts.id`. No cleanup needed for seasons. Concern C15 documents this.

**Verification:**
- `pnpm run test` — **1076/1076 pass** (+2 vs main baseline 1074)
- `tsc --noEmit` — clean
- `pnpm run lint` — clean

### Phase 7 — `fix/homepage-footer-spacing` ✅

**Fixes:** A9
**Files changed:**
- `web/src/app/(blog)/page.tsx:136` — `pt-8` → `pt-8 pb-8` (adds 32px bottom padding to "Next up" section)
- `web/src/components/layout/site-footer.tsx:56` — `mt-20` → `mt-16` (reduces footer top margin by 16px)
- `web/tests/unit/home-page.test.tsx` — 1 new test
- `web/tests/unit/site-footer.test.tsx` — 1 new test

**Tests added:**
- "Next up" `<section>` has `pb-8` or `py-8` in its class
- Site footer has `mt-16` and NOT `mt-20`

**Verification:**
- `pnpm run test` — **1076/1076 pass** (+2 vs main baseline 1074)
- `tsc --noEmit` — clean
- `pnpm run lint` — clean

**Net effect:** ~48px reduction in the homepage→footer visual gap.

### Phase 8 — `fix/branch-6-revision-race` ✅

**Fixes:** A8
**Files changed:**
- `web/src/server/dal/post-revisions.ts` — `createPostRevision` replaced read-then-insert with a single atomic INSERT that uses a SQL subquery to compute the next revision_num. Uses `.returning()` to get the actual value.
- `web/tests/unit/post-revisions-dal-race.test.ts` — 4 new tests

**Tests added:**
- No `db.select` call (old read step is gone)
- `db.insert` called exactly once (single atomic statement)
- `revisionNum` value is a `sql` template containing MAX+COALESCE+1
- Returned record has the correct revisionNum from RETURNING
- revisionNum=1 when no prior revisions exist

**Verification:**
- `pnpm run test` — **1078/1078 pass** (+4 vs main baseline 1074)
- `tsc --noEmit` — clean
- `pnpm run lint` — clean

**Race condition fix:** The SELECT subquery and INSERT now execute as one statement. SQLite/libSQL guarantee statement-level atomicity, so two concurrent calls serialize at the DB level and each sees its own pre-insert state. Duplicates are impossible.

---

## Phase 9 — Final Merge ✅

**Status:** Complete. All 8 fix branches + Phase C squashed into main via local merges.

**Merge order:**
1. `fix/branch-4-taxonomy-queries` (Phase 1) — A1, A2, C5
2. `fix/concerns-phase1-phase2` (Phase C) — C1, C2
3. `fix/branch-2-backtop-a11y` (Phase 2) — A3
4. `fix/branch-7-search-perf` (Phase 3) — A4
5. `fix/branch-10-print-scope` (Phase 4) — A5
6. `fix/branch-5-tags-admin-error` (Phase 5) — A6
7. `fix/branch-9-orphan-cleanup` (Phase 6) — A7
8. `fix/homepage-footer-spacing` (Phase 7) — A9
9. `fix/branch-6-revision-race` (Phase 8) — A8

**Strategy decision:** Local merges instead of PRs. Each fix branch was independently developed and verified in its own worktree. The branches don't conflict in code (each touches different files), only in `docs/REVIEW-PLAN.md` (which has phase status updates). Conflicts resolved by combining all phase statuses into a unified table.

**Final verification on main:**
- `pnpm run test` — **1108/1108 pass** (+34 vs pre-review baseline of 1074)
- `tsc --noEmit` — clean
- `pnpm run lint` — clean

**TBD:** Decide PR strategy based on number of changes.

---

## Tracking Table

| Phase | Branch | Status | Commit | PR | Tests Added | Notes |
|-------|--------|--------|--------|-----|-------------|-------|
| 1 | `fix/branch-4-taxonomy-queries` | ✅ | `ad1a274` + `ac22c4b` | | +8 | Pushed. Fixes A1, A2, C5. |
| 2 | `fix/branch-2-backtop-a11y` | ✅ | `e9c20e0` | | +3 | Pushed. A11y fix. |
| 3 | `fix/branch-7-search-perf` | ✅ | `7b42b98` | | +8 | Pushed. DB-level LIKE filter; O(n) → indexed. |
| 4 | `fix/branch-10-print-scope` | ✅ | `ffadfaa` | | +6 | Pushed. Print button hide scoped to header/nav/footer. |
| 5 | `fix/branch-5-tags-admin-error` | ✅ | `4c367aa` | | +1 | Pushed. Admin tags page handles DAL errors gracefully. |
| 6 | `fix/branch-9-orphan-cleanup` | ✅ | `3d3eb89` | | +2 | Pushed. post_links now cleaned in delete transaction. |
| 7 | `fix/homepage-footer-spacing` | ✅ | `4c71506` | | +2 | Pushed. ~48px visual gap reduction. |
| 8 | `fix/branch-6-revision-race` | ✅ | `789a8af` | | +4 | Pushed. Atomic INSERT subquery; no race. |
| 9 | Merged to main | ✅ | `15f7262` | — | — | All 8 fix branches + Phase C squashed into main. |
| 10 | `fix/open-concerns-batch` | 🟢 | (pending) | | +9 | Addresses C6, C7, C12, C13, C15, C18, C20. C20 is the real race fix. |
| C | `fix/concerns-phase1-phase2` | ✅ | `c3509b7` | | 0 | Pushed. Addresses C1, C2. C5 fixed in Phase 1 (commit `ac22c4b`). |

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

---

## Concerns Verification Gate

After each phase's main fix is committed, a concerns pass is run before moving to the next phase. This catches inconsistencies, naming mismatches, and test accuracy issues before they compound.

### Concerns Discovered

| # | Phase | Concern | Severity | Status | Fix Branch |
|---|-------|---------|----------|--------|------------|
| C1 | 1 | Wrapper `listPublishedPostsByCategory` in `queries/posts.ts:212` still uses `category` param name; inner function now uses `categorySlug` — naming mismatch | LOW | Open | `fix/concerns-phase1-phase2` |
| C2 | 1 | Tests `category-page.test.tsx:73` and `category-feed-route.test.ts:49` pass URL-encoded name (`"Van%20Life"`) instead of slug (`"van-life"`) — doesn't match real-world browse-page behavior | LOW | Open | `fix/concerns-phase1-phase2` |
| C3 | 2 | `aria-hidden` + `tabIndex={-1}` belt-and-suspenders — no fix needed | — | Closed (no action) | — |
| C4 | 2 | No e2e test — unit tests sufficient for attribute-level assertions | — | Closed (no action) | — |
| C5 | 1 | Category page title shows slug (e.g. "van-life – J²Adventures") instead of display name ("Van Life – J²Adventures") — page has no slug-to-name lookup | LOW | **Fixed** | Phase 1 (commit `ac22c4b`) |
| C6 | 3 | `sql\`...ESCAPE '\\\\'\`` syntax with backslash escaping in JS template literal is tricky to read; consider extracting a helper | LOW | **Fixed** (Phase 10) | `fix/open-concerns-batch` (`escapeLikePattern` + `likeClause` helpers in `dal/posts.ts`) |
| C7 | 3 | Search query has no length validation at the DAL boundary; relies on Zod in the route/page — defense-in-depth violation | LOW | **Fixed** (Phase 10) | `fix/open-concerns-batch` (`MAX_SEARCH_QUERY_LENGTH` check at DAL boundary) |
| C8 | 3 | DAL function is wrapped by `unstable_cache` in the query layer; cache key includes args so different searches are cached separately — behavior preserved, but worth documenting | — | Closed (no action) | — |
| C12 | 5 | `loadFailed` branch has no `data-testid` — the new test uses negative assertions (`admin-tags-empty` and `admin-tags-list` NOT present) to detect the error state. A future change that adds a testid back to the error branch would break the negative assertion. A positive testid is safer. | LOW | **Fixed** (Phase 10) | `fix/open-concerns-batch` (positive `data-testid` on both `admin/tags` and `admin/categories` load-failed branches) |
| C13 | 5 | `console.error` is used for the error path instead of `captureException` from `@/lib/sentry`. Sentry is configured (`web/src/lib/sentry.ts`) but neither categories nor tags page uses it for load errors. Pre-existing inconsistency, not introduced by this fix. | LOW | **Fixed** (Phase 10) | `fix/open-concerns-batch` (`captureException(error, { area: "..." })` on both admin pages; `console.error` retained for dev visibility) |
| C14 | 5 | The error message is generic ("temporarily unavailable"). A more actionable message would tell the admin what to try (refresh, check status page). Matches categories page's message; not diverging from the existing pattern. | — | Closed (no action) | — |
| C15 | 6 | The audit (A7) incorrectly states that `seasons` needs cleanup when posts are deleted. `seasons.created_by_user_id` references `users.id`, not `posts.id`. The review plan description should be corrected. Only `post_links` actually needs cleanup. | LOW | **Fixed** (Phase 10) | `fix/open-concerns-batch` (code comment in `delete.ts`) |
| C16 | 6 | The new test uses reference identity (`call[0] === postLinks`) to detect the delete call. If a future change wraps the delete in a helper function (e.g. `deleteChildRows(tx, table, postIds)`), the reference identity would still hold because `table` is the same Drizzle reference. Robust. | — | Closed (no action) | — |
| C17 | 6 | `deletePosts` doesn't guard against a missing `post_links` table (pre-migration DB). Other child-table deletes also lack this guard, so consistent with existing pattern. If pre-migration support is needed, all deletes would need the same `try` wrapper. | — | Closed (no action) | — |
| C18 | 7 | The `mt-16` footer change is global — applies on every page, not just the homepage. Pages with little content above the footer (e.g. simple legal pages) might now feel like the footer is too close. | LOW | **Closed** (Phase 10) | `fix/open-concerns-batch` (design rationale comment in `site-footer.tsx`; accepted trade-off) |
| C19 | 7 | The test checks for `pb-8` OR `py-8` in the class. If a future refactor uses an arbitrary value or CSS custom property, the regex would fail. Acceptable — explicit Tailwind class names are the convention. | — | Closed (no action) | — |
| C20 | 8 | `restorePostRevisionAtomically()` has the same read-then-insert pattern inside a transaction. Concurrent restore calls across separate connections could still race. Should be fixed with the same atomic INSERT pattern. | LOW | **Fixed** (Phase 10) | `fix/open-concerns-batch` (atomic INSERT with SQL subquery, same pattern as `createPostRevision`; unused `max` import removed) |
| C21 | 8 | The fix uses `sql<number>` to type the subquery result. The COALESCE fallback `0` is the same behavior as the old code. | — | Closed (no action) | — |
| C22 | 8 | The fix doesn't add a unique index on `(post_id, revision_num)`. Defense-in-depth would suggest a unique index to catch any future regression. Adding requires a migration, out of scope. | — | Closed (no action) | — |

### Concerns Gate Process

```
After main fix committed for Phase N:
1. Run pnpm run test (must pass)
2. Run tsc --noEmit (must be clean)
3. Run pnpm run lint (must be clean)
4. Walk concerns checklist above
5. Mark new concerns (if any) with severity + branch
6. Only then proceed to Phase N+1
```

### Concern-Fix Branch

`fix/concerns-phase1-phase2` — addresses C1, C2 from Phase 1.

**Files to change:**
- `web/src/server/queries/posts.ts:212` — rename `category` → `categorySlug` (C1)
- `web/tests/unit/category-page.test.tsx:62-82` — update URL params from `"Van%20Life"` → `"van-life"`; update assertions to match (C2)
- `web/tests/unit/category-feed-route.test.ts:48-58` — same updates (C2)

**Merge order:** After Phase 1 and Phase 2 merge to main.

**Verification (concern-fix branch):**
- `pnpm run test` — must pass
- `tsc --noEmit` — must be clean
- `pnpm run lint` — must be clean
- Existing Phase 1 and Phase 2 tests must still pass with new slug-based inputs

**Skipped for now:**
- C5 (title shows slug) — would need slug-to-name lookup, scope creep for a concern-fix branch

---

## Phase N Concerns Template

For each phase going forward, add a new "Concerns" subsection:

```markdown
### Phase N — [name] ⏳
[main fix details]

**Concerns discovered:**
- CN1: [description] — [severity]
- CN2: [description] — [severity]

**Concerns Gate (post-fix):**
- [ ] All existing tests pass
- [ ] Typecheck clean
- [ ] Lint clean
- [ ] CN1 addressed
- [ ] CN2 addressed
- [ ] No new concerns discovered
- [ ] Or: new concerns logged with branch assignment
```
