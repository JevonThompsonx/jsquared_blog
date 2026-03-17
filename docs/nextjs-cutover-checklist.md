# Next.js Cutover Checklist

## Goal

Use this checklist to decide when `web/` is ready to fully replace the legacy `client/` + `server/` stack.

## Status Key

- `[x]` complete
- `[~]` partial / staged / transitional
- `[ ]` not done

## Core Reading Experience

- [x] Homepage/feed exists in `web/`
- [x] Post detail pages exist in `web/`
- [x] Search exists in `web/`
- [x] Sitemap exists in `web/`
- [x] RSS exists in `web/` — all published posts, updated description
- [x] Homepage cards and responsive layout are in good shape
- [x] Home and filtered feeds group posts under season-year sections
- [x] Reads are Turso-only — legacy fallback removed from `web/src/server/queries/posts.ts`
- [x] Post cards are clickable (overlay link pattern, no nested `<a>`)
- [x] Post detail renders with bullet/numbered list styles
- [x] Post detail shows "Edit post" button when admin is signed in
- [x] Post slug normalization — slugs with spaces (e.g. "post post" → "post-post") resolve correctly

## Admin Experience

- [x] GitHub admin auth exists in Next.js
- [x] Admin dashboard exists in Next.js
- [x] Admin dashboard filters use theme-aware custom selects
- [x] Widened admin dashboard, tags, and moderation layouts have manual browser QA at tablet/laptop/wide-desktop widths
- [x] Native create post flow exists in Next.js
- [x] Native edit post flow exists in Next.js
- [x] Cloudinary upload flow exists in Next.js
- [x] Featured image and gallery media UI exists in Next.js
- [~] Content is still stored in transitional HTML payload form rather than full canonical Tiptap JSON workflow

## Public User Experience

- [x] Public Supabase auth pages/flows are fully ported into `web/` (login, signup, email callback)
- [x] User account settings are ported into `web/`
- [x] User profiles are ported into `web/`
- [x] Avatar/profile editing is ported into `web/`
- [x] Theme preference persistence for public users is ported into `web/`
- [x] Theme toggle reliable (stale-state bug fixed via post-mount localStorage sync)
- [x] Signup email delivery — confirmed working (email received in testing)
- [x] Signup duplicate-email detection — already-registered email shows inline error with link to sign in (Supabase `identities` array check)
- [x] Navbar "Admin" link removed — admin dashboard only reachable via `/admin` directly or mobile menu when signed in as admin
- [x] "Sign in" link hidden when admin is signed in (GitHub/NextAuth session)
- [x] Hero section mobile title font size fixed — `clamp(1.8rem, 7.5vw, 2.6rem)` prevents overflow at narrow widths
- [x] Avatar: preset icons (`j2:*`), file upload via Cloudinary, URL fallback, initials fallback
- [x] Theme preference auto-applied on any page when signed in (`UserThemeSync` component — no longer requires visiting /account)
- [x] Search results and empty states are polished; homepage card titles/excerpts highlight search matches

## Social / Community Features

- [x] Comments are ported into `web/`
- [x] Comment likes are ported into `web/`
- [x] Comment moderation / ownership handling is ported into `web/`
- [x] Comment replies — one level deep, Reply button on each top-level comment, nested display

## Data / Architecture Readiness

- [x] Turso schema exists in `web/src/drizzle/schema.ts`
- [x] Drizzle/Turso DAL exists for core reads and admin writes
- [x] Admin auth maps into local Turso authorization
- [~] Transitional sync assumptions still exist between legacy writes and Turso mirrors
- [x] Legacy fallbacks removed from Next.js read path
- [x] Next.js confirmed as sole source of truth for production reads and writes
- [x] All dead legacy code removed from `web/src` (getLegacyApiBaseUrl, legacy-posts schema, etc.)
- [x] All code passes strict TypeScript — no `any`, `as`, `!` violations
- [x] All server DAL files import `"server-only"`
- [x] Zod validation present at all API trust boundaries
- [x] Auth checked before DB in all server actions
- [x] Baseline security headers ship from `web/next.config.ts`

## Legacy Removal Readiness

- [x] Category page (`/category/:category`) exists in `web/`
- [x] Tag page (`/tag/:slug`) exists in `web/`
- [x] Category and tag chips are clickable links on post cards and post detail pages
- [x] `/settings` → `/account` redirect exists
- [x] `client/` no longer needed for any user-facing path
- [x] `server/` no longer needed for any production API path
- [x] Environment variables and deployment docs written (`docs/deployment.md`)
- [x] Final smoke test completed — all core flows confirmed (reading, SEO, admin, public auth, comments, likes, account settings)
- [x] Cutover plan executed: `client/`, `server/`, `shared/` all deleted
- [x] Root `package.json` cleaned (legacy workspaces, scripts, devDeps removed)
- [x] Root `bun.lock` regenerated with only `web/` workspace

## Smoke Test Results (2026-03-14)

### Passed ✓
- Homepage loads, infinite scroll works
- Search returns results
- Category page with filtered posts
- Tag page with filtered posts
- Post detail page renders with comments endpoint
- Sitemap XML valid
- RSS feed valid (all posts)
- Unauthenticated comment POST → 401
- Admin image upload without auth → 401
- Admin route unauthenticated → GitHub sign-in page
- `/settings` redirect → 307
- Admin login/logout
- Signup password validation (Supabase policy enforced correctly)
- Cards clickable, category/tag chips still navigate correctly
- Edit post button visible on post detail when admin signed in
- Theme toggle works reliably

### Passed ✓ (2026-03-15 — live auth session)
- Signup email delivery confirmed working
- Login redirect to `redirectTo` param
- Account settings: display name save, theme persist, email/password change
- Post a comment, like/unlike, delete own comment
- Admin create/edit/delete post end-to-end

### Known Issue — Login before email confirmation
Users can sign in immediately after registering without clicking the confirmation link. This is likely a Supabase dashboard setting ("Enable email confirmations" toggle under Authentication → Email). Should be investigated and resolved before going fully public.

## SMTP Note

Supabase shared email (free tier) confirmed working. Custom SMTP not yet configured but not blocking.

## Post Page Visual Redesign (2026-03-15)

- [x] Hero image full-width at top of article card (no inset padding)
- [x] Featured image clickable → opens photo lightbox
- [x] Gallery thumbnail strip for extra images
- [x] Keyboard navigation (← → Esc) in lightbox
- [x] Swipe gestures in lightbox (mobile)
- [x] Scroll lock fix: non-passive touchmove preventDefault + `lightbox-open` body class
- [x] HomeFeed pull-to-refresh ignores touch when lightbox is open
- [x] Editorial article header (larger title, balanced meta row, tag chips)
- [x] Prose width constrained to `68ch` for comfortable reading
- [x] Related posts cards with image thumbnails
- [x] "Keep exploring" CTA with accent gradient background
- [x] Post page scroll target and map focus behavior improved for navigation
- [~] JSON-LD blog posting structured data present on post detail pages; deployed Rich Results validation still pending before it should be treated as fully closed

## Recommended Next Steps

1. Decommission the legacy Cloudflare Worker in the Cloudflare dashboard
2. Remove old Cloudflare Workers environment variables and build settings from the dashboard
3. Keep expanding automated coverage for authenticated admin flows and remaining UX polish tasks, especially Playwright verification for the already browser-checked widened admin layouts
