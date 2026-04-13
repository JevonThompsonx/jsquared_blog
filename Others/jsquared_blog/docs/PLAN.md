# J²Adventures — Project Roadmap

Last updated: 2026-03-21

## Current State

**Feature-complete travel blog** at jsquaredadventures.com. The production app lives in `web/`, deploys on Vercel.

- Site is **LIVE** — Lighthouse 100/100 Performance, 100 Accessibility, 100 SEO
- 170 unit tests + 19/19 E2E passing
- All code tasks through Phase 6 are complete; remaining items are manual/operational

### Pending Manual Tasks

- **Apply migration `0010_phase6_indexes.sql`** — run `bun run db:migrate` from `web/`
- **6.S.5** — Enable Supabase email confirmation (Supabase dashboard → Authentication → Settings)
- **6.S.6** — Comment notification smoke test (set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `COMMENT_NOTIFICATION_TO_EMAIL`, post a real comment)
- **6.O.1** — Set up external uptime monitoring (Betterstack, UptimeRobot, or Vercel Monitoring)
- **6.O.3** — Newsletter provider verification (set `RESEND_API_KEY` + `RESEND_NEWSLETTER_SEGMENT_ID`, test `POST /api/newsletter`)
- **6.A.2** — Manual screen reader QA (VoiceOver/NVDA on: homepage, post detail + ToC, comment form, account settings, mobile nav)
- **V.8** — Custom SMTP for Supabase (Resend) — not blocking

---

## Phase 1: Infrastructure & Code Quality

**Status: COMPLETE**

| # | Task | Status |
|---|------|--------|
| 1.1 | Required env var validation with Zod at startup | DONE |
| 1.2 | Vitest setup + first unit tests (DAL layer) | DONE |
| 1.3 | Playwright setup + smoke test suite | DONE |
| 1.4 | Cloudinary WebP delivery (`f_auto,q_auto`) | DONE |
| 1.5 | Upgrade rate limiting to Upstash Redis | DONE |
| 1.6 | Sentry error monitoring integration | DONE |
| 1.7 | Plausible analytics integration | DONE |
| 1.8 | Custom SMTP for Supabase (Resend) | TODO — not blocking; shared email works |
| 1.9 | CI pipeline (GitHub Actions) | DONE |

---

## Phase 2: Admin Quality-of-Life

**Status: COMPLETE**

| # | Task | Status |
|---|------|--------|
| 2.1 | Bulk publish/unpublish on admin dashboard | DONE |
| 2.2 | Post preview at unlisted URL (`/preview/[id]`) | DONE |
| 2.3 | Canonical Tiptap JSON storage | DONE |
| 2.4 | Admin post list: search, filter by status/category | DONE |
| 2.5 | Scheduled post auto-publish cron | DONE |
| 2.6 | Post duplication ("Clone post" button) | DONE |
| 2.7 | Image alt text validation warning in editor | DONE |

---

## Phase 3: UX & Performance Polish

**Status: COMPLETE**

| # | Task | Status |
|---|------|--------|
| 3.1 | Core Web Vitals audit + fix (LCP, CLS, INP) | DONE — LCP 0.5s, Speed Index 0.6s |
| 3.2 | WCAG AA accessibility audit + fix | DONE — 100/100 Lighthouse Accessibility |
| 3.3 | Image lazy loading + blur placeholders | DONE |
| 3.4 | Skeleton loading states for all async content | DONE |
| 3.5 | Mobile nav UX improvements | DONE |
| 3.6 | Search improvements (debounce, highlight, empty state) | DONE |
| 3.7 | Reduced motion support | DONE |
| 3.8 | Print stylesheet | DONE |
| 3.9 | Social share buttons (Web Share API) | DONE |
| 3.10 | Related posts algorithm improvement | DONE |
| 3.11 | Admin dropdown dark mode fix | DONE |
| 3.12 | Season-year date display | DONE |
| 3.13 | Post page scroll/focus priority | DONE |
| 3.14 | Season-year grouped feed | DONE |

---

## Phase 4: Community & Growth

**Status: COMPLETE** (code done; some env-backed verification pending)

| # | Task | Status |
|---|------|--------|
| 4.1 | Comment moderation tools (admin flag/hide/delete) | DONE |
| 4.2 | Email notification on new comment (Resend) | DONE (code) — env setup + smoke verification pending |
| 4.3 | RSS per category/tag | DONE — code shipped |
| 4.4 | Structured data (JSON-LD for BlogPosting) | DONE — validated via Google Rich Results Test |
| 4.5 | Reading time estimate | DONE |
| 4.6 | Newsletter signup (Resend + simple form) | DONE |
| 4.7 | Post view counter (privacy-respecting) | DONE |
| 4.8 | Admin desktop layout expansion | DONE |

