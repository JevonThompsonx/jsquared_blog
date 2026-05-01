# J2 Adventures Architecture

**Last Updated:** 2026-05-01

## System Architecture Overview

```
                    Browser
                       |
                 Vercel Edge (proxy.ts)
                  middleware (CSRF + CSP)
                       |
            Next.js 16 App Router
              /              \
        Server Components    API Routes
              |                  |
    +---------+---------+   +---+---+
    |         |         |   |       |
  Turso    Supabase  Cloudinary   Upstash
  (Posts,  (Public   (Images,     (Rate
   Users,   Auth)     CDN)         Limiting)
   Comments)
              |                   |
              +--------+----------+
                       |
                    Resend
                  (Email)
```

### Component Breakdown

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Bun (dev), Node.js (prod) | Package manager, local dev server |
| **Framework** | Next.js 16 App Router | Pages, API routes, server components |
| **Primary DB** | Turso (libSQL) + Drizzle ORM | Content store: posts, users, comments, media, wishlist |
| **Public Auth** | Supabase Auth | Email/password + OAuth for public users |
| **Admin Auth** | Auth.js (NextAuth) + GitHub OAuth | Admin login, JWT sessions, GitHub ID allowlist |
| **Image CDN** | Cloudinary | Image upload, transformation, delivery |
| **Email** | Resend | Newsletter, comment notifications |
| **Rate Limiting** | Upstash Redis (prod), in-memory (dev/test) | Distributed sliding-window rate limiter |
| **Observability** | Sentry (optional) | Error tracking, performance monitoring |
| **Maps** | Stadia Maps (tiles) + MapLibre GL, Geoapify (routing), Nominatim (geocoding) | Interactive maps, route planner |
| **Styling** | TailwindCSS 4 | Utility-first CSS |
| **Editor** | Tiptap | Rich text editor for post content |
| **Deployment** | Vercel with cron jobs | Hosting, scheduled tasks |

---

## Auth Flow (Dual Auth)

The app has two independent authentication systems that serve different audiences.

### Admin Auth (Auth.js + GitHub OAuth)

```
User clicks "Sign in with GitHub"
           |
    GET /api/auth/signin
           |
    Auth.js redirects to GitHub OAuth
           |
    User authorizes on GitHub
           |
    GitHub redirects back to /api/auth/callback
           |
    Auth.js validates OAuth code
           |
    signIn callback:
      - Parses GitHub profile (id, login, email)
      - Checks id against AUTH_ADMIN_GITHUB_IDS allowlist
      - If not allowed: returns false (login rejected)
      - If allowed: calls ensureGitHubAdminUser() to upsert user in DB
           |
    JWT callback:
      - Stores userId, role, githubLogin, avatarUrl in token
           |
    session callback:
      - Attaches userId, role, githubLogin, avatarUrl to session.user
           |
    Redirect to /admin
```

**Key files:**
- `web/src/lib/auth/admin.ts` - Auth.js config with GitHub provider, callbacks, allowlist check
- `web/src/lib/auth/session.ts` - `getAdminServerSession()`, `requireAdminSession()`
- `web/src/server/auth/admin-users.ts` - DB operations for admin user upsert/lookup
- `web/src/app/api/auth/[...nextauth]/route.ts` - NextAuth API route handler

**Security:**
- Admin access is restricted to GitHub user IDs in `AUTH_ADMIN_GITHUB_IDS` (comma-separated)
- `requireAdminSession()` checks both session existence AND role === "admin"
- CSRF protection on state-changing admin requests via `proxy.ts`

### Public Auth (Supabase)

```
User signs up / logs in
           |
    Supabase Auth handles credentials
           |
    Returns JWT (access_token + refresh_token)
           |
    Client stores token in memory/HTTP-only
           |
    API requests include Authorization: Bearer <token>
           |
    Server validates via createClient with token:
      supabase.auth.getUser()
           |
    Links to local user via auth_accounts table (provider="supabase")
```

**Key files:**
- `web/src/lib/supabase/server.ts` - `getRequestSupabaseUser()` - validates Bearer token
- `web/src/lib/supabase/client.ts` - Browser-side Supabase client singleton
- `web/src/server/auth/public-users.ts` - DB operations for public user lookup
- `web/src/app/(public-auth)/login/` - Login page
- `web/src/app/(public-auth)/signup/` - Signup page

