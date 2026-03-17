# J²Adventures Blog — Project Tracker

> **Last Updated**: March 17, 2026 | **Stack**: Next.js 15 · Turso · Supabase Auth · Cloudinary · Vercel

---

## Quick Reference

| Component | Technology | Status |
|-----------|------------|--------|
| Frontend/Backend | Next.js 15 (App Router) | Live on Vercel |
| Database | Turso (SQLite / Drizzle ORM) | Configured |
| Public Auth | Supabase Auth | Working |
| Admin Auth | Auth.js + GitHub OAuth | Working |
| Image Storage | Cloudinary | Working |
| Map Tiles | Stadia Maps (Outdoors) + MapLibre GL | Working |
| Geocoding | Nominatim (OSM, server-side on save) | Working |
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
- [x] Table of contents — auto-generated from h2–h4, scroll-tracked active section, collapsible
- [x] Date formatting toggle — click any date to switch absolute ↔ relative; preference persisted to localStorage; default absolute
- [x] Series/collections pages (`/series/[slug]`) — ordered post list with part badges
- [x] Print-friendly styles — `@media print` hides nav/buttons, resets backgrounds, shows URLs
- [x] Reduced-motion support — `prefers-reduced-motion` kills all transitions/animations
- [x] Lora serif heading font — applied to hero title and prose h2/h3/h4 via `next/font/google`
- [x] `next/image` throughout — all `<img>` tags replaced with `next/image` (WebP, CDN, srcset)
- [x] Skeleton loading + `loading.tsx` — pulse skeletons while feed route fetches data
- [x] Comment counts on post cards — shown in card footer when count > 0
- [x] Author bio card on post detail — avatar, display name, bio, link to author profile
- [x] Dark mode text fix — `.theme-root { color: var(--foreground) }` ensures inherited text reads dark-mode vars
- [x] Tag descriptions — `description` column on `tags` table (migration 0004); shown on `/tag/[slug]` header; used in metadata
- [x] Empty search state — action buttons ("Browse all stories", "Explore the map") on zero-result search; same pattern in `FilteredFeed` for category/tag pages
- [x] Button contrast (`--btn-bg` / `--btn-text`) — dedicated CSS vars for CTA buttons; deep forest + lime in light mode, lime + dark in dark mode; `.btn-primary` class in globals.css overrides cascade layer issues
- [x] Tag description admin UI — `/admin/tags` page lists all tags with post counts and inline description editor; "Manage tags" link on admin dashboard
- [x] Tag & category page redesign — rich hero header with icon badge, post count, description (tags); consistent layout across both `/tag/[slug]` and `/category/[cat]` pages
- [x] Category-specific SVG icons — each category slug (hiking, van-life, international, gear, camping, road-trips) maps to a distinct inline SVG icon on the category hero; icon badge scales + border highlights on hover
- [x] Category/tag kicker chip hover — `.post-card-kicker` and `.card-overlay-kicker` gain pill background + accent color on hover; negative-margin trick prevents layout shift

### Gallery & Media
- [x] Featured image + gallery with focal points and alt text
- [x] Full-screen lightbox with filmstrip thumbnails, SVG nav icons, fade animation, counter top bar
- [x] Keyboard navigation (arrow keys + Esc) and mobile swipe gestures

