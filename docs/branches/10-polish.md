# Branch 10: `feat/polish`

**Status:** ✅ Merged (PR #53, 2026-06-15)
**Estimated effort:** 4-5 hours
**Depends on:** Nothing

---

## Goal

Nice-to-have polish improvements that don't affect core functionality. Grouped as "polish" — ship when there's time.

---

## Checklist

### 10.1 Print styles
- [ ] Edit `web/src/app/globals.css`
- [ ] Add `@media print` block
- [ ] Hide: header, nav, footer, comments, share buttons, newsletter form
- [ ] Show: only post content, author, date
- [ ] Use `display: none` or `visibility: hidden` as appropriate
- [ ] Test: print preview a post, verify clean output

**Files:**
- `web/src/app/globals.css`

---

### 10.2 Reading progress a11y
- [ ] Edit `web/src/components/blog/reading-progress-bar.tsx`
- [ ] Add visually hidden `aria-live="polite"` region
- [ ] Announce progress at milestones: 25%, 50%, 75%, 100%
- [ ] Use `sr-only` class for screen reader only content
- [ ] Test: use screen reader, verify progress announcements

**Files:**
- `web/src/components/blog/reading-progress-bar.tsx`

---

### 10.3 Social links on about page
- [ ] Edit `web/src/app/(blog)/about/page.tsx`
- [ ] Add social media links (Instagram, YouTube, etc.)
- [ ] Use placeholder URLs if actual URLs unknown (mark as TODO)
- [ ] Style as icon buttons or text links
- [ ] Test: view about page, verify links render

**Files:**
- `web/src/app/(blog)/about/page.tsx`

---

### 10.4 PWA manifest completeness
- [ ] Edit `web/src/app/manifest.ts`
- [ ] Add PNG icon variants: 192x192, 512x512 (may need to generate from SVG)
- [ ] Add `screenshots` array (desktop and mobile screenshots)
- [ ] Add `categories: ["travel", "blog", "lifestyle"]`
- [ ] Add `lang: "en"`
- [ ] Test: install PWA, verify icons and metadata

**Files:**
- `web/src/app/manifest.ts`
- `public/` (add PNG icons if generating)

---

### 10.5 Accessibility statement page
- [ ] Create `web/src/app/(blog)/accessibility/page.tsx`
- [ ] Write accessibility commitment statement
- [ ] List known accessibility features (skip link, ARIA labels, keyboard nav, etc.)
- [ ] Provide contact form or email for accessibility issues
- [ ] Add link from footer
- [ ] Test: view page, verify content renders

**Files:**
- `web/src/app/(blog)/accessibility/page.tsx` (new)

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
feat: add print styles for clean post printing
feat: add screen reader announcements to reading progress bar
feat: add social media links to about page
feat: complete PWA manifest with PNG icons and metadata
feat: add accessibility statement page
```

---

## Acceptance Criteria

- [ ] All 5 checklist items complete
- [ ] Print styles work
- [ ] Screen reader announcements work
- [ ] Social links render
- [ ] PWA manifest complete
- [ ] Accessibility statement page exists
- [ ] CI passes
- [ ] PR created and merged to main
- [ ] `docs/ROADMAP.md` status table updated to ✅ Merged
- [ ] `docs/CHANGELOG.md` entry added
- [ ] Branch deleted
