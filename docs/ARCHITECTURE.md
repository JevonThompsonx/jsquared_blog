# J2 Adventures Architecture

**Last Updated:** 2026-11-24

## System Architecture Overview

```
                    Browser
                       |
             Cloudflare edge (DNS, TLS, WAF, Access)
                       |
              Cloudflare Tunnel (templetonbak)
                       |
        Next.js 16 standalone Node (templetonbak host, :3010)
           proxy.ts — CSRF + CSP + nonce
              /                       \
        Server Components           API Routes
              |                         |
    +---------+----------+       +------+------+
    |         |          |       |             |
  SQLite   Local media   WorkOS AuthKit
  (Posts,  (/media,      (Readers + admins)
   Users,   sharp WebP)
  Comments)
              |
        Resend (email) + Listmonk (self-hosted newsletter)
```

### Component Breakdown

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js, pnpm (primary) | Package manager, local dev server |
| **Framework** | Next.js 16 App Router | Pages, API routes, server components |
| **Primary DB** | SQLite (libSQL `file:` URL) + Drizzle ORM | Content store on the local origin; Turso is only used by the rollback Worker |
| **Public + Admin Auth** | WorkOS AuthKit (keyless PKCE) | Hosted email/password identity, `wos-session`, verified-email mapping, restrictive admin gate |
| **Media** | Local content-addressed WebP + `sharp` | Upload, EXIF stripping, `/media` delivery, Next image optimizer |
| **Email** | Resend (SMTP relay + comments), Listmonk (self-hosted newsletter) | Newsletter subscriptions, comment notifications |
| **Rate Limiting** | In-process sliding window (`RATE_LIMIT_DRIVER=memory`) | Single Node process on templetonbak; Upstash only for the rollback Worker |
| **Observability** | Sentry (optional) | Error tracking, performance monitoring |
| **Maps** | Stadia Maps (tiles) + MapLibre GL, Geoapify (routing), Nominatim (geocoding) | Interactive maps, route planner |
| **Styling** | TailwindCSS 4 | Utility-first CSS |
| **Editor** | Tiptap | Rich text editor for post content |
| **Deployment** | templetonbak: systemd `jsquared-blog.service` + Cloudflare Tunnel; systemd timers for cron | Hosting, scheduled tasks |

---

## Auth Flow (WorkOS AuthKit)

Readers and admins use one WorkOS AuthKit identity provider and one host-scoped
`wos-session` cookie. The app runs as a public PKCE client and never receives a
WorkOS API key.

```
/login or /signup
        |
GET /api/auth/login or /api/auth/signup
        |
WorkOS hosted AuthKit (Email + Password)
        |
GET /callback (explicit validated public baseURL)
        |
onSuccess: resolveWorkosIdentity()
  - require verified email
  - normalize lowercase + trim
  - resolve provider/subject link
  - otherwise link existing local user by normalized email
  - otherwise create workos-user-<subject> + profile
  - never promote during login; operator provisioning grants admin
  - reject legacy/conflicting identities
        |
sealed wos-session cookie
        |
reader APIs: getRequestPublicUser()
admin requests: requireAdminSession()
  - verified WorkOS email
  - current ADMIN_ALLOWED_EMAILS membership
  - live local users.role === admin
  - checkRecentAuth({ maxAge: 86400 })
```

**Key files:**

- `web/src/lib/auth/workos.ts` — allowed-email parsing, safe return paths, initiation/logout URLs
- `web/src/app/callback/route.ts` — `handleAuth`, public `baseURL`, identity mapping
- `web/src/app/api/auth/{login,signup,logout}/route.ts` — same-origin hosted-flow endpoints
- `web/src/server/auth/workos-identity.ts` — transactional local identity mapping
- `web/src/server/auth/workos-admin.ts` — restrictive admin authorization
- `web/src/server/auth/public-users.ts` — WorkOS session to local reader
- `web/src/proxy.ts` — AuthKit header partitioning + existing CSP/CSRF/rate-limit protections

**Security properties:**

- `wos-session` is HttpOnly, SameSite=Lax, Secure in production, Path=/, and
  host-scoped; there is no `WORKOS_COOKIE_DOMAIN`.
- `NEXT_PUBLIC_WORKOS_REDIRECT_URI` is the approved default/fallback. Per-request
  `Host`/`x-forwarded-host` selects the apex, `www`, `next`, or localhost callback;
  untrusted hosts are rejected. The callback base URL never uses the internal
  Node bind address.
