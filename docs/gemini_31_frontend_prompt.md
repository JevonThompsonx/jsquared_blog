# Gemini 3.1 Frontend Task Brief

**Project**: J²Adventures (`web/` — Next.js App Router, TailwindCSS 4, Turso/Drizzle, Supabase Auth)
**Role**: Frontend/UI only. Components, pages, loading states, styling, accessibility.
**Read first**: `AGENTS.md`, `docs/PLAN.md`, `docs/handoff.md`, `prompt.md`

---

## Current state

The app is live and stable. We are in Phase 4.

- **PLAN 4.1** ✅ — admin comment moderation UI is done and validated.
- **PLAN 4.4** ✅ in code — BlogPosting JSON-LD now renders from `web/src/app/(blog)/posts/[slug]/head.tsx` for published posts only.
- **PLAN 4.8** 🔄 — admin desktop layout expansion is close, but real browser QA is still missing.

Recent follow-up already completed:
- `web/src/components/admin/admin-dashboard.tsx`
  - roomier toolbar and row footer composition
  - wrapped action pills
  - improved pagination layout
  - filter selects now behave better before XL widths
- `web/src/app/admin/tags/page.tsx`
  - wider shell
  - clearer editorial guidance
  - better textarea/button alignment
- `web/src/components/admin/admin-comments-panel.tsx`
  - moderation summary stats
  - lighter sort-refresh treatment that preserves content
  - `md` summary-card breakpoints
- `web/src/components/admin/admin-comment-card.tsx`
  - clearer hidden/deleted treatment
  - better reply hierarchy and focus states
- `web/src/app/admin/posts/[postId]/comments/page.tsx`
  - wider moderation shell and helper copy
- `web/src/app/admin/posts/[postId]/comments/loading.tsx`
  - loading width matched to widened shell

---

## Task 1 — Finish PLAN 4.8 with real browser QA

Do a manual browser QA pass and fix only what you actually find.

### Required widths

- tablet: `768px`
- laptop: `1280px`
- wide desktop: `1536px+`

### QA targets

- `/admin`
  - toolbar filter wrapping at laptop widths
  - action pill wrapping in post rows at narrower desktop widths
  - pagination composition at XL
- `/admin/tags`
  - textarea/button alignment at tablet and XL
  - readability when descriptions are longer
- `/admin/posts/[postId]/comments`
  - summary cards at tablet widths
  - reply indentation balance
  - sort refresh treatment
  - hidden/deleted card readability

### Fix rules

- Small, surgical changes only.
- Do not rewrite whole components.
- Do not create new admin pages.
- CSS variables only — no hardcoded color values.
- Preserve the current moderation logic and API contract.

When these surfaces look solid in the browser, PLAN 4.8 is effectively done.

---

## Task 2 — Keep the moderation delete flow polished

**File**: `web/src/components/admin/admin-comment-card.tsx`

Current state:
- delete already uses an inline themed confirmation row

Do not replace this with a native confirm dialog. Only refine it if real browser QA shows a usability or accessibility issue.

What to preserve:
- inline themed treatment
- keyboard access
- clear destructive affordance
- existing optimistic moderation behavior
- CSS variable usage only

Only change this area if you find a real issue like:
- cramped wrapping at tablet widths
- weak focus handling
- poor destructive-state clarity

---

## Constraints

- **Server Components by default.** Use `"use client"` only when needed.
- **No `any`, `as`, or `!`**.
- **CSS variables only** — use existing theme tokens.
- **`next/image` for all images.**
- **Typed route helpers** for dynamic `Link` hrefs.
- **WCAG AA minimum**: semantic HTML, ARIA labels, keyboard nav, focus-visible states.
- Do not modify backend files unless a very small frontend-supporting type/helper import is unavoidable.

---

## Notes about JSON-LD

- Do not move structured data back into the page body.
- Current implementation lives in `web/src/app/(blog)/posts/[slug]/head.tsx`.
- Required fields are already present there.
- The public post model does not currently expose a distinct `updatedAt`, so `dateModified` intentionally falls back to the same ISO timestamp used for publish date.
- Google Rich Results validation still needs to happen on a deployed URL; do not mark that as done from local checks alone.

---

## Quality gate

Run from `web/` before handoff:

```bash
bun run lint
bunx tsc --noEmit
bun run build
```

---

## Key files

| File | Purpose |
|---|---|
| `web/src/app/(blog)/posts/[slug]/head.tsx` | JSON-LD output for blog posts |
| `web/src/app/(blog)/posts/[slug]/page.tsx` | Post detail UI |
| `web/src/components/admin/admin-dashboard.tsx` | Dashboard QA target |
| `web/src/app/admin/tags/page.tsx` | Tags page QA target |
| `web/src/components/admin/admin-comments-panel.tsx` | Moderation panel QA target |
| `web/src/components/admin/admin-comment-card.tsx` | Moderation card + delete confirmation target |
| `web/src/app/admin/posts/[postId]/comments/page.tsx` | Moderation shell |
| `web/src/app/admin/posts/[postId]/comments/loading.tsx` | Moderation loading shell |
| `web/src/components/admin/post-editor-form.tsx` | Wider editor layout reference |
| `web/src/app/globals.css` | Theme tokens |

---

## Handoff expectations

When done, report:
- what browser QA issues you found
- what you changed to fix them
- whether the inline delete confirmation needed any additional polish
- whether `bun run lint`, `bunx tsc --noEmit`, and `bun run build` passed