### Dual Auth Flow Summary

```
Request to API route
    |
    ├── Is it an admin route (/api/admin/*)?
    │     YES → requireAdminSession() via Auth.js JWT
    │     Auth.js reads session cookie, validates JWT
    │     If no valid session: 401/403
    │
    ├── Is it a public auth route (bookmarks, comments, profile)?
    │     YES → getRequestSupabaseUser() via Bearer token
    │     Validates token with Supabase Auth
    │     If no valid token: anonymous access (limited)
    │
    └── Is it a fully public route?
          → No auth required (read-only)
```

---

## Data Model

### 19 Drizzle Tables (Turso/libSQL)

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `users` | id, primaryEmail, role (reader/author/admin) | Core identity record for all users |
| `auth_accounts` | userId, provider (supabase/github), providerUserId | Links external auth providers to local users |
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
| `sessions` | (managed by Auth.js/Turso adapter) | Admin auth sessions |

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
| POST | `/api/posts/[postId]/comments` | Supabase (optional) | Add comment or reply |
| GET | `/api/posts/[postId]/bookmark` | Supabase | Check bookmark status |
| POST | `/api/posts/[postId]/bookmark` | Supabase | Toggle bookmark |
| POST | `/api/posts/[postId]/view` | None | Increment view count (cookie-deduped) |
| POST | `/api/comments/[commentId]/like` | Supabase | Like a comment |
| DELETE | `/api/comments/[commentId]` | Supabase | Delete own comment |
| GET | `/api/bookmarks` | Supabase | List user's bookmarks |
| GET | `/api/account/profile` | Supabase | Get own profile |
| PATCH | `/api/account/profile` | Supabase | Update profile |
| POST | `/api/account/avatar` | Supabase | Upload avatar image |
| POST | `/api/newsletter` | None | Newsletter signup |
| POST | `/api/route-plans` | None | Get route suggestions |

### Admin API Routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/admin/posts` | Auth.js JWT | List all posts (incl. drafts/scheduled) |
| POST | `/api/admin/posts/clone` | Auth.js JWT | Clone a post |
| POST | `/api/admin/posts/preview` | Auth.js JWT | Generate preview token |
| POST | `/api/admin/posts/bulk-status` | Auth.js JWT | Bulk update post status |
| GET | `/api/admin/posts/[postId]/comments` | Auth.js JWT | List comments for moderation |
| GET | `/api/admin/posts/[postId]/revisions` | Auth.js JWT | List revision history |
| GET | `/api/admin/posts/[postId]/revisions/[revisionId]` | Auth.js JWT | Get specific revision |
| POST | `/api/admin/posts/[postId]/revisions/[revisionId]/restore` | Auth.js JWT | Restore a revision |
| POST | `/api/admin/comments/moderate` | Auth.js JWT | Moderate comment visibility |
| GET | `/api/admin/series/[seriesId]/part-numbers` | Auth.js JWT | Get series part numbers |
| POST | `/api/admin/uploads/images` | Auth.js JWT | Upload editorial image |
| POST | `/api/admin/song-preview` | Auth.js JWT | Song preview/autofill |
| GET | `/api/admin/location-autocomplete` | Auth.js JWT | Location autocomplete |
| GET | `/api/admin/posts/warnings` | Auth.js JWT | Content warning checks |

### Cron Routes

| Method | Route | Auth | Purpose | Schedule |
|--------|-------|------|---------|----------|
| GET | `/api/cron/publish-scheduled` | Bearer CRON_SECRET | Publish scheduled posts | Daily at midnight (0 0 * * *) |
| GET | `/api/cron/keep-supabase-awake` | Bearer CRON_SECRET | Prevent Supabase cold starts | Daily at 6 AM (0 6 * * *) |

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
| `/series/[slug]` | RSC | Series detail |
| `/bookmarks` | RSC | Signed-in user's saved posts |
| `/account` | RSC | Account settings page |
| `/settings` | RSC | Theme/settings page |
| `/login` | RSC | Public auth login |
| `/signup` | RSC | Public auth signup |
| `/admin` | RSC | Admin dashboard |
| `/admin/posts/` | RSC | Admin post editor/list |
| `/admin/wishlist/` | RSC | Admin wishlist editor |
| `/admin/tags/` | RSC | Admin tag management |
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
    ├── Upstash Redis configured?
    │     YES → checkUpstash(key, limit, windowMs)
    │            Uses @upstash/ratelimit with sliding window
    │            Globally consistent across Vercel instances
    │
    ├── Deployed environment (VERCEL=1 or NODE_ENV=production)?
    │     YES → Throws error (rate limiting is mandatory in prod)
    │
    └── Local dev / test
          → checkInMemory(key, limit, windowMs)
            In-process Map with periodic sweep
            NOT consistent across instances (but fine for single-process dev)
