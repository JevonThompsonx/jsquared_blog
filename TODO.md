# J²Adventures Blog - Project Tracker

> **Last Updated**: January 15, 2026 | **Version**: 0.9.3

---

## Quick Reference

| Component | Technology | Status |
|-----------|------------|--------|
| Frontend | React 19 + Vite + TailwindCSS 4 | Deployed |
| Backend | Hono (Cloudflare Worker) | Deployed |
| Database | Supabase PostgreSQL | Configured |
| Auth | Supabase Auth | Working |
| Storage | Supabase Storage (WebP) | Working |
| Deployment | Cloudflare Pages + Workers | Live |

---

## Completed Features

### Core Infrastructure
- [x] Bun workspace monorepo (client/server/shared)
- [x] TypeScript project references for type safety
- [x] Supabase integration (Auth, DB, Storage)
- [x] Cloudflare deployment pipeline
- [x] Environment variable configuration
- [x] SPA routing with `_redirects` for Cloudflare Pages

### User Profiles & Authentication
- [x] Display name support (optional, falls back to email)
- [x] Profile avatars with 3 options: letter, preset icons, custom image
- [x] 10 color choices for letter/icon avatars
- [x] Account settings page (`/settings`)
- [x] Profile dropdown in navbar with avatar
- [x] Theme preference per profile (persists across sessions)
- [x] Profile picture cropping before upload
- [x] Profile cache for instant avatar display (no flicker)
- [x] Admin dashboard access from profile menu

### Performance & Pagination
- [x] Infinite scroll with Intersection Observer
- [x] Server-side pagination (`limit`, `offset`, `hasMore`)
- [x] Search debouncing (400ms delay)
- [x] Server-side search (title, description, category)
- [x] Cache-Control headers (5 min CDN caching)

### Grid Layout & Design
- [x] CSS `grid-flow-dense` for gap-free layouts
- [x] Pattern-based layout randomization (6-post cycle)
- [x] Three layout types: horizontal (2-col), vertical, hover
- [x] Responsive grid (2/3/4 columns by screen)
- [x] Four theme options (dark/light variants)

### Categories System
- [x] 15 predefined travel categories
- [x] Custom category support ("Other" option)
- [x] Category pages with infinite scroll (`/category/:name`)
- [x] Clickable category badges on all post cards

### Image Handling
- [x] Multiple images per post (image gallery)
- [x] Image carousel with navigation arrows
- [x] Focal point editor for image positioning
- [x] Automatic WebP conversion (85% quality)
- [x] Supabase Storage bucket (`jsquared_blog`)
- [x] Smart file naming with timestamps
- [x] Old image cleanup on replacement
- [x] URL paste + file upload options
- [x] Image alt text for accessibility and SEO

### Admin Features
- [x] Role-based access control (admin/viewer)
- [x] Create/Edit/Delete posts
- [x] Shuffle layouts button
- [x] Image upload with category dropdown
- [x] Show image file size before upload
- [x] Confirmation dialog before deleting posts

### SEO
- [x] robots.txt + dynamic sitemap.xml
- [x] Open Graph + Twitter Card meta tags
- [x] JSON-LD structured data (Organization, BlogPosting, Breadcrumbs)
- [x] Proper heading hierarchy (h1 -> h2 -> h3)
- [x] Canonical URLs
- [x] 404 page with adventure theme
- [x] RSS feed (`/feed.xml`) with homepage link

### Rich Text Editor
- [x] Tiptap integration with React
- [x] Full-featured toolbar (bold, italic, headings, lists, links, code blocks)
- [x] Auto-loads existing content when editing posts
- [x] HTML content rendering on post detail pages
- [x] Plain text extraction for post previews and meta descriptions

### Draft & Scheduling System
- [x] Draft/published/scheduled status field for posts
- [x] Save posts as drafts before publishing
- [x] Post scheduling with datetime picker
- [x] Auto-publish via Cloudflare Workers cron (every 15 min)
- [x] Request-time auto-publish fallback
- [x] Blue "SCHEDULED" badge for admin visibility
- [x] Timezone-aware datetime handling

### Navigation & UX
- [x] Breadcrumbs (Home -> Category -> Post)
- [x] Loading skeleton for post cards
- [x] Fixed initial load scroll behavior
- [x] "Back to Top" button on long pages
- [x] Post count on category page headers
- [x] Keyboard shortcut (Ctrl+K) for search focus

### Comments System
- [x] Full comments functionality with add/delete
- [x] Comment likes with heart icon
- [x] Sort by likes, newest, oldest
- [x] Login prompt for unauthenticated users
- [x] Relative time formatting (just now, 5m ago, etc.)

