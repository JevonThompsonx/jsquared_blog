# J²Adventures – Next.js Port Handoff

Last updated: 2026-03-17

## Where we are

The Next.js `web/` app is the active production codebase. Core reading, admin,
public auth, comments, and SEO flows are in place, and the legacy `client/`, `server/`,
and `shared/` stacks have already been removed.

The authoritative status tracker is `docs/nextjs-cutover-checklist.md`.

Latest work pushed Phase 4 in two directions:
- **4.1 comment moderation** now has an admin moderation UI with optimistic updates, inline action errors, route validation, and theme-safe status treatments
- **4.8 admin desktop layout expansion** has advanced with wider post editor/moderation shells, a roomier editor grid, better dashboard action/pagination composition, and more readable tags-page spacing, but real browser QA is still the primary remaining gap
- **4.4 structured data** is partially landed in `web/src/app/(blog)/posts/[slug]/head.tsx`; local build is good, but deployed rich-results validation is still outstanding

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
- **Admin moderation**: `/admin/posts/[postId]/comments` route with hide/unhide/delete/flag controls, optimistic updates, and loading state
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
- **Season feed polish**: home and filtered feeds now group posts under season-year headers
- **Search polish**: header search debounces to the homepage, search terms highlight in home cards, and empty states are more polished
- **Image placeholders**: Cloudinary-backed blur placeholders are wired into key card and gallery imagery
- **Post series**: `series` table, `SeriesNav` on post detail, `/series/[slug]` public page
- **Map view**: MapLibre GL + Stadia Maps Outdoors style; post detail embedded map;
  `/map` world map with all located posts as pins; Nominatim geocoding on save;
  iOverlander URL support; location autocomplete in admin editor
- **Post navigation polish**: post pages now include scroll-to-content guidance, ToC anchor target, map blur-on-load protection, and JSON-LD on post detail pages
- **Admin delete confirm**: admin comment moderation now uses an inline themed confirmation row instead of a native browser confirm dialog
- **Admin theming**: dashboard filters use a themed custom select instead of native dark-mode-hostile selects; moderation/status alerts now use shared CSS variables
- **Security headers**: CSP, HSTS, X-Frame-Options, Referrer-Policy, X-Content-Type-Options, and Permissions-Policy are configured in `web/next.config.ts`
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
- Finish the remaining UX polish tasks tracked in `docs/PLAN.md` Phase 3, especially browser-level QA
- Continue PLAN `4.8` with browser QA across the widened admin views/components and keep future admin surfaces aligned with the broader shell
- Validate PLAN `4.4` on a deployed post URL with Google Rich Results Test before marking structured data complete
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
| Admin dashboard shell | `web/src/app/admin/page.tsx` |
| Admin dashboard UI | `web/src/components/admin/admin-dashboard.tsx` |
| Admin comment moderation page | `web/src/app/admin/posts/[postId]/comments/page.tsx` |
| Admin comment moderation UI | `web/src/components/admin/admin-comments-panel.tsx` |
| Admin comment moderation card | `web/src/components/admin/admin-comment-card.tsx` |
| Themed admin select | `web/src/components/ui/theme-select.tsx` |
| Account settings UI | `web/src/app/account/account-settings.tsx` |
| Drizzle schema | `web/src/drizzle/schema.ts` |
| Supabase server helper | `web/src/lib/supabase/server.ts` |
| Admin session helper | `web/src/lib/auth/session.ts` |
| URL helpers (typed routes) | `web/src/lib/utils.ts` — `getPostHref`, `getCategoryHref`, `getTagHref`, `getSeriesHref`, `getMapHref` |
| Series DAL | `web/src/server/dal/series.ts` |
| Post map (single post) | `web/src/components/blog/post-map.tsx` |
| Scroll-to-content helper | `web/src/components/blog/scroll-to-content.tsx` |
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

---

## Gemini 3.1 Pro Low handoff

You are continuing the J²Adventures Next.js app in `web/`.

Project context:
- App is live/stable; we are in Phase 4.
- PLAN task `4.1` now has a working admin moderation UI and passed repo quality checks.
- PLAN task `4.8` admin desktop layout expansion has started but is incomplete.
- Follow `prompt.md`, `AGENTS.md`, and strict TS rules (`no any`, `no as`, `no !`).

Your scope:
- Frontend/UI only: components, page UI, interaction flows, styling, accessibility.
- Prefer edits in `web/src/components/` and `web/src/app/**/page.tsx`/`loading.tsx`.
- Do NOT modify backend architecture files unless a very small type import is required.

Backend contract now available:
- `GET /api/admin/posts/[postId]/comments?sort=likes|newest|oldest`
  - Auth: admin GitHub session only
  - Response: `{ comments: AdminComment[] }`
  - `AdminComment` includes existing public fields plus `visibility`, `isFlagged`, `moderatedAt`, `moderatedByUserId`, and `canLike`
  - Returns original comment content even when hidden/deleted so admin can review it
