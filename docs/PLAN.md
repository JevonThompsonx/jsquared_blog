# J²Adventures — Comprehensive Project Plan

Last updated: 2026-03-19

## Model Allocation

| Responsibility | Model | Tool |
|---|---|---|
| Planning / Architecture / Tests / AGENTS.md | Claude Opus 4.6 | Claude Code |
| TS Backend (API routes, DAL, server actions, DB) | Claude Sonnet 4.6 | Claude Code |
| UI Components / Styling | Gemini 3 Flash | Windsurf Cascade |
| Complex Frontend Logic | Gemini 3 Flash | Windsurf Cascade |
| Review / Tests / Automation | GPT-5.4 | OpenCode / Copilot |

## Current State

**Feature-complete travel blog** at jsquaredadventures.com. The production app lives in `web/`, deploys on Vercel, and the retired `client/` / `server/` / `shared/` stack has been removed.

Everything below is additive — the app is live and stable.

### Active Work Right Now

- **Gemini 3 Flash** is working on frontend accessibility/CWV audits and browser QA (PLAN 3.1, 3.2, 3.6). **Status: awaiting review for validity and code quality.**
- No other models are actively editing code.

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

**Status: MOSTLY COMPLETE** (11/14 done; 3 in progress/awaiting review with Gemini)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 3.1 | Core Web Vitals audit + fix (LCP, CLS, INP) | Opus (audit) / Gemini (fix) | IN PROGRESS — Gemini working, **awaiting review** |
| 3.2 | WCAG AA accessibility audit + fix | Opus (audit) / Gemini (fix) | IN PROGRESS — Gemini working, **awaiting review** |
| 3.3 | Image lazy loading + blur placeholders | Gemini | DONE |
| 3.4 | Skeleton loading states for all async content | Gemini | DONE |
| 3.5 | Mobile nav UX improvements | Gemini | DONE |
| 3.6 | Search improvements (debounce, highlight, empty state) | Gemini | IN PROGRESS — Gemini working, **awaiting review** |
| 3.7 | Reduced motion support | Gemini | DONE |
| 3.8 | Print stylesheet | Gemini | DONE |
| 3.9 | Social share buttons (Web Share API) | Gemini | DONE |
| 3.10 | Related posts algorithm improvement | Sonnet | DONE |
| 3.11 | Admin dropdown dark mode fix (custom themed select) | Gemini | DONE |
| 3.12 | Season-year date display | Sonnet + Gemini | DONE |
| 3.13 | Post page scroll/focus priority | Gemini | DONE |
| 3.14 | Season-year grouped feed | Sonnet + Gemini | DONE |

**Exit criteria**: Lighthouse Performance > 90, Accessibility > 95 on key pages. No WCAG AA violations. **Pending: requires real Lighthouse audit results from Gemini's current pass.**

---

## Phase 4: Community & Growth

**Goal**: Improve engagement, discoverability, and reader retention.

**Status: MOSTLY COMPLETE** (6/8 done; 2 not started)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 4.1 | Comment moderation tools (admin flag/hide/delete) | Sonnet + Gemini | DONE |
| 4.2 | Email notification on new comment (Resend) | Sonnet | TODO |
| 4.3 | RSS per category/tag | Sonnet | DONE — code shipped, manual smoke pending |
| 4.4 | Structured data (JSON-LD for BlogPosting) | Gemini | DONE (code) — deployed Rich Results validation pending |
| 4.5 | Reading time estimate | Sonnet | DONE |
| 4.6 | Newsletter signup (Resend + simple form) | Sonnet + Gemini | TODO |
| 4.7 | Post view counter (privacy-respecting) | Sonnet | DONE (code) — migration 0007 pending on prod DB |
| 4.8 | Admin desktop layout expansion | Gemini | DONE |

**Exit criteria**: Admin has moderation tools. Structured data validates in Google Rich Results test. **Partially met — Rich Results validation still needs deployed URL check.**

---

## Phase 4.5: Verification & Deployment Readiness

**Goal**: Close the gap between "code is written" and "verified working in production." Nothing here is new code — it's manual verification, migration application, and operational cleanup.

**Primary owner**: Jevon (manual) + Opus (verification planning)

| # | Task | Owner | Status |
|---|------|-------|--------|
| V.1 | Apply migration `0007_post_view_count.sql` via `bun run db:migrate` | Manual | TODO |
| V.2 | Smoke test RSS feeds in browser (`/feed.xml`, `/category/*/feed.xml`, `/tag/*/feed.xml`) | Manual | TODO |
| V.3 | Verify post view counter increments once per session in dev | Manual | TODO |
| V.4 | Validate JSON-LD on a deployed post URL via Google Rich Results Test | Manual | TODO |
| V.5 | Run authenticated E2E suite (`bun run seed:e2e` + `bun run e2e:capture-admin-state` + `bun run test:e2e`) | Manual | TODO |
| V.6 | Review Gemini's 3.1/3.2/3.6 work for correctness and code quality | Opus | TODO |
| V.7 | Decommission legacy Cloudflare Worker from dashboard | Manual | TODO |
| V.8 | Optionally configure custom SMTP (Resend) for Supabase | Manual | TODO — not blocking |
| V.9 | Remaining `as` assertion cleanup across untouched files | GPT-5.4 | TODO |
| V.10 | Enable Supabase email confirmation requirement | Manual | TODO — see known issue in cutover checklist |

**Exit criteria**: All verification tasks green. Production database has migration 0007. JSON-LD validates. E2E suite passes with admin auth. No critical `as` assertions remain.

---

## Phase 5: Stretch Goals

Lower priority. Only pursue after Phases 1–4.5 are solid.

| # | Task | Notes |
|---|------|-------|
| 5.1 | PWA (offline reading of saved posts) | Service worker + cache strategy |
| 5.2 | i18n (multilingual support) | next-intl or similar |
| 5.3 | Webmentions / IndieWeb | Backfeed from other blogs |
| 5.4 | Post revision history | Diff viewer in admin |
| 5.5 | AI-assisted writing (summarize, SEO suggestions) | Claude API integration |
| 5.6 | Photo EXIF metadata display | Extract on upload, display in lightbox |

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
bun run test          # Vitest — 85+ tests passing
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
