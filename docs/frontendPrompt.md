# Frontend Engineer / Gemini 3.1 Pro Brief (Canonical Next Task Prompt)

**Project**: J²Adventures (`web/` — Next.js 16 App Router, TailwindCSS 4, Turso/Drizzle, Supabase Auth, Auth.js admin)
**Role**: Frontend/UI only (components, page rendering, styling, accessibility, client interactivity).
**Tooling**: Windsurf Cascade.

Read first, in this order:
1. `AGENTS.md`
2. `.windsurfrules`
3. `docs/PLAN.md`
4. `docs/handoff.md`
5. `TODO.md`
6. `prompt.md`
7. This file

---

## Verified baseline snapshot (2026-03-19)

Treat this as the verified baseline before your session:

- `bun run lint` — pass
- `bunx tsc --noEmit` — pass
- `bun run test` — pass (107 tests)
- `bun run build` — pass
- `bun run test:e2e` — 12 passed, 7 skipped (authenticated admin scenarios require storage state capture)

---

## Already completed — do not redo

- [x] `web/src/components/blog/home-post-card.tsx` — SVG fallback replaced with `.png`; `dangerouslyAllowSVG` warning resolved.
- [x] Comment delete flow restored to inline confirmation in `web/src/components/blog/comments.tsx`.
- [x] Comment error styling moved to CSS variable-based status colors.
- [x] Account loading structure corrected to avoid duplicate `main#main-content` conflicts.
- [x] Skip-link targets applied broadly via `tabIndex={-1}` on `main#main-content` shells.
- [x] First-pass search highlight/debounce work already exists in `home-post-card.tsx` and surrounding feed components.
- [x] Backend newsletter API at `POST /api/newsletter` is complete — do not rebuild the backend contract in frontend code.

---

## Deferred — skip this session entirely

**PLAN 3.1 (CWV), 3.2 (WCAG AA), 3.6 (Search interactive QA)** are deferred to next week.

These tasks require:
- An interactive browser with DevTools / Lighthouse
- Manual keyboard-only QA across multiple routes
- Real Lighthouse Performance and Accessibility score capture

None of these are possible in the current tooling context. They are explicitly scheduled for next week. **Do not attempt them, do not create placeholder fixes, and do not mark them complete.**

---

## Primary mission — PLAN 4.6 Newsletter Signup UI

Implement the newsletter signup form component and integrate it into an appropriate public-facing surface.

The backend is complete and tested. Your job is the frontend slice only.

---

## Backend contract (do not change)

Endpoint: `POST /api/newsletter`

Request body (Zod-validated):
```ts
{
  email: string;         // required, valid email
  firstName?: string;    // optional
  lastName?: string;     // optional
  source?: string;       // optional, e.g. "footer", "post-page"
}
```

Success responses:
- `201 { status: "subscribed", source: "created" | "updated" }` — new or reactivated subscriber
- `200 { status: "already-subscribed" }` — idempotent, treat as friendly success
- `202 { status: "skipped", reason: "missing-config", setup: string[] }` — env not configured; **not a user error**, do not surface an error UI for this case — treat it as a soft success or silent no-op

Error responses:
- `400 { error: ... }` — invalid input (show inline validation error)
- `429` — rate limited (show "Please slow down" message)
- `500` — unexpected server error

---

## Implementation requirements

### Component: NewsletterSignupForm

Create `web/src/components/blog/newsletter-signup-form.tsx`.

This should be a `"use client"` component because it has form state and event handlers.

Required behavior:
1. Collect `email` at minimum. Optionally collect `firstName` (keep the form light — do not show all fields unless they add real UX value).
2. On submit: POST to `/api/newsletter` with `source` set to the placement (e.g., `"footer"`, `"post-page"`).
3. Loading state: disable the button, show a brief loading indicator.
4. Success state (`subscribed` or `already-subscribed`): show a friendly confirmation message in place of the form. The message should work for both — "You're subscribed!" or "You're already on the list!".
5. `skipped` state: treat the same as success — do not show an error. The env is not configured in this environment; the user experience should be indistinguishable from success.
6. Validation error (`400`): surface the field error inline under the relevant input.
7. Rate limit (`429`): show a message — "Too many attempts, please wait a moment."
8. Server error (`500`): show a generic error message — "Something went wrong. Please try again."

