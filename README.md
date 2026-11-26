# J²Adventures Blog

A production travel blog platform built around the live Next.js app in `web/`. It supports rich publishing, expiring previews, post revisions, maps, galleries, comments, bookmarks, public accounts, a public wishlist, WorkOS-authenticated reader accounts and restrictive admin tooling, newsletters, and production SEO for `jsquaredadventures.com`.

**Live Site**: [jsquaredadventures.com](https://jsquaredadventures.com)

---

## Tech Stack

| Layer                         | Technology                                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| **App**                       | Next.js 16 App Router                                                                                    |
| **Language**                  | TypeScript (`strict: true`)                                                                              |
| **Database**                  | SQLite (libSQL `file:`) + Drizzle ORM; Turso only for the rollback Worker                                |
| **Reader + Admin Auth**       | WorkOS AuthKit (keyless PKCE; email Magic Auth, passkeys, OAuth)                                         |
| **Storage**                   | Local content-addressed WebP via `sharp`, served at `/media`                                             |
| **Routing / geocoding**       | Geoapify                                                                                                 |
| **Email**                     | Resend (comment notifications + newsletter relay); Listmonk self-hosted for newsletter subscriptions     |
| **Rate limiting**             | In-process on the single Node origin; Upstash only for the rollback Worker                               |
| **Observability**             | Sentry (optional)                                                                                        |
| **Styling**                   | TailwindCSS 4 + CSS variables                                                                            |
| **Testing**                   | Vitest + Playwright                                                                                      |
| **Deployment**                | templetonbak host (systemd) behind its Cloudflare Tunnel; Cloudflare DNS/TLS/WAF, Access only on `next.` |
| **Runtime / package manager** | pnpm (primary), bun (dev-only for `bunx`)                                                                |

---

## Project Structure

```
jsquared_blog/
├── package.json          # Root workspace manifest — scripts delegate to `web`
├── pnpm-workspace.yaml   # Workspace globs + security-driven dependency overrides
├── pnpm-lock.yaml        # pnpm lockfile (source of truth for installs)
├── tsconfig.json         # Base compiler options (web/tsconfig.json extends the setup)
├── vercel.json           # Historical Vercel cron config (not the current deploy path)
├── web/                  # Active Next.js application — Node standalone release
├── docs/                 # Plans, handoffs, deployment, workflow notes (see docs/INDEX.md)
├── testImages/           # Test image fixtures
├── MODERNIZATION_TODO.md # Open modernization items from the 2026-09-03 audit pass
├── AGENTS.md             # Agent operating instructions for this repo
├── README.md             # This file
├── LICENSE               # MIT
├── .github/workflows/    # CI (lint, typecheck, test, security, build, e2e)
├── .husky/               # Git hooks (pre-commit → lint-staged)
├── .claude/              # Harness-local plans and evals (not product docs)
├── .sentryclirc          # Sentry CLI org/project config — tracked, contains no token
└── .tool-versions        # asdf/mise version pins
```

---

## Quick Start

### Prerequisites

- [pnpm](https://pnpm.io/installation)
- [Node.js](https://nodejs.org/) >= 22.13
- A SQLite database at `file:/absolute/path/blog.db` (or Turso credentials for the legacy path)
- WorkOS AuthKit public client ID, exact OIDC issuer, approved callback, and a 32+ character cookie password
- `ADMIN_ALLOWED_EMAILS` for the local admin gate; no WorkOS API key in the app environment
- `LOCAL_MEDIA_ROOT` for uploads (no Cloudinary account required)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy `web/.env.example` to `web/.env.local` and fill in the values your environment needs.

For **unit tests**, Vitest loads `web/.env.test.local` automatically via the env-loader. Copy the example file to get started (no real credentials needed for unit tests):

```bash
cp web/.env.test.example web/.env.test.local
```

Required app/runtime variables:

```bash
TURSO_DATABASE_URL=file:/absolute/path/blog.db
WORKOS_CLIENT_ID=client_...
WORKOS_ISSUER=https://api.workos.com/user_management/client_...
NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3000/callback
WORKOS_COOKIE_PASSWORD=<32+ character secret>
WORKOS_COOKIE_MAX_AGE=1209600
ADMIN_ALLOWED_EMAILS=admin@example.com
RATE_LIMIT_DRIVER=memory
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Optional integrations and operational variables:

```bash
NEXT_PUBLIC_STADIA_MAPS_API_KEY=...
ROUTING_PROVIDER=geoapify
GEOCODING_PROVIDER=geoapify
GEOAPIFY_API_KEY=...
ROUTE_PLANNER_TIMEOUT_MS=10000
GEOCODING_TIMEOUT_MS=8000
ROUTE_PLANNER_MAX_STOPS=10
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
COMMENT_NOTIFICATION_TO_EMAIL=...
LISTMONK_URL=...
LISTMONK_LIST_UUID=...
LISTMONK_ACCESS_CLIENT_ID=...
LISTMONK_ACCESS_CLIENT_SECRET=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
CRON_SECRET=...
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_AUTH_TOKEN=...
```

Notes:

- `CRON_SECRET` is optional only for local loopback development, but required for deployed cron routes.
- Upstash credentials are required in deployed environments unless `RATE_LIMIT_DRIVER=memory` is explicitly selected for the single Node origin.
- WorkOS runs keyless: do not set `WORKOS_API_KEY` or `WORKOS_COOKIE_DOMAIN` in the app environment.
- Legacy Better Auth / Auth.js variables are optional and retained for one code-rollback cycle.
- Newsletter signup is a server-side proxy to the self-hosted Listmonk public subscription API. It safely returns a non-fatal skipped result when Listmonk config is absent.
- `SENTRY_AUTH_TOKEN` is only needed when uploading source maps during production builds.
- Optional Playwright/operator helpers live in `web/.env.example`; authenticated fixture capture uses the WorkOS SDK `sealedSession`.

### 3. Run Development Server

```bash
cd web
pnpm run dev
```

App runs at `http://localhost:3000` by default. On this host port 3000 is occupied
by Open WebUI; use `pnpm run dev --port 3100` for the blog. Playwright already
defaults to `http://127.0.0.1:3100`.

### Optional: Capture a WorkOS Playwright fixture

Operator-only; the API key and fixture email stay in the shell. No password is used:

```bash
cd web
WORKOS_API_KEY=... E2E_WORKOS_EMAIL=owner@example.com \
WORKOS_CLIENT_ID=client_... WORKOS_COOKIE_PASSWORD=... \
E2E_BASE_URL=https://jsquaredadventures.com E2E_WORKOS_MAX_AGE=3600 \
pnpm run e2e:capture-workos-state
```

The fixture is written to `playwright/.auth/admin.json` with origin metadata,
mode `0600`, inside a `0700` directory. It contains only the SDK-sealed session;
the one-time code and raw tokens are never persisted. Revoke the session and
delete the fixture after authenticated smoke.

Local Playwright defaults to `http://127.0.0.1:3100` because port 3000 is occupied
by Open WebUI on this host. Full hosted-auth round-trip smoke targets production;
local port-3100 E2E validates pages and redirect initiation only.

See [`docs/runbooks/workos-auth.md`](./docs/runbooks/workos-auth.md) for verified
dashboard values, cutover, live smoke, and rollback.

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
- Optional per-story song metadata block with Spotify embeds or external listen links
- Per-post view tracking with cookie dedupe

### Travel Tools

- Public wishlist page with map/list rendering for future destinations
- Visited wishlist stops excluded by default, with an opt-in include-visited toggle
- Admin wishlist editor supports place names, autocompleted locations, optional info links, short descriptions, and public/private visibility
- New wishlist entries default to public visibility
- Admins can check off a wishlist item into the post flow while keeping it visible until the linked post is actually published
- Linked published posts are excluded from public wishlist surfaces automatically

### User Profiles

- Display name and avatar customization
- Letter avatars, preset icons, or uploaded avatars
- Theme preference persistence
- Account settings page

### Reader + Admin Auth Contract

- WorkOS AuthKit is the only session source; `wos-session` is host-scoped, HttpOnly, SameSite=Lax, and Secure in production.
- First login maps a verified normalized email to the existing local `users.id`, preserving profiles and content FKs.
- Admin access requires a live WorkOS session, verified email, current `ADMIN_ALLOWED_EMAILS`, local `users.role === 'admin'`, and `auth_time` no older than 24 hours. Production currently uses the WorkOS staging environment by owner decision; its emails are `[STAGING]`-prefixed.
- Cloudflare Access is removed from `/admin`; WorkOS is the only admin gate. `next.` remains Access-gated.

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

Run these from `web/` (the Vercel deploy root). The root `package.json` mirrors a subset — `dev`, `build`, `lint`, `test` delegate through `pnpm --filter web run …` — so `pnpm run test:e2e` and the `db:*` / `seed:*` scripts only exist at the `web/` level.

```bash
cd web

pnpm run dev
pnpm run lint
pnpm run lint:fix
pnpm run typecheck                       # same as `pnpm exec tsc --noEmit`
pnpm run test
pnpm run test:watch
pnpm run test:e2e
pnpm run build
pnpm run build:analyze

# Drizzle / Turso
pnpm run db:generate
pnpm run db:migrate

# WorkOS / E2E helpers
pnpm run workos:provision-admins   # dry-run; add --apply to write
pnpm run workos:audit-identities
pnpm run e2e:capture-workos-state
pnpm run test:authkit-smoke /tmp/j2-release

# Content helpers
pnpm run seed:wishlist                                # Seed example wishlist destinations
pnpm exec tsx ./scripts/seed-series-categories.ts     # Seed series/categories
pnpm exec tsx ./scripts/seed-rich-content.ts          # Seed sample rich content
pnpm exec tsx ./scripts/seed-locations.ts             # Seed location metadata
```

---

## Database Setup

### Disaster Recovery

`docs/DISASTER-RECOVERY.md` is listed in `.gitignore` as an internal document, so it is not committed and will be missing from a fresh clone. It describes recovering accidentally deleted posts via Turso point-in-time branching.

Until that file exists locally, the only repo-local recovery surface is the migration set in `web/drizzle/` (25 SQL files) plus `pnpm run db:migrate`. Row-level restore depends on a Turso backup/branch procedure that is not documented in this repo.

### New Project Setup

Apply Drizzle migrations against the configured SQLite/libSQL database from `web/`:

```bash
cd web
pnpm run db:migrate
```

Optional local content helpers:

```bash
cd web
pnpm exec tsx ./scripts/seed-series-categories.ts
pnpm exec tsx ./scripts/seed-rich-content.ts
```

### Core Tables (21 Drizzle)

- `users` / `auth_accounts` - Local authorization + provider-linked identities
- `profiles` - Public profile data, avatars, theme preference
- `posts` - Blog posts, scheduling, content format, view count, location and song metadata
- `post_preview_tokens` - Expiring preview access tokens
- `post_revisions` - Admin revision history and restore snapshots
- `media_assets` - Uploaded media metadata and EXIF fields
- `post_images` - Gallery ordering, focal points, captions
- `post_links` - External links per post
- `series` - Linked post series metadata
- `seasons` - Seasonal homepage hero grouping
- `comments` - Post comments with visibility / moderation state
- `comment_likes` - Comment likes (one per user)
- `post_bookmarks` - Saved posts per public user
- `categories`, `tags`, `post_tags` - Taxonomy
- `wishlist_places` - Travel wishlist entries with location data
- `auth_accounts` - WorkOS/provider links with a unique provider/subject index
- `session`, `account`, `verification` - Legacy Better Auth tables retained for rollback

---

## Deployment

Production origin is a **Next 16 standalone Node process on templetonbak**,
behind the `templetonbak` Cloudflare Tunnel. Cloudflare provides DNS, TLS, WAF,
cache, and the Access gate. Vercel is suspended. The Worker `jsquared-blog` is a
rollback artifact with no custom domains and no cron schedules.

Deploy with the standalone pipeline documented in
[`docs/runbooks/local-origin.md`](./docs/runbooks/local-origin.md):

```bash
cd web
pnpm run build:node
node scripts/package-standalone.mjs /tmp/j2-release
# copy to /srv/blog/releases/<timestamp>, swap `current`, restart
```

`pnpm run deploy:cf` is only for a deliberate rollback to the Worker. Never run a
bare `vinext-cloudflare deploy`: it drops the Worker secrets. The Vercel-era
files (`vercel.json`, `web/vercel.json`, `.env` references to Turso/Cloudinary/
Upstash) remain for rollback/reference and are not the current path.

---

## Key Routes / Endpoints

```
GET  /                            # Homepage / feed
GET  /posts/[slug]                # Published post detail
GET  /preview/[id]?token=...      # Admin or token preview
GET  /tags                         # Tag browse index
GET  /categories                   # Category browse index
GET  /map                          # World map of posts
GET  /wishlist                     # Public travel wishlist
GET  /wishlist/[slug]              # Public wishlist item detail
GET  /privacy                     # Privacy, cookies, and data-request policy
GET  /accessibility               # Accessibility commitment
GET  /route-planner                # Travel route planner (needs Geoapify)
GET  /admin/wishlist               # Admin wishlist editor
GET  /admin/tags                   # Admin tag management
GET  /admin/categories             # Admin category management
GET  /admin/seasons                # Admin season management
GET  /category/[category]         # Category feed
GET  /tag/[slug]                  # Tag feed
GET  /series                      # Series index
GET  /series/[slug]               # Series detail
GET  /bookmarks                   # Signed-in saved posts
GET  /account                     # Public account page
GET  /settings                    # Theme/settings page
GET  /login                       # Hosted AuthKit sign-in notice
GET  /signup                      # Hosted AuthKit sign-up notice
GET  /callback                    # PKCE callback + local identity mapping

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
GET  /api/auth/login              # Start hosted sign-in
GET  /api/auth/signup             # Start hosted sign-up
GET  /api/auth/logout             # Clear WorkOS session
GET  /api/auth/session           # Public-safe token-free admin display fields
GET  /api/admin/session          # Same WorkOS admin handler; no Cloudflare Access
POST /api/newsletter
POST /api/route-plans              # Route planner (needs Geoapify)
POST /api/csp-report               # Log-only CSP violation collector

GET  /api/admin/posts
POST /api/admin/posts/clone
POST /api/admin/posts/preview
POST /api/admin/song-preview        # Admin-only song metadata preview/autofill
POST /api/admin/posts/bulk-status
GET  /api/admin/posts/warnings      # Content warning checks
GET  /api/admin/location-autocomplete # Location autocomplete
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

| Check                  | Tool                    | Command                                                                                      |
| ---------------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| Type-check             | TypeScript              | `cd web && pnpm run typecheck` (or `pnpm exec tsc --noEmit`)                                 |
| Lint                   | ESLint                  | `cd web && pnpm run lint`                                                                    |
| Unit tests             | Vitest                  | `cd web && pnpm run test`                                                                    |
| E2E smoke              | Playwright              | `cd web && pnpm run test:e2e`                                                                |
| WorkOS fixture capture | Playwright + WorkOS SDK | `cd web && pnpm run e2e:capture-workos-state`                                                |
| Identity audit         | libSQL                  | `cd web && pnpm run workos:audit-identities`                                                 |
| Format                 | Prettier                | `pnpm run format` / `pnpm run format:check` (root or `web`)                                  |
| CI                     | GitHub Actions          | `.github/workflows/ci.yml` — 6 jobs: Lint, Typecheck, Unit tests, Security audit, Build, E2E |
| Deploy                 | Node standalone         | `cd web && pnpm run build:node` + `node scripts/package-standalone.mjs`                      |

**Input validation** uses [Zod](https://zod.dev) at API and action trust boundaries.

**Content sanitization** uses an allowlist-based `sanitize-html` pipeline before rendering prose. `sanitize-html` is pinned to exact `2.17.7` to avoid the XSS vulnerability in `2.17.3`. Comment content is additionally stripped of HTML tags via Zod `.transform(stripHtmlTags)` before storage.

**Security headers** ship from `web/src/proxy.ts` (dynamic CSP/nonces) and `web/next.config.ts` (remaining static headers).

**Proxy** (`web/src/proxy.ts`) composes AuthKit session headers with CSRF protection on state-changing admin requests and dynamic CSP headers with per-request nonces. It strips client-supplied/internal `x-workos-*` headers, keeps prefetch in the matcher, and never exposes AuthKit headers to browsers.

---

## Documentation

Start at [`docs/INDEX.md`](./docs/INDEX.md) — it has one line for every document in `docs/`.

| Document                                                       | Purpose                                                                                                                                       |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [docs/INDEX.md](./docs/INDEX.md)                               | Index of every doc in `docs/` (start here)                                                                                                    |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)                 | System architecture, auth flow, data model, API routes, deployment                                                                            |
| [docs/CODING.md](./docs/CODING.md)                             | Codemap: file patterns, conventions, component organization                                                                                   |
| [docs/SETUP.md](./docs/SETUP.md)                               | Environment setup, database config, running tests, integrations                                                                               |
| [docs/KNOWLEDGE_BASE.md](./docs/KNOWLEDGE_BASE.md)             | Living reference of project-specific gotchas (SQLite, Drizzle, Turso, React 19, Next.js). Agents add to this when they discover new patterns. |
| [docs/IMPROVEMENTS.md](./docs/IMPROVEMENTS.md)                 | Prioritized backlog of tech debt, features, security, and perf work                                                                           |
| [docs/MODERNIZATION-AUDIT.md](./docs/MODERNIZATION-AUDIT.md)   | Security / efficiency / speed / QoL audit — snapshot dated 2026-08-24, re-verify versions against `web/package.json`                          |
| [docs/VERCEL-CLI-REFERENCE.md](./docs/VERCEL-CLI-REFERENCE.md) | Vercel CLI operational reference                                                                                                              |
| [docs/STYLEGUIDE.md](./docs/STYLEGUIDE.md)                     | Design tokens, component patterns, and conventions                                                                                            |
| [docs/ROADMAP.md](./docs/ROADMAP.md)                           | Active branch tracking and implementation status                                                                                              |
| [docs/CHANGELOG.md](./docs/CHANGELOG.md)                       | Version history and completed work log                                                                                                        |
| [docs/branches/](./docs/branches/)                             | Per-branch implementation checklists (all merged)                                                                                             |
| [docs/runbooks/](./docs/runbooks/)                             | Manual operational smoke tests                                                                                                                |
| `docs/DISASTER-RECOVERY.md`                                    | Post deletion recovery via Turso PITR — **internal, gitignored, not in a fresh clone**                                                        |
| [AGENTS.md](./AGENTS.md)                                       | Agent operating instructions (workflow, patterns, constraints)                                                                                |

---

## License

MIT License - see [LICENSE](./LICENSE)
