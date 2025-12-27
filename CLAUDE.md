# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

J²Adventures Blog is a full-stack blog application built as a Bun workspace monorepo, featuring a React frontend deployed to Cloudflare Pages and a Hono API backend running as a Cloudflare Worker. The application uses Supabase for authentication and PostgreSQL database, and Cloudflare Images for optimized image delivery.

## Tech Stack

- **Runtime**: Bun (for local development)
- **Frontend**: React 19 + Vite + TypeScript + TailwindCSS 4
- **Backend**: Hono (Cloudflare Worker runtime)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Image Storage**: Supabase Storage with Cloudflare Images CDN
- **Deployment**: Cloudflare Pages (frontend) + Cloudflare Workers (backend)

## Monorepo Structure

This is a Bun workspace with three packages:

- **`client/`**: React frontend (Vite app)
- **`server/`**: Hono backend API (Cloudflare Worker)
- **`shared/`**: Shared TypeScript types used by both client and server

The `shared` package provides end-to-end type safety across the full stack. Both `client` and `server` depend on `shared` via `workspace:*` protocol.

## Development Commands

### Full Stack Development

**IMPORTANT**: Before running the dev server, ensure you have a `.dev.vars` file in the `server/` directory with your Supabase credentials. Copy from `.dev.vars.example` and fill in your values.

```bash
# Install all dependencies
bun install

# Start all services (shared watch mode, server, client)
bun run dev
```

This runs:
- `shared` in watch mode (TypeScript compilation)
- `server` via `wrangler dev` on port 8787 (uses `.dev.vars` for env variables)
- `client` via Vite on port 5173

The Vite dev server proxies `/api/*` requests to the Wrangler dev server at `http://127.0.0.1:8787`.

### Individual Workspace Commands

```bash
# Client only
cd client && bun run dev

# Server only (from root)
bunx wrangler dev --config server/wrangler.toml

# Shared types in watch mode
cd shared && bun run dev
```

### Building

```bash
# Build entire monorepo (runs TypeScript project references)
bun run build

# Individual builds
bun run build:client
bun run build:server
bun run build:shared
```

The root `build` command uses `tsc --build` which respects TypeScript project references for efficient incremental compilation.

### Linting

```bash
cd client && bun run lint
```

## Environment Variables

### Client (`.env` in `client/`)
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Server Development (`.dev.vars` in `server/`)

**REQUIRED for local development with wrangler dev:**
```
SUPABASE_URL="your_supabase_project_url"
SUPABASE_ANON_KEY="your_supabase_anon_key"
```

The `.dev.vars` file is used by `wrangler dev` for local development. Copy from `.dev.vars.example` and fill in your Supabase credentials. This file is gitignored to prevent committing secrets.

### Server Production

For production deployment, set environment variables in Cloudflare Worker dashboard (not in files).

## Architecture

### Authentication Flow

- Uses Supabase Auth with custom `profiles` table that stores user roles (`admin` or `viewer`)
- Frontend uses `AuthContext` (`client/src/context/AuthContext.tsx`) to manage auth state globally
- Server uses auth middleware (`server/src/middleware/auth.ts`) to protect routes by verifying Supabase JWT tokens
- Admin routes require both authentication AND `role: 'admin'` in the user's profile

### API Routes (Backend)

The Hono backend (`server/src/index.ts`) exposes:

- `GET /api/posts` - Fetch posts with pagination
  - Query params: `limit` (default 20, max 100), `offset` (default 0), `search` (optional)
  - Returns: `{ posts, total, limit, offset, hasMore }`
  - Supports server-side search across title, description, and category
- `POST /api/posts` - Create new post (admin only)
- `PUT /api/posts/:id` - Update post (admin only)
- `DELETE /api/posts/:id` - Delete post (admin only)
- `GET /api/posts/:id` - Fetch single post

Protected routes use the `authMiddleware` which sets `c.get('user')` and `c.get('supabase')` for authenticated requests.

### Frontend Routes

Defined in `client/src/main.tsx` using React Router:

- `/` - Home page (public)
- `/auth` - Login/signup (public)
- `/admin` - Admin dashboard (requires admin role)
- `/posts/:id` - Single post detail (public)
- `/posts/:id/edit` - Edit post (requires admin role)

Protected routes use the `PrivateRoute` component which checks both authentication and admin role.

### Image Handling

- **Upload**: Images are uploaded to Supabase Storage (`post-images` bucket)
- **Storage**: The `posts.image_url` field stores only the filename/path
- **Delivery**: Frontend constructs Cloudflare Images URLs using the account hash and stored filename
- **Format**: Cloudflare Images CDN serves optimized WebP/JPEG with on-the-fly transformations

### Theme System

The app supports multiple visual themes defined in `client/src/main.tsx`:

- `midnightGarden` (dark green)
- `enchantedForest` (dark teal + purple)
- `daylightGarden` (light green)
- `daylitForest` (light teal)

Themes are applied via CSS custom properties and managed through React state.

### Post Layout Types

Posts support three display types (defined in `shared/src/types/index.ts`):

- `horizontal` - Split view with image on left/right
- `vertical` - Split view with image on top/bottom
- `hover` - Image overlay that reveals on hover

The backend automatically reassigns layout types when posts are created/deleted to maintain visual variety on the homepage.

## Database Schema (Supabase)

Key tables:

- `posts`: id, created_at, title, description, image_url, category, author_id, type
- `profiles`: id (FK to auth.users), username, role
- `auth.users`: Managed by Supabase Auth

## TypeScript Configuration

The monorepo uses TypeScript project references:

- Root `tsconfig.json` references all workspaces
- Each workspace has its own `tsconfig.json` with `composite: true`
- Build with `tsc --build` for incremental compilation

## Deployment

### Backend (Cloudflare Worker)

```bash
cd server
bunx wrangler deploy
```

Set secrets in Cloudflare dashboard: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_IMAGES_ACCOUNT_HASH`

### Frontend (Cloudflare Pages)

Configure Pages project:
- Build command: `bun run build`
- Build directory: `client/dist`
- Set environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

For custom domains, set up CNAME record for API subdomain pointing to Worker URL.

## Performance Optimizations

### Infinite Scroll

The homepage (`client/src/components/Home.tsx`) implements infinite scroll for optimal performance:

- Loads 20 posts initially, then 20 more as user scrolls
- Uses Intersection Observer API to detect when user reaches bottom
- Prevents loading all posts at once (critical for scalability)
- Shows loading indicator while fetching more posts
- Displays "end of adventures" message when no more posts

### Search Performance

- Search input is debounced by 400ms using custom `useDebounce` hook
- Server-side search available via `?search=keyword` query parameter
- Frontend debouncing prevents unnecessary API calls and re-renders

### Caching

- Backend sets Cache-Control headers (5 minutes for paginated posts)
- Cloudflare CDN caches responses at the edge for faster delivery

## Database Seeding

To add starter posts for development/testing:

```bash
cd server
bun run seed
```

This requires a `.env` file in `server/` with `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

## Key Files to Know

- `server/src/index.ts` - Main API implementation with all routes and pagination
- `server/src/middleware/auth.ts` - Authentication middleware
- `server/src/seed-posts.ts` - Database seeding script for starter posts
- `client/src/main.tsx` - App routing and theme system
- `client/src/context/AuthContext.tsx` - Global auth state management
- `client/src/hooks/useDebounce.ts` - Search debouncing hook
- `shared/src/types/index.ts` - Shared TypeScript types
- `client/src/components/Home.tsx` - Main homepage with infinite scroll
- `client/src/components/Admin.tsx` - Admin dashboard for creating posts
