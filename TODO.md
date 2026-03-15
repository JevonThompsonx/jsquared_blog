# J²Adventures Blog — Project Tracker

> **Last Updated**: March 14, 2026 | **Stack**: Next.js 15 · Turso · Supabase Auth · Cloudinary · Vercel

---

## Quick Reference

| Component | Technology | Status |
|-----------|------------|--------|
| Frontend/Backend | Next.js 15 (App Router) | Live on Vercel |
| Database | Turso (SQLite / Drizzle ORM) | Configured |
| Public Auth | Supabase Auth | Working |
| Admin Auth | Auth.js + GitHub OAuth | Working |
| Image Storage | Cloudinary | Working |
| Deployment | Vercel | Live |

---

## Completed Features

### Core Infrastructure
- [x] Next.js 15 App Router with Turbopack
- [x] Turso/libSQL + Drizzle ORM (sole DB)
- [x] Two-auth-system architecture (Supabase public + Auth.js admin)
- [x] TypeScript strict mode — no any/as/!
- [x] Zod validation at all API trust boundaries
- [x] server-only imports in all DAL files

### Reading Experience
- [x] Homepage/feed with infinite scroll
- [x] Post detail pages with full content rendering
- [x] Bullet/numbered list styles in post content
- [x] Category pages (`/category/:slug`) with infinite scroll
- [x] Tag pages (`/tag/:slug`) with infinite scroll
- [x] Clickable category and tag chips on cards and post detail
- [x] Post card overlay link pattern (no nested `<a>`)
- [x] Slug normalization (spaces → hyphens)
- [x] Sitemap XML (`/sitemap.xml`)
- [x] RSS feed (`/feed.xml`)
- [x] Search (URL query param, server-side)
- [x] `/settings` → `/account` redirect

### Admin Experience
- [x] GitHub OAuth admin login
- [x] Admin dashboard with post list
- [x] Create post (Tiptap editor, status, scheduling, category, tags, images)
- [x] Edit post
- [x] Cloudinary image upload (editorial images)
- [x] Featured image + gallery with focal points and alt text
- [x] "Edit post" button on post detail when admin is signed in
- [x] Admin username in navbar links to `/admin`
- [x] "Sign in" link hidden when admin is signed in

### Public User Experience
- [x] Supabase signup with duplicate-email detection
- [x] Supabase login with `redirectTo` support
- [x] Email callback handler (`/callback`)
- [x] Account settings page (`/account`): display name, avatar, theme, email, password, sign out
- [x] Avatar: preset icons (`j2:*`), file upload (Cloudinary), URL input, initials fallback
- [x] Theme preference saved to DB + auto-applied on any page when signed in (`UserThemeSync`)

### Theme System
- [x] Light/dark mode toggle
- [x] Two looks: Moss & Linen (`sage`), Lichen Light (`lichen`)
- [x] localStorage primary + cookie fallback (cross-session)
- [x] DB preference auto-synced on login (no need to visit /account)
- [x] Post-mount hydration guard (no flash)

### Comments
- [x] List comments with sort (likes / newest / oldest)
- [x] Post a comment (authenticated Supabase users)
- [x] Like / unlike comments
- [x] Delete own comment
- [x] Nested replies (one level deep)
- [x] Reply to any comment from own or other accounts

### Draft & Scheduling
- [x] Draft / published / scheduled post status
- [x] Scheduled publish time with datetime picker
- [x] Auto-publish via Turso query on request-time

### SEO
- [x] robots.txt + dynamic sitemap.xml
- [x] Open Graph + Twitter Card meta tags
- [x] RSS feed
- [x] Canonical URLs
- [x] Proper heading hierarchy (h1 → h2 → h3)

---

## In Progress / Next Up

### High Priority

| Feature | Notes |
|---------|-------|
| Legacy deletion | ✅ Done — `client/`, `server/`, `shared/` deleted. Decommission Cloudflare Worker in dashboard when ready. |
| Custom SMTP for Supabase | Optional — shared email is working. Configure a provider (Resend etc.) for reliability at scale. |

### Medium Priority

| Feature | Notes |
|---------|-------|
| Public author profiles | `/author/:username` — show user's published comments/activity |
| About page | Tell the J² story |
| Post bookmarks/favorites | Let readers save posts |

### Lower Priority

| Feature | Notes |
|---------|-------|
| Map view | Add location field to posts, render on a map |
| Post series/collections | Group related posts |
| Newsletter integration | Mailchimp / ConvertKit |
| Post analytics | View counts, popular posts |
| Table of contents | For long posts |
| Full-screen gallery | Full-screen image gallery mode |
| Date formatting options | Relative vs absolute toggle |

---

## Quick Wins (< 1 hour each)

- [x] "Continue reading" indicator for truncated post excerpts (conditional → with arrow)
- [x] Keyboard navigation for image gallery (arrow keys + Esc)
- [x] Swipe gestures for image gallery on mobile (lightbox swipe + scroll lock fix)
- [x] Pull-to-refresh on homepage (mobile)

---

## Architecture Notes

### Database Schema (Turso/Drizzle)

```
users              id, primary_email, role, created_at, updated_at
profiles           user_id (FK), display_name, avatar_url, bio, theme_preference
auth_accounts      id, user_id (FK), provider, provider_user_id, provider_email
posts              id, title, slug, content_json, excerpt, status, layout_type,
                   published_at, scheduled_publish_time, author_id (FK),
                   category_id (FK), featured_image_id (FK)
post_images        id, post_id (FK), media_asset_id (FK), sort_order, focal_x, focal_y, caption
media_assets       id, owner_user_id (FK), provider, public_id, secure_url, format, alt_text
categories         id, name, slug, description
tags               id, name, slug
post_tags          post_id (FK), tag_id (FK) [PK composite]
comments           id, post_id (FK), author_id (FK), content, parent_id, created_at, updated_at
comment_likes      comment_id (FK), user_id (FK) [PK composite]
```

### Key Directories

```
web/src/app/           Next.js app router pages and API routes
web/src/components/    React components (blog/, layout/, theme/, providers/, ui/)
web/src/server/        Server-only DAL + queries + forms + auth
web/src/lib/           Shared utilities (db, auth, cloudinary, supabase, env)
web/src/drizzle/       Drizzle schema and migrations
web/drizzle/           Migration SQL files
```

---

## Development Commands

```bash
cd web
bun run dev            # Start dev server at localhost:3000
bun run build          # Production build
bun run lint           # ESLint
bun run db:generate    # Generate Drizzle migrations
bun run db:migrate     # Apply migrations to Turso
```

## Deployment

Push to GitHub → Vercel auto-deploys. Root directory: `web/`. See `docs/deployment.md`.
