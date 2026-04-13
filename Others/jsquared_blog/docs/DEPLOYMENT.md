# J²Adventures — Next.js Production Deployment

Last updated: 2026-03-21

## Overview

The production stack is a single Next.js app (`web/`) deployed to Vercel, with:

- **Turso** — application database (posts, profiles, comments, tags, media)
- **Supabase Auth** — public user authentication (sign up, login, password reset)
- **Auth.js + GitHub** — admin authentication
- **Cloudinary** — image and media hosting

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

### Email (Resend)

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Resend API key — used for comment notifications and newsletter |
| `RESEND_FROM_EMAIL` | Sender address for comment notifications (e.g. `noreply@yourdomain.com`) |
| `COMMENT_NOTIFICATION_TO_EMAIL` | Where to receive new comment alerts |
| `RESEND_NEWSLETTER_SEGMENT_ID` | Resend audience/segment ID for newsletter signups |

### Monitoring

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN — find in Sentry project settings under Client Keys |
| `SENTRY_AUTH_TOKEN` | Sentry auth token for source map upload during build |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Plausible analytics domain (e.g. `jsquaredadventures.com`) |

### Site

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Production URL — `https://jsquaredadventures.com` |

### CI (GitHub Secrets)

| Variable | Description |
|---|---|
| `LHCI_GITHUB_APP_TOKEN` | Lighthouse CI GitHub App token — for PR status checks |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel Protection Bypass secret — enables Lighthouse CI to audit the real app instead of the Vercel login page. Enable "Protection Bypass for Automation" in Vercel project settings, then copy the generated secret here. |

---

## Vercel Deployment Setup

1. Import the repository into Vercel.
2. Set the **Root Directory** to `web/`.
3. Build settings are controlled by `web/vercel.json` — do **not** set manual overrides in the Vercel dashboard. The `vercel.json` sets `framework`, `buildCommand` (`bun run build`), `installCommand` (`bun install`), and `outputDirectory` (`.next`).
4. Add all environment variables listed above.
5. Push to `main` — Vercel auto-deploys via GitHub webhook.

> **Cron jobs**: The Hobby plan allows one cron job at most with a minimum interval of 1 day. The cron at `/api/cron/publish-scheduled` runs daily at midnight UTC.

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
