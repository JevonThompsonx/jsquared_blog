# Gemini 3 Flash Frontend Brief

**Project**: J²Adventures (`web/` — Next.js 16 App Router, TailwindCSS 4, Turso/Drizzle, Supabase Auth)
**Role**: Frontend/UI only. Components, pages, loading states, styling, accessibility, browser QA.
**Read first**: `AGENTS.md`, `docs/handoff.md`, `docs/PLAN.md`, `TODO.md`, `prompt.md`

## Current state

The app is live and stable at `jsquaredadventures.com`. We are in Phase 4, wrapping up polish and growth features.

**Done items — treat as baselines, do not rewrite:**

- PLAN `4.1` admin moderation UI — fully done with optimistic updates, summary stats, themed thread cards, and inline delete confirmation.
- PLAN `4.8` widened admin layouts — done and browser-QA'd at 768px, 1280px, 1536px+.
- PLAN `3.5` mobile nav UX — Radix dialog-based mobile drawer with search/account/admin parity and click-to-close.
- PLAN `4.5` reading time — shared helpers power post pages, previews, and editor estimates.
- PLAN `3.7` reduced-motion support — done.
- PLAN `3.8` print stylesheet — done.
- PLAN `3.9` social share buttons — done (copy link with clipboard API).
- PLAN `3.11` admin dropdown dark mode fix — done (custom `ThemeSelect` component).
- PLAN `3.12` season-year date display — done.
- PLAN `3.13` post page scroll/focus — done.
- PLAN `3.14` season-year grouped feed — done.
- Comment counts on post cards — done.
- Homepage seasonal hero cleanup — done. `J²Adventures` is the constant title, seasonal note panel adds whimsy.
- Empty search state — done with action buttons.
- Tag & category page redesign — done with rich hero headers, icons, descriptions.
- Author bio card on post detail — done.
- Skeleton loading states and `loading.tsx` — done.
- Table of contents — done with scroll tracking.
- Lora serif heading font — done.

**In progress — these are YOUR tasks this session:**

- PLAN `3.1` Core Web Vitals audit + fix (IN PROGRESS)
- PLAN `3.2` WCAG AA accessibility audit + fix (IN PROGRESS)
- PLAN `3.6` Search improvements (IN PROGRESS)
- PLAN `4.4` JSON-LD validation (code is done — deployed validation still needed)

## Frontend baseline you must preserve

Verified admin surfaces:
- `/admin`
- `/admin/tags`
- `/admin/posts/[postId]/comments`

Verified widths: `768px`, `1280px`, `1536px+`

Already-stable behaviors:
- admin dashboard filters/pagination layout
- tags textarea/button alignment
- moderation summary cards and reply indentation
- inline delete confirmation on moderation cards
- inline clone confirmation in the post editor
- mobile nav drawer behavior (search, account, close-on-click)
- homepage seasonal hero layout
- season-year grouped feed headers

## Session tasks — do these in order

### Task 1: Search improvements (PLAN 3.6)

The search page currently works with `?search=` URL query params and server-side search. Add these improvements:

1. **Debounced input** — add a client-side search input component with a 300ms debounce before updating the URL params. Use `useRouter().replace()` with the new search param to avoid stacking history entries. The input should show a loading indicator during the debounce/fetch.
2. **Search result highlighting** — highlight the matching search terms in post card titles and excerpts on the search results page. Use a `<mark>` element with appropriate CSS styling (use CSS variables, not hardcoded colors). Do not use `dangerouslySetInnerHTML` — split text by match and render React elements.
3. **Improved empty state** — the empty state already exists with "Browse all stories" and "Explore the map" buttons. Make sure the search input itself is prominent and focused. Add a "Try searching for:" section with 3–4 suggested search terms as clickable chips that populate the search input.

Files to touch:
- Create `web/src/components/blog/search-input.tsx` (new `"use client"` component)
- `web/src/app/(blog)/page.tsx` or search route — integrate the search input
- `web/src/components/blog/home-post-card.tsx` — add optional highlight prop for title/excerpt
- `web/src/app/globals.css` — `mark` element styling using CSS variables

### Task 2: Core Web Vitals cleanup (PLAN 3.1)

Run a Lighthouse audit on the homepage and a post detail page in the browser. Fix the issues you find. Common areas to address:

