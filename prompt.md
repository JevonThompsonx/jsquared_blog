# J²Adventures Blog — Project Source of Truth Prompt

#automation/AI/prompting #projects/jsquared

---

## PRIORITY RULES — Always Active

> These rules override everything below. If context is compressed, these survive.

| # | Rule | Non-Negotiable |
|---|------|----------------|
| 1 | `strict: true` in `tsconfig.json`. No `any`, no `as` type assertions, no `!` non-null assertions. | YES |
| 2 | Never trust the client. Validate server-side on every request. Server Actions are public HTTP endpoints. | YES |
| 3 | No hardcoded secrets. Validate env vars with Zod at startup. `.env*` stays gitignored. | YES |
| 4 | Server Components by default. `"use client"` only when browser APIs, hooks, or interactivity are required. | YES |
| 5 | Validate every trust boundary with Zod. Client validation is for UX only; server validation is for security. | YES |
| 6 | Every Server Action checks auth and validates input before doing anything else. | YES |
| 7 | Never render unsanitized user-authored HTML. Do not use `dangerouslySetInnerHTML` on untrusted content. | YES |
| 8 | Pin exact dependency versions. Commit `bun.lock`. | YES |
| 9 | Deployments must be idempotent. Migrations are append-only. Never edit applied migrations. | YES |
| 10 | All database access goes through a server-only Data Access Layer. Never `SELECT *`. | YES |
| 11 | Structured error handling only. Never leak internal stack traces, provider errors, or secrets to the client. | YES |
| 12 | If auth, storage, media processing, or migration behavior is ambiguous, ask before implementing. | YES |
| 13 | Search for current stable package versions before coding. Do not guess. | YES |
| 14 | Explain non-obvious security and architecture choices. | YES |
| 15 | Every deliverable must pass type-check, lint, tests, and build before being called complete. | YES |

---

## Project Identity

| Field | Value |
|-------|-------|
| **Name** | J²Adventures Blog |
| **Domain** | `jsquaredadventures.com` |
| **Purpose** | Travel blog platform with rich publishing, previews, revisions, galleries, profiles, comments, bookmarks, newsletters, scheduling, maps, and SEO |
| **Owner** | Jevon |
| **Legacy App** | React + Vite frontend, Hono worker backend, Supabase auth/database/storage (retired) |
| **Current App** | Next.js 16 App Router in `web/` with Turso/libSQL, Drizzle, Supabase Auth, Auth.js admin auth, Cloudinary, and optional Resend/Upstash/Sentry integrations |
| **Current Focus** | Keep the live app accurate, hardened, and documented. Treat `web/` as the only production app. |

The rewrite is complete. This file defines the live architecture, guardrails, and behavior expectations for ongoing work inside `web/`.

---

## LOCKED ARCHITECTURE DECISIONS

| Concern | Decision |
|---------|----------|
| Framework | Next.js App Router |
| Language | TypeScript strict mode |
| ORM | Drizzle ORM |
| Database | Turso / libSQL |
| Public user auth | Supabase Auth |
| Admin auth | Auth.js with GitHub provider |
| Styling | Tailwind CSS 4 |
| Editor | Tiptap |
| Validation | Zod |
| Package manager | Bun |
| Deployment | Vercel |
| Testing | Vitest + Playwright |
| CI/CD | GitHub Actions |
| Primary media storage | Cloudinary |
| Newsletter / email | Resend |
| Rate limiting | Upstash Redis in deployed environments; in-memory fallback only for local dev/test |
| Error monitoring | Sentry (optional) |
| Large gallery overflow | optional external links to restricted Immich albums |

---

## Current Architecture Reality

### App layout
- Production app lives in `web/`
- App Router pages and route handlers live in `web/src/app`
- Shared helpers live in `web/src/lib`
- Server-only auth, DAL, queries, posts, and services live in `web/src/server`
- Drizzle schema lives in `web/src/drizzle/schema.ts`
- Unit tests live in `web/tests/unit`
- E2E tests live in `web/tests/e2e`

### Content model
- Canonical post content is stored as Tiptap JSON
- Derived `contentHtml`, `contentPlainText`, and `excerpt` are generated server-side
- Legacy HTML is still supported during migration through a strict allowlist sanitizer
- Never treat raw client HTML as trusted

