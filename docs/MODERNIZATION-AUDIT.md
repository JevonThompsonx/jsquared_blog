# Modernization Audit — J² Adventures Blog

**Date:** 2026-08-24
**Scope:** `/home/hermes/Projects/jsquared_blog` — Next.js 16 monorepo (`web/`), Drizzle/Turso, Sentry, Playwright, pnpm workspace.
**Lens:** Security · Efficiency · Speed · QoL
**Method:** Source inspection + live `npm view` currency checks against the installed lockfile versions. Only findings backed by code/version evidence are listed.

> This complements (does not duplicate) `docs/IMPROVEMENTS.md` (the feature/tech-debt backlog) and `docs/ROADMAP.md`. Items here are modernization-specific; cross-references to `IMPROVEMENTS.md` are noted where they exist.

---

## Evidence baseline (verified)

| Package | Installed | Latest | Note |
|---|---|---|---|
| `next` | 16.2.9 | 16.3.2 | minor behind |
| `next-auth` | **4.24.15** | (v4 line) | **Auth.js v4 — pre-Next-App-Router-native**; v5 (`next-auth@5` beta) is the modernization target |
| `react` / `react-dom` | 19.2.7 | 19.2.8 | patch behind |
| `zod` | **4.4.3** | 4.4.3 | ✅ already on v4 |
| `@sentry/nextjs` | 10.62.0 | 10.71.0 | minor behind |
| `react-map-gl` | **8.1.1** | — | **Duplicate of `@vis.gl/react-maplibre@8.1.1`** (same maintainer, same code) |
| `@types/node` | 25.9.3 (runtime Node 24) | — | type/runtime mismatch (see QoL/M6) |
| `typescript` | 6.0.3 | — | ✅ modern |

---

## 🔒 Security

### SEC-1 — `sendDefaultPii: true` ships IP + request headers to Sentry (HIPAA/GDPR surface)
- **Where:** `web/src/sentry.server.config.ts:22`, `web/sentry.client.config.ts:7`, `web/sentry.edge.config.ts:8`
- **Finding:** All three Sentry inits set `sendDefaultPii: true`, which attaches client IP and full request headers (incl. cookies/authorization in some paths) to events. For a public blog this expands the PII footprint stored in a third party and broadens breach/DSAR scope.
- **Action:** Default to `false`; if user context is needed for error triage, attach only a hashed/opaque user id via `Sentry.setUser({ id })` rather than raw PII. Document the privacy decision.
- **Effort:** Low.

### SEC-2 — Stale Sentry client/edge configs drift from server sampler
- **Where:** `sentry.client.config.ts` still has `tracesSampleRate` and `replaysSessionSampleRate`/`replaysOnErrorSampleRate`, while `sentry.server.config.ts` uses a `tracesSampler`. The server config no longer calls `Sentry.replayIntegration()` (good), but client/edge still do not route through the route-aware sampler, so client trace volume is ungoverned (10% flat) vs the server's targeted sampling.
- **Action:** Centralize tracing config; apply the server's `tracesSampler` logic (or a client-equivalent) to client traces; confirm `replaysOnErrorSampleRate: 1.0` is intended and the 10% session replay is acceptable cost/PII-wise.
- **Effort:** Low.

### SEC-3 — CSP has no `report-to`/`report-uri` (violations invisible)
- **Where:** `web/src/proxy.ts` builds CSP but never appends a reporting directive.
- **Cross-ref:** `IMPROVEMENTS.md` **S5** (open).
- **Action:** Add a `/api/csp-report` route + `report-to` directive (or Sentry reporting), gated to log-only initially.
- **Effort:** Low–Medium.

### SEC-4 — `dangerouslySetInnerHTML` for post body relies entirely on upstream sanitization
- **Where:** `web/src/components/blog/prose-content.tsx:47` and `web/(blog)/posts/[slug]/head.tsx:61` (JSON-LD — safe). The prose path is guarded by `sanitizeRichTextHtml()` + a `nosemgrep` suppression comment.
- **Finding:** The suppression is justified (admin-authored, pre-sanitized) but the safety is *only* as strong as `sanitizeRichTextHtml`. There is no defense-in-depth (e.g., DOMPurify on the client, or a CI step that fails if the sanitizer allowlist is loosened).
- **Action:** Add a unit test that asserts the sanitizer strips `script`, `onerror=`, `javascript:`; add a test fixture of known attack vectors. Keep the `nosemgrep` but require the test as the compensating control.
- **Effort:** Low.

