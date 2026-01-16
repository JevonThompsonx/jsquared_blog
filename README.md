# J²Adventures Blog

A full-stack travel blog application built with React, Hono, and Supabase. Features include infinite scroll, rich text editing, image galleries, comments, tags, post scheduling, and user profiles.

**Live Site**: [jsquaredadventures.com](https://jsquaredadventures.com)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + Vite + TailwindCSS 4 |
| **Backend** | Hono (Cloudflare Worker) |
| **Database** | Supabase PostgreSQL |
| **Auth** | Supabase Auth |
| **Storage** | Supabase Storage (WebP conversion) |
| **Deployment** | Cloudflare Pages (frontend) + Workers (backend) |
| **Runtime** | Bun (local development) |

---

## Project Structure

```
jsquared_blog/
├── client/          # React frontend (Vite)
├── server/          # Hono backend API (Cloudflare Worker)
├── shared/          # Shared TypeScript types
├── CLAUDE.md        # AI assistant guidance (comprehensive)
├── TODO.md          # Feature tracker & roadmap
└── docs/            # Additional documentation
```

---

## Quick Start

### Prerequisites
- [Bun](https://bun.sh/docs/installation) installed
- Supabase project with credentials

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure Environment Variables

**Client** (`client/.env`):
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Server** (`server/.dev.vars`) - **DO NOT use quotes around values**:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: For local scheduled post testing
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DEV_MODE=true
```

### 3. Run Development Server
```bash
bun run dev
```

This starts:
- Frontend on `http://localhost:5173`
- Backend on `http://127.0.0.1:8787`
- Shared types in watch mode

### Local Scheduled Post Testing

The Cloudflare cron job only runs in production. For local testing:

```bash
# Check environment variables are loaded
curl http://127.0.0.1:8787/api/test/env

# View scheduled posts and their timing
curl http://127.0.0.1:8787/api/test/scheduled-posts

# Manually trigger publish for due posts
curl http://127.0.0.1:8787/api/test/cron
```

**Note:** Test endpoints require `DEV_MODE=true` in `.dev.vars`. Posts are also auto-published when someone visits `/api/posts` or `/api/posts/:id`.

---

## Key Features

### Content Management
- Rich text editor (Tiptap) with full formatting
- Multiple images per post with carousel gallery
- Focal point editor for image positioning
- Automatic WebP conversion (85% quality)
- Draft/Published/Scheduled post status
- Tags system with autocomplete
- 15 predefined categories + custom

### User Experience
- Infinite scroll with Intersection Observer
- Server-side search (title, description, category)
- Four theme options (dark/light variants)
- Responsive grid layouts (1-4 columns)
- Back to top button, breadcrumbs, loading skeletons

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

### SEO
- Dynamic sitemap.xml
- RSS feed (/feed.xml)
- Open Graph + Twitter Cards
- JSON-LD structured data
- Proper heading hierarchy

---

## Development Commands

```bash
# Full stack development
bun run dev

# Individual services
cd client && bun run dev          # Frontend only
bunx wrangler dev --config server/wrangler.toml  # Backend only
cd shared && bun run dev          # Types watch mode

# Build
bun run build                     # Full monorepo

# Database seeding
cd server && bun run seed         # Add starter posts

# Deploy backend
cd server && bunx wrangler deploy
```

---

## Database Setup

### New Project Setup
Run the combined migration in Supabase SQL Editor:
```bash
# Copy contents from:
server/migrations/APPLY_ALL_MIGRATIONS.sql
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

### Backend (Cloudflare Workers)
```bash
cd server
wrangler login
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler deploy
```

### Frontend (Cloudflare Pages)
1. Connect GitHub repository in Cloudflare Pages
2. Build settings:
   - Build command: `bun run build`
   - Output directory: `client/dist`
3. Environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

## API Endpoints

```
GET  /api/posts                    # Paginated posts (?limit, ?offset, ?search, ?status)
GET  /api/posts/:id                # Single post with images and tags
POST /api/posts                    # Create post (admin)
PUT  /api/posts/:id                # Update post (admin)
DELETE /api/posts/:id              # Delete post (admin)

GET  /api/posts/:id/images         # Get images for a post
POST /api/posts/:id/images         # Upload images (admin)

GET  /api/posts/:id/comments       # Comments (?sort=likes|newest|oldest)
POST /api/posts/:id/comments       # Add comment (authenticated)
POST /api/comments/:id/like        # Toggle like (authenticated)
DELETE /api/comments/:id           # Delete comment (owner only)

GET  /api/tags                     # All available tags
POST /api/tags                     # Create tag (admin)
PUT  /api/posts/:id/tags           # Update post tags (admin)
GET  /api/tags/:slug/posts         # Get posts by tag (?limit, ?offset)

GET  /api/authors/:username        # Author profile with posts

GET  /sitemap.xml                  # Dynamic sitemap
GET  /feed.xml                     # RSS feed
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](./CLAUDE.md) | Complete technical reference |
| [TODO.md](./TODO.md) | Feature tracker & roadmap |
| [docs/TESTING.md](./docs/TESTING.md) | Testing guide for features |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Detailed deployment guide |

---

## License

MIT License - see [LICENSE](./LICENSE)
