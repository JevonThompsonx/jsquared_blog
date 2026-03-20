# J²Adventures Blog — Project Tracker

> **Last Updated**: March 19, 2026 | **Stack**: Next.js 16 · Turso · Supabase Auth · Cloudinary · Vercel

---

## Quick Reference

| Component | Technology | Status |
|-----------|------------|--------|
| Frontend/Backend | Next.js 16 (App Router) | Live on Vercel |
| Database | Turso (SQLite / Drizzle ORM) | Configured |
| Public Auth | Supabase Auth | Working |
| Admin Auth | Auth.js + GitHub OAuth | Working |
| Image Storage | Cloudinary | Working |
| Map Tiles | Stadia Maps (Outdoors) + MapLibre GL | Working |
| Geocoding | Nominatim (OSM, server-side on save) | Working |
| Deployment | Vercel | Live |

---

## What Needs Attention Now

### Gemini's Completed Work

Gemini 3.1 Pro completed its last session with the following outcomes:

- **DONE**: `web/src/components/blog/home-post-card.tsx` — replaced `placehold.co` SVG fallback with a `.png` fallback, resolving the `dangerouslyAllowSVG` Next.js dev warning.
- **DONE**: Quality gates — `bun run lint`, `bunx tsc --noEmit`, `bun run build`, `bun run test` (107 tests), `bun run test:e2e` (12 passed, 7 skipped) all pass.
- **DEFERRED** (next week): PLAN 3.1 (CWV), 3.2 (WCAG), 3.6 (Search interactive QA) — blocked by lack of an interactive browser / Lighthouse environment. Code improvements from prior passes are shipped; measurement-backed evidence is not yet available.

### Next Gemini Task (Assigned)

Gemini's next session is the **PLAN 4.6 newsletter signup form UI**. The backend is complete and production-ready. See `docs/frontendPrompt.md` for the full brief.

| Task | Owner | Scope for next pass |
|------|-------|---------------------|
| PLAN 4.6 — Newsletter signup form | Gemini / Frontend | Implement a lightweight newsletter signup form component using the existing `POST /api/newsletter` backend contract. Keep it visually consistent with the current design system. |

### Verification Tasks (Manual / Operational)

These are "done in code" but need manual steps to be truly complete:

| Task | What's Needed | Blocks |
|------|---------------|--------|
| Apply migration 0007 | Run `bun run db:migrate` on production DB | View counter won't work until applied |
| RSS feed smoke test | Visit `/feed.xml`, `/category/*/feed.xml`, `/tag/*/feed.xml` in browser | Closing PLAN 4.3 |
| View counter verification | Check that views increment once per session in dev | Closing PLAN 4.7 |
| JSON-LD validation | Run a deployed post URL through Google Rich Results Test | Closing PLAN 4.4 |
| Comment notification smoke test | Set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `COMMENT_NOTIFICATION_TO_EMAIL`, then post a real dev comment/reply | Closing PLAN 4.2 |
| Authenticated E2E suite | Run `bun run seed:e2e` + `bun run e2e:capture-admin-state` + `bun run test:e2e` | Full E2E coverage |
| Supabase email confirmation | Enable "require email confirmation" in Supabase dashboard | Known security issue |
| Decommission CF Worker | Delete legacy worker in Cloudflare dashboard | Cleanup |

### Not Yet Started (Future Work)

| Task | Owner | Notes |
|------|-------|-------|
| PLAN 3.1 / 3.2 / 3.6 — Live QA pass | Gemini | Deferred to next week; requires interactive browser + Lighthouse environment |
| PLAN 1.8 — Custom SMTP for Supabase | Manual | Not blocking; shared email works fine |

Latest session notes (2026-03-19):

- Gemini 3.1 Pro completed `home-post-card.tsx` SVG fallback fix (was `placehold.co/*.svg`, now `placehold.co/*.png`).
- All quality gates pass: 107 unit tests, 12 E2E passed (7 skipped), lint, tsc, build all clean.
- PLAN 3.1 / 3.2 / 3.6 deferred to next week — code improvements from prior sessions are in place; Lighthouse/CWV measurement and full interactive browser QA matrix require a live environment that is not available in the current tooling context.
- PLAN V.9 (`as`/`any` cleanup) is complete: no unjustified type assertions remain in backend/shared code. Only legitimate `as const` for GeoJSON discrimination in `world-map.tsx` remains.
- PLAN 4.6 backend is fully shipped. Gemini's next task is the frontend newsletter signup form component.
- The next frontend brief is in `docs/frontendPrompt.md`. The next backend brief is in `docs/backendPrompt.md`.

