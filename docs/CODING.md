# J2 Adventures — Codemap

File patterns, conventions, and component organization. Use this as a quick reference.

---

## Directory Map

```
web/
├── src/
│   ├── app/          # Next.js App Router — pages + API routes
│   ├── components/   # React components (admin, auth, blog, layout, providers, theme, ui)
│   ├── drizzle/      # Schema (21 tables), Drizzle ORM with libSQL/SQLite
│   ├── lib/          # Client libs: auth, cloudinary, supabase, rate-limit, env, geocode, email
│   ├── server/       # Server-only: DAL, forms, services, queries, auth, feeds, cloudinary
│   ├── types/        # TypeScript type definitions
│   ├── proxy.ts      # CSP + CSRF middleware
│   └── instrumentation.ts  # Sentry init
├── tests/
│   ├── unit/         # Vitest (189 test files)
│   └── e2e/          # Playwright (18 spec files)
│       └── helpers/  # E2E auth helpers
├── drizzle/          # Migration files (27 SQL + meta/)
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
├── (public-auth)/    # Hosted AuthKit notices: login, signup, password/verification
├── callback/         # WorkOS PKCE callback + identity mapping
├── admin/            # Admin pages (WorkOS + local role + recent auth)
├── account/          # Public account settings
├── settings/         # Theme/settings
└── api/              # API routes
```

---

## Component Categories

| Dir                           | Files | Pattern                                      |
| ----------------------------- | ----- | -------------------------------------------- |
| `components/admin/`           | 12    | Admin editor, dashboard, widgets             |
| `components/auth/`            | 2     | AdminAuthButton, AuthKitNotice               |
| `components/blog/`            | 25    | Post rendering, feed, comments, map, search  |
| `components/layout/`          | 3     | SiteHeader, MobileNav, SiteFooter, BackToTop |
| `components/providers/`       | 3     | AppProviders, Theme, Navigation              |
| `components/theme/`           | 1     | ThemeProvider                                |
| `components/ui/`              | 3     | ThemeSelect, FeedbackPanel, SearchInput      |
| `components/pwa-registry.tsx` | 1     | PWA manifest registration                    |

---

## Server Layer

| Dir                | Purpose                                                         |
| ------------------ | --------------------------------------------------------------- |
| `server/dal/`      | Data access layer — DB queries via Drizzle                      |
| `server/forms/`    | Zod schemas for request body validation                         |
| `server/services/` | External integrations (email, newsletter)                       |
| `server/queries/`  | Read-only aggregated queries (dashboard, posts, wishlist)       |
| `server/posts/`    | Post write operations (clone, delete, publish, preview)         |
| `server/auth/`     | WorkOS identity mapping, reader resolution, admin authorization |
| `server/feeds/`    | RSS feed generation                                             |

---

## Key Conventions

**DB access**: Server Components → `getDb()` (direct). Client components → API routes.

**Env vars**: Always via `getServerEnv()`, `getDatabaseEnv()`, etc. from `lib/env.ts`. Never `process.env` directly.

**Validation**: Zod at every trust boundary (API route, Server Action, form submission).

**Content safety**: `sanitize-html` allowlist for HTML. Comments stripped via `stripHtmlTags()` Zod transform.

**Rate limiting**: `checkRateLimit()` from `lib/rate-limit.ts` on public endpoints. Upstash Redis in prod, in-memory fallback in dev/test.

**Auth**: Readers and admins → WorkOS AuthKit (`withAuth()` / `useAuth()`). Readers resolve through `getRequestPublicUser()`; admins additionally require `requireAdminSession()` with verified email, current allowlist, local admin role, and recent `auth_time`. Cron → Bearer token (`checkCronAuth()`).

**Security headers**: CSP + nonce in `proxy.ts`. Static headers in `next.config.ts`.

---

## API Route Map

### Public (no auth required unless noted)

- `GET /api/posts` — paginated published posts
- `GET /api/posts/[postId]/comments`
- `POST /api/posts/[postId]/comments` — WorkOS session
- `GET/POST /api/posts/[postId]/bookmark` — WorkOS session
- `POST /api/posts/[postId]/view` — cookie-deduped view count
- `POST /api/comments/[commentId]/like` — WorkOS session
- `DELETE /api/comments/[commentId]` — WorkOS session
- `GET /api/bookmarks` — WorkOS session
- `GET/PATCH /api/account/profile` — WorkOS session
- `POST /api/account/avatar` — WorkOS session
- `POST /api/newsletter`
- `POST /api/route-plans`

### Admin (WorkOS + local admin role + recent auth)

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

---

## Drizzle Schema (21 tables)

Core tables: `users`, `profiles`, `posts`, `post_revisions`, `post_preview_tokens`, `post_images`, `post_tags`, `post_bookmarks`, `post_links`, `media_assets`, `categories`, `tags`, `series`, `comments`, `comment_likes`, `auth_accounts`, `wishlist_places`, `seasons`.

WorkOS identities use `auth_accounts` with a unique `(provider, provider_user_id)` index. The existing `users.id` remains every content FK target. Legacy Better Auth `session`, `account`, and `verification` tables are retained for rollback. All tables are indexed on FK columns and query-filtered fields.