### Admin Experience
- [x] GitHub OAuth admin login
- [x] Admin dashboard with post list
- [x] Create/edit post — Tiptap editor, status, scheduling, category, tags, images, series, location
- [x] Cloudinary image upload (editorial images)
- [x] "Edit post" button on post detail when admin is signed in
- [x] Admin username in navbar links to `/admin`
- [x] Series management — `SeriesSelector` client component: `ComboboxInput` dropdown of existing series; fetches taken part numbers from `/api/admin/series/[seriesId]/part-numbers` on series change; auto-fills next available number; amber conflict warning + clickable shortcuts when chosen number is taken; `isFirstFetch` ref guard preserves existing post's part number on edit-page load
- [x] `ComboboxInput` — reusable client combobox: dropdown filters from static list, × clear button (onMouseDown + preventDefault to avoid blur race), `onValueChange` callback
- [x] `TagMultiSelect` — selected tags as primary-colored pills with × remove; text input with Enter/comma/Add button for new tags; unselected existing tags as outline pills (click to toggle); new-tag indicator; hidden `<input name="tagNames">` for form submission
- [x] Location field with Nominatim autocomplete — free-text ("Portland, OR", "California"); geocoded on save
- [x] iOverlander URL field — stored and rendered as a button on post detail + map popup
- [x] Inline image insertion in Tiptap editor — "Image" toolbar button; Cloudinary upload; alt text panel; inserted at cursor
- [x] Tiptap JSON storage — admin editor writes native `{type:"doc",...}` JSON; `renderTiptapJson()` handles both new format and legacy `{type:"legacy-html"}` payloads for backward-compatible reads; legacy wrapper entirely removed from write path
- [x] `web/scripts/seed-series-categories.ts` — idempotent seed script for 5 test series + 6 categories (uses `onConflictDoNothing`)

### Map View
- [x] MapLibre GL JS + Stadia Maps (Outdoors) — open source, no vendor lock-in
- [x] Post detail map — embedded below prose, above comments; shows location pin + name + iOverlander link
- [x] World map (`/map`) — all published posts with locations as clickable pins; popup shows thumbnail, title, category, date, link
- [x] Map starts centered on United States (zoom 3.5)
- [x] Geocoding via Nominatim on admin save — auto zoom based on result type (country/region/city/precise)
- [x] Map nav link in site header (desktop + mobile)
- [x] Graceful fallback when `NEXT_PUBLIC_STADIA_MAPS_API_KEY` is unset
- [x] Map clustering — nearby pins auto-group when zoomed out via MapLibre GeoJSON source (`cluster: true`); click cluster zooms in; three green shades scale with count
- [x] Map filter by category — category pill buttons above map; filters pins and the post list below; resets popup on switch

### Post Series
- [x] `series` table (id, title, slug, description, created_at)
- [x] `series_id`, `series_order` columns on posts
- [x] `SeriesNav` component on post detail — "Part X of Y", prev/next post links
- [x] `/series/[slug]` public page — ordered list with part badges and thumbnails
- [x] Admin editor series section — datalist of existing series, auto-creates new ones

### Public User Experience
- [x] Supabase signup with duplicate-email detection
- [x] Supabase login with `redirectTo` support
- [x] Email callback handler (`/callback`)
- [x] Account settings page (`/account`): display name, avatar, theme, email, password, sign out
- [x] Avatar: preset icons (`j2:*`), file upload (Cloudinary), URL input, initials fallback
- [x] Theme preference saved to DB + auto-applied on any page when signed in (`UserThemeSync`)
- [x] Post bookmarks — toggle, `/bookmarks` saved-posts page, "Saved" nav link when signed in
- [x] Author profiles (`/author/[id]`) — profile card, stats, comment activity feed

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
- [x] Backend comment moderation contract — admin hide / unhide / delete / flag / unflag routes and DAL, moderation metadata on comments, public placeholders for moderated comments

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

### Maintenance
| Task | Notes |
|------|-------|
| Custom SMTP for Supabase | Optional — shared email is working. Configure Resend or similar for reliability at scale. |
| Decommission Cloudflare Worker | Delete in dashboard when legacy stack is fully retired. |

