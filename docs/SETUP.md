# J2 Adventures Setup Guide

> **Production note (2026-11-24):** the live origin uses SQLite (`file:` URL)
> and local media on **templetonbak**. The Turso, Cloudinary, Upstash, and Vercel
> sections below are **legacy/rollback** instructions. Current setup, deploy,
> and rollback: [`runbooks/local-origin.md`](./runbooks/local-origin.md).

**Last Updated:** 2026-11-24

## Prerequisites

- **pnpm** — pinned to `pnpm@11.1.1` by the `packageManager` field in the root `package.json`; CI (`.github/workflows/ci.yml`) also pins 11.1.1. Install: `npm install -g pnpm@11.1.1`
- **Node.js** >= 22.13 (root `engines.node`); `.tool-versions` pins nodejs 24.0.0 and CI runs on Node 24
- **bun** (optional, dev-only for `bunx` one-off runs)
- **Git** for version control

## Quick Start

```bash
# Install dependencies (from repo root)
pnpm install

# Copy environment file
cp web/.env.example web/.env.local

# Fill in required values (see below), then:
cd web
pnpm run dev
```

App runs at `http://localhost:3000`.

---

## Environment Variables Setup

### Required Variables

Copy `web/.env.example` to `web/.env.local` and configure:

| Variable                          | Description                                                 | Source                    |
| --------------------------------- | ----------------------------------------------------------- | ------------------------- |
| `TURSO_DATABASE_URL`              | `file:/absolute/path/blog.db`, or a remote libsql/https URL | local file / Turso        |
| `TURSO_AUTH_TOKEN`                | Only for remote libsql/https URLs                           | Turso                     |
| `WORKOS_CLIENT_ID`                | AuthKit public client ID                                    | WorkOS staging dashboard  |
| `WORKOS_ISSUER`                   | Exact access-token issuer from OIDC discovery               | WorkOS discovery document |
| `NEXT_PUBLIC_WORKOS_REDIRECT_URI` | Approved `/callback` URI                                    | WorkOS Redirects tab      |
| `WORKOS_COOKIE_PASSWORD`          | 32+ character session sealing secret                        | `openssl rand -base64 24` |
| `WORKOS_COOKIE_MAX_AGE`           | Session cookie lifetime; use `1209600` (14 days)            | repo default              |
| `ADMIN_ALLOWED_EMAILS`            | Comma/space-separated admin emails                          | owner-approved list       |
| `RATE_LIMIT_DRIVER`               | `memory` for the single templetonbak Node process           | repo default              |

Do not set `WORKOS_API_KEY` or `WORKOS_COOKIE_DOMAIN` in the app environment.
`NEXT_PUBLIC_SITE_URL` must be HTTPS and non-loopback in deployed environments.
The runtime is keyless and sessions are host-scoped.

Legacy `BETTER_AUTH_*`, `AUTH_SECRET`, `AUTH_GITHUB_*`, `AUTH_ADMIN_GITHUB_IDS`,
and `CF_ACCESS_*` variables are optional and retained only for one code-rollback
cycle. Cloudflare Access no longer gates `/admin`; `next.` remains Access-gated.

### Test Environment

For unit tests, copy `web/.env.test.example` to `web/.env.test.local`. It contains
only dummy values; no real WorkOS, database, or email credentials are required.

```bash
TURSO_DATABASE_URL=https://test-db.turso.io
TURSO_AUTH_TOKEN=test-token
WORKOS_CLIENT_ID=client_test_dummy
WORKOS_ISSUER=https://auth.example.test/user_management/client_test_dummy
NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://jsquaredadventures.com/callback
WORKOS_COOKIE_PASSWORD=test-cookie-password-at-least-32-characters
WORKOS_COOKIE_MAX_AGE=1209600
ADMIN_ALLOWED_EMAILS=admin@example.com
CRON_SECRET=test-cron-secret-min-16
```

Vitest uses these dummy values plus a dedicated AuthKit components stub so unit
tests never call WorkOS or depend on `next/cache` ESM resolution.

### Optional Integrations

