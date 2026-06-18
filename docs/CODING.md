# J2 Adventures — Codemap

File patterns, conventions, and component organization. Use this as a quick reference.

---

## Directory Map

```
web/
├── src/
│   ├── app/          # Next.js App Router — pages + API routes
│   ├── components/   # React components (admin, auth, blog, layout, providers, theme, ui)
│   ├── drizzle/      # Schema (18 tables), Drizzle ORM with Turso/libSQL
│   ├── lib/          # Client libs: auth, cloudinary, supabase, rate-limit, env, geocode, email
│   ├── server/       # Server-only: DAL, forms, services, queries, auth, feeds, cloudinary
│   ├── types/        # TypeScript type definitions
│   ├── proxy.ts      # CSP + CSRF middleware
│   └── instrumentation.ts  # Sentry init
├── tests/
│   ├── unit/         # Vitest (164 test files)
│   └── e2e/          # Playwright (21 spec files)
│       └── helpers/  # E2E auth helpers
├── drizzle/          # Migration files (24 SQL + meta/)
├── scripts/          # Build, seed, migration, E2E capture scripts
└── playwright.config.ts  # E2E config
```

---

## App Router Layout

```
src/app/
├── (blog)/           # Route group: public blog pages
│   ├── page.tsx              # /
│   ├── posts/[slug]/         # /posts/[slug]
│   ├── preview/[id]/         # /preview/[id]?token=
│   ├── category/[category]/  # /category/[name]
│   ├── tag/[slug]/           # /tag/[slug]
│   ├── tags/                 # /tags (browse all tags)
│   ├── categories/           # /categories (browse all categories)
│   ├── series/[slug]/        # /series/[slug]
│   ├── author/[id]/          # /author/[id]
│   ├── wishlist/             # /wishlist, /wishlist/[slug]
│   ├── bookmarks/            # /bookmarks
│   ├── map/                  # /map
│   ├── route-planner/        # /route-planner
│   ├── search/               # /search?q=...
│   ├── about/                # /about
│   └── accessibility/        # /accessibility
├── (public-auth)/    # Route group: Supabase auth
│   ├── login/
│   ├── signup/
│   └── callback/
├── admin/            # Admin pages (Auth.js protected)
├── account/          # Public account settings
├── settings/         # Theme/settings
└── api/              # API routes
```

---

## Component Categories

| Dir | Files | Pattern |
|-----|-------|---------|
| `components/admin/` | 12 | Admin editor, dashboard, widgets |
| `components/auth/` | 1 | AdminAuthButton |
| `components/blog/` | 25 | Post rendering, feed, comments, map, search |
| `components/layout/` | 3 | SiteHeader, MobileNav, SiteFooter, BackToTop |
| `components/providers/` | 3 | AppProviders, Theme, Navigation |
| `components/theme/` | 1 | ThemeProvider |
| `components/ui/` | 3 | ThemeSelect, FeedbackPanel, SearchInput |
| `components/pwa-registry.tsx` | 1 | PWA manifest registration |

---

## Server Layer

| Dir | Purpose |
|-----|---------|
| `server/dal/` | Data access layer — DB queries via Drizzle |
| `server/forms/` | Zod schemas for request body validation |
| `server/services/` | External integrations (email, newsletter) |
| `server/queries/` | Read-only aggregated queries (dashboard, posts, wishlist) |
| `server/posts/` | Post write operations (clone, delete, publish, preview) |
| `server/auth/` | Admin + public user DB operations |
| `server/feeds/` | RSS feed generation |
| `server/supabase/` | Supabase keepalive cron |

---

## Key Conventions

**DB access**: Server Components → `getDb()` (direct). Client components → API routes.

**Env vars**: Always via `getServerEnv()`, `getDatabaseEnv()`, etc. from `lib/env.ts`. Never `process.env` directly.

**Validation**: Zod at every trust boundary (API route, Server Action, form submission).

**Content safety**: `sanitize-html` allowlist for HTML. Comments stripped via `stripHtmlTags()` Zod transform.

**Rate limiting**: `checkRateLimit()` from `lib/rate-limit.ts` on public endpoints. Upstash Redis in prod, in-memory fallback in dev/test.

**Auth**: Admin → Auth.js + GitHub OAuth (`requireAdminSession()`). Public → Supabase (`getRequestSupabaseUser()`). Cron → Bearer token (`checkCronAuth()`).

**Security headers**: CSP + nonce in `proxy.ts`. Static headers in `next.config.ts`.

---

## API Route Map

### Public (no auth required unless noted)
- `GET /api/posts` — paginated published posts
- `GET /api/posts/[postId]/comments`
- `POST /api/posts/[postId]/comments` — Supabase auth
- `GET/POST /api/posts/[postId]/bookmark` — Supabase auth
- `POST /api/posts/[postId]/view` — cookie-deduped view count
- `POST /api/comments/[commentId]/like` — Supabase auth
- `DELETE /api/comments/[commentId]` — Supabase auth
- `GET /api/bookmarks` — Supabase auth
- `GET/PATCH /api/account/profile` — Supabase auth
- `POST /api/account/avatar` — Supabase auth
- `POST /api/newsletter`
- `POST /api/route-plans`

### Admin (Auth.js JWT required)
- `GET /api/admin/posts` — list all posts
- `POST /api/admin/posts/clone` — clone a post
- `POST /api/admin/posts/preview` — generate preview token
- `POST /api/admin/posts/bulk-status` — bulk status update
- `GET /api/admin/posts/[postId]/comments` — moderation
- `GET /api/admin/posts/[postId]/revisions`
- `GET /api/admin/posts/[postId]/revisions/[revisionId]`
- `POST /api/admin/posts/[postId]/revisions/[revisionId]/restore`
- `POST /api/admin/comments/moderate`
- `GET /api/admin/series/[seriesId]/part-numbers`
- `POST /api/admin/uploads/images`
- `POST /api/admin/song-preview`
- `GET /api/admin/location-autocomplete`
- `GET /api/admin/posts/warnings`

### Cron (Bearer CRON_SECRET)
- `GET /api/cron/publish-scheduled` — daily midnight
- `GET /api/cron/keep-supabase-awake` — daily 6 AM

---

## Drizzle Schema (18 tables)

Core tables: `users`, `profiles`, `posts`, `post_revisions`, `post_preview_tokens`, `post_images`, `post_tags`, `post_bookmarks`, `post_links`, `media_assets`, `categories`, `tags`, `series`, `comments`, `comment_likes`, `auth_accounts`, `wishlist_places`, `seasons`.

`sessions` is managed by the Auth.js Turso adapter (not in schema.ts). All tables indexed on FK columns and query-filtered fields.
