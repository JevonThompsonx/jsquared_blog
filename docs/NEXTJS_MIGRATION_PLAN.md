# Next.js Migration Plan

## Current strategy

This repository is moving in stages rather than by a one-shot rewrite.

### Stage 1 - Foundations and safety
- Keep the current Vite + Hono app as the production-safe path.
- Add a new `web/` Next.js App Router workspace.
- Scaffold server-only env, auth, DB, Cloudinary, and query-layer boundaries.
- Read legacy published content from the existing API so the new app can render without cutting over storage or auth.
- Sanitize rich HTML before rendering in both the current client and the new app.

### Stage 2 - Data ownership
- Stand up Turso / LibSQL.
- Apply Drizzle schema and migrations from `web/src/drizzle/schema.ts`.
- Build a real DAL for posts, tags, comments, profiles, and admin authorization.
- Move canonical content storage toward structured Tiptap JSON.

### Stage 3 - Auth split
- Keep Supabase Auth for public users.
- Add Auth.js GitHub login for admins.
- Map external identities into local Turso authorization tables.

### Stage 4 - Media cutover
- Replace direct Supabase Storage assumptions with the Cloudinary service layer.
- Move editorial image metadata into Turso.

### Stage 5 - Feature cutover
- Port admin CRUD, comments, profiles, scheduling, search, and feed generation into the Next.js app.
- Switch production traffic once the Next.js app is functionally complete.

## What changed in this stage
- Added `web/` as a new Next.js App Router workspace.
- Added transitional server-side post queries that validate legacy API responses before rendering.
- Added initial Drizzle schema for the target Turso data model.
- Added a real Drizzle DAL for published post reads in `web/src/server/dal/posts.ts`.
- Applied the initial Drizzle migration to the configured Turso database.
- Updated the Next.js query layer to prefer Turso reads and fall back to the legacy API when Turso is empty or incomplete.
- Added a one-time Supabase import command in `web/scripts/import-supabase.ts` to migrate profiles, categories, tags, posts, featured images, and gallery metadata into Turso.
- Added transitional Turso write-sync hooks in `server/src/lib/tursoSync.ts` so legacy admin writes keep Turso updated while Supabase remains the operational write path.
- Added auth and Cloudinary abstraction modules so future work lands behind stable interfaces.
- Hardened current rich-text rendering with HTML sanitization.

## Import workflow

From `web/`:

```bash
bun run db:migrate
bun run db:import:supabase
```

The importer currently:
- reads from Supabase using the configured service role when available
- creates legacy-mapped users, auth accounts, categories, tags, posts, media assets, and post image records in Turso
- stores legacy HTML as a structured transitional payload so the Next.js app can render it safely while Tiptap JSON migration is still pending
- keeps the Next.js read path on a Turso-first, legacy-fallback strategy

## Transitional writes

The current admin UI and Hono API still write to Supabase first.

After successful legacy writes, the server now mirrors these changes into Turso for:
- post create and update
- post delete
- tag create
- post-tag updates
- gallery image add, remove, reorder, focal point, and alt text updates
- scheduled post publication

This keeps the Next.js read layer current without forcing an immediate admin rewrite.

## Admin auth

The Next.js app now includes a staged Auth.js GitHub admin entry point at `/admin`.

- GitHub login is enabled through `next-auth`
- successful sign-ins are mirrored into Turso `users`, `profiles`, and `auth_accounts`
- access is fail-closed unless `AUTH_ADMIN_GITHUB_IDS` is configured
- the existing production admin remains the active editor until native Next.js write flows are finished

## Native admin progress

The Next.js app now includes native Turso-first admin routes for:
- `/admin` dashboard
- `/admin/posts/new` post creation
- `/admin/posts/[postId]/edit` post editing

This first editor slice writes directly to Turso for core post fields:
- title
- slug
- excerpt
- category
- status
- layout type
- scheduled publish time
- HTML content stored in the transitional legacy payload format

Still pending before the old dashboard can be fully retired:
- native tag editing
- native featured image and gallery media workflows
- Cloudinary-backed uploads
- richer Tiptap JSON authoring instead of raw HTML textarea input

## Important note

The new Next.js app is intentionally read-only right now. The current `client/` and `server/` apps remain the working system of record while the rewrite progresses.