### Editorial workflow
- Posts support `draft`, `published`, and `scheduled`
- Admins can generate expiring preview links for unpublished content
- Editing a post revokes preview tokens and captures pre-update revision snapshots best-effort
- Admins can inspect post revisions and restore a revision atomically

### Media model
- Featured images and gallery images are stored as `media_assets` plus `post_images`
- Gallery images can persist EXIF metadata (capture date, coordinates, camera/lens, aperture, shutter, ISO)
- Upload validation checks byte signatures server-side, not only MIME/type metadata

### Public interaction model
- Public users authenticate with Supabase
- Signed-in users can comment, reply, like comments, delete their own comments, and manage bookmarks
- Comment lists support `likes`, `newest`, and `oldest` sorting
- View counts are incremented through a dedicated route with cookie-based dedupe

### Operational endpoints
- `GET /api/cron/publish-scheduled` publishes due scheduled posts
- `GET /api/cron/keep-supabase-awake` pings Supabase auth health
- Outside local loopback development, cron routes require `CRON_SECRET`
- In deployed environments, rate limiting must use Upstash credentials and fail closed if missing

---

## Product Requirements

Preserve and extend what is already shipped:
- rich publishing and safe prose rendering
- image-forward storytelling
- categories, tags, and series
- comments, likes, moderation, and bookmarks
- profiles, avatars, and theme preferences
- scheduled publishing, previews, and revisions
- SEO, map/location content, and related posts
- travel-blog presentation quality

### Core Publishing
- homepage / post listing
- post detail pages
- categories and tags
- series pages and series navigation
- SEO: sitemap, RSS, Open Graph, Twitter cards
- public auth foundation with Supabase Auth
- admin auth foundation with GitHub Auth.js
- admin post CRUD
- Tiptap editor
- basic light/dark theme
- featured image support
- gallery support
- preview links
- post revisions / restore
- optional per-post external gallery link

### Media, Profiles, and Discovery
- multi-image galleries
- alt text
- image ordering
- focal-point metadata
- EXIF metadata capture when present
- user profiles
- avatar support
- account settings
- theme preference persistence
- scheduled publishing
- post layout type support
- map/location metadata
- song metadata on posts

### Social and Platform Features
- comments
- threaded replies
- comment likes
- comment deletion by owner
- admin moderation tools
- bookmarks
- newsletter signup
- related posts
- share buttons
- search
- view counts
- moderation/admin quality-of-life tools
- analytics / monitoring hooks where configured

---

## AUTH MODEL — LOCKED

This project intentionally uses **two auth systems**.

### 1. Public User Auth — Supabase Auth
Use Supabase Auth for:
- signup
- login
- logout
- password reset
- public user identity
- comment ownership
- bookmark ownership
- profile ownership

### 2. Admin Auth — Auth.js GitHub
Use Auth.js GitHub for:
- admin dashboard login
- post management
- publishing
- preview / revision / moderation flows
- admin-only media management
- admin-only scheduled publishing controls

### Important auth rule
Do **not** merge these conceptually.

- a Supabase-authenticated user is not automatically an admin
- a GitHub-authenticated admin is not automatically a public user profile unless explicitly mapped
- routes and actions must explicitly choose which auth system they depend on

### Authorization source of truth
Authentication comes from external providers.
Authorization comes from local app data in Turso / libSQL.

Use local tables as the source of truth for:
- roles
- display name
- profile metadata
- admin eligibility

### Admin rule
Admin access requires:
1. valid GitHub Auth.js session
2. local role of `admin`

GitHub allowlist is the first gate.
Local role check is the second gate.

### Admin profile attribution contract
- Admin accounts remain distinct by GitHub provider user id
- Session `githubLogin` comes from the live GitHub profile for operator attribution
- Persisted admin display/avatar identity intentionally resolves to shared site-owner branding rather than each operator's live GitHub avatar

---

## DATA MODEL

Use Turso / SQLite-friendly schema design.

### ID Strategy
- no integer primary keys
- use text IDs generated application-side
- prefer UUID v7 or CUID2
- store IDs as `text`

### Core Tables

#### `users`
- `id`
- `primary_email`
- `role`
- `created_at`
- `updated_at`

#### `profiles`
- `user_id`
- `display_name`
- `avatar_url`
- `bio`
- `theme_preference`
- `created_at`
- `updated_at`

#### `auth_accounts`
- `id`
- `user_id`
- `provider`
- `provider_user_id`
- `provider_email`
- `created_at`

