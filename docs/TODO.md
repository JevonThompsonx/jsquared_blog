# J²Adventures Blog — Status

> **Last Updated**: March 21, 2026 | **Stack**: Next.js 16.2 · Turso · Supabase Auth · Cloudinary · Vercel

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

## Remaining Manual Tasks

### High Priority

- **Apply migration `0010_phase6_indexes.sql`** — run `bun run db:migrate` from `web/`
- **Enable Supabase email confirmation** — Supabase dashboard → Authentication → Settings → "Enable email confirmations"
- **Set up external uptime monitoring** — Betterstack, UptimeRobot, or Vercel Monitoring on `jsquaredadventures.com`

### Medium Priority

- **Comment notification smoke test** — set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `COMMENT_NOTIFICATION_TO_EMAIL` in Vercel → post a real comment
- **Newsletter provider verification** — set `RESEND_API_KEY` + `RESEND_NEWSLETTER_SEGMENT_ID` → test `POST /api/newsletter`
- **Manual screen reader QA** — test with VoiceOver/NVDA on: homepage, post detail + ToC, comment form, account settings, mobile nav

### Low Priority

- **Custom SMTP for Supabase (Resend)** — not blocking; shared email works

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
- [x] Vitest unit test suite (170 tests passing)
- [x] Playwright E2E smoke suite (public + authenticated admin, 19/19 passing)
- [x] CI pipeline (GitHub Actions: lint, type-check, test, build, SAST, dependency audit)
- [x] Lighthouse CI on Vercel deployments
- [x] Rate limiting via Upstash Redis with in-memory fallback
- [x] Sentry error monitoring
- [x] Plausible analytics
- [x] HTTP security headers (CSP with nonces, HSTS, X-Frame-Options, etc.)
- [x] Cloudinary WebP delivery (`f_auto,q_auto`)
- [x] PWA: web app manifest, SVG icon, service worker (offline-first HTML + stale-while-revalidate static assets)

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
- [x] Post bookmarks + `/bookmarks` page
- [x] Author profiles (`/author/[id]`)
- [x] RSS feeds (global, per-category, per-tag)
- [x] Reading time estimate
- [x] Mobile nav drawer (Radix dialog-based)
- [x] Sitemap XML, Open Graph, Twitter Cards, canonical URLs
- [x] Newsletter signup form

</details>

<details>
<summary><strong>Gallery & Media</strong> (click to expand)</summary>

- [x] Featured image + gallery with focal points and alt text
- [x] Full-screen lightbox with filmstrip thumbnails, SVG nav, fade animation
- [x] Keyboard navigation (arrow keys + Esc) and mobile swipe gestures
- [x] Inline images in gallery lightbox
- [x] EXIF metadata display in lightbox (camera, aperture, shutter, ISO, date, GPS link)

</details>

<details>
<summary><strong>Admin Experience</strong> (click to expand)</summary>

- [x] GitHub OAuth admin login
- [x] Admin dashboard with post list, search, filters
- [x] Create/edit post — Tiptap editor, status, scheduling, category, tags, images, series, location
- [x] Cloudinary image upload (captures EXIF metadata)
- [x] Bulk publish/unpublish
- [x] Post preview at unlisted URL
- [x] Clone post
- [x] Alt text validation warnings in editor
- [x] Series management with conflict warnings
- [x] Tag management page with inline description editing
- [x] Location field with Nominatim autocomplete
- [x] iOverlander URL field
- [x] Inline image insertion in Tiptap editor
- [x] Tiptap JSON storage (legacy HTML read-compatible)
- [x] Comment moderation (flag, hide, unhide, delete, summary stats)
- [x] Post revision history (schema, DAL, API routes, diff viewer UI)

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
media_assets       id, owner_user_id (FK), provider, public_id, secure_url, format, alt_text,
                   exif_taken_at, exif_lat, exif_lng, exif_camera_make, exif_camera_model,
                   exif_lens_model, exif_aperture, exif_shutter_speed, exif_iso
categories         id, name, slug, description
tags               id, name, slug, description
post_tags          post_id (FK), tag_id (FK) [PK composite]
comments           id, post_id (FK), author_id (FK), content, parent_id, created_at, updated_at
comment_likes      comment_id (FK), user_id (FK) [PK composite]
post_bookmarks     post_id (FK), user_id (FK), created_at [PK composite]
post_revisions     id, post_id (FK), revision_num, title, content_json, excerpt,
                   saved_by_user_id (FK), saved_at, label
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
| `0007_post_view_count.sql` | `view_count` column on `posts` |
| `0008_post_revisions.sql` | `post_revisions` table |
| `0009_media_asset_exif.sql` | 9 EXIF columns on `media_assets` |
| `0010_phase6_indexes.sql` | FK indexes, composite feed index, scheduled-publish index — **pending prod apply** |

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
```

## Deployment

Push to GitHub → Vercel auto-deploys. Root directory: `web/`. See `docs/DEPLOYMENT.md`.
