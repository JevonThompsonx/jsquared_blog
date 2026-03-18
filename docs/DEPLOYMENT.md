# J²Adventures — Next.js Production Deployment

Last updated: 2026-03-17

## Overview

The production stack is a single Next.js app (`web/`) deployed to Vercel, with:

- **Turso** — application database (posts, profiles, comments, tags, media)
- **Supabase Auth** — public user authentication (sign up, login, password reset)
- **Auth.js + GitHub** — admin authentication
- **Cloudinary** — image and media hosting

The legacy Cloudflare Worker (`server/`) and Vite frontend (`client/`) are retired.

---

## Required Environment Variables

Set all of these in the Vercel project dashboard under **Settings → Environment Variables**.

### Database

| Variable | Description |
|---|---|
| `TURSO_DATABASE_URL` | Turso database URL — `libsql://your-db.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso auth token from the Turso dashboard |

### Auth.js (Admin auth via GitHub)

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Random 32+ character secret — run `openssl rand -base64 32` |
| `AUTH_GITHUB_ID` | GitHub OAuth app client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth app client secret |
| `AUTH_ADMIN_GITHUB_IDS` | Comma-separated GitHub user IDs allowed admin access (e.g. `12345678`) |

### Supabase (Public user auth)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL (server-side usage) |
| `SUPABASE_ANON_KEY` | Supabase anon key (server-side usage) |
| `NEXT_PUBLIC_SUPABASE_URL` | Same Supabase project URL (client-side usage) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same Supabase anon key (client-side usage) |

### Cloudinary (Media)

| Variable | Description |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

### Map (Stadia Maps)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_STADIA_MAPS_API_KEY` | Stadia Maps API key — get a free key at stadiamaps.com (200K credits/month free, no card required). Used for the `/map` page and per-post embedded maps. Map degrades gracefully if unset. |

### Site

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Production URL — `https://jsquaredadventures.com` |

> **Note:** `LEGACY_API_BASE_URL` was a transitional variable pointing to the old Hono worker. It is no longer used and should not be set in production.

---

## Vercel Deployment Setup

1. Import the repository into Vercel.
2. Set the **Root Directory** to `web/`.
3. Vercel auto-detects Next.js — leave the build command as default (`next build`).
4. Add all environment variables listed above.
5. Deploy.

### GitHub OAuth callback URL

In your GitHub OAuth app settings, set the callback URL to:

```
https://jsquaredadventures.com/api/auth/callback/github
```

For the Vercel preview environment, also add:

```
https://<your-vercel-project>.vercel.app/api/auth/callback/github
```

### Supabase Auth callback URL

In the Supabase dashboard under **Authentication → URL Configuration**, add:

```
https://jsquaredadventures.com/auth/callback
```

---

## Database Migrations

Migrations live in `web/drizzle/`. Run them against Turso:

```bash
cd web
bun run db:migrate
```

This executes `web/scripts/migrate.ts` which applies any pending Drizzle migrations.

To generate migrations after schema changes:

```bash
cd web
bun run db:generate
```

Migrations are append-only — never edit an applied migration file.

---

## Decommissioning the Legacy Cloudflare Stack

Once the Next.js app is confirmed live and healthy:

### Cloudflare Workers dashboard

1. Go to Workers & Pages → your Hono worker (e.g. `jsquared-blog-api`)
2. Click **Manage** → **Delete** the worker
3. Remove any associated custom domain routes (`api.jsquaredadventures.com` or similar)

### Cloudflare Pages dashboard

If the old Vite frontend was deployed to Cloudflare Pages:

1. Go to Workers & Pages → your Pages project
2. Update the build settings to point to `web/` OR delete the old project if it was separate
3. Remove old environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Legacy environment variables to remove

These were only needed for the old Cloudflare Worker — they are no longer used:

- `SUPABASE_SERVICE_ROLE_KEY`
- `DEV_MODE`

---

## Local Development

```bash
# From repo root
bun install

# From web/
cd web
cp .env.example .env.local
# Fill in .env.local with your values

bun run dev
```

Dev server runs at `http://localhost:3000`.

---

## Health Checks After Deploy

Verify these URLs return expected content:

| URL | Expected |
|---|---|
| `/` | Homepage with posts feed |
| `/sitemap.xml` | Valid XML sitemap |
| `/feed.xml` | Valid RSS feed (all posts) |
| `/category/<name>/feed.xml` | Valid RSS feed (filtered by category) |
| `/tag/<slug>/feed.xml` | Valid RSS feed (filtered by tag) |
| `/map` | World map with post pins |
| `/api/auth/session` | JSON (null if unauthenticated) |