| Variable                                | Required For                                               | Default Behavior If Missing                          |
| --------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_STADIA_MAPS_API_KEY`       | Stadia Maps tile rendering                                 | Maps degrade gracefully                              |
| `ROUTING_PROVIDER` (geoapify)           | Route planner                                              | Route planner returns 503                            |
| `GEOCODING_PROVIDER` (geoapify)         | Route geocoding                                            | Falls back (limited)                                 |
| `GEOAPIFY_API_KEY`                      | Geoapify API access                                        | Route planner returns 503                            |
| `RESEND_API_KEY`                        | Comment notifications + Listmonk SMTP relay                | Email features skip gracefully                       |
| `RESEND_FROM_EMAIL`                     | Sending emails                                             | Email features skip gracefully                       |
| `COMMENT_NOTIFICATION_TO_EMAIL`         | Admin comment notifications                                | Notifications skip                                   |
| `LISTMONK_URL` / `LISTMONK_LIST_UUID`   | Self-hosted newsletter                                     | Newsletter signup returns skipped                    |
| `LISTMONK_ACCESS_CLIENT_ID` / `_SECRET` | Worker → Listmonk Access service token                     | API request denied                                   |
| `UPSTASH_REDIS_REST_URL`                | Production rate limiting                                   | In-memory fallback in dev/test; **required in prod** |
| `UPSTASH_REDIS_REST_TOKEN`              | Production rate limiting                                   | Same as above                                        |
| `CRON_SECRET`                           | Cron job endpoints (deployed)                              | Cron returns 500 in prod; local dev bypasses         |
| `LOCAL_MEDIA_ROOT`                      | Directory served at `/media`; required on the local origin | e.g. `/srv/blog/shared/media`                        |
| `RATE_LIMIT_DRIVER`                     | `memory` for the single templetonbak process               | required locally; Upstash only for rollback          |
| `NEXT_PUBLIC_SENTRY_DSN`                | Sentry error tracking                                      | Sentry disabled                                      |
| `SENTRY_AUTH_TOKEN`                     | Source map uploads during build                            | Source maps not uploaded                             |

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
   pnpm run db:migrate
   ```

4. (Optional) Generate new migration after schema changes:
   ```bash
   pnpm run db:generate
   ```

### WorkOS AuthKit identity mapping

Readers and admins use WorkOS AuthKit. Apply all migrations with
`pnpm run db:migrate`; migration `0025_workos_identity.sql` adds the unique
`(provider, provider_user_id)` index for `auth_accounts.provider='workos'`.

The existing `users.id` remains the FK target for profiles, posts, comments,
bookmarks, and media. First login links a verified normalized email to an
existing row or creates a `workos-user-<subject>` reader plus profile. The
legacy Better Auth `session`, `account`, and `verification` tables remain for
rollback.

Full environment, dashboard, cutover, smoke, and rollback instructions:
[`runbooks/workos-auth.md`](./runbooks/workos-auth.md).

### Drizzle Schema

The full schema is defined in `web/src/drizzle/schema.ts`. WorkOS links identities through `auth_accounts`; the existing `users.id` remains every content FK target. The Better Auth tables are rollback-only. Key types:

```typescript
// Tables: users, profiles, posts, post_revisions, post_preview_tokens,
// post_images, post_tags, post_bookmarks, post_links, media_assets,
// categories, tags, series, comments, comment_likes,
// auth_accounts, wishlist_places, seasons
```

---

## Running the App

### Development Server

```bash
cd web
pnpm run dev
```

Opens at `http://localhost:3000` with hot module replacement.

### Production Build

```bash
cd web
pnpm run build:node
node scripts/package-standalone.mjs /path/to/release
```

`build:node` emits Next standalone output. `package-standalone.mjs` assembles a
self-contained release and recreates top-level runtime links for `sharp`,
`@libsql/client`, `@workos-inc/authkit-nextjs`, and `@workos-inc/node`.

### Linting

```bash
cd web
pnpm run lint
# Or for strict type checking:
cd web && pnpm exec tsc --noEmit
```

---

## Running Tests

### Unit Tests (Vitest)

```bash
cd web
pnpm run test
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
pnpm run test:e2e
```

Configuration: `web/playwright.config.ts`

- Runs in Chromium only
- Auto-starts dev server on `127.0.0.1:3100` (port 3000 is reserved by Open WebUI on this host)
- Retries once on CI
- Screenshots on failure, traces retained on first retry
- E2E specs in `web/tests/e2e/`

### E2E Auth State Capture

Authenticated live smoke is orchestrator-owned. The optional fixture script uses
WorkOS Magic Auth and the SDK `sealedSession`; it does not use or require a password:

```bash
cd web
WORKOS_API_KEY=... E2E_WORKOS_EMAIL=owner@example.com \
WORKOS_CLIENT_ID=client_... WORKOS_COOKIE_PASSWORD=... \
E2E_BASE_URL=https://jsquaredadventures.com E2E_WORKOS_MAX_AGE=3600 \
pnpm run e2e:capture-workos-state
```

The API key belongs only in the operator shell. The script uses the one-time code
returned by `createMagicAuth` in memory, stores only the sealed session, writes the
fixture as `0600` under a `0700` `playwright/.auth` directory, and never logs the
code or raw tokens. Revoke the session and delete the fixture after smoke.

## Seeding Data

### E2E Fixtures