### SEC-5 — `next-auth` v4 on App Router (token/secret ergonomics)
- **Where:** `web/src/lib/auth/session.ts`, `web/src/app/api/auth/[...nextauth]/route.ts`, `web/src/types/next-auth.d.ts`. `package.json` pins `next-auth@4.24.14`.
- **Finding:** v4 predates the App Router `auth()` primitives and leans on the `[...nextauth]` route + `NEXTAUTH_SECRET`/`NEXTAUTH_URL` shims (see `env.ts:10-16`). The codebase already bridges `AUTH_SECRET`→`NEXTAUTH_SECRET`, evidence of v4 friction.
- **Action:** Plan migration to **Auth.js v5 (`next-auth@5`)** — native `auth()` helpers, simplified config, no `NEXTAUTH_URL` shimming. Track as a modernization epic (not a drop-in bump; v5 is still beta but production-used widely).
- **Effort:** Medium–High.

---

## ⚡ Efficiency

### EFF-1 — React 19 `'use cache'` not adopted anywhere
- **Where:** No `'use cache'` directives in `web/src` (grep). Data fetching in Server Components calls `getDb()` directly with `revalidate`/`revalidatePath`.
- **Finding:** Next 16 + React 19 offer the Cache Components / `'use cache'` primitive for request-coalesced, cache-tag-aware data. The project still uses the older `fetch`/`revalidate` ISR model.
- **Action:** Pilot `'use cache'` on the homepage feed and post detail queries (with `cacheLife`/`cacheTag`) to get dedup + on-demand invalidation. Requires verifying Drizzle queries are cache-safe (no non-serializable args).
- **Effort:** Medium.

### EFF-2 — N+1 / query consolidation not yet audited for the feed
- **Cross-ref:** `IMPROVEMENTS.md` **P3** (open, Medium).
- **Finding:** Homepage = published posts + author + featured image + tags. Worth confirming via `EXPLAIN`-style tracing that these are joined, not looped.
- **Action:** Run the P3 audit; convert any per-post sub-queries to a single join/CTE.
- **Effort:** Medium.

### EFF-3 — Rate limiter in-memory fallback is dead-weight in serverless but still bundled
- **Where:** `web/src/lib/rate-limit.ts:106-181` (in-memory `Map` store + sweep). Production correctly throws if Upstash is missing, but the in-memory code ships to all environments.
- **Finding:** Not a bug (fail-closed is correct), but ~75 lines of dev/test-only code is included in the server bundle.
- **Action:** Lazy-import the in-memory limiter only when `!isUpstashConfigured() && !isDeployedEnvironment()`. Minor bundle/clarity win.
- **Effort:** Low.

### EFF-4 — `react-map-gl` and `@vis.gl/react-maplibre` are installed as the same package twice
- **Where:** `package.json:46` (`react-map-gl@^8.1.0`); lockfile also resolves `@vis.gl/react-maplibre@8.1.1` (the underlying package `react-map-gl/maplibre` re-exports). Both are present in the dependency graph.
- **Finding:** `react-map-gl` v8 is essentially a thin re-export of `@vis.gl/react-maplibre`. Importing via `react-map-gl/maplibre` pulls the same code but adds a redundant dependency entry and potential duplicate install.
- **Action:** Standardize on one import path (`@vis.gl/react-maplibre` directly) and drop `react-map-gl` from `dependencies`, or vice-versa. Removes ambiguity for future updaters.
- **Effort:** Trivial.

---

## 🚀 Speed

