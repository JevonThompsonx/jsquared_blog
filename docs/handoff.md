# J²Adventures — Project Handoff

Last updated: 2026-03-19

## Where the project stands

The Next.js app in `web/` is the production codebase at jsquaredadventures.com. The app is **feature-complete and live**. All core reading, auth, comments, admin, maps, and SEO flows are working. The remaining work is verification, targeted polish, and a handful of future features.

### Source-of-truth trackers

- `TODO.md` — practical backlog with open items at the top
- `docs/PLAN.md` — phase/task status with quality standards
- `docs/nextjs-cutover-checklist.md` — cutover validation record

---

## Active work

### Gemini 3 Flash — Frontend Polish (AWAITING REVIEW)

Gemini is working on PLAN 3.1 (CWV audit), 3.2 (WCAG audit), and 3.6 (search UX). This work includes accessibility improvements, mobile UI updates, and browser QA across breakpoints.

**All of Gemini's current output needs to be reviewed for validity and code quality before it is treated as done.** Previous Gemini/GPT passes have introduced issues that required correction.

### No other models are actively editing code.

---

## What is done

### Phases 1-2: Complete

Infrastructure (env validation, Vitest, Playwright, Cloudinary WebP, rate limiting, Sentry, Plausible, CI, security headers) and admin QoL (bulk publish, preview, Tiptap JSON, search/filter, cron, clone, alt text warnings) are all shipped and verified.

### Phase 3: Mostly complete (11/14)

All UX polish tasks are done except:
- 3.1 CWV audit — Gemini working, awaiting review
- 3.2 WCAG audit — Gemini working, awaiting review
- 3.6 Search improvements — Gemini working, awaiting review

### Phase 4: Mostly complete (6/8)

- 4.1 Comment moderation — done
- 4.3 RSS per category/tag — done in code, manual smoke pending
- 4.4 JSON-LD — done in code, deployed Rich Results validation pending
- 4.5 Reading time — done
- 4.7 Post view counter — done in code, migration 0007 not yet applied to prod
- 4.8 Admin layout expansion — done
- 4.2 Email notifications — not started
- 4.6 Newsletter — not started

---

## What needs manual verification

These items are implemented in code but need human steps to close out:

1. **Apply migration 0007** — `bun run db:migrate` on production Turso database
2. **RSS smoke test** — visit `/feed.xml`, `/category/<name>/feed.xml`, `/tag/<slug>/feed.xml` in a browser
3. **View counter smoke test** — verify views increment once per session in dev
4. **JSON-LD validation** — run a deployed post URL through Google Rich Results Test
5. **Authenticated E2E** — `bun run seed:e2e` + `bun run e2e:capture-admin-state` + `bun run test:e2e`
6. **Supabase email confirmation** — enable "require email confirmation" in Supabase dashboard (known issue: users can currently sign in without confirming email)

---

## Latest verification snapshot

From the `web/` directory:

- `bun run lint` — pass
- `bunx tsc --noEmit` — pass
- `bun run build` — pass
- `bun run test` — pass (85 tests)
- `bun run test:e2e` — 12 passed, 7 skipped (authenticated admin coverage depends on seeded fixtures + storage state)

---

## Important caveats

- **Do not claim Gemini's 3.1/3.2/3.6 work is done** until it has been reviewed with real Lighthouse/accessibility data.
- **Do not claim Google Rich Results validation is complete** without a deployed URL check.
- **Do not regress admin confirmation patterns** back to browser-native `confirm()` dialogs.
- The repo still contains older `as` assertions outside the latest cleanup pass; docs are honest about this.
- `bun run seed:e2e` and `bun run db:migrate` are intentionally manual — they mutate the database.
- The working tree contains uncommitted changes from Gemini's active frontend work.

---

## Key files

| Purpose | File |
|---------|------|
| Playwright config | `web/playwright.config.ts` |
| E2E smoke tests | `web/tests/e2e/smoke.spec.ts` |
| Admin E2E helpers | `web/tests/e2e/helpers/admin.ts` |
| Admin auth capture | `web/scripts/capture-admin-storage-state.ts` |
| E2E fixture seed | `web/scripts/seed-e2e-fixtures.ts` |
| Admin dashboard | `web/src/components/admin/admin-dashboard.tsx` |
| Moderation panel | `web/src/components/admin/admin-comments-panel.tsx` |
| Post editor | `web/src/components/admin/post-editor-form.tsx` |
| Media manager | `web/src/components/admin/post-media-manager.tsx` |
| Reading time | `web/src/lib/content.ts` |
| Post queries | `web/src/server/queries/posts.ts` |
| Admin post DAL | `web/src/server/dal/admin-posts.ts` |
| Public post DAL | `web/src/server/dal/posts.ts` |
| RSS builder | `web/src/server/feeds/rss.ts` |
| JSON-LD | `web/src/app/(blog)/posts/[slug]/head.tsx` |
| Homepage | `web/src/app/(blog)/page.tsx` |
| Root layout | `web/src/app/layout.tsx` |

---

## Model-specific handoff briefs

- Gemini 3 Flash: `docs/gemini_3_flash_frontend_prompt.md`
- GPT-5.4: `docs/gpt54_future_iteration_handoff.md`
