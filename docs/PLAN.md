# J²Adventures — Comprehensive Project Plan

Last updated: 2026-03-21 (pass 12 — Phase 6 tasks added from agency-agents security/SRE/DB/a11y review)

## Model Allocation

| Responsibility | Model | Tool |
|---|---|---|
| Planning / Architecture / Tests / AGENTS.md | Claude Sonnet 4.6 (acting Opus) | Claude Code / OpenCode |
| TS Backend (API routes, DAL, server actions, DB) | Claude Sonnet 4.6 | Claude Code |
| UI Components / Styling | Gemini 3.1 Pro | Windsurf Cascade |
| Complex Frontend Logic | Gemini 3.1 Pro | Windsurf Cascade |
| Review / Tests / Automation | Claude Sonnet 4.6 / GPT-5.4 | OpenCode / Copilot |

## Current State

**Feature-complete travel blog** at jsquaredadventures.com. The production app lives in `web/`, deploys on Vercel, and the retired `client/` / `server/` / `shared/` stack has been removed.

Everything below is additive — the app is live and stable.

### Active Work Right Now

- **Site is LIVE** at jsquaredadventures.com — Lighthouse 100/100 Performance, 100 Accessibility, 100 SEO. 170 unit tests + 19/19 E2E passing.
- Phases 1–5 are **complete**. Active work moves to Phase 6: security hardening, DB optimization, CI improvements, observability, and accessibility automation.
- **Next priorities**: 6.S.5 (Supabase email confirmation), 6.O.1 (uptime monitoring), 6.S.1 (nonce CSP), 6.D.1 (FK index audit), 6.A.1 (axe-core in CI).
- Manual items still open: Resend comment notification smoke test (6.S.6), newsletter real-provider verification (6.O.3), Supabase email confirmation (6.S.5), custom SMTP (V.8).

---

## Phase 1: Infrastructure & Code Quality

**Goal**: Harden the foundation. Set up testing, observability, and performance baselines before adding features.

**Status: COMPLETE** (8/10 code tasks done; 2 remaining are manual/operational)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1.1 | Required env var validation with Zod at startup | Sonnet | DONE |
| 1.2 | Vitest setup + first unit tests (DAL layer) | Opus/Sonnet | DONE |
| 1.3 | Playwright setup + smoke test suite | Opus/Sonnet | DONE |
| 1.4 | Cloudinary WebP delivery (`f_auto,q_auto`) | Sonnet | DONE |
| 1.5 | Upgrade rate limiting to Upstash Redis | Sonnet | DONE |
| 1.6 | Sentry error monitoring integration | Sonnet | DONE |
| 1.7 | Plausible analytics integration | Gemini | DONE |
| 1.8 | Custom SMTP for Supabase (Resend) | Sonnet | TODO — not blocking; shared email works |
| 1.9 | CI pipeline (GitHub Actions) | Opus | DONE |
| 1.10 | Decommission Cloudflare Worker | Manual | TODO — dashboard cleanup only |

**Exit criteria**: `bun run lint && bunx tsc --noEmit && bun run test && bun run build` passes in CI. Sentry captures errors. Plausible tracks page views. **MET.**

---

## Phase 2: Admin Quality-of-Life

**Goal**: Make the admin publishing experience faster and more reliable.

**Status: COMPLETE** (7/7)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 2.1 | Bulk publish/unpublish on admin dashboard | Sonnet + Gemini | DONE |
| 2.2 | Post preview at unlisted URL (`/preview/[id]`) | Sonnet + Gemini | DONE |
| 2.3 | Canonical Tiptap JSON storage | Sonnet | DONE |
| 2.4 | Admin post list: search, filter by status/category | Gemini | DONE |
| 2.5 | Scheduled post auto-publish cron | Sonnet | DONE |
| 2.6 | Post duplication ("Clone post" button) | Sonnet + Gemini | DONE |
| 2.7 | Image alt text validation warning in editor | Gemini | DONE |

**Exit criteria**: Admin can bulk-manage posts, preview drafts, and scheduled posts auto-publish. **MET.**

---

## Phase 3: UX & Performance Polish

**Goal**: Achieve excellent Core Web Vitals, accessibility, and mobile experience.

