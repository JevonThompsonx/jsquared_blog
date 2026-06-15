# Branch 2: `feat/layout-footer-and-nav`

**Status:** ✅ Merged (PR #43, 2026-06-15)
**Estimated effort:** 3-4 hours
**Depends on:** Nothing

---

## Goal

Add layout-level UX improvements: a site footer, a back-to-top button, and dark-mode support for the global error page. All three are layout-level changes that ship together because they share the same touchpoint (the site shell).

---

## Checklist

### 2.1 Create site footer component
- [x] Create `web/src/components/layout/site-footer.tsx`
- [x] Add sections:
  - **Brand:** Site name, tagline, copyright
  - **Navigation:** Home, Map, About, Wishlist
  - **Content:** Tags, Categories, RSS Feed
  - **Social:** Instagram, YouTube (use placeholder URLs if actual URLs unknown — to be filled in later)
  - **Newsletter re-CTA:** Compact newsletter signup form
- [x] Style with Tailwind using existing theme variables (`var(--card-bg)`, `var(--border)`, etc.)
- [x] Responsive: stack on mobile, grid on desktop
- [x] Add to `web/src/app/layout.tsx` below `{children}`

**Files:**
- `web/src/components/layout/site-footer.tsx` (new)
- `web/src/app/layout.tsx`

**Test:**
- [x] View homepage, scroll to bottom, verify footer renders
- [x] View post page, verify footer renders
- [x] Toggle dark mode, verify footer respects theme
- [x] Resize to mobile, verify layout stacks

---

### 2.2 Add back-to-top floating button
- [x] Create `web/src/components/ui/back-to-top.tsx`
- [x] Client component using `useState` + `useEffect` to track scroll position
- [x] Appears after scrolling down 500px
- [x] Smooth scroll to top on click (`window.scrollTo({ top: 0, behavior: "smooth" })`)
- [x] Fixed position bottom-right, z-index above content
- [x] Accessible: `aria-label="Back to top"`, keyboard focusable
- [x] Respect `prefers-reduced-motion` (use `behavior: "auto"` if reduced)
- [x] Add to `web/src/app/layout.tsx` (or selectively to long pages)

**Files:**
- `web/src/components/ui/back-to-top.tsx` (new)
- `web/src/app/layout.tsx`

**Test:**
- [x] View long page, scroll down, verify button appears
- [x] Click button, verify smooth scroll to top
- [x] Test keyboard focus, verify accessible
- [x] Toggle dark mode, verify button visible

---

### 2.3 Global error respects dark mode
- [x] Edit `web/src/app/global-error.tsx`
- [x] Replace hardcoded colors with CSS custom properties or `@media (prefers-color-scheme: dark)` block
- [x] Add dark palette: `background: #111812`, `color: #f4efe5`, `border: #2a3a2a`, etc.
- [x] Use `useEffect` + `window.matchMedia('(prefers-color-scheme: dark)')` to detect theme
- [x] Or: use CSS custom properties with fallback (simpler, works without JS)

**Files:**
- `web/src/app/global-error.tsx`

**Test:**
- [x] Trigger global error (e.g., throw in root layout)
- [x] Verify error page renders in light mode (default)
- [x] Toggle OS to dark mode, verify error page renders dark

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
feat: add site footer with navigation, social links, and newsletter CTA
feat: add back-to-top floating button
fix: make global error page respect dark mode
```

**Actual commits (3 total):**
- `5b8b0f6` feat: add site footer with navigation, social links, and newsletter CTA
- `1d1da91` (squashed with footer) feat: add back-to-top floating button
- `1d1da91` fix: make global error page respect dark mode

---

## PR Description

```markdown
## Layout, Footer, and Navigation Improvements

Adds layout-level UX improvements: a site footer, a back-to-top button, and dark-mode support for the global error page.

### Changes
- Site footer with brand, navigation, discovery, newsletter, social
- Back-to-top floating button
- Global error respects dark mode

### Testing
- [x] All 881 unit tests pass (13 new)
- [x] TypeScript type check passes
- [x] ESLint clean
```

**PR:** [#43](https://github.com/JevonThompsonx/jsquared_blog/pull/43)

---

## Acceptance Criteria

- [x] All 3 checklist items complete
- [x] CI passes
- [x] PR created and merged to main
- [x] `docs/ROADMAP.md` status table updated to ✅ Merged
- [x] `docs/CHANGELOG.md` entry added
- [x] Branch deleted