### Tags System
- [x] Tags table with predefined tags (10 built-in)
- [x] Custom tag creation
- [x] Tag autocomplete with keyboard navigation
- [x] Tags displayed on post cards and detail pages
- [x] Many-to-many relationship (posts <-> tags)

### Engagement Features
- [x] Related/Suggested Posts component (by category)
- [x] Share Buttons (copy link)
- [x] Reading time display on posts

### Database Seeding
- [x] 20 starter posts with diverse categories
- [x] High-quality Unsplash images
- [x] Mixed layout types
- [x] Run with: `cd server && bun run seed`

---

## In Progress / Next Up

### High Priority

| Feature | Effort | Notes |
|---------|--------|-------|
| Public Author Profiles | Medium | `/author/:username` - show user's posts |
| About Page | Easy | Tell J² story, team bios |

### Medium Priority

| Feature | Effort | Notes |
|---------|--------|-------|
| Bookmarks/Favorites | Medium | Let users save posts for later |
| Email Notifications | Medium | Notify when someone replies to your comment |

### Lower Priority (Polish)

| Feature | Effort | Notes |
|---------|--------|-------|
| Map View | High | Add location field to posts, unique differentiator |
| Post Series/Collections | Medium | Group related posts together |
| PWA Support | Medium | Service worker + manifest for offline |
| Newsletter | Medium | Mailchimp/ConvertKit integration |
| Post Analytics | Medium | Track view counts, popular posts |
| Multi-language | High | i18n support for international readers |
| Date organization | Medium | Organize by published date |

---

## Quick Wins (< 1 hour each)

- [x] "Back to Top" button on long pages
- [x] Loading skeleton for post cards
- [x] Post count on category page headers
- [x] Confirmation dialog before deleting posts
- [x] Show image file size before upload
- [x] Dark mode toggle in settings (persist preference)
- [x] Copy post link button on post detail page
- [ ] Date formatting options (relative vs absolute)
- [ ] "Continue reading" indicator for long posts
- [ ] Estimated upload time for large images
- [ ] Keyboard navigation for image gallery (arrow keys)

---

## UI/UX Ideas

### Homepage Enhancements
- [ ] Featured/pinned posts at the top
- [x] "New" badge for posts less than 24h old
- [ ] Filter by date range
- [ ] View toggle (grid vs list view)

### Post Detail Improvements
- [ ] Table of contents for long posts
- [ ] Progress bar while reading
- [ ] "Print friendly" version
- [ ] Full-screen image gallery mode

### Admin Dashboard
- [ ] Post analytics (views, engagement)
- [ ] Bulk edit/delete posts
- [ ] Post templates for consistent formatting
- [ ] Revision history (undo changes)
- [ ] Duplicate post feature

### Mobile Experience
- [ ] Swipe gestures for image gallery
- [ ] Pull-to-refresh on homepage
- [ ] Bottom navigation bar option
- [ ] Share sheet integration

---

## Architecture Notes

### API Endpoints

```
GET  /api/posts                    - Paginated posts (?limit, ?offset, ?search)
GET  /api/posts/:id                - Single post with images and tags
POST /api/posts                    - Create post (admin)
PUT  /api/posts/:id                - Update post (admin)
DELETE /api/posts/:id              - Delete post (admin)
GET  /api/posts/:id/comments       - Get comments (?sort=likes|newest|oldest)
POST /api/posts/:id/comments       - Add comment (authenticated)
POST /api/comments/:id/like        - Toggle like (authenticated)
DELETE /api/comments/:id           - Delete comment (owner only)
GET  /api/tags                     - All available tags
POST /api/tags                     - Create tag (admin)
PUT  /api/posts/:id/tags           - Update post tags (admin)
GET  /sitemap.xml                  - Dynamic sitemap
```

### Frontend Routes

```
/                    - Home (public)
/auth                - Login/signup
/admin               - Admin dashboard (admin only)
/posts/:id           - Post detail (public)
/posts/:id/edit      - Edit post (admin only)
/category/:category  - Category page (public)
/tag/:slug           - Tag page (public)
/settings            - Account settings (authenticated)
/*                   - 404 page
```

### Database Schema

```sql
posts: id, created_at, title, description, image_url, category, author_id, type, status, scheduled_for, published_at
post_images: id, post_id, image_url, sort_order, focal_point, alt_text, created_at
profiles: id (FK auth.users), username, avatar_url, role, theme_preference
comments: id, created_at, content, post_id, user_id
comment_likes: id, comment_id, user_id (unique constraint)
tags: id, name, slug, created_at
post_tags: post_id, tag_id, created_at (junction table)
```