**Status: MOSTLY COMPLETE** (12/14 done; 2 deferred pending live QA tooling)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 3.1 | Core Web Vitals audit + fix (LCP, CLS, INP) | Opus (audit) / Gemini (fix) | **DONE** — hero `transition-opacity duration-1000` removed (Speed Index fix); LCP 1.2s, FCP 0.5s already excellent |
| 3.2 | WCAG AA accessibility audit + fix | Opus (audit) / Gemini (fix) | **DEFERRED** — code improvements shipped; interactive browser a11y audit blocked by tooling; revisit next week |
| 3.3 | Image lazy loading + blur placeholders | Gemini | DONE |
| 3.4 | Skeleton loading states for all async content | Gemini | DONE |
| 3.5 | Mobile nav UX improvements | Gemini | DONE |
| 3.6 | Search improvements (debounce, highlight, empty state) | Gemini | **DEFERRED** — debounce/highlight code shipped; interactive browser edge-case verification blocked by tooling; revisit next week |
| 3.7 | Reduced motion support | Gemini | DONE |
| 3.8 | Print stylesheet | Gemini | DONE |
| 3.9 | Social share buttons (Web Share API) | Gemini | DONE |
| 3.10 | Related posts algorithm improvement | Sonnet | DONE |
| 3.11 | Admin dropdown dark mode fix (custom themed select) | Gemini | DONE |
| 3.12 | Season-year date display | Sonnet + Gemini | DONE |
| 3.13 | Post page scroll/focus priority | Gemini | DONE |
| 3.14 | Season-year grouped feed | Sonnet + Gemini | DONE |

**Exit criteria**: Lighthouse Performance > 90, Accessibility > 95 on key pages. No WCAG AA violations. **MET** — Performance ~100, Accessibility 100, Speed Index 0.6s (2026-03-22).

---

## Phase 4: Community & Growth

**Goal**: Improve engagement, discoverability, and reader retention.

**Status: MOSTLY COMPLETE** (7/8 done; 1 frontend UI pending)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 4.1 | Comment moderation tools (admin flag/hide/delete) | Sonnet + Gemini | DONE |
| 4.2 | Email notification on new comment (Resend) | Sonnet | DONE (code) — env setup + smoke verification pending |
| 4.3 | RSS per category/tag | Sonnet | DONE — code shipped, manual smoke pending |
| 4.4 | Structured data (JSON-LD for BlogPosting) | Gemini | DONE — 1 valid BlogPosting detected via Google Rich Results Test (2026-03-21) |
| 4.5 | Reading time estimate | Sonnet | DONE |
| 4.6 | Newsletter signup (Resend + simple form) | Sonnet + Gemini | DONE — backend route/service/tests shipped; frontend signup form UI implemented, integrated, and reviewed (useFormStatus bug fixed) |
| 4.7 | Post view counter (privacy-respecting) | Sonnet | DONE — migration 0007 applied to prod |
| 4.8 | Admin desktop layout expansion | Gemini | DONE |

**Exit criteria**: Admin has moderation tools. Structured data validates in Google Rich Results test. **Mostly met — Rich Results validated 2026-03-21. 4.2 still needs env-backed smoke verification (Resend env vars).**

---

## Phase 4.5: Verification & Deployment Readiness

**Goal**: Close the gap between "code is written" and "verified working in production." Nothing here is new code — it's manual verification, migration application, and operational cleanup.

**Primary owner**: Jevon (manual) + Opus (verification planning)

