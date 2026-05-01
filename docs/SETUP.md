# J2 Adventures Setup Guide

**Last Updated:** 2026-05-01

## Prerequisites

- **Bun** >= 1.x (recommended runtime). Install: `curl -fsSL https://bun.sh/install | bash`
- **Node.js** >= 18
- **Git** for version control

## Quick Start

```bash
# Install dependencies (from repo root)
bun install

# Copy environment file
cp web/.env.example web/.env.local

# Fill in required values (see below), then:
cd web
bun run dev
```

App runs at `http://localhost:3000`.

---

## Environment Variables Setup

### Required Variables

Copy `web/.env.example` to `web/.env.local` and configure these:

| Variable | Description | Source |
|----------|-------------|--------|
| `TURSO_DATABASE_URL` | Turso database URL (libsql:// or https://) | Turso dashboard |
| `TURSO_AUTH_TOKEN` | Turso database auth token | Turso dashboard |
| `SUPABASE_URL` | Supabase project URL | Supabase dashboard > Settings > API |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as SUPABASE_URL (public) | Same |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as SUPABASE_ANON_KEY (public) | Same |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL | `http://localhost:3000` for local dev |
| `AUTH_SECRET` | Auth.js secret (min 32 chars) | `openssl rand -base64 32` |
| `AUTH_GITHUB_ID` | GitHub OAuth App client ID | GitHub > Settings > Developer settings > OAuth Apps |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App client secret | Same |
| `AUTH_ADMIN_GITHUB_IDS` | Comma-separated GitHub user IDs allowed as admins | GitHub profile page numeric ID |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Cloudinary dashboard |

### Test Environment

For unit tests, create `web/.env.test.local`:

```bash
TURSO_DATABASE_URL=https://test-db.turso.io
TURSO_AUTH_TOKEN=test-token
AUTH_SECRET=test-secret-minimum-32-characters!!
AUTH_GITHUB_ID=test-id
AUTH_GITHUB_SECRET=test-secret
CLOUDINARY_CLOUD_NAME=test
CLOUDINARY_API_KEY=test-key
CLOUDINARY_API_SECRET=test-secret
SUPABASE_URL=https://test.supabase.co
SUPABASE_ANON_KEY=test-key
CRON_SECRET=test-cron-secret-min-16
```

Vitest auto-loads `web/.env.test.local` via the env-loader. No real credentials are needed for unit tests.

### Optional Integrations

| Variable | Required For | Default Behavior If Missing |
|----------|-------------|----------------------------|
| `NEXT_PUBLIC_STADIA_MAPS_API_KEY` | Stadia Maps tile rendering | Maps degrade gracefully |
| `ROUTING_PROVIDER` (geoapify) | Route planner | Route planner returns 503 |
| `GEOCODING_PROVIDER` (geoapify) | Route geocoding | Falls back (limited) |
| `GEOAPIFY_API_KEY` | Geoapify API access | Route planner returns 503 |
| `RESEND_API_KEY` | Email (newsletter, comment notifications) | Email features skip gracefully |
| `RESEND_FROM_EMAIL` | Sending emails | Email features skip gracefully |
| `COMMENT_NOTIFICATION_TO_EMAIL` | Admin comment notifications | Notifications skip |
| `RESEND_NEWSLETTER_SEGMENT_ID` | Newsletter segmentation | Newsletter signup skips segment add |
| `UPSTASH_REDIS_REST_URL` | Production rate limiting | In-memory fallback in dev/test; **required in prod** |
| `UPSTASH_REDIS_REST_TOKEN` | Production rate limiting | Same as above |
| `CRON_SECRET` | Cron job endpoints (deployed) | Cron returns 500 in prod; local dev bypasses |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking | Sentry disabled |
| `SENTRY_AUTH_TOKEN` | Source map uploads during build | Source maps not uploaded |

---

## Database Setup

### Turso

1. Create a Turso database (if not existing):
   ```bash
   turso db create jsquared-blog
   turso db show jsquared-blog --url
   turso db tokens create jsquared-blog
   ```

2. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `web/.env.local`.

3. Run migrations:
   ```bash
   cd web
   bun run db:migrate
   ```

4. (Optional) Generate new migration after schema changes:
   ```bash
   bun run db:generate
   ```

5. (Optional) Import data from Supabase:
   ```bash
   bun run db:import:supabase
   ```

### Supabase

1. Create a Supabase project.
2. Enable email/password auth (and any additional providers as needed).
3. Copy `SUPABASE_URL` and `SUPABASE_ANON_KEY` (project settings > API).
4. Set both `SUPABASE_URL`/`SUPABASE_ANON_KEY` (server) and `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (client) in env.

### Drizzle Schema

The full schema is defined in `web/src/drizzle/schema.ts` with 19 tables. Key types:

```typescript
// Tables: users, auth_accounts, profiles, posts, post_revisions,
// post_preview_tokens, post_images, post_tags, post_bookmarks,
// post_links, media_assets, categories, tags, series, comments,
// comment_likes, wishlist_places, seasons, post_links
```

---

## Running the App

### Development Server

```bash
cd web
bun run dev
```

Opens at `http://localhost:3000` with hot module replacement.

### Production Build

```bash
cd web
bun run build
```

Uses `scripts/build.ts` which wraps `next build` with Sentry source map upload.

### Linting

```bash
cd web
bun run lint
# Or for strict type checking:
cd web && bunx tsc --noEmit
```

---

## Running Tests

### Unit Tests (Vitest)

```bash
cd web
bun run test
```

Loads `web/.env.test.local` automatically. Tests live in `web/tests/unit/`.

Configuration: `web/vitest.config.ts`

- Environment: `node`
- Alias: `@/` maps to `./src/`, `server-only` stubbed for test environment
- Timeout: 30s
- Pattern: `tests/unit/**/*.test.{ts,tsx}`

### E2E Tests (Playwright)

```bash
cd web
bun run test:e2e
```

Configuration: `web/playwright.config.ts`

- Runs in Chromium only
- Auto-starts dev server on `localhost:3000`
- Retries once on CI
- Screenshots on failure, traces retained on first retry
- E2E specs in `web/tests/e2e/`

### E2E Auth State Capture

Before running E2E tests against a deployed instance, capture auth states:

```bash
# Admin (requires GitHub OAuth login)
cd web
bun run e2e:capture-admin-state

# Public user (requires Supabase test account)
bun run seed:e2e
bun run e2e:capture-public-state
```

---

## Seeding Data

### E2E Fixtures

```bash
cd web
bun run seed:e2e
```

Creates a publishable test post, category, tags, and a Supabase user for E2E testing. Writes fixture metadata to `web/.env.test.local`.

### Wishlist Places

```bash
cd web
bun run seed:wishlist
```

Seeds example wishlist destinations.

### Series & Categories

```bash
cd web
bun run ./scripts/seed-series-categories.ts
```

Creates default series and categories for content organization.

### Rich Content

```bash
cd web
bun run ./scripts/seed-rich-content.ts
```

Seeds a post with sample rich content (images, formatting, etc.).

### Location Data

```bash
cd web
bun run ./scripts/seed-locations.ts
```

Seeds location metadata for geotagged content.

---

## Optional Integrations

### Resend (Email)

1. Create a Resend account and verify a domain.
2. Generate an API key.
3. Set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `COMMENT_NOTIFICATION_TO_EMAIL`.
4. For newsletter: set `RESEND_NEWSLETTER_SEGMENT_ID` (ID of the Resend audience segment).

Newsletter signup safely returns a non-fatal "skipped" result when Resend is not configured.

### Upstash Redis (Rate Limiting)

1. Create an Upstash Redis database.
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. **Required in deployed environments** (Vercel, etc.) -- rate limiting fails closed without Redis.
4. Local dev and test use in-memory fallback automatically.

### Sentry (Observability)

1. Create a Sentry project.
2. Set `NEXT_PUBLIC_SENTRY_DSN` for client-side error reporting.
3. Set `SENTRY_AUTH_TOKEN` for source map uploads (Vercel environment variable, not committed).

### Stadia Maps

1. Sign up for Stadia Maps and get an API key.
2. Set `NEXT_PUBLIC_STADIA_MAPS_API_KEY`.
3. Without it, map tiles will not render. The app does not crash but maps will show blank tiles.

### Geoapify (Route Planner)

1. Create a Geoapify account and get an API key.
2. Set `GEOAPIFY_API_KEY`, `ROUTING_PROVIDER=geoapify`, `GEOCODING_PROVIDER=geoapify`.
3. Optional tuning: `ROUTE_PLANNER_TIMEOUT_MS`, `GEOCODING_TIMEOUT_MS`, `ROUTE_PLANNER_MAX_STOPS`.
4. Without Geoapify, `/route-planner` and `POST /api/route-plans` return 503.

---

## GitHub OAuth Setup for Admin Auth

1. Go to GitHub > Settings > Developer settings > OAuth Apps > New OAuth App.
2. Set:
   - **Application name**: J2 Adventures (local dev) or similar
   - **Homepage URL**: `http://localhost:3000` (dev) or `https://jsquaredadventures.com` (prod)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback` (dev) or `https://jsquaredadventures.com/api/auth/callback` (prod)
3. Copy `Client ID` to `AUTH_GITHUB_ID`.
4. Generate a `Client Secret` and copy to `AUTH_GITHUB_SECRET`.
5. Find your GitHub numeric user ID (GitHub API: `GET /users/{username}`) and add it to `AUTH_ADMIN_GITHUB_IDS`.
6. For multiple admins: comma-separate IDs in `AUTH_ADMIN_GITHUB_IDS`.

---

## Vercel Deployment

### Environment Variables

Set all required variables in Vercel project settings (Environment Variables). Do NOT commit secrets to `.env.local`.

### Cron Jobs

Defined in `web/vercel.json`:
- `GET /api/cron/publish-scheduled` - daily at midnight
- `GET /api/cron/keep-supabase-awake` - daily at 6 AM

Set `CRON_SECRET` in Vercel environment. Cron invocations include `Authorization: Bearer <CRON_SECRET>`.

### Build Command

```bash
bun run build
```

Runs from `web/` directory (Vercel is configured to use `web/` as the root).

---

## Environment File Loading Order

`env-loader.ts` loads files in this precedence (first match wins):

1. `web/.env.test.local`
2. `web/.env.local`
3. `web/.env`
4. `web/.dev.vars`
5. `.env.test.local` (repo root)
6. `.env.local` (repo root)
7. `.env` (repo root)
8. `.dev.vars` (repo root)

This means `web/.env.local` overrides `.env`, and test env files take highest priority.

---

## Common Commands Reference

```bash
# Development
bun run dev                          # Start dev server (from web/)

# Database
bun run db:generate                  # Generate Drizzle migration
bun run db:migrate                   # Apply pending migrations
bun run db:import:supabase           # Import data from Supabase

# Testing
bun run test                         # Run unit tests (Vitest)
bun run test:e2e                     # Run E2E tests (Playwright)

# Code Quality
bun run lint                         # Run ESLint
bunx tsc --noEmit                    # TypeScript type check

# E2E Auth Setup
bun run seed:e2e                     # Seed E2E test fixtures
bun run e2e:capture-admin-state      # Capture admin auth state for E2E
bun run e2e:capture-public-state     # Capture public auth state for E2E

# Seeding
bun run ./scripts/seed-series-categories.ts   # Seed series/categories
bun run ./scripts/seed-rich-content.ts        # Seed sample rich content
bun run ./scripts/seed-wishlist.ts            # Seed wishlist places

# Building
bun run build                        # Production build with Sentry
```