#### `series`
- `id`
- `title`
- `slug`
- `description`
- `created_at`

#### `posts`
- `id`
- `title`
- `slug`
- `content_json`
- `content_format` (`tiptap-json`, `legacy-html`)
- `content_html`
- `content_plain_text`
- `excerpt`
- `status` (`draft`, `published`, `scheduled`)
- `layout_type` (`standard`, `split-horizontal`, `split-vertical`, `hover`)
- `published_at`
- `scheduled_publish_time`
- `author_id`
- `category_id`
- `series_id`
- `series_order`
- `featured_image_id`
- `location_name`
- `location_lat`
- `location_lng`
- `location_zoom`
- `ioverlander_url`
- `song_title`
- `song_artist`
- `song_url`
- `external_gallery_url`
- `external_gallery_label`
- `view_count`
- `created_at`
- `updated_at`

#### `media_assets`
- `id`
- `owner_user_id`
- `provider`
- `public_id`
- `secure_url`
- `resource_type`
- `format`
- `width`
- `height`
- `bytes`
- `alt_text`
- `exif_taken_at`
- `exif_lat`
- `exif_lng`
- `exif_camera_make`
- `exif_camera_model`
- `exif_lens_model`
- `exif_aperture`
- `exif_shutter_speed`
- `exif_iso`
- `created_at`

#### `post_images`
- `id`
- `post_id`
- `media_asset_id`
- `sort_order`
- `focal_x`
- `focal_y`
- `caption`
- `created_at`

#### `categories`
- `id`
- `name`
- `slug`
- `description`

#### `tags`
- `id`
- `name`
- `slug`
- `description`

#### `post_tags`
- `post_id`
- `tag_id`

#### `comments`
- `id`
- `post_id`
- `author_id`
- `content`
- `parent_id`
- `visibility` (`visible`, `hidden`, `deleted`)
- `is_flagged`
- `moderated_at`
- `moderated_by_user_id`
- `created_at`
- `updated_at`

#### `comment_likes`
- `comment_id`
- `user_id`

#### `post_bookmarks`
- `post_id`
- `user_id`
- `created_at`

#### `post_preview_tokens`
- `id`
- `token_hash`
- `post_id`
- `issued_by_user_id`
- `expires_at`
- `revoked_at`
- `last_used_at`
- `created_at`

#### `post_revisions`
- `id`
- `post_id`
- `revision_num`
- `title`
- `content_json`
- `excerpt`
- `song_title`
- `song_artist`
- `song_url`
- `saved_by_user_id`
- `saved_at`
- `label`

### Schema Rules
- all mutable tables get `created_at` and `updated_at` where applicable
- index `posts.slug`, `posts.status`, `posts.published_at`, `posts.author_id`
- index `posts.series_id`, `posts.content_format`, `posts.category_id`, `posts.scheduled_publish_time`
- public queries filter on `status = 'published'`
- scheduled posts publish by moving from `scheduled` to `published`
- all query access is explicit through the DAL
- no hidden data ownership in third-party providers

---

## CONTENT STORAGE RULE

### Tiptap content
Do not store raw HTML as the canonical source.

Preferred approach:
- store Tiptap JSON in Turso
- validate shape with Zod
- derive excerpt/plain text separately
- derive HTML server-side
- render through a safe structured renderer

### Current sanitizer contract
- Rich prose rendering goes through an allowlist `sanitize-html` pipeline
- Allowed markup is intentionally narrow (`p`, headings, lists, blockquote, links, images, code, details/summary, etc.)
- Links are normalized to safe schemes only (`http`, `https`, `mailto`)
- Image sources must be absolute `http`/`https`
- Any future raw HTML sink must reuse the same sanitizer boundary or justify a different vetted sanitizer

---

## MEDIA STRATEGY — LOCKED

### Primary media handling
Cloudinary is the default image/media platform for content shown directly in the blog.

### Delivery format
Publicly rendered blog images should be delivered as optimized Cloudinary variants by default.

Preferred strategy:
- upload original asset to Cloudinary
- store Cloudinary metadata in Turso
- generate delivery URLs with sensible quality settings
- do not hardcode massive original files into the UI

### Image rules
- use responsive sizes
- generate optimized derivatives
- alt text is required for editorial images
- image metadata lives in Turso
- upload logic lives behind a service layer
- validate uploads by file signature server-side

