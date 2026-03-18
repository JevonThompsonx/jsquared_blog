# J²Adventures Blog

A travel blog platform built around the live Next.js app in `web/`. It supports rich publishing, maps, galleries, comments, public accounts, GitHub-based admin tooling, and production SEO for `jsquaredadventures.com`.

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
└── prompt.md        # Master project prompt / guardrails
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

Create `web/.env` (or `web/.env.local`) with the variables documented in `web/src/lib/env.ts` and `docs/deployment.md`.

Typical local setup includes:

```bash
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
AUTH_SECRET=...
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
AUTH_ADMIN_GITHUB_IDS=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
NEXT_PUBLIC_STADIA_MAPS_API_KEY=...
```

### 3. Run Development Server
```bash
cd web
bun run dev
```

App runs at `http://localhost:3000`.

### Optional: Capture admin Playwright state

To run authenticated admin smoke tests locally without signing in every run:

```bash
cd web
bun run e2e:capture-admin-state
```

This writes `web/playwright/.auth/admin.json`, which `bun run test:e2e` will use automatically.

---

## Key Features

### Content Management
- Rich text editor (Tiptap) with full formatting
- Multiple images per post with carousel gallery
- Focal point editor for image positioning
- Cloudinary-backed optimized image delivery (`f_auto,q_auto`)
- Draft/Published/Scheduled post status
- Tags system with autocomplete
- Categories, tags, series, location metadata, and previews

### User Experience
- Infinite scroll with Intersection Observer
- Server-side search (title, description, category)
- Seasonal homepage hero and grouped feed sections
- Theme preferences across light/dark mode and look variants
- Responsive grid layouts (1-4 columns)
- Breadcrumbs, loading skeletons, reading progress, and print/reduced-motion support

### User Profiles
- Display name and avatar customization
- Letter avatars, preset icons, or custom images
- Theme preference persistence
- Account settings page

### Social Features
- Comments with likes
- Share buttons (copy link)
- Reading time estimates
- Related posts suggestions
- Bookmarks and author profile pages

### SEO
- Dynamic sitemap.xml
- RSS feed (/feed.xml)
- Open Graph + Twitter Cards
- JSON-LD structured data
- Proper heading hierarchy

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

# Helpers
bun run e2e:capture-admin-state
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

### Tables
- `posts` - Blog posts with status, scheduling
- `post_images` - Image gallery with focal points, alt text
- `profiles` - User profiles with avatars, roles, theme
- `comments` - Post comments
- `comment_likes` - Comment likes (one per user)
- `tags` / `post_tags` - Tag system

---

## Deployment

The live app deploys from `web/` to Vercel. See `docs/deployment.md` for the full environment-variable checklist, cutover cleanup, and dashboard notes.

---

## Key Routes / Endpoints

```
GET  /                            # Homepage / feed
GET  /posts/[slug]                # Published post detail
GET  /preview/[id]?token=...      # Admin / token preview
GET  /map                         # World map of posts
GET  /category/[category]         # Category feed
GET  /tag/[slug]                  # Tag feed

GET  /api/posts                   # Paginated published posts
POST /api/posts/[postId]/comments # Add comment (public auth)
POST /api/comments/[commentId]/like
GET  /api/bookmarks

GET  /api/admin/posts
POST /api/admin/posts/clone
POST /api/admin/posts/preview
POST /api/admin/comments/moderate
POST /api/admin/uploads/images

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
| CI | GitHub Actions | Auto-runs on PR / push to `main` |

**Input validation** uses [Zod](https://zod.dev) at API and action trust boundaries.

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
