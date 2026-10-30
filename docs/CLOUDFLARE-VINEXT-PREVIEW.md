# Cloudflare Workers / vinext preview (2026-10-30)

Status: **preview deployed and serving pages/auth endpoints; database-backed
content is blocked by a stale Turso token.** No DNS or Vercel changes were made.

- Worker: `jsquared-blog-preview`
- URL: https://jsquared-blog-preview.servicesorsubscriptions-natural894.workers.dev
- Branch: `feat/cloudflare-vinext-preview`
- Runtime: Cloudflare Workers, vinext 1.4.0, Vite 8, `nodejs_compat`

## What was done

1. `vinext check` → **92% compatible** (26 supported, 3 partial, 1 issue).
   - Issue: `next-auth` v4 ("relies on Next.js API route internals").
   - Partial: `next/image` (no build-time optimizer), `typedRoutes`, `@sentry/nextjs`
     (source-map/plugin features don't run).
2. `vinext init --platform=cloudflare --name jsquared-blog-preview
   --cdn-cache=workers-cache --data-cache=none --image-optimization=none`.
3. Added:
   - `web/vite.config.ts` — vinext + Cloudflare Vite plugin + Workers cache adapter.
   - `web/cloudflare.config.ts` — Worker name, assets, compat flags, runtime env.
   - `web/worker-entry.ts` — copies Worker string bindings into `process.env`
     before the app loads.
4. Fixed two CJS/ESM interop breaks in `next-auth`:
   - `web/src/app/api/auth/[...nextauth]/route.ts` — resolve the default export
     through one/two wrapper layers.
   - `web/src/lib/auth/admin.ts` — same for `next-auth/providers/github`.
5. Removed `.cloudflare/types/**/*.ts` from `web/tsconfig.json`: the generated
   types narrow `Response.json()` to `unknown`, which produced 23 type errors.
   With it removed, `pnpm exec tsc --noEmit` is **0 errors**.
6. Preview binding workaround: `cloudflare.config.ts` passes the runtime values
   as **text bindings** read from the deploying process. `cf` drops Worker
   secrets when it uploads a new code version, so this is preview-only. Text
   bindings are visible in the dashboard and `cf` prints them in its bindings
   table — production should use secrets.

## Verified

| Check | Result |
|---|---|
| `pnpm run build:vinext` | passes |
| `pnpm exec tsc --noEmit` | 0 errors |
| `/` | 200 (75 KB HTML) |
| `/about`, `/login` | 200 |
| `/feed.xml` | 200 |
| `/api/posts` | 200 `{"posts":[],...}` (DB 401 → empty) |
| `/api/auth/providers` | 200, GitHub provider, preview callback URL |
| `/api/auth/session` | 200 `{}` |
| `/api/auth/csrf` | 200 |

## Open blockers

1. **Turso token is stale.** The `TURSO_DATABASE_URL` points at
   `database-beige-vercel-icfg-…turso.io`; its token returns HTTP 401. The worker
   logs `listAllSeasons failed` / `listPublishedPosts failed` and renders empty
   data. The production Vercel project injects a fresh token via its Turso
   integration; this local `.env` token is no longer valid. Provide a current
   token (or rotate one in Turso) to test real content.
2. **`next-auth` is patched, not supported.** Login/logout should be exercised;
   the long-term path is better-auth (the compatibility report's recommendation).
3. **Cron routes do not run on Workers.** `vercel.json` cron schedules need
   Cloudflare Cron Triggers for `/api/cron/publish-scheduled` and
   `/api/cron/keep-supabase-awake`.
4. **Image optimization** is not enabled (no Cloudflare Images binding); remote
   images go through `@unpic/react`, local images are served as-is.
5. **No custom domain.** Preview is on `*.workers.dev`; switching
   `jsquaredadventures.com` / `www` requires updating GitHub OAuth and Supabase
   redirect URLs first.

## Production rollout outline

1. Provide a valid Turso token; confirm `/api/posts` returns real posts.
2. Test admin login, post edit, image upload, comment, newsletter.
3. Move text bindings to Worker secrets; add a deploy check that secrets survive
   a code upload.
4. Add Cloudflare Cron Triggers for the two cron routes.
5. Add the custom domain and update OAuth/Supabase callbacks.
6. Only then move DNS off Vercel.

## Rollback

Vercel and DNS are untouched. Delete the preview Worker
(`cf workers scripts delete jsquared-blog-preview`) and the branch; no user
traffic was moved.
