# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

J²Adventures Blog is a travel blog application. The active codebase is the Next.js app in `web/`. The legacy `client/` (Vite/React), `server/` (Hono/Cloudflare Worker), and `shared/` directories are present but retired — do not touch them.

**Live Site**: [jsquaredadventures.com](https://jsquaredadventures.com)

## Active Tech Stack (`web/`)

- **Framework**: Next.js 15 (App Router, Turbopack)
- **Runtime**: Node.js / Vercel
- **Database**: Turso (SQLite via libSQL) + Drizzle ORM
- **Public auth**: Supabase Auth (sign up, login, email callback)
- **Admin auth**: Auth.js (next-auth v4) + GitHub OAuth
- **Image hosting**: Cloudinary
- **Styling**: TailwindCSS 4 + CSS custom properties (theme variables)
- **Rich text**: Tiptap (transitional HTML payload stored in `content_json`)

## Monorepo Structure

```
web/          ← ACTIVE: Next.js app — all development happens here
client/       ← RETIRED: legacy Vite/React frontend (do not touch)
server/       ← RETIRED: legacy Hono/Cloudflare Worker (do not touch)
shared/       ← RETIRED: legacy shared types (do not touch)
docs/         ← Project documentation
```

## Development Commands

```bash
# From web/
cd web
bun run dev        # dev server at http://localhost:3000
bun run build      # production build
bun run lint       # ESLint
bun run db:generate  # generate Drizzle migrations after schema changes
bun run db:migrate   # apply migrations to Turso
```

## Environment Variables (`web/.env.local`)

```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=...
AUTH_SECRET=...
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
AUTH_ADMIN_GITHUB_IDS=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
NEXT_PUBLIC_SITE_URL=https://jsquaredadventures.com
```

## Architecture

### Two Auth Systems (by design)

- **Supabase Auth** → public readers (sign up, login, comments, account settings)
- **Auth.js + GitHub** → admin only (post create/edit/delete, image upload)

They are completely separate. Admin users cannot access `/account`. Public users cannot access `/admin`.

### Key Files

| Purpose | File |
|---|---|
| Root layout + providers | `web/src/app/layout.tsx` |
| App providers (theme, session) | `web/src/components/providers/app-providers.tsx` |
| Theme sync from DB on login | `web/src/components/providers/user-theme-sync.tsx` |
| Theme provider | `web/src/components/theme/theme-provider.tsx` |
| Site header | `web/src/components/layout/site-header.tsx` |
| Homepage feed | `web/src/components/blog/home-feed.tsx` |
| Post detail page | `web/src/app/(blog)/posts/[slug]/page.tsx` |
| Comments component | `web/src/components/blog/comments.tsx` |
| Account settings UI | `web/src/app/account/account-settings.tsx` |
| Admin server actions | `web/src/app/admin/actions.ts` |
| Post reads (Turso-only) | `web/src/server/queries/posts.ts` |
| Post DAL | `web/src/server/dal/posts.ts` |
| Comments DAL | `web/src/server/dal/comments.ts` |
| Profiles DAL | `web/src/server/dal/profiles.ts` |
| Public user mapping | `web/src/server/auth/public-users.ts` |
| Drizzle schema | `web/src/drizzle/schema.ts` |
| Cloudinary uploads | `web/src/lib/cloudinary/uploads.ts` |
| Admin session helper | `web/src/lib/auth/session.ts` |
| URL helpers | `web/src/lib/utils.ts` |

### API Routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/posts` | public | Paginated post list |
| GET | `/api/posts/[postId]/comments` | optional | List comments |
| POST | `/api/posts/[postId]/comments` | Supabase | Post a comment or reply |
| POST | `/api/comments/[commentId]/like` | Supabase | Toggle like |
| DELETE | `/api/comments/[commentId]` | Supabase | Delete own comment |
| GET | `/api/account/profile` | Supabase | Get profile |
| PATCH | `/api/account/profile` | Supabase | Update profile |
| POST | `/api/account/avatar` | Supabase | Upload avatar image |
| POST | `/api/admin/uploads/images` | Admin | Upload editorial image |
| GET/POST | `/api/auth/[...nextauth]` | — | Auth.js GitHub OAuth |

### Frontend Routes

```
/                   Public blog feed
/posts/[slug]       Post detail with comments
/category/[cat]     Category-filtered feed
/tag/[slug]         Tag-filtered feed
/login              Supabase login
/signup             Supabase signup
/callback           Supabase email callback
/account            Public user account settings
/settings           Redirects to /account
/admin              Admin dashboard (GitHub auth)
/admin/posts/new    Create post
/admin/posts/[id]/edit  Edit post
```

### Theme System

Two dimensions: **mode** (`light` | `dark`) and **look** (`sage` | `lichen`). Each combination has full CSS variable sets. Stored in:
1. React state (live)
2. `localStorage` (primary persistence)
3. `j2_theme` cookie (cross-session fallback)
4. Supabase `profiles.theme_preference` (DB backup, synced on login via `UserThemeSync`)

`UserThemeSync` runs once per session: if no localStorage theme is found and a Supabase user is logged in, it fetches the DB preference and restores it.

### Avatar System

Three avatar types:
1. **Preset icons** — stored as `j2:mountain`, `j2:compass`, etc. in `profiles.avatar_url`
2. **Uploaded image** — Cloudinary URL (via `POST /api/account/avatar`)
3. **Initials fallback** — rendered from `displayName` when `avatarUrl` is null

### Comment Replies

Comments support one level of replies via `comments.parent_id`. Top-level comments have `parentId = null`. Replies are displayed nested under their parent, sorted oldest-first.

## Code Rules (must stay in force)

- All server DAL files import `"server-only"` at the top
- No `any`, `as`, or `!` — strict TypeScript throughout
- Zod validation at every API trust boundary
- Server actions and API routes check auth before touching the DB
- API routes that need a Supabase user call `getRequestSupabaseUser(request)`
- Dynamic `Link` hrefs use typed helpers (`getCategoryHref`, `getTagHref`, `getPostHref`)
- After adding new app routes, run `bun run build` from `web/` to regenerate `.next/types/link.d.ts`

## Deployment

Production: Vercel, root directory `web/`. Full setup in `docs/deployment.md`.
