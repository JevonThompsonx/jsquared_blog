# J²Adventures — Project Handoff

Last updated: 2026-03-19

## Where the project stands

The Next.js app in `web/` is the production codebase at jsquaredadventures.com. The app is **feature-complete and live**. Remaining work is verification closure, one active frontend feature (newsletter form), and deferred live QA tasks.

### Source-of-truth trackers (consolidated)

- `TODO.md` — primary operational tracker (open items, verification tasks, next priorities)
- `docs/PLAN.md` — phase/task definitions and quality standards
- `docs/nextjs-cutover-checklist.md` — historical cutover verification log

Use this handoff file as a **routing brief**, not a duplicate status ledger.

---

## Active review status

- PLAN `3.1`, `3.2`, `3.6` are **DEFERRED** to next week — code improvements are in place; browser QA and Lighthouse measurement require a live interactive environment not available in the current tooling context.
- PLAN `V.9` (`as`/`any` type cleanup) is **DONE** — no unjustified type assertions remain in backend/shared code.
- PLAN `4.2` backend implementation is shipped in code with Resend-backed, non-blocking comment/reply notifications; operational smoke test pending manual env setup.
- PLAN `4.6` backend scaffolding is fully in code (`POST /api/newsletter` + Resend segment sync); Gemini is now building the frontend signup form UI.
- Authenticated Playwright coverage is still blocked only by missing captured admin storage state; fixture seeding and public smoke coverage are green (107 unit tests, 12 E2E passed, 7 skipped).
- `home-post-card.tsx` SVG fallback fixed — no more `dangerouslyAllowSVG` dev warning.

---

## Manual verification still required

See `TODO.md` and PLAN Phase `4.5` for full checklist. High-priority manual tasks remain:

1. Apply production migration `0007_post_view_count.sql` (`bun run db:migrate` on prod).
2. Complete deployed JSON-LD Rich Results validation on a live post URL.
3. Complete authenticated E2E flow after capturing admin storage state interactively.
4. Set comment notification env vars and smoke test a real dev comment/reply.
5. Browser smoke test RSS feeds (`/feed.xml`, `/category/*/feed.xml`, `/tag/*/feed.xml`).

---

## Latest verification snapshot

From the `web/` directory (2026-03-19):

- `bun run lint` — pass
- `bunx tsc --noEmit` — pass
- `bun run build` — pass
- `bun run test` — pass (107 tests)
- `bun run test:e2e` — 12 passed, 7 skipped (authenticated admin coverage depends on seeded fixtures + storage state)
- `bun run seed:e2e` — pass

---

## Important caveats

- **Do not claim PLAN 3.1/3.2/3.6 as done** until validated with real Lighthouse/accessibility data in a live environment (next week).
- **Do not claim Google Rich Results validation is complete** without a deployed URL check.
- **Do not claim PLAN 4.2 fully closed operationally** until env vars are configured and a real comment/reply notification is smoke tested.
- **Do not regress inline confirmation UX** back to browser-native `confirm()` dialogs.
- `bun run seed:e2e` and `bun run db:migrate` are intentionally manual — they mutate the database.

---

## Key files

| Purpose | File |
|---------|------|
| Primary tracker | `TODO.md` |
| Phase definitions | `docs/PLAN.md` |
| Canonical backend brief | `docs/backendPrompt.md` |
| Canonical frontend brief | `docs/frontendPrompt.md` |
| E2E smoke suite | `web/tests/e2e/smoke.spec.ts` |
| Admin auth capture | `web/scripts/capture-admin-storage-state.ts` |
| Newsletter API | `web/src/app/api/newsletter/route.ts` |
| Newsletter service | `web/src/server/services/newsletter.ts` |

---

## Model-specific handoff briefs

- Backend / Sonnet / review-verification: `docs/backendPrompt.md`
- Frontend / Gemini 3.1 Pro: `docs/frontendPrompt.md`