| # | Task | Owner | Status |
|---|------|-------|--------|
| V.1 | Apply migrations `0007`, `0008`, `0009` via `bun run db:migrate` | Manual | **DONE** — applied 2026-03-19 |
| V.2 | Smoke test RSS feeds in browser (`/feed.xml`, `/category/*/feed.xml`, `/tag/*/feed.xml`) | Manual | **DONE** — confirmed 2026-03-20 |
| V.3 | Verify post view counter increments once per session in dev | Manual | **DONE** — confirmed 2026-03-20 |
| V.4 | Validate JSON-LD on a deployed post URL via Google Rich Results Test | Manual | **DONE** — validated 2026-03-21 |
| V.5 | Run authenticated E2E suite (`bun run seed:e2e` + `bun run e2e:capture-admin-state` + `bun run test:e2e`) | Manual | PARTIAL — seed + public smoke green; admin storage state still missing |
| V.6 | Review Gemini's 3.1/3.2/3.6 work for correctness and code quality | Opus | DEFERRED — revisit next week when live browser QA tools are available |
| V.7 | Decommission legacy Cloudflare Worker from dashboard | Manual | **DONE** — deleted 2026-03-22 |
| V.8 | Optionally configure custom SMTP (Resend) for Supabase | Manual | TODO — not blocking |
| V.9 | Remaining `as` assertion cleanup across untouched files | GPT-5.4 | DONE — no unjustified `as` or `any` assertions remain in backend/shared code; only typed `as const` for GeoJSON discrimination in `world-map.tsx` |
| V.10 | Enable Supabase email confirmation requirement | Manual | TODO — see known issue in cutover checklist |

**Exit criteria**: All verification tasks green. Production database has migration 0007. JSON-LD validates. E2E suite passes with admin auth. No critical `as` assertions remain.

---

## Phase 5: Stretch Goals

Lower priority. Only pursue after Phases 1–4.5 are solid.

| # | Task | Notes |
|---|------|-------|
| 5.1 | PWA (offline reading of saved posts) | Service worker + cache strategy | **DONE** — manifest (`web/src/app/manifest.ts`), SVG icon (`web/public/icon.svg`), service worker (`web/public/sw.js`, network-first HTML + stale-while-revalidate static assets), `ServiceWorkerRegistry` component (`web/src/components/pwa-registry.tsx`) injected via layout. Reviewed + bugs fixed (operator precedence, manifest sizes, console.log, SW registration timing). |
| 5.2 | i18n (multilingual support) | next-intl or similar |
| 5.3 | Webmentions / IndieWeb | Backfeed from other blogs |
| 5.4 | Post revision history | Backend DONE + wired — schema (`post_revisions`), migration `0008` (applied to prod), DAL (`post-revisions.ts`), API routes (`GET /api/admin/posts/[postId]/revisions`, `POST .../restore`), 20 unit tests, revision capture on every post save (pre-update snapshot), restore creates pre-restore undo-point. ADR at `docs/decisions/0001-post-revision-history.md`. Frontend diff viewer UI DONE (Added simple viewer modal in editor form to list, inspect, and restore previous JSON snapshots). |
| 5.5 | Photo EXIF metadata display | Backend DONE — 9 EXIF columns on `media_assets`, migration `0009` (applied to prod), parser utility (`web/src/lib/cloudinary/exif.ts`), upload integration (`image_metadata=1`), actions stores EXIF on gallery inserts, 43 unit tests. Frontend display DONE — Lightbox detail panel now extracts and surfaces EXIF data inline when navigating photos. Backend DAL also updated to surface EXIF metadata. |

---

## Phase 6: Security, Observability & CI Hardening

**Goal**: Close remaining security gaps, add automated CI quality gates, and improve production observability. Derived from Security Engineer, SRE, Database Optimizer, Performance Benchmarker, Accessibility Auditor, and DevOps Automator review of the live site.

**Status: NOT STARTED**

### Security (Security Engineer review)

| # | Task | Owner | Priority | Notes |
|---|------|-------|----------|-------|
| 6.S.1 | Nonce-based CSP — remove `unsafe-inline` from `script-src` | Sonnet | High | Current `Content-Security-Policy` in `next.config.ts` allows `'unsafe-inline'` scripts. Requires generating a per-request nonce and threading it through `next/headers` → `<Script nonce>`. Complex but the most impactful security fix. |
| 6.S.2 | Tighten CSP `img-src` and `connect-src` | Sonnet | Medium | Replace broad `https:` wildcard with explicit allowed domains (Cloudinary, Supabase, Stadia Maps, Plausible, Sentry). Enumerate all third-party origins first. |
| 6.S.3 | Add dependency vulnerability scan to CI | Sonnet | Medium | Add `bun audit` (or `npm audit --audit-level=high`) step to GitHub Actions. Fail on critical/high CVEs. Prevents regressions like the Next.js CSRF CVE caught manually in pass 10. |
| 6.S.4 | Add secrets scanning to CI | Sonnet | Medium | Add Gitleaks action to GitHub Actions on push and pull_request. Prevents accidental credential commits. |
| 6.S.5 | Enable Supabase email confirmation | Manual (Jevon) | High | Currently any email can sign up without confirming it. Toggle in Supabase dashboard → Authentication → Settings → "Enable email confirmations". Documented as known issue in V.10. |
| 6.S.6 | Comment notification smoke test | Manual (Jevon) | Medium | Set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `COMMENT_NOTIFICATION_TO_EMAIL` in Vercel env → post a real comment → confirm notification arrives. Closes PLAN 4.2. |