---

## Completed Features

<details>
<summary><strong>Core Infrastructure</strong> (click to expand)</summary>

- [x] Next.js 16 App Router with Turbopack
- [x] Turso/libSQL + Drizzle ORM (sole DB)
- [x] Two-auth-system architecture (Supabase public + Auth.js admin)
- [x] TypeScript strict mode — lint, `tsc`, and build pass
- [x] Zod validation at all API trust boundaries
- [x] server-only imports in all DAL files
- [x] Required env var validation with Zod at startup
- [x] Vitest unit test suite (99 tests passing)
- [x] Playwright E2E smoke suite (public + env-gated admin)
- [x] CI pipeline (GitHub Actions: lint, type-check, test, build)
- [x] Rate limiting via Upstash Redis with in-memory fallback
- [x] Sentry error monitoring
- [x] Plausible analytics
- [x] HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
- [x] Cloudinary WebP delivery (`f_auto,q_auto`)

</details>

<details>
<summary><strong>Reading Experience</strong> (click to expand)</summary>

- [x] Homepage/feed with infinite scroll + season-year grouping
- [x] Post detail pages with full content rendering
- [x] Category pages (`/category/:slug`) with infinite scroll
- [x] Tag pages (`/tag/:slug`) with infinite scroll
- [x] Series/collections pages (`/series/[slug]`) with ordered part badges
- [x] Search (URL query param, server-side)
- [x] Table of contents (auto-generated from h2-h4, scroll-tracked, collapsible)
- [x] Date formatting toggle (absolute/relative, persisted to localStorage)
- [x] Reading progress bar (3px accent bar at top of viewport)
- [x] Copy link button with clipboard feedback
- [x] Smart related posts (scored by category, tags, date proximity)
- [x] Print-friendly styles (`@media print`)
- [x] Reduced-motion support (`prefers-reduced-motion`)
- [x] Lora serif heading font via `next/font/google`
- [x] `next/image` throughout
- [x] Skeleton loading + `loading.tsx`
- [x] Comment counts on post cards
- [x] Author bio card on post detail
- [x] Tag descriptions (shown on `/tag/[slug]`, editable via `/admin/tags`)
- [x] Category-specific SVG icons
- [x] Empty search state with action buttons
- [x] Button contrast via dedicated CSS vars
- [x] Post bookmarks + `/bookmarks` page
- [x] Author profiles (`/author/[id]`)
- [x] RSS feeds (global, per-category, per-tag)
- [x] Reading time estimate
- [x] Mobile nav drawer (Radix dialog-based)
- [x] Sitemap XML, Open Graph, Twitter Cards, canonical URLs

</details>

<details>
<summary><strong>Gallery & Media</strong> (click to expand)</summary>

- [x] Featured image + gallery with focal points and alt text
- [x] Full-screen lightbox with filmstrip thumbnails, SVG nav, fade animation
- [x] Keyboard navigation (arrow keys + Esc) and mobile swipe gestures
- [x] Inline images in gallery lightbox

</details>

<details>
<summary><strong>Admin Experience</strong> (click to expand)</summary>

