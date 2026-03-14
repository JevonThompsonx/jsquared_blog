# J²Adventures Blog — AI Rewrite Master Prompt (Final Revised)

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
| **Purpose** | Travel blog platform with rich publishing, galleries, profiles, comments, tags, scheduling, and SEO |
| **Owner** | Jevon |
| **Current App** | React + Vite frontend, Hono worker backend, Supabase auth/database/storage |
| **Rewrite Goal** | Move to a cleaner unified Next.js App Router architecture |

---

## LOCKED ARCHITECTURE DECISIONS

These are locked unless a true technical blocker appears.

| Concern | Decision |
|---------|----------|
| Framework | Next.js App Router |
| Language | TypeScript strict mode |
| ORM | Drizzle ORM |
| Database | Turso / LibSQL |
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
| Large gallery overflow | optional external links to restricted Immich albums |

---

## Why These Choices

### Next.js App Router
The current split architecture is too fragmented:
- React frontend
- Hono backend
- Supabase data/auth/storage
- Cloudflare deployment split

The rewrite should reduce this to one app runtime and one main deployment target.

### Turso / LibSQL
Turso has already worked well in another production-like project and is now the source of truth for app data:
- posts
- profiles
- categories
- tags
- comments
- admin roles
- media metadata

### Supabase Auth only
Supabase remains in the stack for:
- public signup/login
- email/password auth
- password reset
- session handling for public users

Supabase is **not** the application database in this rewrite.

### GitHub admin auth
Admin auth should match the successful portfolio approach:
- GitHub login only
- allowlisted admin IDs/usernames
- simple, low-friction admin access

### Cloudinary for media
Cloudinary is preferred for:
- optimized image delivery
- easy WebP transforms
- responsive variants
- CDN-backed travel-blog media

But all media logic must be isolated behind a service layer so the storage provider can be replaced later if needed.

### Immich for overflow galleries
Do not force the app to host every image or video asset forever.
For very large galleries or video-heavy content, allow posts to include:
- `See more here`
- link to a restricted external album (for example, an Immich shared album)
- only if the link is intentionally public or properly permissioned

---

## Core Rewrite Philosophy

This rewrite should preserve what the current app is already good at:
- rich publishing
- image-forward storytelling
- categories and tags
- comments and likes
- profiles
- scheduling
- SEO
- travel-blog feel

But it should improve:
- architecture consistency
- deployment simplicity
- auth clarity
- data ownership
- maintainability
- testability

---

## FEATURES TO PRESERVE

### Phase 1 — Core Publishing
- homepage / post listing
- post detail pages
- categories and tags
- SEO: sitemap, RSS, Open Graph, Twitter cards
- public auth foundation with Supabase Auth
- admin auth foundation with GitHub Auth.js
- admin post CRUD
- Tiptap editor
- basic light/dark theme
- featured image support
- initial gallery support
- optional per-post external gallery link

### Phase 2 — Media & Profiles
- multi-image galleries
- alt text
- image ordering
- focal-point metadata if worth preserving
- user profiles
- avatar support
- account settings
- theme preference persistence
- scheduled publishing
- post layout type support if still useful

### Phase 3 — Social & Polish
- comments
- comment likes
- related posts
- share buttons
- search
- moderation/admin quality-of-life tools
- analytics

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
- profile ownership

### 2. Admin Auth — Auth.js GitHub
Use Auth.js GitHub for:
- admin dashboard login
- post management
- publishing
- admin-only media management
- admin-only scheduled publishing controls

### Important auth rule
Do **not** merge these conceptually.

- a Supabase-authenticated user is not automatically an admin
- a GitHub-authenticated admin is not automatically a public user profile unless explicitly mapped
- routes and actions must explicitly choose which auth system they depend on

### Authorization source of truth
Authentication comes from external providers.
Authorization comes from local app data in Turso.

Use local Turso tables as the source of truth for:
- roles
- display name
- profile metadata
- admin eligibility

### Recommended identity mapping tables

#### `users`
- `id`
- `primary_email`
- `role` (`reader`, `author`, `admin`)
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
- `provider` (`supabase`, `github`)
- `provider_user_id`
- `provider_email`
- `created_at`

### Admin rule
Admin access requires:
1. valid GitHub Auth.js session
2. local Turso role of `admin`

GitHub allowlist is the first gate.
Local Turso role check is the second gate.

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

#### `posts`
- `id`
- `title`
- `slug`
- `content_json`
- `excerpt`
- `status` (`draft`, `published`, `scheduled`)
- `layout_type` (`standard`, `split-horizontal`, `split-vertical`, `hover`) if preserved
- `published_at`
- `scheduled_publish_time`
- `author_id`
- `category_id`
- `featured_image_id` (nullable FK to media table if preferred)
- `external_gallery_url` (nullable)
- `external_gallery_label` (nullable)
- `created_at`
- `updated_at`

#### `media_assets`
- `id`
- `owner_user_id`
- `provider` (`cloudinary`)
- `public_id`
- `secure_url`
- `resource_type` (`image`, `video`)
- `format`
- `width`
- `height`
- `bytes`
- `alt_text`
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

#### `post_tags`
- `post_id`
- `tag_id`

#### `comments`
- `id`
- `post_id`
- `author_id`
- `content`
- `parent_id`
- `created_at`
- `updated_at`

#### `comment_likes`
- `comment_id`
- `user_id`

### Schema Rules
- all mutable tables get `created_at` and `updated_at`
- index `posts.slug`, `posts.status`, `posts.published_at`, `posts.author_id`
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
- render through a safe structured renderer

If HTML is generated:
- sanitize it before storage or rendering
- never trust client-generated HTML blindly

---

## MEDIA STRATEGY — LOCKED

### Primary media handling
Cloudinary is the default image/media platform for content shown directly in the blog.

### Delivery format
Publicly rendered blog images should be delivered as **WebP** by default.

Preferred strategy:
- upload original asset to Cloudinary
- store Cloudinary metadata in Turso
- generate delivery URLs that request WebP output and sensible quality settings
- do not hardcode massive original files into the UI

### Image rules
- use responsive sizes
- generate optimized derivatives
- alt text is required for editorial images
- image metadata lives in Turso
- upload logic lives behind a service layer

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
jsquared-blog/
├── public/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   ├── sitemap.ts
│   │   ├── feed.xml/
│   │   │   └── route.ts
│   │   ├── (blog)/
│   │   │   ├── posts/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx
│   │   │   ├── categories/
│   │   │   ├── tags/
│   │   │   └── search/
│   │   ├── (public-auth)/
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── callback/
│   │   ├── (admin)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   ├── posts/
│   │   │   ├── media/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   └── cron/
│   │   │       └── publish-scheduled/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── blog/
│   │   ├── editor/
│   │   ├── comments/
│   │   └── providers/
│   ├── lib/
│   │   ├── env.ts
│   │   ├── db.ts
│   │   ├── auth/
│   │   │   ├── public.ts
│   │   │   ├── admin.ts
│   │   │   └── identities.ts
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── cloudinary/
│   │   │   ├── server.ts
│   │   │   ├── urls.ts
│   │   │   └── uploads.ts
│   │   ├── utils.ts
│   │   └── errors.ts
│   ├── server/
│   │   ├── actions/
│   │   ├── queries/
│   │   └── services/
│   ├── schemas/
│   ├── types/
│   └── drizzle/
├── drizzle/
├── tests/
├── package.json
├── bun.lock
├── drizzle.config.ts
├── next.config.ts
├── tsconfig.json
└── README.md
