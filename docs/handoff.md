# J²Adventures – Next.js Port Handoff

Last updated: 2026-03-14

## Where we are

The Next.js `web/` app is **feature-complete and smoke-tested**. All reading flows, admin
auth, and SEO are confirmed working. The only remaining step before retiring the legacy
stack is completing the public auth/comment manual flows and then deleting `client/`,
`server/`, and `shared/`.

The authoritative status tracker is `docs/nextjs-cutover-checklist.md`.

---

## What is done

- **Core reading**: homepage, post detail, search, sitemap, RSS feed (all posts)
- **Category pages**: `/category/:category` with infinite scroll
- **Tag pages**: `/tag/:slug` with infinite scroll
- **Clickable chips**: category and tag badges on home cards and post detail page
- **Post cards**: overlay link pattern — no nested `<a>`, category/tag links still work
- **Post detail**: bullet/numbered list styles, "Edit post" button for admins
- **Slug normalization**: slugs with spaces (e.g. "post post") resolve to slugified URLs
- **`/settings` redirect**: redirects to `/account`
- **Admin**: GitHub OAuth, dashboard, create/edit post, Cloudinary image upload,
  gallery, focal points, alt text
- **Public auth**: Supabase login, signup, email callback — all native in Next.js
- **Account settings** (`/account`): display name, avatar URL, theme preference
  save/restore, email change, password change, sign out
- **Comments**: list, post, delete, like/unlike — Turso-backed
- **Theme**: Moss & Linen / Lichen Light, sun/moon toggle, reliable post-mount sync
- **Legacy reads removed**: `web/src/server/queries/posts.ts` is Turso-only
- **Dead legacy code removed**: `getLegacyApiBaseUrl`, `legacy-posts.ts` schema,
  `LEGACY_API_BASE_URL` env var references
- **Deployment docs**: `docs/deployment.md` covers full production setup
- **Code audit**: all prompt.md rules pass — no `any`/`as`/`!`, Zod at all boundaries,
  auth-before-DB in all server actions, `server-only` in all DAL files

---

## What is left before the legacy can be retired

### 1. Complete manual smoke test  `[~]`

Reading/SEO/admin flows are confirmed. Still pending (require a real signed-in public user):

- Signup email delivery (check spam, or configure custom SMTP in Supabase dashboard)
- Login → `redirectTo` redirect
- Account settings: display name save, theme persist, email/password change
- Post a comment, like/unlike, delete own comment

### 2. Delete legacy code  `[ ]`

When the full smoke test passes:

1. Delete `client/` directory
2. Delete `server/` directory
3. Delete `shared/` directory
4. Remove `client`, `server`, `shared` workspace entries from root `package.json`
5. Remove `bun.lockb` and re-lock with only `web/`
6. Decommission the Cloudflare Worker in the dashboard
7. Update Cloudflare Pages build settings to point to `web/`
8. Remove old environment variables from Cloudflare Workers dashboard

---

## Killing the dev server on Windows

`pkill` is not available on Windows. Use:

```powershell
# Kill by PID (replace 5916 with the actual PID shown)
taskkill /PID 5916 /F

# Or kill all node/bun processes holding port 3000
netstat -ano | findstr :3000
# Find the PID in the last column, then:
taskkill /PID <PID> /F
```

Or just close the terminal window that is running the old server.

---

## Environment variables

`web/.env` is gitignored and holds all local credentials. No other env files are needed
once `client/` and `server/` are deleted. For production (Vercel), set all vars from
`web/.env.example` in the Vercel dashboard.

---

## Key files to know

| Purpose | File |
|---|---|
| Post reads (Turso-only) | `web/src/server/queries/posts.ts` |
| Post DAL | `web/src/server/dal/posts.ts` |
| Admin server actions | `web/src/app/admin/actions.ts` |
| Comments DAL | `web/src/server/dal/comments.ts` |
| Profiles DAL | `web/src/server/dal/profiles.ts` |
| Public user mapping | `web/src/server/auth/public-users.ts` |
| Theme provider | `web/src/components/theme/theme-provider.tsx` |
| Site header | `web/src/components/layout/site-header.tsx` |
| Homepage card | `web/src/components/blog/home-post-card.tsx` |
| Homepage feed | `web/src/components/blog/home-feed.tsx` |
| Category/tag feed | `web/src/components/blog/filtered-feed.tsx` |
| Category page | `web/src/app/(blog)/category/[category]/page.tsx` |
| Tag page | `web/src/app/(blog)/tag/[slug]/page.tsx` |
| Post detail page | `web/src/app/(blog)/posts/[slug]/page.tsx` |
| Account settings UI | `web/src/app/account/account-settings.tsx` |
| Drizzle schema | `web/src/drizzle/schema.ts` |
| Supabase server helper | `web/src/lib/supabase/server.ts` |
| Admin session helper | `web/src/lib/auth/session.ts` |
| URL helpers (typed routes) | `web/src/lib/utils.ts` — `getPostHref`, `getCategoryHref`, `getTagHref` |
| Deployment guide | `docs/deployment.md` |

---

## Rules that must stay in force (prompt.md)

- All server DAL files import `"server-only"` at the top
- No `any`, `as`, or `!` — full strict TypeScript
- Zod validation at every API trust boundary
- Server actions check auth before touching the database
- API routes that need a Supabase user call `getRequestSupabaseUser(request)`
  from the inline helper in the comments route
- Dynamic `Link` hrefs use typed helper functions (`getCategoryHref`,
  `getTagHref`, `getPostHref`) so Next.js typed routes stay satisfied
- After adding new app routes, run `bun run build` from `web/` once to
  regenerate `.next/types/link.d.ts` before running `bunx tsc --noEmit`