- `POST /api/admin/comments/moderate`
  - Body: `{ commentIds: string[]; action: "hide" | "unhide" | "delete" | "flag" | "unflag" }`
  - Response: `{ action, updatedCount, unchangedCount, missingIds, comments }`
  - Each returned comment item is `{ commentId, postId, visibility, isFlagged, moderatedAt, moderatedByUserId, changed }`
  - Best optimistic behavior: patch local comment state immediately, then reconcile from returned `comments`; rollback the touched comments if request fails

Public behavior already enforced by backend:
- Hidden comments stay in the thread but render placeholder-safe content in public reads
- Deleted comments stay in the thread as deleted placeholders in public reads
- Likes/replies only work on visible comments
- Replies to hidden/deleted parents are rejected server-side

What already exists now:
- `web/src/app/admin/posts/[postId]/comments/page.tsx`
- `web/src/app/admin/posts/[postId]/comments/loading.tsx`
- `web/src/components/admin/admin-comments-panel.tsx`
- `web/src/components/admin/admin-comment-card.tsx`
- wider shells on the admin create/edit/comments pages
- a widened desktop layout in `web/src/components/admin/post-editor-form.tsx`, including a sticky XL sidebar
- a stronger dashboard layout cleanup in `web/src/components/admin/admin-dashboard.tsx`, including roomier row actions and pagination composition

Latest frontend follow-up completed:
- `web/src/components/admin/admin-comments-panel.tsx`
  - Added moderation summary stats for threads, flagged, hidden, and deleted comments
  - Changed sort refreshes to preserve existing content while showing a lighter "Refreshing" state
  - Expanded the first-load skeleton so it better matches the live moderation layout
- `web/src/components/admin/admin-comment-card.tsx`
  - Added clearer visual separation for hidden/deleted states while preserving original review content
  - Improved reply hierarchy and focus-visible states on moderation actions
- `web/src/app/admin/posts/[postId]/comments/page.tsx`
  - Moved the moderation view onto the wider shared admin shell and added helper copy
- `web/src/app/admin/posts/[postId]/comments/loading.tsx`
  - Matched the loading state width to the widened moderation route shell
- `web/src/components/admin/admin-dashboard.tsx`
  - Improved post-row footer hierarchy, action sizing, and pagination layout on desktop
- `web/src/app/admin/tags/page.tsx`
  - Relaxed row spacing and added clearer editorial guidance for tag descriptions

Your next task:
1. Run actual browser QA for PLAN `4.8` on `/admin`, `/admin/tags`, and `/admin/posts/[postId]/comments` at `768px`, `1280px`, and `1536px+`.
2. Apply only the minimal frontend fixes that the browser pass proves are needed.
3. Preserve the existing moderation behavior; the admin delete flow already uses an inline themed confirmation pattern, so refine it only if a real QA issue appears.
4. Do not touch blog structured-data implementation unless the work is specifically about presentation around it; JSON-LD stays in `web/src/app/(blog)/posts/[slug]/head.tsx`.

Suggested implementation direction:
1. Review `web/src/components/admin/admin-dashboard.tsx` for remaining cramped desktop/tablet sections, especially pagination, toolbar density, and card action grouping.
2. Review `web/src/app/admin/tags/page.tsx` for larger-screen readability and form alignment polish.
3. Review the moderation route UI for polish only:
    - `web/src/app/admin/posts/[postId]/comments/page.tsx`
    - `web/src/app/admin/posts/[postId]/comments/loading.tsx`
    - `web/src/components/admin/admin-comments-panel.tsx`
    - `web/src/components/admin/admin-comment-card.tsx`
4. If you touch status/alert treatments, use CSS variables only and preserve the current teal info palette.
5. Prefer small, surgical changes over broad rewrites.
6. Report browser findings precisely so docs can be updated from observed behavior rather than static inspection.

Acceptance criteria:
- Admin moderation still works without page reload.
- Desktop admin pages feel less cramped and more intentional on wide screens.
- Moderation loading/error/success states remain clear and theme-safe.
- Existing public comment flows still work.
- No `any`, `as`, or `!`.

Quality gate before handoff:
- `cd web`
- `bun run lint`
- `bunx tsc --noEmit`
- `bun run build`

Notes:
- Do not create a parallel moderation implementation; refine the existing files.
- The repo worktree is dirty with many unrelated in-progress changes. Avoid broad formatting or unrelated cleanup.
- Manual browser QA is still the biggest missing piece after the current code pass.
- `window.confirm()` has already been replaced in `web/src/components/admin/admin-comment-card.tsx`; do not reintroduce native confirm dialogs on admin moderation actions.

