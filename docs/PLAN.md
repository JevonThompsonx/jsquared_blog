# J²Adventures — Comprehensive Project Plan

Last updated: 2026-03-16

## Model Allocation

| Responsibility | Model | Tool |
|---|---|---|
| Planning / Architecture / Tests / AGENTS.md | Claude Opus 4.6 | Claude Code |
| TS Backend (API routes, DAL, server actions, DB) | Claude Sonnet 4.6 | Claude Code |
| UI Components / Styling | Gemini 3 Pro Low | Windsurf Cascade |
| Complex Frontend Logic | Gemini 3 Pro Low | Windsurf Cascade |
| Hard Frontend Problems | Gemini 3 Pro High | Windsurf Cascade (rare) |
| Python / Data / Terminal scripts | GPT-5.3 Codex Med | Windsurf Cascade |
| Hard Backend Problems | GPT-5.3 Codex High | Windsurf Cascade (rare) |

## Current State (Session 9 Baseline)

**Feature-complete travel blog** at jsquaredadventures.com. 110 source files in `web/src/`. Deployed on Vercel. Legacy `client/`/`server/`/`shared/` directories deleted.

Everything below is additive — the app is live and stable.

---

## Phase 1: Infrastructure & Code Quality

**Goal**: Harden the foundation. Set up testing, observability, and performance baselines before adding features.

**Primary models**: Claude Opus 4.6 (architecture), Claude Sonnet 4.6 (backend implementation)

| # | Task | Owner | Files Touched | Status |
|---|------|-------|--------------|--------|
| 1.1 | Required env var validation with Zod at startup | Sonnet | `web/src/lib/env.ts` | DONE |
| 1.2 | Vitest setup + first unit tests (DAL layer) | Opus → Sonnet | `web/tests/unit/utils.test.ts`, `web/tests/unit/transform.test.ts`, `web/tests/unit/content.test.ts` | DONE |
| 1.3 | Playwright setup + smoke test suite | Opus → Sonnet | `web/playwright.config.ts`, `web/tests/e2e/smoke.spec.ts` | DONE |
| 1.4 | Cloudinary WebP delivery (`f_auto,q_auto`) | Sonnet | `web/src/lib/cloudinary/transform.ts`, `web/src/app/api/bookmarks/route.ts`, `web/src/app/(blog)/series/[slug]/page.tsx` | DONE |
| 1.5 | Upgrade rate limiting to Upstash Redis | Sonnet | `web/src/lib/rate-limit.ts` | DONE |
| 1.6 | Sentry error monitoring integration | Sonnet | `web/next.config.ts`, `web/src/lib/sentry.ts`, `web/src/app/global-error.tsx` | DONE |
| 1.7 | Plausible analytics integration | Gemini Low | `web/src/app/layout.tsx` | DONE |
| 1.8 | Custom SMTP for Supabase (Resend) | Sonnet | Supabase dashboard config, no code changes | TODO |
| 1.9 | CI pipeline (GitHub Actions: lint, type-check, test, build) | Opus | `.github/workflows/ci.yml` | DONE |
| 1.10 | Decommission Cloudflare Worker | Manual | Cloudflare dashboard | TODO |

**Exit criteria**: `bun run lint && bunx tsc --noEmit && bun run test && bun run build` passes in CI. Sentry captures errors. Plausible tracks page views.

---

## Phase 2: Admin Quality-of-Life

**Goal**: Make the admin publishing experience faster and more reliable.

**Primary models**: Claude Sonnet 4.6 (backend), Gemini 3 Pro Low (UI)

| # | Task | Owner | Files Touched | Status |
|---|------|-------|--------------|--------|
| 2.1 | Bulk publish/unpublish on admin dashboard | Sonnet (action) + Gemini (UI) | `web/src/app/admin/actions.ts`, `web/src/components/admin/admin-dashboard.tsx` | DONE |
| 2.2 | Post preview at unlisted URL (`/preview/[id]`) | Sonnet (route) + Gemini (page) | `web/src/app/(blog)/preview/[id]/page.tsx`, `web/src/server/posts/preview.ts` | DONE |
| 2.3 | Canonical Tiptap JSON storage (replace HTML payload) | Sonnet | `web/src/server/dal/admin-posts.ts`, `web/src/lib/content.ts` | DONE |
| 2.4 | Admin post list: search, filter by status/category | Gemini Low | `web/src/components/admin/admin-dashboard.tsx` | DONE |
| 2.5 | Scheduled post auto-publish cron (Vercel Cron) | Sonnet | `web/src/app/api/cron/publish-scheduled/route.ts`, `web/vercel.json` | DONE |
| 2.6 | Post duplication ("Clone post" button) | Sonnet (action) + Gemini (UI) | `web/src/app/admin/actions.ts`, `web/src/components/admin/post-editor-form.tsx` | DONE |
| 2.7 | Image alt text validation warning in editor | Gemini Low | `web/src/components/admin/post-rich-text-editor.tsx` | DONE |

**Exit criteria**: Admin can bulk-manage posts, preview drafts, and scheduled posts auto-publish.

---

## Phase 3: UX & Performance Polish

**Goal**: Achieve excellent Core Web Vitals, accessibility, and mobile experience.

**Primary models**: Gemini 3 Pro Low/High (frontend), Claude Opus 4.6 (audit/plan)

