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

### Gemini's Current Work — Awaiting Review

Gemini 3 Flash is in progress on PLAN 3.1, 3.2, and 3.6. **All output from this pass needs to be checked for validity and code quality before being treated as done.**

| Task | What Gemini Is Doing | Review Status |
|------|---------------------|---------------|
| PLAN 3.1 | Core Web Vitals audit + fixes | **Awaiting review** |
| PLAN 3.2 | WCAG AA accessibility audit + fixes | **Awaiting review** |
| PLAN 3.6 | Search UX improvements | **Awaiting review** |

### Verification Tasks (Manual / Operational)

These are "done in code" but need manual steps to be truly complete:

| Task | What's Needed | Blocks |
|------|---------------|--------|
| Apply migration 0007 | Run `bun run db:migrate` on production DB | View counter won't work until applied |
| RSS feed smoke test | Visit `/feed.xml`, `/category/*/feed.xml`, `/tag/*/feed.xml` in browser | Closing PLAN 4.3 |
| View counter verification | Check that views increment once per session in dev | Closing PLAN 4.7 |
| JSON-LD validation | Run a deployed post URL through Google Rich Results Test | Closing PLAN 4.4 |
| Authenticated E2E suite | Run `bun run seed:e2e` + `bun run e2e:capture-admin-state` + `bun run test:e2e` | Full E2E coverage |
| Supabase email confirmation | Enable "require email confirmation" in Supabase dashboard | Known security issue |
| Decommission CF Worker | Delete legacy worker in Cloudflare dashboard | Cleanup |

### Not Yet Started (Future Work)

| Task | Owner | Notes |
|------|-------|-------|
| PLAN 4.2 — Email notification on new comment | Sonnet | Needs Resend integration; depends on custom SMTP (1.8) |
| PLAN 4.6 — Newsletter signup | Sonnet + Gemini | Needs Resend + form; lower priority |
| PLAN 1.8 — Custom SMTP for Supabase | Manual | Not blocking; shared email works fine |
| PLAN V.9 — Remaining `as` assertion cleanup | GPT-5.4 | Older files outside latest cleanup pass |

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
- [x] Vitest unit test suite (85 tests passing)
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