- Return paths reject absolute, protocol-relative, backslash, control-character,
  encoded, and auth-loop values.
- AuthKit request headers are stripped from client input, trusted headers are
  forwarded only to server components, and `x-workos-*` headers never reach the
  browser. Pending PKCE cookies are stripped from ordinary anonymous responses;
  prefetch requests remain in the proxy matcher.
- Login, signup, and callback routes are rate-limited; stale live admin sessions
  are offered forced reauthentication rather than being treated as anonymous.
- Cloudflare Access remains the outer `/admin` gate during soak; its JWT is not
  an application admin credential.
- Better Auth tables/env and Auth.js settings remain for one code-rollback cycle.

Full operations, verified dashboard values, cutover, smoke, and rollback:
[`runbooks/workos-auth.md`](./runbooks/workos-auth.md).

---

## Data Model

### 21 Drizzle Tables (SQLite/libSQL)

The current schema defines all application and rollback auth tables. WorkOS
sessions live in the sealed cookie; the three Better Auth tables are retained
only for rollback.

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `users` | id, primaryEmail, role (reader/author/admin) | Core identity record for all users |
| `auth_accounts` | userId, provider (supabase/github/workos), providerUserId | Provider identity mapping; unique provider/subject index |
| `profiles` | userId, displayName, avatarUrl, bio, themePreference | Public-facing profile data |
| `posts` | id, title, slug, contentJson, contentFormat, status, categoryId, seriesId, featuredImageId, location*, song*, viewCount | Blog posts with scheduling, metadata |
| `post_revisions` | postId, revisionNum, title, contentJson, song*, savedByUserId | Revision history snapshots |
| `post_preview_tokens` | postId, tokenHash, expiresAt, revokedAt | Expiring preview links for unpublished posts |
| `post_images` | postId, mediaAssetId, sortOrder, focalX/Y, caption | Gallery ordering per post |
| `post_tags` | postId, tagId (composite PK) | Many-to-many post-tag junction |
| `post_bookmarks` | postId, userId (composite PK) | Saved posts per public user |
| `post_links` | postId, label, url, sortOrder | External links per post |
| `media_assets` | id, ownerUserId, provider, publicId, secureUrl, resourceType, width, height, bytes, exif* | Uploaded image/video metadata |
| `categories` | id, name, slug, description | Post categorization |
| `tags` | id, name, slug, description | Post tagging |
| `series` | id, title, slug, description | Post series grouping |
| `comments` | id, postId, authorId, content, parentId, visibility, isFlagged, moderatedAt | Post comments with moderation |
| `comment_likes` | commentId, userId (composite PK) | Comment likes |
| `wishlist_places` | id, name, location*, visited, isPublic, linkedPostId, itemType, parentId | Travel wishlist entries |
| `seasons` | id, seasonKey, displayName | Seasonal content grouping for homepage hero |
| `session` | userId, token, expiresAt | Legacy Better Auth reader sessions; rollback only |
| `account` | userId, providerId, password | Legacy Better Auth credentials; rollback only |
| `verification` | identifier, value, expiresAt | Legacy Better Auth verification tokens; rollback only |

### Key Relationships

```
users --1:N--> posts (authorId)
users --1:N--> comments (authorId)
users --1:1--> profiles (userId)
users --1:N--> media_assets (ownerUserId)
users --1:N--> auth_accounts (userId)
users --1:N--> wishlist_places (createdByUserId)

posts --N:1--> categories
posts --N:M--> tags (via post_tags)
posts --1:N--> post_images
posts --1:N--> comments
posts --1:N--> post_revisions
posts --1:N--> post_preview_tokens
posts --1:N--> post_bookmarks
posts --1:N--> post_links
posts --1:1--> media_assets (featuredImageId)
posts --N:1--> series

media_assets --1:N--> post_images
comments --1:N--> comments (parentId, self-referential for replies)
comments --1:N--> comment_likes

wishlist_places --N:1--> wishlist_places (parentId, for multi-destination entries)
wishlist_places --1:1--> posts (linkedPostId)
```

### Noteworthy Indexes

- `posts_status_published_at_idx` - Composite index for published feed queries
- `posts_scheduled_publish_time_idx` - Index for scheduled-publish cron job
- `posts_category_id_idx` - FK index for category lookups
- `post_revisions_post_id_revision_num_idx` - Composite for revision retrieval
- `post_revisions_post_id_saved_at_idx` - Composite for timeline listing

