# J²Adventures — Project Handoff

Last updated: 2026-03-19

## Where the project stands

The Next.js app in `web/` is the production codebase at jsquaredadventures.com. The app is **feature-complete and live**. Remaining work is verification closure and a short list of deferred features.

### Source-of-truth trackers (consolidated)

- `TODO.md` — primary operational tracker (open items, verification tasks, next priorities)
- `docs/PLAN.md` — phase/task definitions and quality standards
- `docs/nextjs-cutover-checklist.md` — historical cutover verification log

Use this handoff file as a **routing brief**, not a duplicate status ledger.

---

## Active review status

- PLAN `3.1`, `3.2`, `3.6` remain open/partial pending full browser QA matrix + measured CWV/a11y evidence.
- Frontend regressions identified in comment delete UX/theming were fixed.
- Backend verification improvements (unit coverage for RSS/view route/JSON-LD) are in place.

---

## Manual verification still required

See `TODO.md` and PLAN Phase `4.5` for full checklist. High-priority manual tasks remain:

1. Apply production migration `0007_post_view_count.sql`.
2. Complete deployed JSON-LD Rich Results validation.
3. Complete authenticated E2E flow after capturing admin storage state.
4. Complete full frontend browser QA evidence pass for PLAN `3.1`, `3.2`, `3.6`.

---

## Latest verification snapshot

From the `web/` directory:

- `bun run lint` — pass
- `bunx tsc --noEmit` — pass
- `bun run build` — pass
- `bun run test` — pass (93 tests)
- `bun run test:e2e` — 12 passed, 7 skipped (authenticated admin coverage depends on seeded fixtures + storage state)

---

## Important caveats

- **Do not claim PLAN 3.1/3.2/3.6 as done** until validated with real Lighthouse/accessibility data.
- **Do not claim Google Rich Results validation is complete** without a deployed URL check.
- **Do not regress inline confirmation UX** back to browser-native `confirm()` dialogs.
- The repo still contains older `as` assertions outside the latest cleanup pass; docs are honest about this.
- `bun run seed:e2e` and `bun run db:migrate` are intentionally manual — they mutate the database.
- The working tree contains uncommitted changes from Gemini's active frontend work.

---

## Key files

| Purpose | File |
|---------|------|
| Primary tracker | `TODO.md` |
| Phase definitions | `docs/PLAN.md` |
| Gemini handoff | `docs/gemini_3_flash_frontend_prompt.md` |
| GPT-5.4 handoff | `docs/gpt54_future_iteration_handoff.md` |
| E2E smoke suite | `web/tests/e2e/smoke.spec.ts` |
| Admin auth capture | `web/scripts/capture-admin-storage-state.ts` |
| Frontend comments flow | `web/src/components/blog/comments.tsx` |

---

## Model-specific handoff briefs

- Gemini 3 Flash: `docs/gemini_3_flash_frontend_prompt.md`
- GPT-5.4: `docs/gpt54_future_iteration_handoff.md`