```

### Implementation Details

- **Production**: Uses `@upstash/ratelimit` with Redis sliding window
- **Redis key prefix**: `j2:rl:*`
- **Fallback**: In-memory `Map<string, { count, resetAt }>` with sweep every 100 writes
- **IP extraction**: `x-forwarded-for` header (first IP), falls back to `x-real-ip`, then `"unknown"`
- **Rate limit keys**: Typically `"<route>:<ip>"` (e.g., `"comment:203.0.113.1"`)
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
    Cloudinary upload (uploadEditorialImage):
      - SHA1 signature with API secret
      - Uploads to folder "j2adventures/editorial"
      - Requests image_metadata=1 for EXIF data
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
Database stores Cloudinary secure_url (e.g., https://res.cloudinary.com/.../upload/v1234/image.jpg)

cdnImageUrl() transform:
  If Cloudinary URL and not already transformed:
    Injects f_auto,q_auto into URL path
    Result: https://res.cloudinary.com/.../upload/f_auto,q_auto/v1234/image.jpg

  f_auto → browser gets WebP/AVIF based on Accept header
  q_auto → Cloudinary picks optimal quality/compression ratio

cdnBlurDataUrl() for low-quality placeholders:
  Generates SVG data URI with w_10,e_blur:1000 transformation
  Used as blurDataURL for Next.js Image component

buildCloudinaryImageUrl() for custom sizes:
  Programmatic URL construction with width, quality, format options
  Used in gallery/map components
```

**Key files:**
- `web/src/lib/cloudinary/uploads.ts` - Upload logic, validation, EXIF capture
- `web/src/lib/cloudinary/transform.ts` - `cdnImageUrl()`, `cdnBlurDataUrl()`
- `web/src/lib/cloudinary/urls.ts` - `buildCloudinaryImageUrl()`
- `web/src/lib/cloudinary/exif.ts` - EXIF parsing (GPS coords, camera metadata)
- `web/src/lib/cloudinary/server.ts` - Cloudinary config loading

---

## Deployment Architecture

### Vercel

```
vercel.json (web/)
  ├── Build: Next.js default
  ├── Cron: /api/cron/publish-scheduled (daily midnight)
  └── Cron: /api/cron/keep-supabase-awake (daily 6 AM)
```

### Environment Split

| Env | DB | Rate Limiting | Auth |
|-----|----|--------------|------|
| Local dev | Turso remote/local | In-memory fallback | GitHub OAuth localhost |
| Preview deploy | Turso remote | Upstash Redis | GitHub OAuth preview URL |
| Production | Turso remote | Upstash Redis (required) | GitHub OAuth + Supabase |

### Cron Jobs

1. **Publish scheduled posts** (`GET /api/cron/publish-scheduled`): Runs daily at midnight. Queries posts where `scheduled_publish_time <= now AND status = 'scheduled'`, sets status to "published" and `publishedAt` to now.

2. **Keep Supabase awake** (`GET /api/cron/keep-supabase-awake`): Runs daily at 6 AM. Hits Supabase to prevent cold starts on the free tier.

**Cron auth**: Both endpoints require `Authorization: Bearer <CRON_SECRET>` header. In local dev, directly calling from localhost bypasses the check.

### Build Pipeline

```
bun run build (web/scripts/build.ts)
    |
    Sentry source map upload (if SENTRY_AUTH_TOKEN set)
    |
    next build
    |
    Deploy to Vercel
```

---

## Security Model

### 1. Dual Auth with Role Enforcement

- **Admin routes**: Protected by Auth.js JWT session, `requireAdminSession()` checks `role === "admin"`
- **Public user routes**: Protected by Supabase JWT verification via `getRequestSupabaseUser()`
- **Cron routes**: Protected by Bearer token with constant-time comparison
- **Public routes**: No auth required (read-only for anonymous users)

### 2. CSRF Protection (middleware)