---

## API Route Structure

### Public API Routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/posts` | None | Paginated published posts feed |
| GET | `/api/posts/[postId]/comments` | None | List comments for a post |
| POST | `/api/posts/[postId]/comments` | WorkOS session (required) | Add comment or reply |
| GET | `/api/posts/[postId]/bookmark` | WorkOS session (optional) | Check bookmark status |
| POST | `/api/posts/[postId]/bookmark` | WorkOS session | Toggle bookmark |
| POST | `/api/posts/[postId]/view` | None | Increment view count (cookie-deduped) |
| POST | `/api/comments/[commentId]/like` | WorkOS session | Like a comment |
| DELETE | `/api/comments/[commentId]` | WorkOS session | Delete own comment |
| GET | `/api/bookmarks` | WorkOS session | List user's bookmarks |
| GET | `/api/account/profile` | WorkOS session | Get own profile |
| PATCH | `/api/account/profile` | WorkOS session | Update profile |
| POST | `/api/account/avatar` | WorkOS session | Upload avatar image |
| POST | `/api/newsletter` | None | Newsletter signup |
| POST | `/api/route-plans` | None | Get route suggestions |

### Auth Routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/auth/login` | None | Start hosted sign-in with a safe return path |
| GET | `/api/auth/signup` | None | Start hosted sign-up with a safe return path |
| GET | `/callback` | PKCE state + verifier cookie | Exchange code, map identity, set sealed session |
| GET | `/api/auth/logout` | WorkOS session | Clear session and continue to the public return URL |
| GET | `/api/auth/session` | WorkOS admin gate | Public-safe, token-free display fields for client navigation |
| GET | `/api/admin/session` | WorkOS admin gate + Cloudflare Access | Same handler retained at the planned admin path |

### Admin API Routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/admin/posts` | WorkOS admin | List all posts (incl. drafts/scheduled) |
| POST | `/api/admin/posts/clone` | WorkOS admin | Clone a post |
| POST | `/api/admin/posts/preview` | WorkOS admin | Generate preview token |
| POST | `/api/admin/posts/bulk-status` | WorkOS admin | Bulk update post status |
| GET | `/api/admin/posts/[postId]/comments` | WorkOS admin | List comments for moderation |
| GET | `/api/admin/posts/[postId]/revisions` | WorkOS admin | List revision history |
| GET | `/api/admin/posts/[postId]/revisions/[revisionId]` | WorkOS admin | Get specific revision |
| POST | `/api/admin/posts/[postId]/revisions/[revisionId]/restore` | WorkOS admin | Restore a revision |
| POST | `/api/admin/comments/moderate` | WorkOS admin | Moderate comment visibility |
| GET | `/api/admin/series/[seriesId]/part-numbers` | WorkOS admin | Get series part numbers |
| POST | `/api/admin/uploads/images` | WorkOS admin | Upload editorial image |
| POST | `/api/admin/song-preview` | WorkOS admin | Song preview/autofill |
| GET | `/api/admin/location-autocomplete` | WorkOS admin | Location autocomplete |
| GET | `/api/admin/posts/warnings` | WorkOS admin | Content warning checks |

### Cron Routes

| Method | Route | Auth | Purpose | Schedule |
|--------|-------|------|---------|----------|
| GET | `/api/cron/publish-scheduled` | Bearer CRON_SECRET | Publish scheduled posts | Every 5 minutes |

### Page Routes (App Router)

| Route | Type | Purpose |
|-------|------|---------|
| `/` | RSC | Homepage / paginated feed |
| `/posts/[slug]` | RSC | Published post detail page |
| `/preview/[id]?token=...` | RSC | Expiring post preview |
| `/map` | RSC | World map of geotagged posts |
| `/wishlist` | RSC | Public travel wishlist |
| `/route-planner` | RSC | Route planner with wishlist stops |
| `/category/[category]` | RSC | Category feed |
| `/tag/[slug]` | RSC | Tag feed |
| `/tags` | RSC | All tags browse page |
| `/categories` | RSC | All categories browse page |
| `/series/[slug]` | RSC | Series detail |
| `/bookmarks` | RSC | Signed-in user's saved posts |
| `/account` | RSC | Account settings page |
| `/settings` | RSC | Theme/settings page |
| `/login` | RSC | Public auth login |
| `/signup` | RSC | Public auth signup |
| `/search` | RSC | Search results page |
| `/about` | RSC | About page |
| `/accessibility` | RSC | Accessibility statement |
| `/admin` | RSC | Admin dashboard |
| `/admin/posts/` | RSC | Admin post editor/list |
| `/admin/wishlist/` | RSC | Admin wishlist editor |
| `/admin/tags/` | RSC | Admin tag management |
| `/admin/categories/` | RSC | Admin category management |
| `/admin/seasons/` | RSC | Admin season management |
| `/sitemap.xml` | RSC | Dynamic sitemap |
| `/feed.xml` | RSC | RSS feed |
| `/manifest.ts` | RSC | PWA manifest |

