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
- [x] PLAN 4.6 Newsletter Signup UI — Created `NewsletterSignupForm` and integrated into the homepage bottom.
- [x] **Agent opencode has read the docs and marked this prompt as DONE.**

---

## Deferred — skip this session entirely

**PLAN 3.1 (CWV), 3.2 (WCAG AA), 3.6 (Search interactive QA)** are deferred to next week.

These tasks require:
- An interactive browser with DevTools / Lighthouse
- Manual keyboard-only QA across multiple routes
- Real Lighthouse Performance and Accessibility score capture

None of these are possible in the current tooling context. They are explicitly scheduled for next week. **Do not attempt them, do not create placeholder fixes, and do not mark them complete.**

---

## Next tasks to work on

Please consult `docs/PLAN.md` for the next available tasks for Gemini (Frontend Engineer).
Current frontend tasks pending:
- Phase 5.6 EXIF frontend: pass EXIF fields from the `uploadEditorialImage()` response into `galleryEntries` JSON on post save, then display camera/aperture/shutter/ISO/date/GPS in the lightbox detail panel.
- Phase 5.4 post revision history diff viewer UI.
