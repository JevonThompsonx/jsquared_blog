# Branch 8: `feat/site-search`

**Status:** ✅ Merged (PR #51, 2026-06-15)
**Estimated effort:** 4-6 hours
**Depends on:** Nothing

---

## Goal

Add a dedicated `/search` page that works from anywhere on the site, plus a Cmd+K keyboard shortcut for power users. Currently search only works from the homepage (navigates to `/?search=...`).

---

## Checklist

### 8.1 Create `/search` page
- [ ] Create `web/src/app/(blog)/search/page.tsx`
- [ ] Read `q` from search params
- [ ] Use existing `listPublishedPosts()` DAL function (or search-specific version)
- [ ] Display results with pagination
- [ ] Show search input at top (pre-filled with `q`)
- [ ] Show "No results" state if empty
- [ ] Add loading skeleton: `web/src/app/(blog)/search/loading.tsx`
- [ ] Add empty state component

**Files:**
- `web/src/app/(blog)/search/page.tsx` (new)
- `web/src/app/(blog)/search/loading.tsx` (new)

---

### 8.2 Update header search behavior
- [ ] Edit `web/src/components/layout/site-header.tsx`
- [ ] Change search form `action` from `"/"` to `"/search"`
- [ ] Change search param from `search` to `q`
- [ ] Update `navigateToSearch()` function to navigate to `/search?q=...`
- [ ] Test: type in search from any page, verify it goes to `/search`

**Files:**
- `web/src/components/layout/site-header.tsx`

**Breaking change:** Old `/?search=...` URLs will no longer work. Decide if backward compat is needed (probably not, since this is a new feature).

---

### 8.3 Add Cmd+K keyboard shortcut
- [ ] Edit `web/src/components/layout/site-header.tsx`
- [ ] Add `useEffect` with `keydown` listener
- [ ] Detect `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux)
- [ ] Prevent default browser behavior
- [ ] Focus the search input
- [ ] Add visual hint in search placeholder: `"Search stories… (⌘K)"`
- [ ] Test: press Cmd+K, verify search input focuses

**Files:**
- `web/src/components/layout/site-header.tsx`

---

### 8.4 Add unit tests
- [ ] Test `/search` page renders with mock data
- [ ] Test search input navigation works
- [ ] Test Cmd+K shortcut focuses input (may need jsdom keyboard event)

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
feat: add dedicated /search page with results and pagination
refactor: update header search to navigate to /search instead of /
feat: add Cmd+K keyboard shortcut to focus search input
test: add unit tests for site search
```

---

## Acceptance Criteria

- [ ] All checklist items complete
- [ ] `/search?q=...` works from any page
- [ ] Cmd+K focuses search input
- [ ] Search results display correctly
- [ ] CI passes
- [ ] PR created and merged to main
- [ ] `docs/ROADMAP.md` status table updated to ✅ Merged
- [ ] `docs/CHANGELOG.md` entry added
- [ ] Branch deleted
