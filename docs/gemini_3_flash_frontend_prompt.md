# Gemini 3 Flash Frontend Brief (Next Task Prompt)

**Project**: J²Adventures (`web/` - Next.js 16 App Router, TailwindCSS 4, Turso/Drizzle, Supabase Auth)
**Role**: Frontend/UI only (components, page rendering, styling, accessibility, browser QA).
**Tooling**: Windsurf Cascade + browser (Chrome/devtools when available).

Read first, in this order:
1. `AGENTS.md`
2. `.windsurfrules`
3. `docs/PLAN.md`
4. `docs/handoff.md`
5. `TODO.md`
6. `prompt.md`
7. This file

---

## Verified status snapshot (2026-03-19)

Treat this as the baseline truth for your next session:

- `bun run lint` — pass
- `bunx tsc --noEmit` — pass
- `bun run test` — pass (85 tests)
- `bun run build` — pass
- `bun run test:e2e` — pass with **12 passed, 7 skipped** (skipped tests are authenticated admin scenarios)

Task status to use:

- **In progress / awaiting review**: PLAN `3.1`, `3.2`, `3.6`
- **Open backend-led features**: PLAN `4.2`, `4.6`
- **Open manual/verification tasks**: PLAN `V.1` to `V.10` (see `docs/PLAN.md`)

Do not mark 3.1/3.2/3.6 done without measured evidence.

---

## Primary mission

Your immediate assignment is to **complete evidence-backed frontend validation** for PLAN `3.1`, `3.2`, and `3.6`, and fix only frontend-owned issues discovered during that validation.

This is a review-and-verify pass first, coding pass second.

---

## Execution plan (required order)

### Step 1 — Review your own pending frontend changes

Before adding new code:

1. Review changed files from your current 3.1/3.2/3.6 pass.
2. Remove/fix violations of project rules:
   - hardcoded Tailwind palette classes instead of CSS variables
   - string literal internal routes instead of typed helpers
   - unnecessary `"use client"`
   - raw `<img>` instead of `next/image`
   - weak keyboard/focus behavior
   - unsupported completion claims
   - type shortcuts (`any`, `as`, `!`)

### Step 2 — Browser QA matrix

Audit these routes:

1. `/`
2. `/?search=sierra` (or equivalent query with results)
3. one published post page (`/posts/[slug]`)
4. `/map`
5. `/about`
6. one author page (`/author/[id]`)

At these breakpoints:

- `390px`
- `768px`
- `1280px+`

Across these theme combos:

- light × sage
- light × lichen
- dark × sage
- dark × lichen

Validate:

- keyboard navigation + skip links
- focus visibility
- 44px touch targets
- 200% text scaling
- no overflow/clipped controls
- search debounce/loading/empty/highlighting behavior
- map and lightbox keyboard usability

### Step 3 — CWV + accessibility evidence

Collect real measurements where tooling allows:

- Lighthouse Performance score
- Lighthouse Accessibility score
- LCP, CLS, INP indicators

Target thresholds:

- Performance `> 90`
- Accessibility `> 95`
- LCP `< 2.5s`
- CLS `< 0.1`
- INP `< 200ms`

If you cannot capture metrics in your environment, state that explicitly and leave task status as open/partial.

### Step 4 — Final determination for 3.1 / 3.2 / 3.6

For each task, report one status only:

- `done`
- `partially complete`
- `still open`

Each status must include evidence (numbers, tested pages, and observed outcomes).

---

## Guardrails

- Do not redesign the site.
- Do not edit backend-owned files.
- Do not claim Google Rich Results validation is complete unless you validated a deployed URL externally.
- Do not regress admin UX to browser-native `confirm()` dialogs.
- Do not create summary docs unless explicitly requested.

---

## File ownership and allowed edit zones

Stay in frontend-owned files only.

Primary allowed areas:

- `web/src/app/(blog)/**`
- `web/src/app/(public-auth)/**`
- `web/src/app/account/**`
- `web/src/app/layout.tsx`
- `web/src/app/globals.css`
- `web/src/components/blog/**`
- `web/src/components/layout/**`
- `web/src/components/theme/**`
- `web/src/components/providers/**` when needed for frontend behavior only

Only edit other frontend component areas if your fix clearly belongs there and stays within Gemini's ownership.

Off-limits:

- `web/src/server/**`
- `web/src/drizzle/**`
- `web/src/lib/**`
- `web/src/app/api/**`
- `web/src/app/admin/actions.ts`
- `scripts/**`
- `CLAUDE.md`
- `AGENTS.md`
- `docs/PLAN.md`

If you hit a backend/data/auth issue, create `docs/context/<issue>-escalation.md` and report it instead of hacking around it in frontend code.

---

## Non-negotiable frontend rules

- Server Components by default; add `"use client"` only when hooks, event handlers, or browser APIs require it.
- No `any`, `as`, or `!` in new work.
- Use CSS variables for theming; no hardcoded theme colors.
- Use `next/image` for images.
- Use typed route helpers for dynamic internal links.
- Preserve existing visual direction; polish intentionally instead of redesigning.
- Keep semantic HTML, keyboard support, and ARIA labels in place.
- Test all 4 theme combinations for any changed UI.
- Do not write fake completion notes, broad claims, or standalone markdown reports unless explicitly requested.

Common failure patterns to self-check before finishing:

- `bg-green-500`, `text-gray-700`, or similar hardcoded palette classes
- `href="/posts/..."` or other string literal internal routes
- unnecessary client components
- missing loading/empty/error states on edited async views
- dark mode fixed but lichen broken, or vice versa
- visually hidden regressions at mobile widths

---

## Validation and testing expectations

Run from `web/` after your changes:

```bash
bun run lint
bunx tsc --noEmit
bun run build
```

Also run:

```bash
bun run test
```

Run `bun run test:e2e` if your changes can affect public smoke coverage and your environment supports it.

If a command fails, fix the issue if it is in your frontend scope. If it is outside your scope, report it clearly.

Do not claim success unless the commands you ran actually passed.

---

## How to report back

When you finish, report in this format:

1. `Files changed` — exact files and what changed in each.
2. `Review findings` — what was wrong in the prior Gemini pass and what you corrected.
3. `Browser QA` — exact pages, breakpoints, themes, and interactions checked.
4. `Metrics` — actual Lighthouse/CWV/a11y results, or explicit tooling limitation.
5. `Quality gates` — whether `lint`, `tsc`, `build`, `test`, and (if run) `test:e2e` passed.
6. `Open issues` — anything blocked by backend, tooling limits, or manual verification.
7. `PLAN status recommendation` — for each of 3.1, 3.2, and 3.6, say one of: `done`, `partially complete`, or `still open`, with evidence.

Important:

- Be specific.
- Do not say "everything looks good".
- Do not mark a task done without evidence.
- If verification is incomplete, say exactly what still needs to be checked manually.

---

## Success standard

A strong pass from you looks like this:

- frontend-only issues are fixed cleanly
- no architecture or ownership boundaries are crossed
- no new hardcoded colors, route regressions, or type shortcuts are introduced
- browser QA findings are concrete
- Lighthouse/a11y claims are backed by real data, or honestly left open
- the next reviewer can trust your report