- [x] GitHub OAuth admin login
- [x] Admin dashboard with post list, search, filters
- [x] Create/edit post — Tiptap editor, status, scheduling, category, tags, images, series, location
- [x] Cloudinary image upload
- [x] Bulk publish/unpublish
- [x] Post preview at unlisted URL
- [x] Clone post
- [x] Alt text validation warnings in editor
- [x] Theme-aware custom selects (Radix)
- [x] Widened admin layouts (browser QA'd)
- [x] Series management with conflict warnings
- [x] Tag management page with inline description editing
- [x] Location field with Nominatim autocomplete
- [x] iOverlander URL field
- [x] Inline image insertion in Tiptap editor
- [x] Tiptap JSON storage (legacy HTML read-compatible only)
- [x] Comment moderation (flag, hide, unhide, delete, summary stats)
- [x] Inline confirmation dialogs (no browser `confirm()`)

</details>

<details>
<summary><strong>Map View</strong> (click to expand)</summary>

- [x] MapLibre GL JS + Stadia Maps (Outdoors)
- [x] Post detail map below prose
- [x] World map (`/map`) with all located posts
- [x] Map clustering (nearby pins auto-group)
- [x] Map filter by category
- [x] Geocoding via Nominatim on admin save

</details>

<details>
<summary><strong>Public User Experience</strong> (click to expand)</summary>

- [x] Supabase signup with duplicate-email detection
- [x] Login with `redirectTo` support
- [x] Email callback handler
- [x] Account settings (display name, avatar, theme, email, password, sign out)
- [x] Avatar: preset icons, file upload, initials fallback
- [x] Theme preference synced to DB + auto-applied on login

</details>

<details>
<summary><strong>Comments</strong> (click to expand)</summary>

- [x] List comments with sort (likes / newest / oldest)
- [x] Post a comment (authenticated Supabase users)
- [x] Like / unlike comments
- [x] Delete own comment
- [x] Nested replies (one level deep)
- [x] Admin moderation (hide, unhide, delete, flag, unflag)
- [x] Non-blocking email notification on new comment/reply (Resend, env-gated)

</details>

<details>
<summary><strong>Theme System</strong> (click to expand)</summary>

- [x] Light/dark mode toggle
- [x] Two looks: Moss & Linen (`sage`), Lichen Light (`lichen`)
- [x] localStorage primary + cookie fallback
- [x] DB preference auto-synced on login
- [x] Post-mount hydration guard (no flash)

</details>

---

## Architecture Notes

### Database Schema (Turso/Drizzle)

```
users              id, primary_email, role, created_at, updated_at
profiles           user_id (FK), display_name, avatar_url, bio, theme_preference
auth_accounts      id, user_id (FK), provider, provider_user_id, provider_email
series             id, title, slug, description, created_at
posts              id, title, slug, content_json, excerpt, status, layout_type,
                   published_at, scheduled_publish_time, author_id (FK),
                   category_id (FK), series_id (FK), series_order,
                   featured_image_id (FK),
                   view_count,
                   location_name, location_lat, location_lng, location_zoom,
                   ioverlander_url
post_images        id, post_id (FK), media_asset_id (FK), sort_order, focal_x, focal_y, caption
media_assets       id, owner_user_id (FK), provider, public_id, secure_url, format, alt_text
categories         id, name, slug, description
tags               id, name, slug, description
post_tags          post_id (FK), tag_id (FK) [PK composite]
comments           id, post_id (FK), author_id (FK), content, parent_id, created_at, updated_at
comment_likes      comment_id (FK), user_id (FK) [PK composite]
post_bookmarks     post_id (FK), user_id (FK), created_at [PK composite]
```

### Applied Migrations

| File | Description |
|------|-------------|
| `0000_broken_mole_man.sql` | Initial schema |
| `0001_post_bookmarks.sql` | `post_bookmarks` table |
| `0002_series.sql` | `series` table + `series_id`/`series_order` on posts |
| `0003_location.sql` | `location_*` + `ioverlander_url` columns on posts |
| `0004_tag_description.sql` | `description` column on `tags` |
| `0005_post_content_and_preview_tokens.sql` | Canonical content fields + preview token support |
| `0006_comment_moderation.sql` | Comment moderation columns and indexes |
| `0007_post_view_count.sql` | `view_count` column on `posts` (**not yet applied to prod**) |

### Key Directories

```
web/src/app/           Next.js app router pages and API routes
web/src/components/    React components (blog/, layout/, theme/, providers/, admin/)
web/src/server/        Server-only DAL + queries + forms + auth
web/src/lib/           Shared utilities (db, auth, cloudinary, supabase, env)
web/src/drizzle/       Drizzle schema
web/drizzle/           Migration SQL files
web/scripts/           One-off scripts (migrate, import, admin auth capture, seed helpers)
```

---

## Development Commands

```bash
cd web
bun run dev                        # Start dev server at localhost:3000
bun run build                      # Production build
bun run lint                       # ESLint
bunx tsc --noEmit                  # TypeScript type-check
bun run test                       # Vitest unit tests
bun run test:e2e                   # Playwright smoke tests
bun run db:generate                # Generate Drizzle migrations after schema changes
bun run db:migrate                 # Apply migrations to Turso
bun run e2e:capture-admin-state    # Capture reusable admin Playwright session
bun run seed:e2e                   # Seed stable admin E2E post/comment fixtures
bun run ./scripts/seed-locations          # Seed location data onto existing posts (dev only)
bun run ./scripts/seed-series-categories  # Seed test series + categories (dev only, idempotent)
bun run ./scripts/seed-rich-content       # Seed richer editorial content for local QA
```

## Deployment

Push to GitHub -> Vercel auto-deploys. Root directory: `web/`. See `docs/deployment.md`.
