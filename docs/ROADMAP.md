# J² Adventures — Implementation Roadmap

> **For any agent opening this repo:** This is the master tracking document for the feature improvement plan. Start here. The current state, what's done, what's next, and how to pick up work are all in this file.

**Last updated:** 2026-06-15
**Project state:** Stable baseline established. CI passing (3/3 jobs green). Ready for feature work.

---

## How to Use This Document

1. **Check the status table below** — see what's done, in progress, or pending.
2. **If picking up a branch** — open `docs/branches/NN-branch-name.md` for the detailed checklist.
3. **After completing a branch** — update the status table, add a CHANGELOG entry, commit.
4. **If you need context on why** — see the original assessment notes at the bottom of this file.

---

## Branch Status

| # | Branch | Status | PR | Merged | Effort | Ships |
|---|--------|--------|----|--------|--------|-------|
| 1 | `feat/seo-and-discovery` | ✅ Merged | [#42](https://github.com/JevonThompsonx/jsquared_blog/pull/42) | 2026-06-15 | 2-3h | robots.txt, sitemap, social cards, hero |
| 2 | `feat/layout-footer-and-nav` | ✅ Merged | [#43](https://github.com/JevonThompsonx/jsquared_blog/pull/43) | 2026-06-15 | 3-4h | Footer, back-to-top, dark error page |
| 3 | `chore/schema-hardening` | ✅ Merged | [#44](https://github.com/JevonThompsonx/jsquared_blog/pull/44) | 2026-06-15 | 2-3h | FK constraints, indexes, audit timestamps |
| 4 | `feat/taxonomy-browse` | ✅ Merged | [#48](https://github.com/JevonThompsonx/jsquared_blog/pull/48) | 2026-06-15 | 3-4h | /tags and /categories browse pages |
| 5 | `feat/admin-taxonomy-crud` | ✅ Merged | [#49](https://github.com/JevonThompsonx/jsquared_blog/pull/49) | 2026-06-15 | 4-5h | Category CRUD, tag create/delete |
| 6 | `feat/revision-completeness` | ✅ Merged | [#47](https://github.com/JevonThompsonx/jsquared_blog/pull/47) | 2026-06-15 | 4-5h | Full revision restore |
| 7 | `feat/performance-and-reliability` | 🔵 Ready | — | — | 5-6h | Caching, image opt, Sentry, rate limits |
| 8 | `feat/site-search` | 🔵 Ready | — | — | 4-6h | /search page, Cmd+K shortcut |
| 9 | `chore/cleanup-and-hardening` | 🔵 Ready | — | — | 3-4h | Zod validation, Cloudinary cleanup, logging |
| 10 | `feat/polish` | 🔵 Ready | — | — | 4-5h | Print styles, a11y, PWA, social links |
| patch | `fix/footer-polish` | ✅ Merged | [#46](https://github.com/JevonThompsonx/jsquared_blog/pull/46) | 2026-06-15 | 30min | Removed "All rights reserved", gradient transition above footer |
| docs | `docs/knowledge-base` | ✅ Merged | [#45](https://github.com/JevonThompsonx/jsquared_blog/pull/45) | 2026-06-15 | 1h | KNOWLEDGE_BASE.md created, LESSONS.md merged in |

**Legend:**
- 🔵 **Ready** — Can be picked up immediately
- 🟡 **Blocked** — Waiting on another branch to merge first
- 🟢 **In Progress** — Currently being worked on (see "Active Branch" below)
- ✅ **Merged** — Done and shipped to main

**Active Branch:** *(none — branches 1-6 merged; branches 7-10 remain 🔵 Ready)*

## Updated: 2026-06-15 — Phases 1 and 2 complete

- **Phase 1 (branches 1, 2, 3, 7, 8, 9, 10)** — Branches 1, 2, 3 merged. Branches 7, 8, 9, 10 remain 🔵 Ready.
- **Phase 2 (branches 4, 5, 6)** — All three merged after Branch 3 unblocked them. Knowledge base (Branch docs/knowledge-base) and footer polish (Branch fix/footer-polish) also shipped as part of the parallel rollout.

---

## Recommended Merge Order

```
Phase 1 (independent, merge as ready):
  Branch 3 (schema) ── unblocks 4, 5, 6
  Branch 1 (SEO)
  Branch 2 (footer)
  Branch 7 (performance)
  Branch 8 (search)
  Branch 9 (cleanup)
  Branch 10 (polish)

Phase 2 (after Branch 3 merges):
  Branch 4 (taxonomy browse)
  Branch 5 (admin taxonomy CRUD)
  Branch 6 (revision completeness)
```

**Optimal order:** Start with Branch 3 (schema) since it unblocks three other branches. Then merge 1, 2, 7, 8, 9, 10 in any order. Then 4, 5, 6.

---

## Branch Details

Each branch has a detailed file with checklists, files to change, and acceptance criteria:

| # | Branch | Detail File |
|---|--------|-------------|
| 1 | `feat/seo-and-discovery` | [`docs/branches/01-seo-and-discovery.md`](branches/01-seo-and-discovery.md) |
| 2 | `feat/layout-footer-and-nav` | [`docs/branches/02-layout-footer-and-nav.md`](branches/02-layout-footer-and-nav.md) |
| 3 | `chore/schema-hardening` | [`docs/branches/03-schema-hardening.md`](branches/03-schema-hardening.md) |
| 4 | `feat/taxonomy-browse` | [`docs/branches/04-taxonomy-browse.md`](branches/04-taxonomy-browse.md) |
| 5 | `feat/admin-taxonomy-crud` | [`docs/branches/05-admin-taxonomy-crud.md`](branches/05-admin-taxonomy-crud.md) |
| 6 | `feat/revision-completeness` | [`docs/branches/06-revision-completeness.md`](branches/06-revision-completeness.md) |
| 7 | `feat/performance-and-reliability` | [`docs/branches/07-performance-and-reliability.md`](branches/07-performance-and-reliability.md) |
| 8 | `feat/site-search` | [`docs/branches/08-site-search.md`](branches/08-site-search.md) |
| 9 | `chore/cleanup-and-hardening` | [`docs/branches/09-cleanup-and-hardening.md`](branches/09-cleanup-and-hardening.md) |
| 10 | `feat/polish` | [`docs/branches/10-polish.md`](branches/10-polish.md) |

---

## Tracking Workflow for Agents

### When Starting a Branch

1. Check this file's status table — confirm the branch is 🔵 Ready or 🟡 unblocked
2. Read the branch detail file
3. Update status table: 🔵 Ready → 🟢 In Progress
4. Update "Active Branch" section
5. Commit the tracking update
6. Create the feature branch: `git checkout -b feat/branch-name`
7. Implement per the checklist
8. Run CI checks: `pnpm run test && pnpm dlx tsc --noEmit && pnpm run lint`
9. Commit with conventional commit messages
10. Push and create PR

### When Completing a Branch

1. Verify all checklist items in the branch detail file are complete
2. Run final CI checks
3. Update branch detail file: check all boxes
4. Update this ROADMAP.md status table: 🟢 → ✅ Merged (with PR # and merge date)
5. Add entry to [`docs/CHANGELOG.md`](CHANGELOG.md)
6. Commit the tracking updates
7. Delete the feature branch: `git branch -d feat/branch-name`

### If You Need to Pause Mid-Branch

1. Commit any in-progress work
2. Update branch detail file: note where you stopped
3. Update ROADMAP.md: keep 🟢 In Progress, add note in "Active Branch" section
4. Future agent can pick up from the branch detail file

---

## Context: Why This Plan Exists

On 2026-06-15, a comprehensive feature assessment was conducted. The project was found to be stable and feature-rich, but had:

- **Missing standard features:** No robots.txt, no site footer, no tag/category browse pages, no site-wide search
- **Half-built features:** Seasonal hero is static (DB support exists but unused), revision system is incomplete (missing metadata), no admin category CRUD
- **Data integrity gaps:** Missing FK constraints, no soft delete for posts, incomplete audit trails
- **Performance opportunities:** No query caching, wishlist images use raw `<img>`, no Sentry coverage on many 500 errors
- **UX polish:** No back-to-top, no keyboard search shortcut, no print styles, static hero

The plan addresses all of these across 10 branches. Each branch is independently deployable.

---

## See Also

- [`docs/CHANGELOG.md`](CHANGELOG.md) — Log of completed work
- [`docs/IMPROVEMENTS.md`](IMPROVEMENTS.md) — High-level feature backlog (M, S, P, F, R, D, O sections)
- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — System architecture
- [`docs/CODING.md`](CODING.md) — Code conventions and patterns
- [`docs/SETUP.md`](SETUP.md) — Development setup
- [`AGENTS.md`](../AGENTS.md) — Project-specific agent instructions