Set `E2E_POST_SLUG` to a published post slug for content-gate tests. Capture an
optional WorkOS admin fixture with `pnpm run e2e:capture-workos-state`; it writes
`playwright/.auth/admin.json` plus origin metadata. No public password fixture or
`seed:e2e` command remains.

### Wishlist Places

```bash
cd web
pnpm run seed:wishlist
```

Seeds example wishlist destinations.

### Series & Categories

```bash
cd web
pnpm exec tsx ./scripts/seed-series-categories.ts
```

Creates default series and categories for content organization.

### Rich Content

```bash
cd web
pnpm exec tsx ./scripts/seed-rich-content.ts
```

Seeds a post with sample rich content (images, formatting, etc.).

### Location Data

```bash
cd web
pnpm exec tsx ./scripts/seed-locations.ts
```

Seeds location metadata for geotagged content.

---

## Optional Integrations

### Resend (Email)

1. Create a Resend account and verify a domain.
2. Generate an API key.
3. Set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `COMMENT_NOTIFICATION_TO_EMAIL`. Listmonk uses the same Resend SMTP relay; configure it in the Listmonk admin UI.
4. Newsletter is self-hosted in Listmonk; set `LISTMONK_URL`, `LISTMONK_LIST_UUID`, and the Access service-token pair. Resend remains the SMTP relay and comment-notification sender.

Newsletter signup safely returns a non-fatal "skipped" result when Listmonk is not configured.

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

## WorkOS AuthKit Setup

Use the staging values recorded in [`runbooks/workos-auth.md`](./runbooks/workos-auth.md).
The verified dashboard has all four callbacks (apex default), the apex initiate
login URI, four sign-out roots, Magic Auth, passkeys, Email + Password, signups,
and Google/Microsoft/GitHub/Apple OAuth. The dashboard **Sign-up URL override must
remain empty**; setting it to `/api/auth/signup` creates a redirect loop. Session
maximum is 14 days, access-token lifetime 5 minutes, and inactivity limit 7 days.

Implementation and routine deployment must not modify the dashboard. The
optional `workos:configure-redirects` script is for an intentional, separately
approved callback change and needs an API key only in the operator shell.

The WorkOS staging environment is the accepted production identity environment
for now (owner decision, 2026-11-25; low expected volume). Transactional emails are
`[STAGING]`-prefixed, and no environment migration is planned unless volume, SLA,
compliance, or support requirements change.

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
pnpm run build
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

## pnpm Workspace Overrides

`pnpm-workspace.yaml` contains a small set of security-driven overrides applied across the dependency tree:

| Package   | Override   | Reason                                                          |
| --------- | ---------- | --------------------------------------------------------------- |
| `postcss` | `>=8.5.10` | Addresses a known postcss vulnerability in older 8.4.x versions |
| `ws`      | `>=8.20.1` | Addresses a `ws` vulnerability (CVE) in older 8.x versions      |
| `uuid`    | `>=11.1.1` | Addresses a `uuid` vulnerability in older 10.x/8.x versions     |
| `tar`     | `>=7.5.19` | GHSA-23hp-3jrh-7fpw / GHSA-83g3-92jg-28cx                       |

These overrides are intentionally minimal and security-focused. They apply transitively to any package in the dependency tree that depends on these. Review and update them when bumping major dependencies.

`allowBuilds` permits native build steps for these packages (required by Sentry CLI, esbuild, sharp, and unrs-resolver).

> **Do not add overrides to the root `package.json`.** pnpm 11 ignores the legacy `"pnpm": { "overrides": … }` field there and prints `The "pnpm" field in package.json is no longer read by pnpm`. All overrides belong in `pnpm-workspace.yaml`.

---

## Common Commands Reference

```bash
# Development
pnpm run dev                          # Start dev server (from web/)

# Database
pnpm run db:generate                  # Generate Drizzle migration
pnpm run db:migrate                   # Apply pending migrations

# Testing
pnpm run test                         # Run unit tests (Vitest)
pnpm run test:e2e                     # Run E2E tests (Playwright)

# Code Quality
pnpm run lint                         # Run ESLint
pnpm exec tsc --noEmit                    # TypeScript type check

# WorkOS operator helpers
pnpm run workos:audit-identities       # Read-only identity integrity audit
pnpm run e2e:capture-workos-state      # SDK sealedSession fixture (operator-only)

# Seeding
pnpm run seed:wishlist                                    # Seed wishlist places
pnpm exec tsx ./scripts/seed-series-categories.ts         # Seed series/categories
pnpm exec tsx ./scripts/seed-rich-content.ts              # Seed sample rich content
pnpm exec tsx ./scripts/seed-locations.ts                 # Seed location metadata

# Building
pnpm run build:node                   # Standalone Node production build
```
