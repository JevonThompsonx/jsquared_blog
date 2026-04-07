# J²Adventures Blog

A production travel blog platform built around the live Next.js app in `web/`. It supports rich publishing, expiring previews, post revisions, maps, galleries, comments, bookmarks, public accounts, GitHub-based admin tooling, newsletters, and production SEO for `jsquaredadventures.com`.

**Live Site**: [jsquaredadventures.com](https://jsquaredadventures.com)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **App** | Next.js 16 App Router |
| **Language** | TypeScript (`strict: true`) |
| **Database** | Turso / libSQL + Drizzle ORM |
| **Public Auth** | Supabase Auth |
| **Admin Auth** | Auth.js + GitHub OAuth |
| **Storage** | Cloudinary |
| **Email** | Resend (newsletter + comment notifications) |
| **Rate limiting** | Upstash Redis in deployed envs, in-memory locally/tests |
| **Observability** | Sentry (optional) |
| **Styling** | TailwindCSS 4 + CSS variables |
| **Testing** | Vitest + Playwright |
| **Deployment** | Vercel |
| **Runtime / package manager** | Bun |

---

## Project Structure

```
jsquared_blog/
├── web/             # Active Next.js application
├── docs/            # Plans, handoffs, deployment, workflow notes
├── CLAUDE.md        # Architecture + repo guidance
├── AGENTS.md        # Multi-model ownership + coordination
├── TODO.md          # Practical backlog / tracker
└── prompt.md        # Project prompt / architecture guardrails
```

---

## Quick Start

### Prerequisites
- [Bun](https://bun.sh/docs/installation)
- Turso database credentials
- Supabase project credentials
- Cloudinary credentials
- GitHub OAuth app for admin auth

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure Environment Variables

Create `web/.env.local` with the variables documented in `web/src/lib/env.ts` and `docs/deployment.md`.

Required app/runtime variables:

```bash
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
AUTH_SECRET=...
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
AUTH_ADMIN_GITHUB_IDS=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Optional integrations and operational variables:

```bash
NEXT_PUBLIC_STADIA_MAPS_API_KEY=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
COMMENT_NOTIFICATION_TO_EMAIL=...
RESEND_NEWSLETTER_SEGMENT_ID=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
CRON_SECRET=...
NEXT_PUBLIC_SENTRY_DSN=...
SUPABASE_SERVICE_ROLE_KEY=... # tooling / seed / import scripts
```

Notes:
- `CRON_SECRET` is optional only for local loopback development, but required for deployed cron routes.
- Upstash credentials are required in deployed environments because rate limiting fails closed there.
- Newsletter signup safely returns a non-fatal skipped result when Resend newsletter config is absent.

### 3. Run Development Server
```bash
cd web
bun run dev
```

App runs at `http://localhost:3000`.

### Optional: Capture Playwright auth state

Admin:

```bash
cd web
bun run e2e:capture-admin-state
```

Public fixture:

```bash
cd web
bun run seed:e2e
bun run e2e:capture-public-state
```

---

## Key Features

### Content Management
- Rich text editor (Tiptap) with canonical JSON storage
- Safe derived HTML/plain-text rendering for prose
- Legacy HTML migration support behind allowlist sanitization
- Draft / Published / Scheduled post status
- Expiring preview links for unpublished content
- Post revision history with admin restore
- Multiple images per post with carousel gallery
- Focal point editing and EXIF metadata capture for gallery assets
- Cloudinary-backed optimized image delivery (`f_auto,q_auto`)
- Categories, tags, series, location metadata, song metadata, and previews

### User Experience
- Infinite scroll with Intersection Observer
- Server-side search (title, description, category, tags)
- Seasonal homepage hero and grouped feed sections
- Reading progress, related posts, breadcrumbs, and reduced-motion support
- Map/location blocks for geotagged stories
- Per-post view tracking with cookie dedupe

### User Profiles
- Display name and avatar customization
- Letter avatars, preset icons, or uploaded avatars
- Theme preference persistence
- Account settings page

### Admin Auth Contract
- Admin access is allowlisted by GitHub provider user id.
- Persisted admin accounts stay distinct per GitHub provider user id.
- Session `githubLogin` continues to come from the live GitHub profile for operator attribution.
- Persisted admin display/avatar identity intentionally resolves to shared site-owner branding instead of each admin's live GitHub avatar.

### Social Features
- Comments with replies, likes, and owner deletion
- Admin comment moderation
- Bookmarks for signed-in public users
- Share buttons and reading time estimates
- Newsletter signup

### SEO
- Dynamic sitemap.xml
- RSS feed (`/feed.xml`)
- Open Graph + Twitter Cards
- JSON-LD structured data
- Proper heading hierarchy and processed table-of-contents headings

---

## Development Commands

```bash
cd web

bun run dev
bun run lint
bunx tsc --noEmit
bun run test
bun run test:e2e
bun run build

# Drizzle / Turso
bun run db:generate
bun run db:migrate
bun run db:import:supabase

# E2E helpers
bun run e2e:capture-admin-state
bun run e2e:capture-public-state
bun run seed:e2e

# Content helpers
bun run ./scripts/seed-series-categories.ts
bun run ./scripts/seed-rich-content.ts
```

---

## Database Setup

### New Project Setup
Apply Drizzle migrations against Turso from `web/`:
```bash
cd web
bun run db:migrate
```

Optional local content helpers:

```bash
cd web
bun run ./scripts/seed-series-categories.ts
bun run ./scripts/seed-rich-content.ts
```

### Core Tables
- `users` / `auth_accounts` - Local authorization + provider-linked identities
- `profiles` - Public profile data, avatars, theme preference
- `posts` - Blog posts, scheduling, content format, view count, location and song metadata
- `post_preview_tokens` - Expiring preview access tokens
- `post_revisions` - Admin revision history and restore snapshots
- `media_assets` - Uploaded media metadata and EXIF fields
- `post_images` - Gallery ordering, focal points, captions
- `series` - Linked post series metadata
- `comments` - Post comments with visibility / moderation state
- `comment_likes` - Comment likes (one per user)
- `post_bookmarks` - Saved posts per public user
- `categories`, `tags`, `post_tags` - Taxonomy

---

## Deployment

The live app deploys from `web/` to Vercel. See `docs/deployment.md` for the full environment-variable checklist, cutover cleanup, and dashboard notes.

---

## Key Routes / Endpoints

```
GET  /                            # Homepage / feed
GET  /posts/[slug]                # Published post detail
GET  /preview/[id]?token=...      # Admin or token preview
GET  /map                         # World map of posts
GET  /category/[category]         # Category feed
GET  /tag/[slug]                  # Tag feed
GET  /series/[slug]               # Series detail
GET  /bookmarks                   # Signed-in saved posts
GET  /account                     # Public account page
GET  /settings                    # Theme/settings page

GET  /api/posts                   # Paginated published posts
GET  /api/posts/[postId]/comments # List comments
POST /api/posts/[postId]/comments # Add comment or reply (public auth)
GET  /api/posts/[postId]/bookmark # Bookmark status
POST /api/posts/[postId]/bookmark # Toggle bookmark
POST /api/posts/[postId]/view     # Increment deduped view count
POST /api/comments/[commentId]/like
DELETE /api/comments/[commentId]
GET  /api/bookmarks
GET  /api/account/profile
PATCH /api/account/profile
POST /api/account/avatar
POST /api/newsletter

GET  /api/admin/posts
POST /api/admin/posts/clone
POST /api/admin/posts/preview
POST /api/admin/posts/bulk-status
POST /api/admin/comments/moderate
GET  /api/admin/posts/[postId]/comments
GET  /api/admin/posts/[postId]/revisions
GET  /api/admin/posts/[postId]/revisions/[revisionId]
POST /api/admin/posts/[postId]/revisions/[revisionId]/restore
GET  /api/admin/series/[seriesId]/part-numbers
POST /api/admin/uploads/images

GET  /api/cron/publish-scheduled
GET  /api/cron/keep-supabase-awake

GET  /sitemap.xml
GET  /feed.xml
```

---

## Code Quality

| Check | Tool | Command |
|-------|------|---------|
| Type-check | TypeScript | `cd web && bunx tsc --noEmit` |
| Lint | ESLint | `cd web && bun run lint` |
| Unit tests | Vitest | `cd web && bun run test` |
| E2E smoke | Playwright | `cd web && bun run test:e2e` |
| Admin auth capture | Playwright | `cd web && bun run e2e:capture-admin-state` |
| Public auth capture | Playwright | `cd web && bun run e2e:capture-public-state` |
| CI | GitHub Actions | Auto-runs on PR / push to `main` |

**Input validation** uses [Zod](https://zod.dev) at API and action trust boundaries.

**Content sanitization** uses an allowlist-based `sanitize-html` pipeline before rendering prose.

**Security headers** ship from `web/next.config.ts`.

---

## Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](./CLAUDE.md) | Complete technical reference |
| [AGENTS.md](./AGENTS.md) | Model ownership and coordination |
| [TODO.md](./TODO.md) | Feature tracker & roadmap |
| [docs/handoff.md](./docs/handoff.md) | Current verified status and open work |
| [docs/PLAN.md](./docs/PLAN.md) | Phase/task plan |
| [docs/deployment.md](./docs/deployment.md) | Deployment and dashboard notes |

---

## License

MIT License - see [LICENSE](./LICENSE)