---

## Rate Limiting Strategy

### Architecture

```
checkRateLimit(key, limit, windowMs)
    |
    ├── RATE_LIMIT_DRIVER=memory?
    │     YES → checkInMemory(key, limit, windowMs)
    │            In-process sliding window; correct for the single templetonbak process
    │
    ├── Upstash configured?
    │     YES → checkUpstash(key, limit, windowMs)
    │            Only used by the rollback Worker
    │
    ├── Deployed environment without a driver?
    │     YES → Throws error (rate limiting is mandatory in prod)
    │
    └── Local dev / test
          → checkInMemory(key, limit, windowMs)
```

### Implementation Details

- **Production**: Uses `@upstash/ratelimit` with Redis sliding window
- **Redis key prefix**: `j2:rl:*`
- **Fallback**: In-memory `Map<string, { count, resetAt }>` with sweep every 100 writes
- **IP extraction**: `x-forwarded-for` header (first IP), falls back to `x-real-ip`, then `"unknown"`
- **Rate limit keys**: Typically `"<route>:<userId>:<ip>"` — location-autocomplete key includes `session.user.id` for per-admin tracking
- **429 response**: Returns JSON error with `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` headers

### Configuration Per Endpoint

Each endpoint sets its own limit and window:
- Comment creation: e.g., 5 per minute
- Newsletter signup: e.g., 3 per hour
- View tracking: generous limits
- Admin routes: separate stricter limits

**Key file:** `web/src/lib/rate-limit.ts`

---

## Image Handling Pipeline

### Upload Flow

```
User selects image
    |
    Client-side (browser-image-compression):
      - Compresses image to reduce upload size
    |
    POST /api/admin/uploads/images (admin only)
    |
    Server-side validation:
      - validateUploadedImage(file, { allowedTypes, maxBytes })
      - Checks MIME type (JPEG, PNG, WebP, GIF)
      - Checks file size (configurable max)
      - Checks magic bytes (signature verification against declared type)
    |
    Local storage (saveLocalImage):
      - sharp: rotate, validate, re-encode to WebP (quality 82)
      - EXIF/IPTC/XMP dropped by re-encoding; GPS is never persisted
      - Content-addressed path: editorial/YYYY/MM/<sha256[:16]>-<slug>.webp
      - Writes under LOCAL_MEDIA_ROOT, served at /media/<path>
    |
    Stores in media_assets table:
      - provider, publicId, secureUrl, resourceType, format
      - width, height, bytes, altText
      - EXIF data: takenAt, lat, lng, camera make/model, lens, aperture, shutter, ISO
    |
    Links to post via post_images table:
      - Sort order, focal point (x, y), caption
```

### Delivery Pipeline

```
Database stores a root-relative path (e.g., /media/2026/11/<hash>-slug.webp).

cdnImageLoader() / cdnImageUrl():
  - Local /media paths -> /_next/image?url=<encoded>&w=<width>&q=75
  - Legacy Cloudinary URLs keep the f_auto,q_auto,fl_force_strip transform
    until the rollback window closes

enhanceProseImagesHtml():
  - Adds srcset (640/1080/1200) and sizes for local prose images
  - Keeps the Cloudinary branch for legacy content

Social cards:
  - /api/og-image/<path> renders a cached 1200x630 JPEG with sharp
  - cdnSocialImageUrl() maps local media to that route
```

**Key files:**
- `web/src/lib/media/local-storage.ts` - local WebP storage, EXIF stripping, reference-safe delete
- `web/src/app/media/[...path]/route.ts` - immutable `/media` delivery
- `web/src/app/api/og-image/[...path]/route.ts` - cached 1200x630 JPEG social cards
- `web/src/lib/cloudinary/transform.ts` - local loader/srcset plus legacy Cloudinary transforms
- `web/src/lib/cloudinary/uploads.ts` - upload validation (MIME, size, magic bytes)
- `web/src/lib/cloudinary/server.ts` - legacy Cloudinary config (optional; rollback only)