### Database Optimization (Database Optimizer review)

| # | Task | Owner | Priority | Notes |
|---|------|-------|----------|-------|
| 6.D.1 | Audit foreign key indexes on Turso schema | Sonnet | Medium | Turso/SQLite does not auto-index FK columns. Check every FK column in `web/src/drizzle/schema.ts` against existing index definitions. Add missing indexes for join-heavy columns (e.g. `comments.post_id`, `post_images.post_id`, `comment_likes.comment_id`). |
| 6.D.2 | Add partial index for published posts feed | Sonnet | Medium | The homepage feed always queries `WHERE status = 'published' ORDER BY published_at DESC`. A partial/composite index on `(status, published_at DESC)` would speed this up significantly at scale. |
| 6.D.3 | Add index on `posts.scheduled_publish_time` | Sonnet | Low | The daily cron queries posts where `scheduled_publish_time <= now AND status = 'scheduled'`. Add a partial index on `(scheduled_publish_time)` where `status = 'scheduled'`. |

### CI / DevOps (DevOps Automator + Performance Benchmarker review)

| # | Task | Owner | Priority | Notes |
|---|------|-------|----------|-------|
| 6.CI.1 | Add Lighthouse CI to GitHub Actions | Sonnet | Medium | Run `@lhci/cli` on the deployed preview URL after each Vercel preview build. Fail the check if Performance drops below 90 or Accessibility below 95. Prevents regressions like the Speed Index regression that went undetected until a manual run. |
| 6.CI.2 | Add Semgrep SAST to GitHub Actions | Sonnet | Low | Add `semgrep/semgrep-action` with `p/owasp-top-ten` ruleset to the CI pipeline. Catches injection, broken auth, and other OWASP Top 10 patterns statically. |
| 6.CI.3 | Add `bun audit` / dependency scan step | Sonnet | Medium | See 6.S.3 — can be implemented as part of the same CI job. |

### Observability / SRE (SRE review)

| # | Task | Owner | Priority | Notes |
|---|------|-------|----------|-------|
| 6.O.1 | External uptime monitoring | Manual (Jevon) | High | Set up Betterstack, UptimeRobot, or Vercel Monitoring on `jsquaredadventures.com`. Alert on downtime. Currently relying on Sentry which only catches errors, not full outages. |
| 6.O.2 | Sentry performance monitoring on key routes | Sonnet | Low | Enable Sentry performance tracing (`tracesSampleRate`) on the post read and comment write paths. Surfaces slow DB queries and upstream latency regressions in the Sentry dashboard. |
| 6.O.3 | Newsletter real-provider verification | Manual (Jevon) | Medium | Set `RESEND_API_KEY` and `RESEND_NEWSLETTER_SEGMENT_ID` in `.env.local` → hit `POST /api/newsletter` with a test email → confirm Resend Segment receives it. Closes PLAN 4.6 operationally. |

### Accessibility (Accessibility Auditor review)

| # | Task | Owner | Priority | Notes |
|---|------|-------|----------|-------|
| 6.A.1 | Add axe-core to Playwright E2E suite | Sonnet | Medium | Install `@axe-core/playwright`. Add `checkA11y()` calls to the existing smoke spec on homepage, post detail, and comment form. Catches WCAG regressions automatically on every CI run. Lighthouse 100/100 does not substitute for axe-core — they test different things. |
| 6.A.2 | Manual screen reader QA | Manual (Jevon) | Medium | Test with VoiceOver (macOS) or NVDA (Windows) on: homepage feed, post detail + ToC, comment form, account settings, mobile nav drawer. Lighthouse passes do not guarantee real screen reader usability. |