```
proxy.ts middleware runs on EVERY request (via middleware.ts)
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

Dynamic per-request CSP is set in `proxy.ts`:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}' 'wasm-unsafe-eval' https://plausible.io;
  script-src-attr 'none';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://res.cloudinary.com ...;
  font-src 'self' data: https://fonts.stadiamaps.com;
  connect-src 'self' https://*.supabase.co ... https://res.cloudinary.com;
  media-src 'self' data: blob:;
  worker-src 'self' blob:;
  frame-src 'self' https://open.spotify.com;
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests (production only)
```

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
- Post content is stored as canonical Tiptap JSON, with derived HTML/plain-text
- Legacy HTML migration is behind an allowlist sanitization

### 6. Rate Limiting

- Upstash Redis-backed sliding window in production (globally consistent)
- In-memory fallback in dev/test only
- Fails CLOSED in deployed environments (throws error if Redis not configured)

---

## Directory Structure

```
jsquared_blog/
  web/                          # Next.js application
    src/
      app/                      # Next.js App Router pages + API routes
        (blog)/                 # Public blog pages (posts, map, wishlist, etc.)
        (public-auth)/          # Supabase auth pages (login, signup)
        account/                # Public account settings
        admin/                  # Admin dashboard and editors
        api/                    # API routes (public, admin, cron)
        settings/               # Theme/settings page
      components/               # React components
      drizzle/
        schema.ts               # All 19 Drizzle table definitions
      lib/                      # Client libraries and utilities
        auth/                   # Admin auth (Auth.js config, session helpers)
        cloudinary/             # Image upload, transform, EXIF parsing
        email/                  # Resend email integration
        supabase/               # Supabase auth (client + server)
        rate-limit.ts           # Rate limiter (Upstash + in-memory fallback)
        env.ts                  # Zod-validated env schema
        env-loader.ts           # Dotenv file loading with precedence
        cron-auth.ts            # Bearer token auth for cron endpoints
        geocode.ts              # Nominatim geocoding
      server/                   # Server-only business logic
        auth/                   # Admin/public user DB operations
        dal/                    # Data access layer (posts, comments, etc.)
        forms/                  # Form validation logic
        posts/                  # Post operations (clone, publish, preview, etc.)
        queries/                # Read queries (posts, wishlist, dashboard)
        services/               # External service integrations (email, newsletter)
        supabase/               # Supabase keepalive
        feeds/                  # RSS feed generation
      middleware.ts             # Delegates to proxy.ts
      proxy.ts                  # CSRF + CSP middleware
      instrumentation.ts        # Sentry initialization
    drizzle/                    # Drizzle Kit migration files
    scripts/                    # Build, migration, seed, E2E helper scripts
    tests/                      # Unit (Vitest) + E2E (Playwright) tests
    next.config.ts              # Next.js config + static security headers
    vitest.config.ts            # Vitest configuration
    playwright.config.ts        # Playwright configuration
    drizzle.config.ts           # Drizzle Kit configuration

  docs/
    ARCHITECTURE.md             # This file
    SETUP.md                    # Setup and configuration guide
    VERCEL-CLI-REFERENCE.md     # Vercel CLI commands reference
```

---

## External Dependencies

| Package | Version Range | Purpose |
|---------|--------------|---------|
| next | ^16.2.3 | Framework |
| @libsql/client | ^0.17.2 | Turso/libSQL database client |
| drizzle-orm | ^0.45.2 | ORM / query builder |
| next-auth | ^4.24.13 | Admin auth (GitHub OAuth) |
| @supabase/supabase-js | ^2.102.1 | Public auth client |
| @upstash/ratelimit | ^2.0.8 | Distributed rate limiting |
| @upstash/redis | ^1.37.0 | Redis client for rate limiting |
| @sentry/nextjs | ^10.47.0 | Error tracking |
| @tiptap/* | ^3.22.3 | Rich text editor |
| maplibre-gl | ^5.22.0 | Map rendering |
| react-map-gl | ^8.1.0 | React map component |
| sanitize-html | ^2.17.2 | HTML content sanitization |
| zod | ^4.3.6 | Schema validation |
| tailwindcss | ^4.2.2 | CSS framework |

---

## Related Areas

- [SETUP.md](./SETUP.md) - Environment setup and configuration
- [VERCEL-CLI-REFERENCE.md](./VERCEL-CLI-REFERENCE.md) - Vercel CLI commands