### Video / oversized gallery rule
For media-heavy posts, do not assume the app must host everything.

Support:
- curated in-post images through Cloudinary
- optional external gallery links for full albums or video-heavy collections
- those links may point to a permissioned Immich album if intentionally exposed by the site owner

Important:
- never expose private internal URLs
- only render external album links that were intentionally created for public viewing

---

## PROJECT STRUCTURE

```txt
jsquared_blog/
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (blog)/                # public blog routes
│   │   │   ├── (public-auth)/         # login / signup / callback
│   │   │   ├── account/
│   │   │   ├── admin/
│   │   │   ├── api/
│   │   │   ├── settings/
│   │   │   ├── sitemap.ts
│   │   │   └── feed.xml/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   ├── blog/
│   │   │   ├── layout/
│   │   │   ├── providers/
│   │   │   ├── theme/
│   │   │   └── ui/
│   │   ├── drizzle/
│   │   ├── lib/
│   │   │   ├── auth/
│   │   │   ├── cloudinary/
│   │   │   ├── email/
│   │   │   ├── supabase/
│   │   │   └── tiptap/
│   │   ├── server/
│   │   │   ├── auth/
│   │   │   ├── dal/
│   │   │   ├── feeds/
│   │   │   ├── forms/
│   │   │   ├── posts/
│   │   │   ├── queries/
│   │   │   ├── services/
│   │   │   └── supabase/
│   │   └── types/
│   ├── scripts/
│   ├── tests/
│   │   ├── e2e/
│   │   └── unit/
│   ├── package.json
│   └── bun.lock
├── docs/
├── README.md
├── prompt.md
└── TODO.md
```

---

## Runtime Configuration Truth

### Required server/runtime env
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### Optional / conditional env
- `AUTH_ADMIN_GITHUB_IDS` — if absent, admin access is effectively disabled
- `NEXT_PUBLIC_STADIA_MAPS_API_KEY` — map UI degrades gracefully without it
- `CRON_SECRET` — optional only for local loopback development
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — optional only for local dev/test; required in deployed environments
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `COMMENT_NOTIFICATION_TO_EMAIL` — comment notifications
- `RESEND_NEWSLETTER_SEGMENT_ID` — newsletter segment syncing
- `NEXT_PUBLIC_SENTRY_DSN` — optional monitoring
- `SUPABASE_SERVICE_ROLE_KEY` — tooling / seed / import tasks, not baseline app runtime

### Supabase env rule
- Browser code uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Server auth verification currently uses `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Keep both sets aligned in local/dev/prod configuration

---

## Route / API Contract Snapshot

### Public pages
- `/`
- `/posts/[slug]`
- `/preview/[id]?token=...`
- `/map`
- `/category/[category]`
- `/tag/[slug]`
- `/series/[slug]`
- `/bookmarks`
- `/account`
- `/settings`

### Public APIs
- `GET /api/posts`
- `GET|POST /api/posts/[postId]/bookmark`
- `GET|POST /api/posts/[postId]/comments`
- `POST /api/posts/[postId]/view`
- `POST /api/comments/[commentId]/like`
- `DELETE /api/comments/[commentId]`
- `GET /api/bookmarks`
- `GET|PATCH /api/account/profile`
- `POST /api/account/avatar`
- `POST /api/newsletter`

### Admin APIs
- `GET /api/admin/posts`
- `POST /api/admin/posts/clone`
- `POST /api/admin/posts/preview`
- `POST /api/admin/posts/bulk-status`
- `GET /api/admin/posts/[postId]/comments`
- `GET /api/admin/posts/[postId]/revisions`
- `GET /api/admin/posts/[postId]/revisions/[revisionId]`
- `POST /api/admin/posts/[postId]/revisions/[revisionId]/restore`
- `POST /api/admin/comments/moderate`
- `GET /api/admin/series/[seriesId]/part-numbers`
- `POST /api/admin/uploads/images`

### Cron / operational APIs
- `GET /api/cron/publish-scheduled`
- `GET /api/cron/keep-supabase-awake`

---

## Verification Standard

Do not call work complete until the relevant subset passes:
- `cd web && bun run lint`
- `cd web && bunx tsc --noEmit`
- `cd web && bun run test`
- `cd web && bun run test:e2e`
- `cd web && bun run build`

For focused changes, run the smallest justified subset first, but keep docs aligned with shipped behavior only.
