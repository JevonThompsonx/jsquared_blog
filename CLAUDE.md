# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

J²Adventures Blog is a full-stack blog application built as a Bun workspace monorepo, featuring a React frontend deployed to Cloudflare Pages and a Hono API backend running as a Cloudflare Worker. The application uses Supabase for authentication, PostgreSQL database, and Supabase Storage for image hosting with automatic WebP conversion.

## Tech Stack

- **Runtime**: Bun (for local development)
- **Frontend**: React 19 + Vite + TypeScript + TailwindCSS 4
- **Backend**: Hono (Cloudflare Worker runtime)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Image Storage**: Supabase Storage with automatic WebP conversion (85% quality)
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
- `/category/:category` - Category page showing filtered posts (public)
- `/*` - 404 Not Found page with fun adventure-themed message (public)

Protected routes use the `PrivateRoute` component which checks both authentication and admin role.

### Image Handling

- **Upload**: Images (JPG, PNG, WebP) are uploaded via admin interface
- **Conversion**: Server automatically converts JPG/PNG to WebP format at 85% quality using @jsquash libraries
- **Storage**: Images stored in Supabase Storage (`jsquared_blog` bucket, 5MB file size limit)
- **Naming**: Files are saved with timestamp prefix for uniqueness (e.g., `1234567890-image.webp`)
- **Database**: The `posts.image_url` field stores the full public URL from Supabase Storage
- **Deletion**: Old images are automatically deleted when replacing with new uploads
- **Capacity**: 1GB free tier = approximately 3,300-10,000 images depending on size

### Theme System

The app supports multiple visual themes defined in `client/src/main.tsx`:

- `midnightGarden` (dark green)
- `enchantedForest` (dark teal + purple)
- `daylightGarden` (light green)
- `daylitForest` (light teal)

Themes are applied via CSS custom properties and managed through React state.

### Post Layout Types

Posts support three display types (defined in `shared/src/types/index.ts`):

- `split-horizontal` - Split view with image on left/right (2-column span on desktop)
- `split-vertical` - Standard card with image on top, content below (1-column span)
- `hover` - Image with gradient overlay that reveals description on hover (1-column span)

The backend uses a pattern-based randomization algorithm (6-post repeating cycle) to assign layout types. The homepage grid uses `grid-flow-dense` to automatically fill gaps and prevent layout issues with larger posts.

### Categories

Posts can be organized into predefined categories or custom categories:

- **Predefined**: Hiking, Camping, Food, Nature, Culture, Water Sports, Biking, Road Trip, City Adventure, Wildlife, Beach, Mountains, Photography, Winter Sports, Other
- **Custom**: Admins can create custom categories by selecting "Other" and typing a new name
- **Navigation**: Category badges are clickable and lead to filtered category pages (`/category/:category`)
- **Category Pages**: Each category has a dedicated page with infinite scroll showing only posts in that category

### SEO (Search Engine Optimization)

The application implements comprehensive SEO best practices:

#### Core SEO Components

- **robots.txt** (`client/public/robots.txt`): Tells search engines to crawl all pages and points to sitemap
- **Sitemap.xml** (`GET /sitemap.xml`): Dynamic XML sitemap generated server-side listing homepage and all blog posts
- **SEO Component** (`client/src/components/SEO.tsx`): Reusable component that manages all meta tags and structured data

#### Meta Tags & Social Sharing

The SEO component automatically updates:
- Document title with site branding
- Meta description for search results
- Open Graph tags for Facebook/LinkedIn sharing (og:title, og:description, og:image, og:url, og:type)
- Twitter Card tags for Twitter sharing (twitter:card, twitter:title, twitter:description, twitter:image)
- Article-specific tags for blog posts (article:published_time, article:author, article:section, article:tag)
- Canonical URLs to prevent duplicate content issues

#### JSON-LD Structured Data

Implements schema.org structured data for better search engine understanding:

- **Organization Schema** (Home page): Defines J²Adventures as an organization with name, URL, logo, and description
- **BlogPosting Schema** (Post Detail pages): Rich metadata for blog posts including headline, description, image, author, publisher, dates, and article section
- **BreadcrumbList Schema** (Category pages): Navigation hierarchy for category pages showing Home → Category path

#### Heading Hierarchy

All pages follow proper heading structure:
- Each page has exactly one `<h1>` tag for the main heading
- Article cards use `<h3>` tags for titles (appropriate as sub-elements)
- No skipped heading levels (maintains h1 → h2 → h3 order)

#### Image Optimization for SEO

- All images have descriptive `alt` attributes for accessibility and SEO
- Images converted to WebP for faster loading (better Core Web Vitals scores)
- Lazy loading implemented (`loading="lazy"`) to improve initial page load
- Proper image dimensions to prevent layout shift

#### URL Structure

- Clean, semantic URLs: `/posts/:id`, `/category/:category`
- Category names properly URL-encoded in paths
- Canonical URLs set on all pages to avoid duplicate content penalties

#### Additional SEO Features

- 404 page with proper messaging and navigation back to content
- Fast page loads via Cloudflare CDN caching (Cache-Control headers)
- Mobile-responsive design (important for mobile-first indexing)
- Infinite scroll with proper URL handling (no pagination URLs to dilute SEO)

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

Set secrets in Cloudflare dashboard: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

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

- `server/src/index.ts` - Main API implementation with all routes, pagination, sitemap, and WebP conversion
- `server/src/middleware/auth.ts` - Authentication middleware
- `server/src/seed-posts.ts` - Database seeding script for starter posts
- `client/src/main.tsx` - App routing, theme system, and route configuration
- `client/src/context/AuthContext.tsx` - Global auth state management
- `client/src/hooks/useDebounce.ts` - Search debouncing hook
- `shared/src/types/index.ts` - Shared TypeScript types including CATEGORIES constant
- `client/src/components/Home.tsx` - Main homepage with infinite scroll and landing page
- `client/src/components/Admin.tsx` - Admin dashboard for creating posts with category dropdown
- `client/src/components/EditPost.tsx` - Edit existing posts interface
- `client/src/components/PostDetail.tsx` - Individual post page with full content
- `client/src/components/Category.tsx` - Category-filtered posts page with infinite scroll
- `client/src/components/NotFound.tsx` - 404 error page with adventure theme
- `client/src/components/SEO.tsx` - Reusable SEO component for meta tags and structured data
- `client/public/robots.txt` - Search engine crawler instructions