### Reading Experience Enhancements
| Feature | Notes |
|---------|-------|
| ~~Reading progress bar~~ | ✅ Done — 3px `var(--primary)` bar fixed at top of viewport, passive scroll listener, aria-hidden |
| ~~Copy link button~~ | ✅ Done — chain icon + "Copy link" in post footer; 2s "Copied!" feedback; clipboard API with execCommand fallback |
| ~~Smart related posts~~ | ✅ Done — scores by category (+3), shared tags (+2 each), publish date proximity (+1); tie-broken by recency |
| ~~Inline images in gallery lightbox~~ | ✅ Done — inline `<img>` tags in post prose are extracted server-side, assigned gallery indices, and included in the lightbox filmstrip; clicking any prose image opens the lightbox at that slide |
| ~~Print-friendly styles~~ | ✅ Done — `@media print` hides nav/buttons, resets backgrounds to white, shows link URLs, sets prose to 11pt |
| ~~Reduced-motion support~~ | ✅ Done — `@media (prefers-reduced-motion: reduce)` collapses all transitions/animations to 0.01ms; disables lightbox fade |
| Add a seasonal post slot for the homepage - think whimsy |
|Remove Spring field notes from homepage|
|Remove Mud on the boots, green on the horizon. from homepage. Put J²Adventures there and remove J²Adventures travel journal from homepage |
|Remove Fresh trails, thawing camps, and the first stretch of the year when the map starts calling again from homepage|
### Discovery & Navigation
| Feature | Notes |
|---------|-------|
| ~~Tag descriptions~~ | ✅ Done — `description` column added (migration 0004); shown as subtitle on `/tag/[slug]`; editable via `/admin/tags` |
| ~~Map clustering~~ | ✅ Done — GeoJSON source `cluster: true`; circles scale with count; click to expand |
| ~~Map filter by category~~ | ✅ Done — category pill buttons filter map pins + post list below |
| ~~Comment count on post cards~~ | ✅ Done — speech-bubble icon + count shown in card footer when `commentCount > 0`; fetched in parallel via `listCommentCountsByPostIds` |
| ~~Empty search state~~ | ✅ Done — "Browse all stories" + "Explore the map" action buttons on zero-result search in `HomeFeed`; "Browse all stories" in `FilteredFeed` (category/tag pages) |

### Admin Quality of Life
| Feature | Notes |
|---------|-------|
| ~~Bulk publish / unpublish~~ | ✅ Done — dashboard selection toolbar supports bulk publish/unpublish with updated/unchanged/missing feedback and clears page-local selection when result sets change |
| ~~Post preview (draft)~~ | ✅ Done — drafts and scheduled posts open via expiring `/preview/[id]?token=...` links; published posts keep live links |
| ~~Clone post~~ | ✅ Done — dashboard and editor both clone into a new draft edit page with `?cloned=1` success messaging |
| ~~Alt text warnings in editor~~ | ✅ Done — backend-driven non-blocking warnings render in the rich text editor with thumbnails and reset when the warning set changes |
| ~~Admin dashboard pagination polish~~ | ✅ Done — page jump, page-size controls, and a custom themed select are now in place on the dashboard. |
| Admin page width expansion | In progress — dashboard rows/pagination, post editor sidebar, tags page, and moderation route now use wider shells and roomier desktop composition. Remaining work is browser QA plus consistency review on any future admin subpages. |
| Comment moderation UI | In progress — admin moderation route, optimistic updates, summary stats, themed thread cards, and an inline themed delete-confirmation pattern are live. Remaining work is browser QA and any small polish issues found there. |
| Blog post JSON-LD validation | In progress — structured data now renders from `web/src/app/(blog)/posts/[slug]/head.tsx`; still needs deployed Rich Results validation before this can be treated as complete. |