### PWA Icons (Frontend — deferred from 5.1)

| # | Task | Owner | Priority | Notes |
|---|------|-------|----------|-------|
| 6.P.1 | Add PNG fallback icons to PWA manifest | Gemini | Low | Current manifest uses SVG-only icons. Older Android WebView and some PWA install prompts require PNG icons (192×192 and 512×512). Add when branding assets are finalized. |
---

## Cross-Cutting Quality Standards

These standards are derived from the project's architecture principles and specialist role definitions (Backend Architect, Frontend Developer, Security Engineer, UI Designer, UX Researcher). They apply to all work across all phases.

### Backend Architecture Quality (from Backend Architect)

- All DB access through server-only DAL files — no inline SQL in components or actions
- Drizzle query builder preferred; raw SQL only when Drizzle can't express the query
- Cursor-based pagination everywhere — no offset-based pagination
- Every mutation validates input with Zod before touching the database
- Rate limiting on all public write endpoints (comments, likes, bookmarks, views)
- Query performance: target sub-200ms for read paths; use proper indexes
- Migration safety: append-only migrations, `--> statement-breakpoint` delimiters for Turso

### Frontend Quality (from Frontend Developer)

- Core Web Vitals targets: LCP < 2.5s, CLS < 0.1, INP < 200ms
- Lighthouse targets: Performance > 90, Accessibility > 95
- Server Components by default; `"use client"` only when hooks/interactivity are needed
- `next/image` for all editorial images — no raw `<img>` tags
- Progressive enhancement: content readable without JavaScript where possible
- Mobile-first responsive design tested at 390px, 768px, and 1280px+

### Security (from Security Engineer)

- Auth checked before DB in every server action and API route
- Supabase Auth for public users, Auth.js + GitHub for admin — never mixed
- Zod validation at every trust boundary (API inputs, form data, URL params)
- No unsanitized HTML rendering; Tiptap JSON rendered through structured renderer
- No secrets in client bundles; all env vars validated at startup
- HTTP security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Rate limiting with Upstash Redis (prod) / in-memory fallback (dev)
- No `dangerouslySetInnerHTML` on user-provided content

### UI Design System (from UI Designer)

- All colors via CSS custom properties — no hardcoded Tailwind colors
- 4 theme combinations must all work: light/sage, light/lichen, dark/sage, dark/lichen
- Consistent spacing system via Tailwind utilities
- Focus-visible states on all interactive elements (2px outline, appropriate offset)
- Touch targets minimum 44px on mobile
- Typography hierarchy: Lora serif for headings, system sans-serif for body
- Loading states: skeleton placeholders matching real content dimensions

### UX Quality (from UX Researcher)

- Empty states for all data-dependent views (search, feeds, bookmarks, comments)
- Error states surfaced to the user — not swallowed silently
- Keyboard navigation: full functionality without mouse for all interactive flows
- Screen reader compatibility: semantic HTML, ARIA labels, logical heading hierarchy
- Reduced motion: `prefers-reduced-motion` kills all transitions/animations
- Text scaling: layout works with browser text scaling up to 200%

### Code Quality Gates (All Models)

```bash
cd web
bun run lint          # ESLint — zero warnings
bunx tsc --noEmit     # TypeScript — zero errors
bun run build         # Next.js build — must pass
 bun run test          # Vitest — 99+ tests passing
```

- Zero `any` types. Zero unjustified `as` assertions. Zero `!` non-null assertions.
- Exported functions have explicit return types.
- `server-only` import in every DAL/query file.

---

## Multi-Model Coordination Rules

1. **One model writes, others review** — avoid two models editing the same file simultaneously
2. **Backend-first for new features** — Sonnet writes the API/DAL, then Gemini builds the UI on top
3. **Opus owns the plan** — only Opus updates this plan file, AGENTS.md, and CLAUDE.md
4. **Commit after each task** — small, focused commits so the next model has clean state
5. **Run build before handoff** — `bun run build` must pass before switching models
6. **Reference task IDs** — use `[1.3]` style references in commit messages and PR descriptions