### Placement

Integrate the form into at least one of these surfaces (pick the most natural fit based on the existing layout):

- The site footer (if a footer exists with available space)
- A section at the bottom of the homepage feed
- A "Stay updated" aside on the post detail page

Do not add it to the admin pages.

Do not add it to `/account`.

### Styling

- Use CSS variables for all colors — no hardcoded Tailwind palette classes like `bg-green-500`.
- Match the visual rhythm of existing form elements in the codebase (look at `web/src/app/(public-auth)/login/page.tsx` or account settings for reference).
- The form must work correctly in all 4 theme combinations: `light×sage`, `light×lichen`, `dark×sage`, `dark×lichen`.
- Keep it compact — this is a secondary CTA, not a hero element.

---

## Execution plan

1. Read `web/src/components/blog/home-post-card.tsx`, `web/src/app/(public-auth)/login/page.tsx`, and `web/src/app/globals.css` to understand form patterns and CSS variables in use before writing anything.
2. Create `web/src/components/blog/newsletter-signup-form.tsx`.
3. Integrate into one public surface (footer or homepage bottom).
4. Run quality gates:
   ```bash
   bun run lint
   bunx tsc --noEmit
   bun run build
   bun run test
   ```
5. If `bun run build` fails after adding a new route or component, re-run once to regenerate Next.js types.

---

## File ownership and allowed edit zones

Primary allowed areas:

- `web/src/components/blog/**`
- `web/src/components/layout/**` (footer only)
- `web/src/app/(blog)/**` (homepage or post page integration)
- `web/src/app/globals.css` (only if new CSS variables or utility classes are needed)

Off-limits:

- `web/src/server/**`
- `web/src/drizzle/**`
- `web/src/lib/**`
- `web/src/app/api/**`
- `web/src/app/admin/**`
- `scripts/**`
- `CLAUDE.md`
- `AGENTS.md`
- `docs/PLAN.md`

If you hit a backend/data/auth issue, create `docs/context/<issue>-escalation.md` and report it instead of hacking around it.

---

## Non-negotiable frontend rules

- Server Components by default; add `"use client"` only when hooks, event handlers, or browser APIs require it. (The form itself needs `"use client"`; the page embedding it does not.)
- No `any`, `as`, or `!` in new work.
- CSS variables for all theming; no hardcoded theme colors.
- `next/image` for images; no raw `<img>` tags.
- Typed route helpers for dynamic internal links.
- Preserve existing visual direction — polish intentionally, do not redesign.
- Semantic HTML, keyboard support, and ARIA labels.
- Test all 4 theme combinations for any changed UI.
- Do not write fake completion notes or broad claims.

Common failure patterns to self-check before finishing:

- `bg-green-500`, `text-gray-700`, or similar hardcoded palette classes
- missing loading/error/success states on the form
- form accessible only by mouse (no keyboard submit, no visible focus ring)
- dark mode working but lichen broken, or vice versa

---

## How to report back

When you finish, report in this format:

1. `Files changed` — exact files and what changed in each.
2. `Newsletter form behavior` — describe the form placement and each state (idle, loading, success, error, rate-limited, skipped).
3. `Theme verification` — confirm which theme combinations were tested.
4. `Quality gates` — whether `lint`, `tsc`, `build`, `test`, and (if run) `test:e2e` passed.
5. `Open issues` — anything blocked by backend, tooling limits, or manual verification.
6. `PLAN 4.6 status recommendation` — `done` / `partially complete` / `still open`, with evidence.

---

## Success standard

A strong pass:

- Form is implemented and integrated into a real public surface
- All form states work (idle, loading, success, error, rate-limited, skipped)
- Form is keyboard-navigable and screen-reader friendly
- All 4 theme combinations tested and confirmed working
- No hardcoded colors, no route literal regressions, no type shortcuts
- Quality gates all pass
- The next reviewer can verify the form by running the dev server