### Backend & Infrastructure
| Task | Notes |
|------|-------|
| ~~Rate limiting on public API routes~~ | ✅ Done — `src/lib/rate-limit.ts` sliding-window in-process limiter; 5/min comments, 30/min likes, 20/min bookmarks per IP; X-RateLimit-* headers on 429. Note: per-instance only — upgrade to Upstash Redis for distributed limiting at scale. |
| ~~Cloudinary WebP delivery~~ | ✅ Done — `cdnImageUrl()` in `src/lib/cloudinary/transform.ts` inserts `f_auto,q_auto` after `/upload/`; applied to all `imageUrl` fields in `queries/posts.ts` (feed, post detail, gallery images) |
| Required env var validation | All server env vars currently use `.optional()` — production-critical vars (`TURSO_DATABASE_URL`, `AUTH_SECRET`, etc.) should throw loudly when unset. |
| ~~DB indexes for posts table~~ | ✅ Done — indexes already exist in `web/src/drizzle/schema.ts` and in the initial migration `web/drizzle/0000_broken_mole_man.sql`; no new migration needed. |
| ~~`getRelatedPosts` performance~~ | ✅ Done — related posts now score against targeted category/tag/recent candidate sets instead of loading the full published corpus. |
| ~~Sentry error tracking~~ | ✅ Done — Sentry integration is present; verify production alert routing separately if needed. |
| ~~Tiptap JSON migration~~ | ✅ Done — admin editor now writes native Tiptap JSON; `renderTiptapJson()` backward-compat reads both formats; legacy write path removed entirely |
| ~~HTTP security headers~~ | ✅ Done — baseline CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy now ship from `web/next.config.ts`; validate CSP against production integrations if a runtime violation appears. |
| ~~Comment moderation backend~~ | ✅ Done — schema adds `visibility` / `is_flagged` / moderation metadata, admin routes expose moderation + admin comment reads, public reads preserve threads with placeholders, and replies are blocked on non-visible parents. |
| Integration + E2E tests | Baseline Vitest + Playwright smoke coverage exists, and admin smoke coverage now supports filter/clone/preview with `E2E_ADMIN_STORAGE_STATE`; expand authenticated flows and wire them into CI. |

### Frontend & UX
| Task | Notes |
|------|-------|
| ~~`next/image` for gallery images~~ | ✅ Done — hero, thumbnails, and filmstrip converted; lightbox main `<img>` intentionally kept plain for `max-height` constraint |
| ~~Skeleton loading states~~ | ✅ Done — `PostCardSkeleton` + `loading.tsx` in `(blog)/`; pulse animation matches real card dimensions |
| ~~`loading.tsx` for feed~~ | ✅ Done — included in skeleton loading work above |
| ~~Author bio on post detail~~ | ✅ Done — `AuthorCard` component; fetched in parallel with related posts; shows avatar/initials, name, bio, links to `/author/[id]` |
| ~~Analytics integration~~ | Removed — not needed |
| ~~Custom heading font~~ | ✅ Done — Lora serif via `next/font/google` applied to `.landing-title` and `.prose-content h2/h3/h4` |

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

> **Future DB consideration**: A separate `locations` table could support reusable spots across multiple posts, bounding box columns for region-level locations, and clustering metadata. Not needed yet.

### Applied Migrations
| File | Description |
|------|-------------|
| `0000_broken_mole_man.sql` | Initial schema |
| `0001_post_bookmarks.sql` | `post_bookmarks` table |
| `0002_series.sql` | `series` table + `series_id`/`series_order` on posts |
| `0003_location.sql` | `location_*` + `ioverlander_url` columns on posts |
| `0004_tag_description.sql` | `description` column on `tags` |

### Key Directories

```
web/src/app/           Next.js app router pages and API routes
web/src/components/    React components (blog/, layout/, theme/, providers/, admin/)
web/src/server/        Server-only DAL + queries + forms + auth
web/src/lib/           Shared utilities (db, auth, cloudinary, supabase, env)
web/src/drizzle/       Drizzle schema
web/drizzle/           Migration SQL files
web/scripts/           One-off scripts (migrate, import, seed-locations)
```

---

## Development Commands

```bash
cd web
bun run dev                        # Start dev server at localhost:3000
bun run build                      # Production build
bun run lint                       # ESLint
bun run db:generate                # Generate Drizzle migrations after schema changes
bun run db:migrate                 # Apply migrations to Turso
bun run ./scripts/seed-locations          # Seed location data onto existing posts (dev only)
bun run ./scripts/seed-series-categories  # Seed test series + categories (dev only, idempotent)
```

## Deployment

Push to GitHub → Vercel auto-deploys. Root directory: `web/`. See `docs/deployment.md`.