### Key Files

| File | Purpose |
|------|---------|
| `server/src/index.ts` | API routes, pagination, WebP conversion, cron |
| `server/src/middleware/auth.ts` | JWT verification |
| `client/src/main.tsx` | Routing, themes |
| `client/src/context/AuthContext.tsx` | Auth state + profile management |
| `client/src/components/Home.tsx` | Homepage + infinite scroll |
| `client/src/components/Admin.tsx` | Post creation with tags/scheduling |
| `client/src/components/EditPost.tsx` | Post editing |
| `client/src/components/TagInput.tsx` | Tag autocomplete component |
| `client/src/components/ImageUploader.tsx` | Image upload with alt text |
| `client/src/components/ImageGallery.tsx` | Multi-image carousel |
| `client/src/components/Comments.tsx` | Comments with likes |
| `client/src/components/SEO.tsx` | Meta tags + structured data |
| `shared/src/types/index.ts` | Shared TypeScript types |

---

## Storage & Limits

### Supabase Free Tier
- **Storage**: 1GB (~3,300-10,000 images at 100-300KB each)
- **Bandwidth**: 2GB/month (~6,500-20,000 image loads)
- **Current Format**: WebP @ 85% quality
- **Avatar Size**: 100KB max, 256px dimension

### When to Upgrade
- Approaching 800MB storage usage
- Hitting bandwidth limits consistently
- **Supabase Pro**: $25/month -> 8GB storage + 50GB bandwidth

---

## Development Commands

```bash
# Install dependencies
bun install

# Start full stack dev server
bun run dev

# Individual services
cd client && bun run dev          # Frontend only
bunx wrangler dev --config server/wrangler.toml  # Backend only
cd shared && bun run dev          # Types watch mode

# Build
bun run build                     # Full monorepo build

# Seed database
cd server && bun run seed

# Deploy
cd server && bunx wrangler deploy  # Backend to Workers
# Frontend: Push to GitHub -> Cloudflare Pages auto-deploys
```

---

## Feature Roadmap

### Phase 1: Content Creation - COMPLETE
- Rich text editor
- Draft/publish workflow
- Multiple images per post
- Focal point editor
- Post scheduling
- Tags system
- Image alt text

### Phase 2: User Experience - COMPLETE
- User profiles
- Avatar customization
- Account settings
- Comments system
- Share buttons

### Phase 3: Discovery - IN PROGRESS
- [ ] Public author profiles
- [x] Tag pages (`/tag/:slug`)
- [ ] Advanced search (date range, filters)
- [ ] Map view with adventure locations
- [x] RSS feed with homepage link

### Phase 4: Engagement
- [ ] Post bookmarks/favorites
- [ ] Email notifications
- [ ] Newsletter integration

### Phase 5: Polish
- [ ] PWA offline support
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Post revision history

---

## Recent Changes

### v0.9.3 (January 15, 2026)
- Added "NEW" badge for posts less than 24 hours old
- Added tag pages (`/tag/:slug`) with infinite scroll
- Made all tags clickable to filter posts by tag
- Added RSS feed link to homepage landing section
- Updated Vite proxy to handle `/feed.xml` and `/sitemap.xml`

### v0.9.2 (January 12, 2026)
- Added tags system with autocomplete
- Added post scheduling with cron auto-publish
- Added image alt text for accessibility
- Fixed timezone issues with scheduling
- Fixed display name save getting stuck
- Added blue "SCHEDULED" badge indicator

### v0.9.1 (January 2, 2026)
- Added theme preference per profile (persists to database)
- Added ThemeContext for centralized theme management
- Added profile picture cropping with react-easy-crop
- Added profile cache to prevent avatar flicker on navigation
- Fixed avatar not saving properly

### v0.9.0 (January 2, 2026)
- Added user profile system (display name, avatar)
- Added avatar picker with colors and preset icons
- Added account settings page
- Added profile dropdown in navbar
- Fixed SPA routing for Cloudflare Pages

### v0.8.0 (December 30, 2025)
- Added multiple images per post
- Added image gallery with carousel
- Added focal point editor
- Added breadcrumbs navigation
- Added skeleton loading

---

## Resources

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Cloudflare Workers](https://dash.cloudflare.com)
- [Hono Docs](https://hono.dev)
- [TailwindCSS 4](https://tailwindcss.com)
- [Tiptap Editor](https://tiptap.dev)