1. **LCP (Largest Contentful Paint)** — ensure the hero image or first post card image has `priority` set on the `next/image` tag. Only the above-the-fold image should have `priority={true}`.
2. **CLS (Cumulative Layout Shift)** — ensure all `next/image` tags have explicit `width` and `height` or use `fill` with a sized container. Check that skeleton loaders match the dimensions of loaded content. Verify the reading progress bar doesn't cause layout shift.
3. **INP (Interaction to Next Paint)** — defer non-critical JavaScript. Make sure scroll handlers use `{ passive: true }`. Check that comment like/bookmark toggle handlers are fast (they should be — they're optimistic).

Files likely touched:
- `web/src/components/blog/home-post-card.tsx` — image priority for first card
- `web/src/components/blog/post-gallery.tsx` — image sizing
- `web/src/app/(blog)/posts/[slug]/page.tsx` — above-the-fold image priority
- `web/src/components/blog/reading-progress.tsx` — passive scroll listener check

### Task 3: WCAG AA accessibility pass (PLAN 3.2)

Run the browser's accessibility audit (Lighthouse Accessibility or axe DevTools). Fix what you find. Key areas:

1. **Color contrast** — verify all text/background combos meet 4.5:1 for normal text and 3:1 for large text across all 4 theme combos (light×sage, light×lichen, dark×sage, dark×lichen). Fix with CSS variable adjustments in `globals.css` if needed.
2. **Focus indicators** — ensure every interactive element has a visible `:focus-visible` outline. Check buttons, links, dropdowns, and form inputs.
3. **ARIA labels** — audit all icon-only buttons (theme toggle, search, menu toggle, map controls, etc.) for `aria-label`. Add missing ones.
4. **Skip navigation** — add a "Skip to main content" link as the first focusable element in the layout if one doesn't exist yet.
5. **Form labels** — ensure all form inputs have associated `<label>` elements or `aria-label`.
6. **Semantic HTML** — verify heading hierarchy (single `<h1>` per page, no skipped levels). Check `<nav>`, `<main>`, `<article>`, `<section>` usage.

Files likely touched:
- `web/src/app/globals.css` — contrast fixes, focus styles, skip-nav styles
- `web/src/app/layout.tsx` — skip-nav link
- `web/src/components/layout/site-header.tsx` — ARIA labels
- `web/src/components/blog/*.tsx` — various ARIA additions
- `web/src/components/theme/theme-toggle.tsx` — ARIA

### Task 4: JSON-LD final check (PLAN 4.4)

The JSON-LD structured data is already implemented in `web/src/app/(blog)/posts/[slug]/head.tsx`. Your job:

1. Verify the JSON-LD script tag renders correctly by viewing a published post page source in the browser.
2. Ensure `@type: "BlogPosting"` includes: `headline`, `datePublished`, `dateModified`, `author`, `publisher`, `image`, `description`, `mainEntityOfPage`.
3. Do NOT move the structured data out of `head.tsx`.
4. Do NOT claim Rich Results validation is done — that requires checking a deployed URL in the Google Rich Results Test tool, which is a manual step.

No code changes needed unless you find issues in the rendered output.

## Constraints

- Server Components by default; use `"use client"` only when hooks/interactivity are needed.
- No `any`, `as`, or `!` in new work.
- CSS variables only for color/theming — no hardcoded color values.
- Use `next/image` for all images.
- Use typed route helpers for dynamic links: `getPostHref()`, `getCategoryHref()`, `getTagHref()`, `getSeriesHref()`, `getMapHref()` from `web/src/lib/utils.ts`.
- Meet WCAG AA minimum: semantic HTML, keyboard access, focus-visible states, ARIA where needed.
- Do not modify backend files (DAL, server actions, API routes, queries, schema) unless a tiny frontend-supporting type/helper import is unavoidable.
- TailwindCSS 4 — utilities are inside `@layer`. CSS rules outside `@layer` in `globals.css` have higher cascade precedence. For fighting inherited color, use dedicated classes in `globals.css` rather than Tailwind arbitrary-value classes.

## Quality gate

Run from `web/` before handoff:

```bash
bun run lint
bunx tsc --noEmit
bun run build
```

All three must pass with zero errors/warnings. Browser QA is strongly preferred for any layout-affecting change.

## Key files

- `web/src/app/(blog)/page.tsx` — homepage
- `web/src/app/(blog)/posts/[slug]/page.tsx` — post detail
- `web/src/app/(blog)/posts/[slug]/head.tsx` — JSON-LD
- `web/src/components/blog/home-post-card.tsx` — post card
- `web/src/components/blog/home-feed.tsx` — grouped feed
- `web/src/components/blog/filtered-feed.tsx` — category/tag feed
- `web/src/components/blog/reading-progress.tsx` — progress bar
- `web/src/components/blog/post-gallery.tsx` — gallery
- `web/src/components/layout/site-header.tsx` — navigation
- `web/src/components/layout/mobile-nav.tsx` — mobile drawer
- `web/src/components/theme/theme-toggle.tsx` — theme switch
- `web/src/app/globals.css` — CSS variables, theme combos, utilities
- `web/src/components/admin/admin-dashboard.tsx` — admin layout (preserve)
- `web/src/components/admin/admin-comment-card.tsx` — moderation card (preserve)
- `web/src/lib/utils.ts` — typed route helpers, season formatting

## Report back with

- what you changed and why
- what browser QA showed (screenshots or descriptions)
- Lighthouse scores for Performance and Accessibility (before/after if possible)
- whether the admin layout baseline still held (spot check at 1280px)
- whether lint, type-check, and build all passed
