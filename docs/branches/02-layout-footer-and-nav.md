# Branch 2: `feat/layout-footer-and-nav`

**Status:** 🔵 Ready to start
**Estimated effort:** 3-4 hours
**Depends on:** Nothing

---

## Goal

Add layout-level UX improvements: a site footer, a back-to-top button, and dark-mode support for the global error page. All three are layout-level changes that ship together because they share the same touchpoint (the site shell).

---

## Checklist

### 2.1 Create site footer component
- [ ] Create `web/src/components/layout/site-footer.tsx`
- [ ] Add sections:
  - **Brand:** Site name, tagline, copyright
  - **Navigation:** Home, Map, About, Wishlist
  - **Content:** Tags, Categories, RSS Feed
  - **Social:** Instagram, YouTube (use placeholder URLs if actual URLs unknown — to be filled in later)
  - **Newsletter re-CTA:** Compact newsletter signup form
- [ ] Style with Tailwind using existing theme variables (`var(--card-bg)`, `var(--border)`, etc.)
- [ ] Responsive: stack on mobile, grid on desktop
- [ ] Add to `web/src/app/layout.tsx` below `{children}`

**Files:**
- `web/src/components/layout/site-footer.tsx` (new)
- `web/src/app/layout.tsx`

**Test:**
- [ ] View homepage, scroll to bottom, verify footer renders
- [ ] View post page, verify footer renders
- [ ] Toggle dark mode, verify footer respects theme
- [ ] Resize to mobile, verify layout stacks

---

### 2.2 Add back-to-top floating button
- [ ] Create `web/src/components/ui/back-to-top.tsx`
- [ ] Client component using `useState` + `useEffect` to track scroll position
- [ ] Appears after scrolling down 500px
- [ ] Smooth scroll to top on click (`window.scrollTo({ top: 0, behavior: "smooth" })`)
- [ ] Fixed position bottom-right, z-index above content
- [ ] Accessible: `aria-label="Back to top"`, keyboard focusable
- [ ] Respect `prefers-reduced-motion` (use `behavior: "auto"` if reduced)
- [ ] Add to `web/src/app/layout.tsx` (or selectively to long pages)

**Files:**
- `web/src/components/ui/back-to-top.tsx` (new)
- `web/src/app/layout.tsx`

**Test:**
- [ ] View long page, scroll down, verify button appears
- [ ] Click button, verify smooth scroll to top
- [ ] Test keyboard focus, verify accessible
- [ ] Toggle dark mode, verify button visible

---

### 2.3 Global error respects dark mode
- [ ] Edit `web/src/app/global-error.tsx`
- [ ] Replace hardcoded colors with CSS custom properties or `@media (prefers-color-scheme: dark)` block
- [ ] Add dark palette: `background: #111812`, `color: #f4efe5`, `border: #2a3a2a`, etc.
- [ ] Use `useEffect` + `window.matchMedia('(prefers-color-scheme: dark)')` to detect theme
- [ ] Or: use CSS custom properties with fallback (simpler, works without JS)

**Files:**
- `web/src/app/global-error.tsx`

**Test:**
- [ ] Trigger global error (e.g., throw in root layout)
- [ ] Verify error page renders in light mode (default)
- [ ] Toggle OS to dark mode, verify error page renders dark

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

---

## PR Description Template

```markdown
## Layout and Navigation Improvements

### Changes
- Adds site footer with navigation, social links, and newsletter re-CTA
- Adds floating "back to top" button that appears after scrolling
- Fixes global error page to respect dark mode (no more jarring light-mode flash)

### Testing
- [ ] Footer renders on all pages
- [ ] Back-to-top button appears after scrolling and works
- [ ] Global error page respects dark mode
- [ ] Mobile layout works
- [ ] Keyboard accessible

### Screenshots
- [ ] Footer (light + dark)
- [ ] Back-to-top button visible
- [ ] Global error page (light + dark)
```

---

## Acceptance Criteria

- [ ] All 3 checklist items complete
- [ ] CI passes
- [ ] PR created and merged to main
- [ ] `docs/ROADMAP.md` status table updated to ✅ Merged
- [ ] `docs/CHANGELOG.md` entry added
- [ ] Branch deleted
