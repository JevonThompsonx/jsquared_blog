# J²Adventures – Next.js Port Handoff

Last updated: 2026-03-17

## Where we are

The Next.js `web/` app is the active production codebase. Core reading, admin,
public auth, comments, and SEO flows are in place, and the legacy `client/`, `server/`,
and `shared/` stacks have already been removed.

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
  gallery, focal points, alt text, series, location with autocomplete, iOverlander URL
- **Public auth**: Supabase login, signup, email callback — all native in Next.js
- **Account settings** (`/account`): display name, avatar URL, theme preference
  save/restore, email change, password change, sign out
- **Comments**: list, post, delete, like/unlike, nested replies — Turso-backed
- **Post bookmarks**: toggle button, `/bookmarks` saved-posts page, "Saved" nav link
- **Author profiles**: `/author/[id]` with profile card, stats, comment activity
- **Theme**: Moss & Linen / Lichen Light, sun/moon toggle, reliable post-mount sync
- **Table of contents**: auto-generated from h2–h4, scroll-tracked, collapsible
- **Gallery lightbox**: filmstrip thumbnails, fade animation, keyboard + swipe nav
- **Date toggle**: click any date to switch absolute ↔ relative; localStorage persisted
- **Post series**: `series` table, `SeriesNav` on post detail, `/series/[slug]` public page
- **Map view**: MapLibre GL + Stadia Maps Outdoors style; post detail embedded map;
  `/map` world map with all located posts as pins; Nominatim geocoding on save;
  iOverlander URL support; location autocomplete in admin editor
- **Legacy reads removed**: `web/src/server/queries/posts.ts` is Turso-only
- **Dead legacy code removed**: `getLegacyApiBaseUrl`, `legacy-posts.ts` schema,
  `LEGACY_API_BASE_URL` env var references
- **Deployment docs**: `docs/deployment.md` covers full production setup
- **Code audit**: all prompt.md rules pass — no `any`/`as`/`!`, Zod at all boundaries,
  auth-before-DB in all server actions, `server-only` in all DAL files

---

## What is left

### 1. Operational cleanup  `[~]`

- Decommission the legacy Cloudflare Worker in the dashboard
- Remove any no-longer-used Cloudflare environment variables and build settings
- Optionally configure custom SMTP for Supabase if shared email deliverability becomes a concern

### 2. Quality-of-life follow-up  `[~]`

- Expand authenticated Playwright coverage for admin flows beyond the current smoke path
- Finish the remaining UX polish tasks tracked in `docs/PLAN.md` Phase 3
- Keep `TODO.md` as the practical working backlog and `docs/PLAN.md` as the phase-level roadmap

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
| URL helpers (typed routes) | `web/src/lib/utils.ts` — `getPostHref`, `getCategoryHref`, `getTagHref`, `getSeriesHref`, `getMapHref` |
| Series DAL | `web/src/server/dal/series.ts` |
| Post map (single post) | `web/src/components/blog/post-map.tsx` |
| World map (all posts) | `web/src/components/blog/world-map.tsx` |
| Map page | `web/src/app/(blog)/map/page.tsx` |
| Location autocomplete | `web/src/components/admin/location-autocomplete.tsx` |
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