---

## Phase 5: Stretch Goals

| # | Task | Status |
|---|------|--------|
| 5.1 | PWA (offline reading) | DONE — manifest, SVG icon, service worker, `ServiceWorkerRegistry` |
| 5.2 | i18n (multilingual support) | Not started |
| 5.3 | Webmentions / IndieWeb | Not started |
| 5.4 | Post revision history | DONE — schema, DAL, API routes, diff viewer UI |
| 5.5 | Photo EXIF metadata display | DONE — 9 EXIF columns, parser, lightbox display |

---

## Phase 6: Security, Observability & CI Hardening

**Status: Code tasks COMPLETE. Manual tasks pending.**

### Security

| # | Task | Status |
|---|------|--------|
| 6.S.1 | Nonce-based CSP — remove `unsafe-inline` from `script-src` | DONE — per-request nonce in `middleware.ts` |
| 6.S.2 | Tighten CSP `img-src` and `connect-src` | DONE — explicit domain allowlists in `middleware.ts` |
| 6.S.3 | Add dependency vulnerability scan to CI | DONE — `bun audit --audit-level=high` in `ci.yml` |
| 6.S.4 | Add secrets scanning to CI | DONE — Gitleaks job in `ci.yml` |
| 6.S.5 | Enable Supabase email confirmation | TODO (manual) |
| 6.S.6 | Comment notification smoke test | TODO (manual) |

### Database Optimization

| # | Task | Status |
|---|------|--------|
| 6.D.1 | Audit foreign key indexes | DONE — 7 missing indexes added, migration `0010_phase6_indexes.sql` |
| 6.D.2 | Composite `(status, published_at)` index on `posts` | DONE — in migration `0010` |
| 6.D.3 | Index on `posts.scheduled_publish_time` | DONE — in migration `0010` |

### CI / DevOps

| # | Task | Status |
|---|------|--------|
| 6.CI.1 | Lighthouse CI on Vercel deployment | DONE — `.github/workflows/lighthouse.yml`. Requires `LHCI_GITHUB_APP_TOKEN` + `VERCEL_AUTOMATION_BYPASS_SECRET` secrets. |
| 6.CI.2 | Semgrep SAST scan | DONE — `sast` job in `ci.yml`. Optional: add `SEMGREP_APP_TOKEN` secret for dashboard. |

### Observability

| # | Task | Status |
|---|------|--------|
| 6.O.1 | External uptime monitoring | TODO (manual) |
| 6.O.2 | Sentry performance monitoring on key routes | DONE — route-aware `tracesSampler` in `sentry.server.config.ts` |
| 6.O.3 | Newsletter real-provider verification | TODO (manual) |

### Accessibility

| # | Task | Status |
|---|------|--------|
| 6.A.1 | axe-core WCAG 2.1 AA checks in Playwright E2E | DONE — 3 checks in `smoke.spec.ts` |
| 6.A.2 | Manual screen reader QA | TODO (manual) |

---

## Quality Standards

### TypeScript & Architecture
- Zero `any`, zero unjustified `as`, zero `!` non-null assertions
- All DB access through server-only DAL files — no inline SQL in components or actions
- Drizzle query builder preferred; raw SQL only when Drizzle can't express the query
- Cursor-based pagination everywhere — no offset-based pagination
- Every mutation validates input with Zod before touching the database

### Frontend
- Core Web Vitals targets: LCP < 2.5s, CLS < 0.1, INP < 200ms
- Lighthouse targets: Performance > 90, Accessibility > 95
- Server Components by default; `"use client"` only when hooks/interactivity are needed
- `next/image` for all editorial images — no raw `<img>` tags

### Security
- Auth checked before DB in every server action and API route
- Supabase Auth for public users, Auth.js + GitHub for admin — never mixed
- Zod validation at every trust boundary (API inputs, form data, URL params)
- HTTP security headers: CSP with nonces, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Rate limiting with Upstash Redis (prod) / in-memory fallback (dev)

### Theme System
- All colors via CSS custom properties — no hardcoded Tailwind colors
- 4 theme combinations must all work: light/sage, light/lichen, dark/sage, dark/lichen
- Touch targets minimum 44px on mobile
- Loading states: skeleton placeholders matching real content dimensions

### Quality Gate Commands

```bash
cd web
bun run lint          # ESLint — zero warnings
bunx tsc --noEmit     # TypeScript — zero errors
bun run build         # Next.js build — must pass
bun run test          # Vitest — 170 tests passing
```
