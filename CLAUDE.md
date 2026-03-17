# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

J²Adventures Blog is a travel blog application. The active codebase is the Next.js app in `web/`. The legacy `client/`, `server/`, and `shared/` directories have been deleted.

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

## Repository Structure

```
web/              ← ACTIVE: Next.js app — all development happens here
docs/             ← Project documentation
CLAUDE.md         ← This file — architecture rules for Claude Code
AGENTS.md         ← Multi-model coordination rules (all AI tools read this)
.windsurfrules    ← Windsurf Cascade rules
prompt.md         ← Original design specification
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

---

## Quality Standards

### TypeScript Strictness
- Zero `any` types. Use `unknown` with narrowing if a type is truly unknown.
- No `as` type assertions except at validated API boundaries (parsing external JSON). Every `as` requires a justifying comment.
- No non-null assertions (`!`). Use proper null checks or early returns.
- All exported functions have explicit return types — no inferred returns on public APIs.
- Prefer `satisfies` over `as` for type validation without widening.

### Server/Client Boundary
- Server Components are the default. `"use client"` only when the component needs hooks, event handlers, or browser APIs.
- Never import server-only code (DB queries, env secrets, server actions) into client components.
- Server Actions live in dedicated files with `"use server"` at the top. Don't scatter them.
- Data flows down: Server Component fetches data → passes props to Client Component. Never `fetch()` internal API routes from components.

### Database & Data Access
- All queries go through DAL functions in `server/queries/` or `server/dal/`. No raw SQL in components or actions.
- Drizzle query builder preferred over raw SQL. Use raw SQL only for queries Drizzle can't express.
- Every mutation validates input with Zod before touching the database.
- Pagination is cursor-based, never offset-based.

### Auth Boundary Compliance
- Public user operations → Supabase Auth session check.
- Admin operations → Auth.js session check with GitHub provider.
- Never mix auth systems in a single function. If a function needs both, it's architecturally wrong — split it.

### Route & Link Safety
- All internal links use typed route helpers (`getPostHref()`, `getTagHref()`, etc.) from `web/src/lib/utils.ts`. No string literal paths.
- Verify route helpers exist before using them. If one is missing, create it following existing patterns.

### Theme System Compliance
- No hardcoded colors anywhere. All colors reference CSS custom properties.
- Every visual component must render correctly in all 4 combinations: light×sage, light×lichen, dark×sage, dark×lichen.
- TailwindCSS utilities must be inside `@layer` when defined in CSS files.

---

## Quality Gate Commands

Run these after every logically complete change. **All must pass with zero errors/warnings.**

```bash
cd web && bun run lint        # ESLint — zero warnings
cd web && bunx tsc --noEmit   # TypeScript — zero errors
cd web && bun run build       # Next.js build — must pass
```

If `bun run build` fails on route types after schema changes, run `bun run build` once first to regenerate types, then re-run the full gate.

---

## Review Checklist (Applied to All Code Changes)

### Correctness
- Does the logic actually do what the plan specifies?
- Are edge cases handled (empty arrays, null values, missing data, concurrent mutations)?
- Are error states surfaced to the user, not swallowed silently?

### Type Safety
- Zero `any`, zero unjustified `as`, zero `!`
- Exported functions have explicit return types
- Props interfaces are complete — no optional props that are actually required

### Architecture
- Server/client boundary respected — no server code in client components
- Auth boundary respected — correct auth system for the operation
- Data flows through DAL, not direct DB access
- No new server actions when existing ones cover the use case (check `admin/actions.ts`)

### Security
- All user inputs validated with Zod before use
- No secrets or env variables exposed to client components
- Auth checks present on every mutation and protected query
- SQL injection impossible (parameterized queries via Drizzle)

### Theme & Accessibility (frontend)
- CSS variables used for all colors — no hardcoded values
- Both mode dimensions (light/dark) and both look dimensions (sage/lichen) supported
- Semantic HTML elements used (not div soup)
- Interactive elements have ARIA labels and keyboard handlers
- Images have alt text via `next/image`

### Performance
- No unnecessary `"use client"` directives
- Large lists use virtualization or pagination
- Images use proper Cloudinary transforms and `next/image` sizing
- No N+1 queries — joins or batched fetches instead

---

## Cascade (Windsurf) Failure Patterns to Watch For

When reviewing Cascade-produced code, flag these known issues:

| Pattern | Problem | Fix |
|---|---|---|
| `any` / loose types | Type shortcuts to move fast | Flag every instance — must be fully typed |
| `bg-green-500` etc. | Hardcoded Tailwind colors instead of CSS vars | Theme violation — use `var(--color-*)` |
| `href="/blog/slug"` | String literal routes | Must use typed route helpers |
| Missing `loading.tsx` | Happy path only, no loading/error states | Add loading skeleton and error boundary |
| Excessive `"use client"` | Marked preemptively | Verify each actually needs client interactivity |
| Raw `<img>` tags | Not using `next/image` | No exceptions — always `next/image` |
| Broken dark mode | Works in light, broken in dark | Test against all 4 theme combos |

---

## How to Operate

### When Planning / Architecting
1. Read `docs/plans/` for existing plans. Read `docs/decisions/` for prior ADRs.
2. Read the relevant schema files and existing query patterns before proposing changes.
3. Produce a plan document in `docs/plans/<feature>-plan.md` containing:
   - Schema changes (if any)
   - Server action signatures with full TypeScript types
   - Component tree (names only — Cascade implements them)
   - Data flow diagram (which component calls which action/query)
   - Test plan
4. Update `docs/context/<feature>-tasks.md` with a checklist.

### When Implementing Backend Code
1. Read the plan document first. If none exists, create one before coding.
2. Read `web/src/drizzle/schema.ts` and relevant `server/queries/` files.
3. Implement in layers: schema → DAL functions → server actions → tests.
4. After each layer, run the quality gate commands.
5. All three must pass with zero errors/warnings before proceeding.
6. Commit after each completed layer with a descriptive message.

### When Reviewing Code
Apply the review checklist above to every change. Report format:
```
file_path:line — severity (error|warning|suggestion) — description — fix
```
Be concise — no praise, no filler, only problems and fixes.

### Context Management
- **One task per session.** Do not carry over context from a previous task.
- **Read files fresh.** Never rely on file contents from earlier in the conversation. Re-read before editing.
- **Commit early.** After every completed sub-task, commit. This creates restore points.
- **Update docs.** After completing work, update `docs/context/<feature>-tasks.md` with what was done and what remains.

---

## Key Files to Read Before Modifying Adjacent Code

| File | Contains |
|---|---|
| `AGENTS.md` | Multi-model workflow roles and handoff protocol |
| `docs/PLAN.md` | Current roadmap and priorities |
| `web/src/drizzle/schema.ts` | Full database schema |
| `web/src/server/queries/` | Existing DAL patterns — match these |
| `web/src/lib/utils.ts` | Typed route helpers |
| `web/src/app/globals.css` | Theme variables and CSS layer system |
| `web/src/app/admin/actions.ts` | Existing server actions — reuse before creating new ones |

---

## Anti-Patterns — Do Not Do These

- **Don't fix frontend files.** Report problems. Cascade fixes them.
- **Don't create new server actions when existing ones work.** Check `admin/actions.ts` first.
- **Don't flatten the theme to light/dark.** It's mode × look — 4 combinations.
- **Don't merge the two auth systems.** Supabase = public. Auth.js = admin. Always.
- **Don't paste file contents into docs.** Reference file paths. Contents change; paths are stable.
- **Don't skip the build gate.** `tsc --noEmit` alone misses App Router-specific errors.
- **Don't use offset-based pagination.** Cursor-based only.
- **Don't inline SQL.** Everything through Drizzle query builder via DAL functions.

---

## Multi-Model Collaboration

This codebase is worked on by multiple AI models. See `AGENTS.md` for full coordination rules.

### Model Roles

| Agent | Scope | Tool |
|---|---|---|
| **Claude Opus 4.6** | Planning, architecture, code review, test strategy | Claude Code |
| **Claude Sonnet 4.6** | Backend TS — server/, drizzle/, lib/, api/, actions.ts | Claude Code |
| **Gemini 3 Pro** | UI components, styling, page layouts, client interactivity | Windsurf Cascade |
| **GPT-5.3 Codex** | Python/data tasks, hard backend problems (escalation) | Windsurf Cascade |

### File Ownership
- **Opus does NOT touch frontend files** (`components/`, `page.tsx`, `globals.css`) unless explicitly asked.
- **Opus DOES own**: `server/`, `drizzle/`, `lib/`, `api/`, `admin/actions.ts`, all `docs/`, `CLAUDE.md`, `AGENTS.md`.

### Coordination Rules
1. Never edit files outside your ownership boundary without explicit request
2. Commit after each task — small, focused commits with `[task-id]` prefix
3. Run `bun run build` before handing off to another model
4. Backend-first for new features: API/DAL before UI
5. Reference `docs/PLAN.md` for the current roadmap and task IDs

### Handoff Protocol

**Frontend needs new data:**
1. Cascade defines the TypeScript interface it needs (or Opus defines it during planning)
2. Sonnet implements the server function returning that exact shape
3. Cascade imports and consumes it — no `fetch()` to internal API routes

**Backend changes a return type:**
1. Sonnet updates the type and implementation
2. Run `bunx tsc --noEmit` — surfaces every frontend breakage
3. Report broken files to user. Cascade fixes them.

**Escalation:**
If a problem crosses the frontend/backend boundary, produce `docs/context/<issue>-escalation.md` documenting the problem, what was tried, and what the other agent needs to do.

### Key Docs
| Doc | Purpose |
|-----|---------|
| `AGENTS.md` | Model roles, file ownership, handoff protocol |
| `docs/PLAN.md` | Feature roadmap with task IDs and ownership |
| `docs/multi-model-workflow.md` | Detailed workflow patterns |
| `docs/deployment.md` | Production deployment guide |

## Deployment

Production: Vercel, root directory `web/`. Full setup in `docs/deployment.md`.