| # | Task | Owner | Files Touched | Status |
|---|------|-------|--------------|--------|
| 3.1 | Core Web Vitals audit + fix (LCP, CLS, INP) | Opus (audit) → Gemini (fix) | Various components | TODO |
| 3.2 | WCAG AA accessibility audit + fix | Opus (audit) → Gemini (fix) | Various components | TODO |
| 3.3 | Image lazy loading + blur placeholders | Gemini Low | `web/src/components/blog/home-post-card.tsx`, `web/src/components/blog/post-gallery.tsx` | TODO |
| 3.4 | Skeleton loading states for all async content | Gemini Low | `web/src/app/**/loading.tsx` | DONE |
| 3.5 | Mobile nav UX improvements | Gemini Low | `web/src/components/layout/site-header.tsx` | TODO |
| 3.6 | Search improvements (debounce, highlight, empty state) | Gemini Low | `web/src/app/(blog)/search/` | TODO |
| 3.7 | Reduced motion support (`prefers-reduced-motion`) | Gemini Low | `web/src/app/globals.css` | DONE |
| 3.8 | Print stylesheet | Gemini Low | `web/src/app/globals.css` | DONE |
| 3.9 | Social share buttons (native Web Share API + fallbacks) | Gemini Low | `web/src/components/blog/share-buttons.tsx` | DONE |
| 3.10 | Related posts algorithm improvement | Sonnet | `web/src/server/queries/posts.ts` | TODO |
| 3.11 | Admin dropdown dark mode fix — replace native `<select>` with styled custom dropdown | Gemini Low | `web/src/components/ui/theme-select.tsx` (new), `web/src/components/admin/admin-dashboard.tsx` | TODO |
| 3.12 | Season-year date display — show "Spring 2026" instead of "December 15, 2024" | Sonnet (utility) → Gemini (component) | `web/src/lib/utils.ts`, `web/src/components/blog/post-date.tsx`, `web/tests/unit/utils.test.ts` | TODO |
| 3.13 | Post page scroll/focus — prioritize featured image > ToC > post top, prevent map focus-grab | Gemini Low | `web/src/components/blog/post-map.tsx`, `web/src/app/(blog)/posts/[slug]/page.tsx`, `web/src/components/blog/scroll-to-content.tsx` (new) | TODO |
| 3.14 | Season-year grouped feed — group posts under "Spring 2026" headers in home/filtered feeds | Sonnet (grouping util) → Gemini (UI) | `web/src/lib/utils.ts`, `web/src/components/blog/home-feed.tsx`, `web/src/components/blog/filtered-feed.tsx`, `web/tests/unit/utils.test.ts` | TODO |

**Exit criteria**: Lighthouse Performance > 90, Accessibility > 95 on key pages. No WCAG AA violations.

---

## Phase 4: Community & Growth

**Goal**: Improve engagement, discoverability, and reader retention.

**Primary models**: Claude Sonnet 4.6 (backend), Gemini 3 Pro Low (frontend)

| # | Task | Owner | Files Touched | Status |
|---|------|-------|--------------|--------|
| 4.1 | Comment moderation tools (admin flag/hide/delete) | Sonnet + Gemini | `web/src/app/admin/`, `web/src/server/dal/comments.ts` | TODO |
| 4.2 | Email notification on new comment (Resend) | Sonnet | `web/src/lib/email/`, `web/src/app/api/posts/[postId]/comments/route.ts` | TODO |
| 4.3 | RSS per category/tag | Sonnet | `web/src/app/feed.xml/route.ts` | TODO |
| 4.4 | Structured data (JSON-LD for BlogPosting) | Gemini Low | `web/src/app/(blog)/posts/[slug]/page.tsx` | TODO |
| 4.5 | Reading time estimate | Sonnet | `web/src/lib/content.ts`, `web/src/components/blog/` | TODO |
| 4.6 | Newsletter signup (Resend + simple form) | Sonnet + Gemini | `web/src/components/blog/newsletter-signup.tsx`, `web/src/app/api/newsletter/` | TODO |
| 4.7 | Post view counter (privacy-respecting) | Sonnet | `web/src/server/dal/posts.ts`, schema migration | TODO |

**Exit criteria**: Admin has moderation tools. Readers can subscribe to updates. Structured data validates in Google Rich Results test.

---

## Phase 5: Stretch Goals

Lower priority. Only pursue after Phases 1–4 are solid.

| # | Task | Notes |
|---|------|-------|
| 5.1 | PWA (offline reading of saved posts) | Service worker + cache strategy |
| 5.2 | i18n (multilingual support) | next-intl or similar |
| 5.3 | Webmentions / IndieWeb | Backfeed from other blogs |
| 5.4 | Post revision history | Diff viewer in admin |
| 5.5 | AI-assisted writing (summarize, SEO suggestions) | Claude API integration |
| 5.6 | Photo EXIF metadata display | Extract on upload, display in lightbox |

---

## Cross-Cutting Concerns (All Phases)

### Testing Requirements
- Every new DAL function gets a Vitest unit test
- Every new API route gets integration tests
- Every user-facing flow gets a Playwright smoke test
- Tests run in CI before merge

### Code Quality Gates
- `bun run lint` — zero warnings
- `bunx tsc --noEmit` — zero errors
- No `any`, `as`, or `!` anywhere
- Zod validation at every trust boundary
- `server-only` import in every DAL/query file

### Security Checklist (Per Feature)
- Auth checked before DB in all server actions/API routes
- Rate limiting on all public write endpoints
- No unsanitized HTML rendering
- No secrets in client bundles
- Input validation with Zod on server side

### Multi-Model Coordination Rules
1. **One model writes, others review** — avoid two models editing the same file simultaneously
2. **Backend-first for new features** — Sonnet writes the API/DAL, then Gemini builds the UI on top
3. **Opus owns the plan** — only Opus updates this plan file, AGENTS.md, and CLAUDE.md
4. **Commit after each task** — small, focused commits so the next model has clean state
5. **Run build before handoff** — `bun run build` must pass before switching models
6. **Reference task IDs** — use `[1.3]` style references in commit messages and PR descriptions