---

## Deployment Architecture

Production runs on a **local Node origin**, not Vercel and no longer on the
Cloudflare Worker. Vercel is suspended (`DEPLOYMENT_DISABLED`); the Worker is a
rollback artifact with no custom domains and no cron schedules. Operations:
[`runbooks/local-origin.md`](./runbooks/local-origin.md).

### Local origin (templetonbak)

```
Cloudflare DNS/TLS/WAF/Access
        |
Cloudflare Tunnel `templetonbak`
        |
http://127.0.0.1:3010
        |
systemd `jsquared-blog.service`
  ├── /srv/blog/current -> releases/<timestamp>/web/server.js
  ├── SQLite /srv/blog/shared/blog.db (WAL)
  ├── media  /srv/blog/shared/media/
  └── cache  /srv/blog/shared/cache/
```

### Environment Split

| Env | DB | Rate Limiting | Auth |
|-----|----|--------------|------|
| Local dev | SQLite `file:` or Turso remote | In-memory fallback | WorkOS AuthKit, localhost callback |
| Staging (`next.`) | same SQLite file as production | In-memory | WorkOS AuthKit, `next.` callback |
| Production | SQLite `file:` | In-memory (`RATE_LIMIT_DRIVER=memory`) | WorkOS AuthKit, apex/`www` callbacks |

### Cron Jobs (systemd timers on templetonbak)

1. **Publish scheduled posts** (`GET /api/cron/publish-scheduled`): every 5 minutes. Queries posts where `scheduled_publish_time <= now AND status = 'scheduled'`, sets status to "published" and `publishedAt` to now.
2. **SQLite backup** (`jsquared-blog-backup.timer`): daily at 03:30 UTC, `sqlite3 .backup`, 14-day retention.

**Cron auth**: The HTTP endpoint requires `Authorization: Bearer <CRON_SECRET>`. The Worker schedules are empty; do not re-enable them while the local origin is live.

### Build Pipeline

```
NEXT_OUTPUT=standalone pnpm run build:node
    |
next build -> .next/standalone
    |
node scripts/package-standalone.mjs <release>
    |
copy .next/static + public, link sharp/@libsql, strip env files
    |
tar to /srv/blog/releases/<timestamp>, swap `current`, restart
```

The old `web/scripts/build.ts` / `deploy:cf` path is only for a deliberate
Worker rollback and is not the production pipeline.

---

## Security Model

### 1. Dual Auth with Role Enforcement

- **Admin routes**: Protected by WorkOS admin session, `requireAdminSession()` checks `role === "admin"`
- **Public user routes**: Protected by the WorkOS `wos-session` cookie via `getRequestPublicUser()`; mutations also require an allowed `Origin`.
- **Cron routes**: Protected by Bearer token with constant-time comparison
- **Public routes**: No auth required (read-only for anonymous users)

### 2. CSRF Protection (proxy.ts)

```
web/src/proxy.ts — exports proxy() with middleware config matcher
    |
    Is it a state-changing method (POST, PUT, PATCH, DELETE)?
    AND is it an admin path (/admin or /api/admin/*)?
    |
    YES → Check:
      1. Origin header matches request origin (same-origin)
      2. Sec-Fetch-Site header is "same-origin", "same-site", or "none"
    |
    If either check fails → 403 Forbidden
```

**Key file:** `web/src/proxy.ts`

### 3. CSP Headers

Dynamic per-request CSP is set via `proxy.ts`. Production and dev use different `style-src` policies:

**Production (hardened):**
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}' 'wasm-unsafe-eval' https://plausible.io;
  script-src-attr 'none';
  style-src 'self' 'nonce-{random}';
  style-src-attr 'unsafe-inline';
  img-src 'self' data: blob: https://avatars.githubusercontent.com https://tiles.stadiamaps.com ...;
  font-src 'self' data: https://fonts.stadiamaps.com;
  connect-src 'self' https://*.sentry.io https://plausible.io https://tiles.stadiamaps.com ...;
   manifest-src 'self';
   object-src 'none';
   base-uri 'self';
   media-src 'self' data: blob:;
   worker-src 'self' blob:;
   frame-src 'self' https://open.spotify.com;
   form-action 'self';
   frame-ancestors 'none';
   upgrade-insecure-requests
