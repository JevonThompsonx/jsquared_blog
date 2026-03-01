# J²Adventures Follow‑Up Checklist

Last updated: 2026-02-28

This is a short, actionable checklist for the next work session.

## Immediate follow‑ups

1. **Scheduled publish check**
   - Button reports success, but posts 42/43 are still missing from the public homepage.
   - Confirm `status`, `published_at`, and `scheduled_for` values in Supabase for those posts.
   - If the homepage still misses them, verify cache headers and the `/api/posts` response contents.
   - Run `cd server && bun run src/debug-rls.ts` to compare anon vs service role visibility.

2. **Tag/category after publish**
   - Once posts show as published on homepage, confirm they appear on tag/category pages.

3. **Auth logs**
   - If profile fetch failures continue, confirm RLS rules for `profiles` read access.

## Optional improvements

1. **Admin‑only visibility on tag/category**
   - Consider showing scheduled posts to admins on tag/category pages.

2. **Scheduled status UI**
   - Add “Publish at” timestamp and status refresh hint on the admin list.

3. **Clean up auth log noise**
   - Reduce repeated session snapshot logs in production builds.
