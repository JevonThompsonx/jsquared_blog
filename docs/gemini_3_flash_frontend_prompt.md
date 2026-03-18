# Gemini 3 Flash Frontend Brief

**Project**: J²Adventures (`web/` — Next.js 16 App Router, TailwindCSS 4, Turso/Drizzle, Supabase Auth)
**Role**: Frontend/UI only. Components, pages, loading states, styling, accessibility, browser QA.
**Read first**: `AGENTS.md`, `docs/handoff.md`, `docs/PLAN.md`, `TODO.md`, `prompt.md`

## Current state

The app is live and stable. We are in Phase 4.

- PLAN `4.1` admin moderation UI is done.
- PLAN `4.8` widened admin layouts are done and browser-QA'd.
- PLAN `4.4` JSON-LD is implemented in code but still needs deployed validation.
- The homepage seasonal hero cleanup is now done; treat the current hero as the new baseline, not a placeholder.

## Frontend baseline you should preserve

Verified admin surfaces:
- `/admin`
- `/admin/tags`
- `/admin/posts/[postId]/comments`

Verified widths:
- `768px`
- `1280px`
- `1536px+`

Already-stable behaviors:
- admin dashboard filters/pagination layout
- tags textarea/button alignment
- moderation summary cards and reply indentation
- inline delete confirmation on moderation cards
- inline clone confirmation in the post editor

## Important frontend behavior added in the latest pass

- `web/src/components/admin/post-media-manager.tsx`
  - new uploads no longer inherit filename alt text
  - accessibility status stays in review until real descriptive alt text is present
- `web/src/components/admin/post-editor-form.tsx`
  - clone now uses an inline themed confirmation instead of browser `confirm()`
- `web/src/app/layout.tsx`
  - site metadata copy now reflects the live travel site rather than the migration story
- `web/src/app/(blog)/page.tsx` + `web/src/app/globals.css`
  - homepage hero now keeps `J²Adventures` as the constant title
  - placeholder spring copy is gone
  - a seasonal note panel adds the whimsical slot from `TODO.md`

Preserve these unless real browser QA proves they need refinement.

## Best next frontend work

### 1. Keep admin polish grounded in real QA

If you touch the verified admin surfaces:
- prefer browser evidence over speculative rewrites
- keep fixes surgical
- preserve the current layout baseline unless you observe a regression

### 2. Keep image accessibility honest

If you extend the media manager or editor:
- do not auto-mark filename-derived alt text as acceptable
- keep warnings/review states visible until the content is actually descriptive

### 3. Good frontend pickup areas now

- mobile nav UX/a11y follow-up from PLAN `3.5`
- accessibility/CWV cleanup based on real audits, not speculative redesigns
- admin editor/browser QA once authenticated Playwright state is available locally

## Constraints

- Server Components by default; use `"use client"` only when needed.
- No `any`, `as`, or `!` in new work.
- CSS variables only for color/theming.
- Use `next/image` where the component pattern supports it.
- Use typed route helpers for dynamic links.
- Meet WCAG AA minimum: semantics, keyboard access, focus-visible states, ARIA where needed.
- Do not modify backend files unless a tiny frontend-supporting type/helper import is unavoidable.

## JSON-LD note

- Do not move structured data back into the page body.
- The source of truth is `web/src/app/(blog)/posts/[slug]/head.tsx`.
- Do not mark Rich Results validation done from local-only checks.

## Quality gate

Run from `web/` before handoff:

```bash
bun run lint
bunx tsc --noEmit
bun run build
```

Browser QA is strongly preferred for any layout-affecting frontend pass.

## Key files

- `web/src/components/admin/admin-dashboard.tsx`
- `web/src/app/admin/tags/page.tsx`
- `web/src/components/admin/admin-comments-panel.tsx`
- `web/src/components/admin/admin-comment-card.tsx`
- `web/src/components/admin/post-editor-form.tsx`
- `web/src/components/admin/post-media-manager.tsx`
- `web/src/app/(blog)/page.tsx`
- `web/src/app/layout.tsx`
- `web/src/app/globals.css`

## Report back with

- what you changed
- what browser QA showed
- whether the admin layout baseline still held
- whether lint, type-check, and build passed