```

**Dev:**
- `style-src 'self' 'unsafe-inline'` (no nonce, no `style-src-attr`)
- Same dev condition pattern as `script-src` (`'unsafe-eval'` vs `'wasm-unsafe-eval'`)

**Why this split:**

- `'unsafe-inline'` removed from production `style-src` — nonce covers all `<style>` elements (next/font, CSS-in-JS output). Next.js 16 render pipeline auto-extracts nonce from `script-src` directive and propagates as `ctx.nonce` to `<style>` elements, so no manual injection needed.
- `style-src-attr 'unsafe-inline'` is required for 63+ React `style={}` inline style patterns across the codebase. This directive only covers element-level style attributes, not `<style>` blocks — low risk (no code execution vector).
- Dev keeps `'unsafe-inline'` in `style-src` because Next.js dev mode injects hot-reload CSS directly without nonce support.

Additional static headers set in `next.config.ts`:
- `Referrer-Policy`, `X-Content-Type-Options`, `X-Frame-Options`
- `Permissions-Policy` (restrictive), `Cross-Origin-Opener-Policy`
- `Strict-Transport-Security` (production only, 2-year max-age)

### 4. Input Validation (Zod)

- All environment variables validated at startup via Zod schemas
- All API request bodies validated with Zod (in route handlers and `server/forms/`)
- File uploads validated for MIME type, size, AND magic bytes
- Cloudinary upload responses validated with Zod before use

### 5. Content Security

- User-provided HTML is sanitized through an allowlist-based `sanitize-html` pipeline
- `sanitize-html` pinned to exact version `2.17.5` — 2.17.3 had an XSS vulnerability, pinned to avoid accidental bump
- Comment content is stripped of HTML tags via a Zod `.transform(stripHtmlTags)` before storage (defense-in-depth against XSS in email rendering)
- Post content is stored as canonical Tiptap JSON, with derived HTML/plain-text
- Legacy HTML migration is behind an allowlist sanitization

### 6. Rate Limiting

- Upstash Redis-backed sliding window in production (globally consistent)
- In-memory fallback in dev/test only
- `env.ts` `assertRateLimitConfiguration()` throws at module load if Upstash creds missing in deployed envs — fails CLOSED
- Location-autocomplete rate limit key includes `session.user.id` for per-admin tracking (not just IP)

---

## Directory Structure

```
.sentryclirc                  # Sentry CLI config (org/project)
test-api.sh                   # Quick smoke test script

web/                          # Next.js application
  src/
    app/                      # Next.js App Router pages + API routes
      (blog)/                 # Public blog pages (posts, map, wishlist, search, about, accessibility, etc.)
      (public-auth)/          # Local auth pages (login, signup, verify, reset)
      account/                # Public account settings
      admin/                  # Admin dashboard and editors (posts, categories, tags, seasons, wishlist)
      api/                    # API routes (public, admin, cron)
      settings/               # Theme/settings page
    components/               # React components
      admin/                  # Admin editor, dashboard, widgets
      auth/                   # AdminAuthButton
      blog/                   # Post rendering, feed, comments, map
      layout/                 # SiteHeader, MobileNav, SiteFooter, BackToTop
      providers/              # AppProviders, Theme, Navigation
      theme/                  # ThemeProvider
      ui/                     # ThemeSelect, FeedbackPanel, SearchInput
      pwa-registry.tsx        # PWA manifest registration
    drizzle/
      schema.ts               # All 21 Drizzle table definitions
    lib/                      # Client libraries and utilities
      auth/                   # WorkOS identity mapping + restrictive admin authorization
      cloudinary/             # Legacy image helpers / upload validation
      email/                  # Resend email integration
      rate-limit.ts           # Rate limiter (Upstash + in-memory fallback)
      env.ts                  # Zod-validated env schema
      env-loader.ts           # Dotenv file loading with precedence
      cron-auth.ts            # Bearer token auth for cron endpoints
      geocode.ts              # Nominatim geocoding
    server/                   # Server-only business logic
      auth/                   # Admin/public user DB operations
      dal/                    # Data access layer (posts, comments, categories, tags, etc.)
      forms/                  # Form validation logic (Zod schemas)
      posts/                  # Post operations (clone, delete, publish, preview, etc.)
      queries/                # Read queries (posts, wishlist, dashboard)
      services/               # External service integrations (email, newsletter)
      feeds/                  # RSS feed generation
      cloudinary/             # Cloudinary asset destruction (post delete cleanup)
    proxy.ts                  # CSRF + CSP + Next.js middleware config (matcher + export)
    instrumentation.ts        # Sentry initialization
  drizzle/                    # Drizzle Kit migration files (25 SQL + meta/)
  scripts/                    # Build, migration, seed, E2E helper scripts
  tests/                      # Unit (Vitest, 178 test files) + E2E (Playwright, 17 spec files)
    unit/                     # Vitest unit tests
    e2e/                      # Playwright E2E tests
      helpers/                # E2E auth state helpers
  next.config.ts              # Next.js config + static security headers
  vitest.config.ts            # Vitest configuration
  playwright.config.ts        # Playwright configuration
  drizzle.config.ts           # Drizzle Kit configuration

