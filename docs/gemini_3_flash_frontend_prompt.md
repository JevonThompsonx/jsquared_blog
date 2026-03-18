# Gemini 3 Flash Frontend Brief

**Project**: J²Adventures (`web/` - Next.js 16 App Router, TailwindCSS 4, Turso/Drizzle, Supabase Auth)
**Role**: Frontend/UI only. Components, pages, styling, accessibility, browser QA, contained client-side polish.
**Read first**: `AGENTS.md`, `docs/handoff.md`, `docs/PLAN.md`, `TODO.md`, `prompt.md`

---

## IMPORTANT: Current Work Status

**Your most recent work on PLAN 3.1, 3.2, and 3.6 is awaiting review for validity and code quality.**

Previous passes by Gemini and GPT-5.4 have introduced issues that required correction (type assertions, inaccurate status claims, broken patterns). Before any new work begins, the project owner needs to verify that your latest accessibility/CWV/search changes are correct and meet the project's quality standards.

**Do not claim tasks are complete unless you have real browser data (Lighthouse scores, accessibility audit results) to back the claim.**

---

## Current state

The app is live and stable at `jsquaredadventures.com`. The remaining frontend work is verification-backed polish, not broad redesign.

### Stable baselines — preserve these

- PLAN 4.1 admin moderation UI — done and verified.
- PLAN 4.8 widened admin layouts — done and browser-QA'd.
- PLAN 3.5 mobile nav drawer — done.
- PLAN 4.5 reading time — done.
- PLAN 3.7, 3.8, 3.9, 3.11, 3.12, 3.13, 3.14 — all done.
- Homepage seasonal hero cleanup — done.
- Search results page has a dedicated debounced `SearchInput` header and multi-term highlight support.
- Skip-link targets exist on main public/admin page shells.
- Author avatars, map card images, and gallery lightbox use `next/image`.
- JSON-LD remains in `web/src/app/(blog)/posts/[slug]/head.tsx`. Keep it there.

### Corrections from past sessions

- Do not recreate `docs/frontend_polish_walkthrough.md` — it was deleted for being inaccurate.
- Do not say JSON-LD was moved into `page.tsx` — it was not.
- Do not mark PLAN 3.1, 3.2, or 3.6 complete unless your browser checks actually support that claim with Lighthouse scores or accessibility audit data.

---

## Your assignment (when cleared to resume)

### Task 1: Real browser QA for open polish items

Use browser tooling, not guesswork, on these public surfaces:

1. `/`
2. `/?search=sierra` (or another real query that returns results)
3. A published post detail page
4. `/map`
5. `/about`
6. An author page reached from a post

Check at minimum:

- mobile around `390px`
- tablet around `768px`
- desktop around `1280px` or wider

Focus on:

- keyboard flow and skip-link behavior
- focus-visible states (2px outline, appropriate offset)
- color contrast (4.5:1 minimum for normal text, 3:1 for large text)
- search interactions (debounce, loading indicator, empty state, highlighting)
- map popup/filter usability
- gallery lightbox usability
- mobile nav search parity
- touch targets (minimum 44px on mobile)

Fix frontend-only issues you can prove from that audit.

### Task 2: Finish the real CWV/accessibility verification

PLAN 3.1 and 3.2 are still open because they need real verification data.

Use Lighthouse and/or browser accessibility tooling on the homepage/search state and a post detail page. Fix what you actually find in allowed frontend files.

**Targets** (from the project's quality standards):
- Lighthouse Performance > 90
- Lighthouse Accessibility > 95
- LCP < 2.5s, CLS < 0.1, INP < 200ms
- Zero WCAG AA violations

Pay extra attention to:

- icon-only controls missing good labels
- weak focus states on interactive controls
- contrast regressions across theme combos (all 4: light/sage, light/lichen, dark/sage, dark/lichen)
- layout shift around search/results/media
- mobile overflow or awkward tap targets
- text scaling: layout should work with browser text scaling up to 200%

### Task 3: Search UX validation

The search UI is already partly upgraded. Validate it in the browser and only refine if needed.

Check:

- debounced URL updates
- loading indicator behavior
- empty-state suggestions
- result highlighting in titles/excerpts
- mobile search behavior through the drawer/header flow

Keep the existing query-param model (`?search=`). Do not build a new route structure.

### Task 4: JSON-LD verification only

For PLAN 4.4:

1. Verify the structured data still renders correctly from `web/src/app/(blog)/posts/[slug]/head.tsx`.
2. Confirm the rendered payload still includes `BlogPosting`, `headline`, `datePublished`, `dateModified`, `author`, `publisher`, `image`, `description`, and `mainEntityOfPage`.
3. Do not move it into `page.tsx`.
4. Do not claim Google Rich Results validation is complete unless you actually validate a deployed URL externally.

---

## Allowed focus areas

Stay in these frontend-owned areas:

- `web/src/app/(blog)/**`
- `web/src/app/(public-auth)/**`
- `web/src/app/account/**`
- `web/src/app/layout.tsx`
- `web/src/app/globals.css`
- `web/src/components/blog/**`
- `web/src/components/layout/**`
- `web/src/components/theme/**`

## Off-limits

Do not edit backend files. If you encounter a backend issue, create `docs/context/<issue>-escalation.md` and report it.

- `web/src/server/**`
- `web/src/drizzle/**`
- `web/src/lib/**`
- `web/src/app/api/**`
- `web/src/app/admin/actions.ts`
- `CLAUDE.md`, `AGENTS.md`, `docs/PLAN.md`

---

## Constraints

- Server Components by default; use `"use client"` only when needed.
- No `any`, `as`, or `!` in new work.
- Use CSS variables for theming — no hardcoded theme colors.
- Use `next/image` for editorial/site images.
- Use typed route helpers for dynamic links.
- Preserve existing visual direction; polish intentionally instead of redesigning from scratch.
- Do not create standalone markdown walkthrough/report files unless explicitly asked.

## Quality gate

Run from `web/`:

```bash
bun run lint
bunx tsc --noEmit
bun run build
```

All three must pass with zero errors/warnings.

## Report back with

- what you changed and why
- which pages and breakpoints you checked
- what browser QA found (specific issues, not vague claims)
- Lighthouse performance/accessibility scores (actual numbers)
- whether `lint`, `tsc`, and `build` all pass
- any issues that need backend escalation