### SPD-1 — Turbopack not enabled for `dev` or `build`
- **Where:** `web/package.json` scripts: `"dev": "next dev"`, `"build": "tsx ./scripts/build.ts"` → `next build` (webpack, per `next.config.ts` Sentry `webpack` block). The only Turbopack reference is a test fixture (`sw.test.ts`).
- **Finding:** Next 16 ships stable Turbopack for both `dev` and `build`. The build still uses the webpack path (Sentry's `webpack` config block confirms it).
- **Action:** Enable Turbopack for dev (`next dev --turbopack`) and build (`next build --turbopack`); validate Sentry's `withSentryConfig` + `autoInstrumentServerFunctions` work under Turbopack (Sentry 10 supports the Turbopack plugin — may need config switch). Expect faster cold builds + HMR.
- **Effort:** Medium (validate Sentry + bundle analyzer compat).

### SPD-2 — MapLibre (maplibre-gl) is statically imported, no `next/dynamic` code-splitting
- **Where:** `web/src/components/blog/post-map.tsx`, `web/src/components/blog/world-map.tsx` import `react-map-gl/maplibre` + `maplibre-gl` at module top. **No `next/dynamic` usage exists anywhere** in `src` (grep).
- **Finding:** `maplibre-gl` is ~700KB. Both map components are `"use client"` and the `world-map` is on the **public `/map` page**, so the map bundle is on the public critical path. There is no `dynamic(() => import(...), { ssr: false, loading })` gate.
- **Action:** Wrap `WorldMap`/`PostMap` in `next/dynamic` with `ssr: false` + skeleton; the IntersectionObserver lazy-mount already exists in `PostMap` but the JS is still in the initial client chunk. Confirm the map is excluded from the public route's initial JS.
- **Effort:** Medium. **Cross-ref:** `IMPROVEMENTS.md` **P5** (Tiptap split) — same root cause (no dynamic splitting).

### SPD-3 — Tiptap admin editor likely in shared client graph
- **Where:** `web/src/components/admin/post-rich-text-editor.tsx` and siblings. No `next/dynamic` anywhere (SPD-2).
- **Finding:** Tiptap (5+ packages) is heavy. If any admin component is reachable from a shared layout imported by public routes, the editor leaks into public bundles. Even if admin-only, it's not lazy-loaded within the admin chunk.
- **Action:** `next/dynamic` the editor; verify it is never in a public route's module graph (use `build:analyze`).
- **Effort:** Low–Medium.

### SPD-4 — Image CLS / `next/image` width-height audit incomplete
- **Cross-ref:** `IMPROVEMENTS.md` **P1** (open).
- **Finding:** `next.config.ts` wires Cloudinary/Unsplash/etc `remotePatterns` (good) but the audit for missing `width`/`height` (or `fill` + sized parent) on `<img>`/`<Image>` is still open. World-map popup `<Image fill>` is correctly sized; verify cards/headers.
- **Action:** Complete P1; add a lint/visual check for CLS regressions.
- **Effort:** Medium.

### SPD-5 — ISR / `revalidate` revalidation tuning
- **Cross-ref:** `IMPROVEMENTS.md` **P4** (open).
- **Finding:** New comment → visible delay before it appears; revalidation cadence not tuned for the "post → first paint" path.
- **Action:** Pair with EFF-1 (`'use cache'` + `cacheTag`/`revalidateTag`) for precise invalidation instead of time-based `revalidate`.
- **Effort:** Medium.

### SPD-6 — CI runs `playwright install --with-deps` on every E2E job (slow, cacheable)
- **Where:** `.github/workflows/ci.yml` e2e job installs Chromium + OS deps each run, no browser cache step.
- **Action:** Use `actions/cache` keyed on Playwright version, or the `playwright-github-action` cache; or migrate to `microsoft/playwright-github-action`. Cuts several minutes per PR.
- **Effort:** Low.

---

## 🛠️ QoL (Developer Experience & Maintenance)

### QOL-1 — Line-ending inconsistency (`CRLF` in map components)
- **Where:** `post-map.tsx`, `world-map.tsx` are `CRLF`; most of `src` is `LF`.
- **Finding:** Mixed line endings cause noisy diffs and can break Prettier/editorConfig expectations.
- **Action:** Add a `.gitattributes` (`* text=auto eol=lf`) and normalize the two files (`git add --renormalize`).
- **Effort:** Trivial.

### QOL-2 — `package.json` dev/build scripts lack Turbopack + `typecheck` convenience
- **Where:** Root `package.json` has no `typecheck` script; web has no `typecheck` (`tsc --noEmit` only invoked in CI via `pnpm --filter web exec tsc`).
- **Action:** Add `"typecheck": "tsc --noEmit"` to web + root; add `"dev:turbopack"` alias. Matches `lint`/`test` parity with CI.
- **Effort:** Trivial.

### QOL-3 — `@types/node@25` vs runtime Node 24
- **Cross-ref:** `IMPROVEMENTS.md` **M6** (open, Trivial).
- **Finding:** Engines require `>=22.13`; CI uses Node 24; types are `@types/node@25`. Minor drift that can surface impossible-API type suggestions.
- **Action:** Pin `@types/node` to `^24` (or `^22`) to match the runtime.
- **Effort:** Trivial.

### QOL-4 — No editor/tooling version pinning (Volta/`.nvmrc`/engines sync)
- **Finding:** `packageManager: pnpm@11.1.1` is pinned (good) but there's no `.nvmrc`/Volta `volta.node` to pin Node for contributors, and `engines.node` (`>=22.13`) is a floor, not a pin.
- **Action:** Add `.nvmrc` (24) and consider `volta` pinning for reproducible local runs.
- **Effort:** Trivial.

### QOL-5 — Dependabot only scans the repo root; the real app is in `web/`
- **Where:** `.github/dependabot.yml` uses `directory: "/"` for both `npm` and `github-actions`. The application manifest is `web/package.json`; updates there are **not** auto-PR'd.
- **Finding:** Security/dep updates for `next`, `next-auth`, `@sentry/nextjs`, etc. are not covered by Dependabot — only root dev deps (`@sentry/cli`, `vercel`).
- **Action:** Add a `package-ecosystem: "npm"` entry with `directory: "/web"`. This is the highest-value QoL/security fix in this audit.
- **Effort:** Trivial.

### QOL-6 — ESLint 9 / TS 6 are modern, but TS 7 native is the real win
- **Cross-ref:** `IMPROVEMENTS.md` **M1/M2/M3** (open).
- **Finding:** Already on ESLint 9.39.4 + TS 6.0.3 (good). The next meaningful bump is TypeScript 7 (native Go port) for `tsc` speed; currently blocked on ecosystem (same as M1/M3).
- **Action:** Track TS 7 native preview; no action until stable.
- **Effort:** Low when available.

### QOL-7 — `sentry.client.config.ts` is effectively an orphan file
- **Finding:** `sentry.client.config.ts` is the legacy client init; `instrumentation-client.ts` is the native hook. The legacy file still contains replay/sampler config that may be double-initializing or simply dead. `sentry.server.config.ts`/`sentry.edge.config.ts` are imported by `instrumentation.ts` (correct).
- **Action:** Confirm `sentry.client.config.ts` is not imported anywhere; if orphaned, delete it to avoid confusion. (Note the existing `web/sentry.client.config.ts` vs `src/...` — verify import graph.)
- **Effort:** Trivial.

---

## Prioritized modernization plan

**Do first (high value / low effort):**
1. **QOL-5** — Add Dependabot `directory: "/web"` (closes the real security-update gap).
2. **SEC-5 / EFF-4** — Scope the `next-auth` v5 migration epic; dedupe `react-map-gl`.
3. **QOL-1/2/3/4** — Line-ending normalize, add `typecheck` script, pin `@types/node`, add `.nvmrc`.

**Next (medium, measurable speed wins):**
4. **SPD-1** — Enable Turbopack for dev + build (validate Sentry compat).
5. **SPD-2 / SPD-3** — `next/dynamic` the MapLibre + Tiptap components (public bundle瘦身).
6. **EFF-1 / SPD-5** — Pilot `'use cache'` + tag invalidation; retire time-based `revalidate`.

**Later (privacy + polish):**
7. **SEC-1 / SEC-2** — Revisit `sendDefaultPii`, centralize Sentry sampling.
8. **SEC-3 / SEC-4** — CSP reporting + sanitizer test fixtures.
9. **EFF-2 / SPD-4** — N+1 audit, image CLS audit.

---

## Files inspected (evidence)
- `package.json`, `pnpm-workspace.yaml`, `web/package.json`, `web/tsconfig.json`, `web/next.config.ts`
- `web/src/proxy.ts`, `web/src/lib/env.ts`, `web/src/lib/rate-limit.ts`
- `web/src/sentry.*.config.ts`, `web/src/instrumentation*.ts`
- `web/src/components/blog/prose-content.tsx`, `post-map.tsx`, `world-map.tsx`
- `web/scripts/build.ts`, `web/drizzle.config.ts`
- `.github/workflows/ci.yml`, `.github/dependabot.yml`
- `docs/IMPROVEMENTS.md` (cross-references)
- Live: `npm view` for `next`, `next-auth`, `react`, `zod`, `@sentry/nextjs`

---

## Modernization Wave Status (2026-08-24)

**Current branch / SHA:** `feat/phase1-modernization` @ `4d50dd14a0c5070f8257d2e1585a035db02ba8ce`
**Source doc:** `docs/MODERNIZATION-AUDIT.md` (this file) · **Baseline:** `/tmp/baseline-jsquared.md` · **Second audit:** `/tmp/second-audit-jsquared.md`

### ✅ Wave 1 completions (committed on this branch)
- **QOL-5 ✅** Dependabot `/web` directory coverage added (commit `4d50dd1`). Real-app security updates (`next`, `next-auth`, `@sentry/nextjs`) now auto-PR'd — closes the highest-value QoL/SEC gap.
- **QOL-7 ✅** Orphan `web/sentry.client.config.ts` stub deleted (commit `3dfbf3a`). The file was a 2-line empty stub imported nowhere — confirming the **second audit's correction** that the Phase-1 baseline's counter-claim ("`sentry.client.config.ts` IS imported — QOL-7 moot") was **FALSE**.

### 🔧 Corrections found (second audit supersedes Phase-1 baseline)
- **SEC-1 location corrected:** client `sendDefaultPii: true` is at `web/src/instrumentation-client.ts:7`, **NOT** `web/sentry.client.config.ts` (now deleted). The count ("3 configs") still holds (server `web/sentry.server.config.ts:22`, edge `web/sentry.edge.config.ts:8`, client `web/src/instrumentation-client.ts:7`). SEC-1 risk remains unaddressed in Wave 1 — only the dead stub was removed; the `sendDefaultPii: true` flags are still live.
- **`web/` is a pnpm workspace, not a git submodule** — reconfirmed valid (Phase-1 already corrected this; second audit agrees).
- **next-auth lockfile = `4.24.14`** (audit body's one "4.24.15" mention is a typo; baseline noted). No action.

### 📋 Wave 2 queue (remaining — all need code changes)
- **SECURITY:** SEC-1 flip `sendDefaultPii`→`false` in all 3 live files + hashed `Sentry.setUser({id})`; SEC-2 centralize Sentry sampling (client/edge→server sampler); SEC-3 add CSP `report-to` + `/api/csp-report`; SEC-4 sanitizer XSS test fixtures; SEC-5 plan Auth.js v5 migration.
- **RELIABILITY:** delete the 3 orphaned social-link tests in `about-page.test.tsx` (AGENTS.md bans the feature; section removed in `87723ba`) → returns suite to 1120/1120.
- **EFFICIENCY:** EFF-1 pilot `'use cache'`; EFF-2 N+1 feed audit; EFF-3 lazy-import in-memory limiter; EFF-4 dedupe `react-map-gl`→`@vis.gl/react-maplibre`.
- **SPEED:** SPD-1 Turbopack dev/build; SPD-2 `next/dynamic` MapLibre; SPD-3 `next/dynamic` Tiptap; SPD-4 image CLS audit; SPD-6 cache Playwright browsers in CI.
- **QoL/DX:** QOL-1 `.gitattributes` + renormalize CRLF map files; QOL-2 add `typecheck` scripts (root+web); QOL-3 pin `@types/node` to runtime; QOL-4 `.nvmrc`/Volta; QOL-6 track TS 7 native.