docs/
  INDEX.md                   # Index of every doc in docs/ (start here)
  ARCHITECTURE.md             # This file
  CODING.md                   # Codemap and contributor reference
  SETUP.md                    # Setup and configuration guide
  VERCEL-CLI-REFERENCE.md     # Vercel CLI commands reference
  DISASTER-RECOVERY.md        # Post deletion recovery via Turso PITR — gitignored internal doc, absent on fresh clones
  KNOWLEDGE_BASE.md           # Living reference of project-specific gotchas (SQLite/Drizzle/Turso/React/Next.js). Agents add to this when they discover new patterns.
  IMPROVEMENTS.md             # Prioritized feature/backlog tracker
  MODERNIZATION-AUDIT.md      # Security/efficiency/speed/QoL audit snapshot (2026-08-24)
  ROADMAP.md                  # Active branch tracking (10 branches, all merged)
  CHANGELOG.md                # Version history
  REVIEW-PLAN.md              # Bug bash review tracking (complete)
  responsive-design-plan.md   # Responsive design phase plan
  branches/                   # Per-branch implementation checklists (all complete)
  runbooks/                   # Manual operational smoke tests
```

---

## External Dependencies

> Version figures below were recorded on **2026-06-18** and drift with every dependency bump. Treat `web/package.json` as the source of truth; the ranges listed here are the last verified snapshot.

| Package | Version Range | Purpose |
|---------|--------------|---------|
| next | 16.3.4 | Framework |
| @libsql/client | 0.18.0 | Turso/libSQL database client |
| drizzle-orm | 0.45.2 | ORM / query builder |
| @workos-inc/authkit-nextjs | 4.6.3 | Reader/admin AuthKit sessions |
| @workos-inc/node | 12.4.0 | WorkOS SDK / operator fixtures |
| better-auth | 1.7.27 | Local public auth (email/password, sessions, reset) |
| @upstash/ratelimit | ^2.0.8 | Distributed rate limiting |
| @upstash/redis | ^1.38.3 | Redis client for rate limiting |
| @sentry/nextjs | 10.73.0 | Error tracking |
| @tiptap/* | 3.31.0 | Rich text editor |
| maplibre-gl | 6.19.0 | Map rendering (`public/maplibre-worker.js` is the matching v6 module worker) |
| react-map-gl | ^8.1.2 | React map component |
| sanitize-html | 2.17.7 (exact) | HTML content sanitization — pinned exact to avoid the XSS vulnerability in 2.17.3 |
| zod | 4.5.4 | Schema validation |
| tailwindcss | 4.3.3 | CSS framework |
| typescript | 6.0.3 | Type checking |

---

## Related Areas

- [SETUP.md](./SETUP.md) - Environment setup and configuration
- [CODING.md](./CODING.md) - Codemap and contributor reference
- [VERCEL-CLI-REFERENCE.md](./VERCEL-CLI-REFERENCE.md) - Vercel CLI commands
- [INDEX.md](./INDEX.md) - Index of every doc in `docs/`
- `DISASTER-RECOVERY.md` - Post deletion recovery via Turso PITR — **gitignored internal doc, not present on a fresh clone**
- [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md) - Living reference of project-specific gotchas and workarounds (SQLite, Drizzle, Turso, React 19, Next.js). Agents add to this when they discover new patterns.
- [IMPROVEMENTS.md](./IMPROVEMENTS.md) - Prioritized feature/backlog tracker
- [ROADMAP.md](./ROADMAP.md) - Active branch tracking (10 branches, all merged)
- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [README.md](../README.md) - Project overview and quick start
