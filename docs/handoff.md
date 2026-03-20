# J²Adventures — Project Handoff

Last updated: 2026-03-20 (pass 10)

## Where the project stands

The Next.js app in `web/` is the production codebase at jsquaredadventures.com. The app is **feature-complete and live**. Remaining work is verification closure and deferred live QA tasks. No active frontend or backend feature work remains.

### Source-of-truth trackers (consolidated)

- `TODO.md` — primary operational tracker (open items, verification tasks, next priorities)
- `docs/PLAN.md` — phase/task definitions and quality standards
- `docs/nextjs-cutover-checklist.md` — historical cutover verification log

Use this handoff file as a **routing brief**, not a duplicate status ledger.

---

## Active review status

- **Pass 10 production readiness fixes DONE** — see `TODO.md` for full list. Summary:
  - Next.js upgraded to 16.2.0 (CSRF CVE patched).
  - All hardcoded `red-*`/`green-*` Tailwind colors replaced with CSS custom properties — dark mode error/success states now correct.
  - Touch targets on `BookmarkButton` and `ShareButtons` bumped to 44px (WCAG 2.5.5).
  - `loading.tsx` added for `/tag/[slug]/` and `/category/[category]/`.
  - `next/image remotePatterns` restricted to explicit Cloudinary domains.
  - `color-scheme` CSS property added (browser scrollbars match theme).
  - `viewport` export with `theme-color` added to `layout.tsx`.
  - `global-error.tsx` branded.
  - `not-found.tsx` admin link removed.
  - `commentId` path param Zod-validated in `DELETE /api/comments/[commentId]`.
  - `loading="lazy"` added to prose `<img>` emitter.
- Hydration mismatch in `NextThemeProvider` **FIXED** — added `suppressHydrationWarning` to the theme-root `<div>`. Root cause: `useSyncExternalStore` SSR/client snapshot difference meant the server rendered `light/sage` defaults while the client immediately read a different theme from localStorage. Fix is correct and intentional (`theme-provider.tsx:491`).
- PLAN `3.1`, `3.2`, `3.6` are **DEFERRED** to next week — code improvements are in place; browser QA and Lighthouse measurement require a live interactive environment not available in the current tooling context.
- PLAN `V.9` (`as`/`any` type cleanup) is **DONE** — no unjustified type assertions remain in backend/shared code.
- PLAN `4.2` backend implementation is shipped in code with Resend-backed, non-blocking comment/reply notifications; operational smoke test pending manual env setup.
- PLAN `4.6` frontend signup UI is **DONE** — `NewsletterSignupForm` component is implemented, integrated, and reviewed. `useFormStatus` bug fixed (was dead code; replaced with explicit `loading` prop).
- PLAN `5.1` PWA is **DONE** — manifest, SVG icon, service worker, `ServiceWorkerRegistry` component. Reviewed and bugs fixed (operator precedence bug, invalid manifest icon sizes, removed `console.log`, fixed SW registration timing).
- PLAN `5.4` post revision history is **FULLY DONE** — schema, migration, DAL, GET list route, POST restore route, all tests shipped.
- PLAN `5.6` EXIF metadata is **FULLY DONE** — backend (schema, migration `0009`, parser, upload integration, 43 unit tests) and frontend (lightbox EXIF detail panel) both complete.
- Authenticated Playwright coverage is **COMPLETE** — all 19 E2E tests pass (19/19). Final fix was test 14: replaced `waitForURL(sort=updated-desc)` with an assertion on the rendered Radix Select value, since `router.push` races server-component re-renders when the select fires in uncontrolled mode (`value={undefined}`).

---

## Manual verification still required

See `TODO.md` and PLAN Phase `4.5` for full checklist. High-priority manual tasks remain:

1. ~~Apply production migrations~~ — **DONE** (`0007`, `0008`, `0009` applied 2026-03-19).
2. ~~RSS feed smoke test~~ — **DONE** (confirmed 2026-03-20).
3. ~~Post view counter verification~~ — **DONE** (confirmed 2026-03-20).
4. Complete deployed JSON-LD Rich Results validation on a live post URL.
5. ~~Complete authenticated E2E flow after capturing admin storage state interactively.~~ — **DONE** (19/19 passing, 2026-03-20).
6. Set comment notification env vars and smoke test a real dev comment/reply.

---

## Latest verification snapshot

From the `web/` directory (2026-03-20 pass 10):

- `bun run lint` — pass
- `bunx tsc --noEmit` — pass
- `bun run build` — pass (Next.js 16.2.0)
- `bun run test` — pass (170 tests)

---

## Important caveats

- **Do not claim PLAN 3.1/3.2/3.6 as done** until validated with real Lighthouse/accessibility data in a live environment (next week).
- **Do not claim Google Rich Results validation is complete** without a deployed URL check.
- **Do not claim PLAN 4.2 fully closed operationally** until env vars are configured and a real comment/reply notification is smoke tested.
- **Do not regress inline confirmation UX** back to browser-native `confirm()` dialogs.
- `bun run seed:e2e` and `bun run db:migrate` are intentionally manual — they mutate the database.
- All migrations through `0009` are now applied to production.
- PWA install on Android/Chrome may prompt only after two visits (browser heuristic); this is expected behavior.
- SVG-only PWA icons work in modern browsers (Chrome 80+, Firefox, Safari 15.4+) but older Android WebView may not install. PNG icons should be added when branding assets are finalized.

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
| EXIF parser | `web/src/lib/cloudinary/exif.ts` |
| Revision DAL | `web/src/server/dal/post-revisions.ts` |
| Restore route | `web/src/app/api/admin/posts/[postId]/revisions/[revisionId]/restore/route.ts` |
| PWA registry component | `web/src/components/pwa-registry.tsx` |
| Service worker | `web/public/sw.js` |
| Web manifest | `web/src/app/manifest.ts` |

---

## Model-specific handoff briefs

- Backend / Sonnet / review-verification: `docs/backendPrompt.md`
- Frontend / Gemini 3.1 Pro: `docs/frontendPrompt.md`
