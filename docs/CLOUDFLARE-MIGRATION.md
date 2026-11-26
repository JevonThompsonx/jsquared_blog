# Vercel → Cloudflare migration record (2026-10-30)

Status: **the blog runs on Cloudflare Workers with its database in the owner's
own Turso account.** WebDevBlog is deployed and verified on Workers too.
Vercel was not deleted; it stays as a rollback target.

Operations guide: [`CLOUDFLARE-HOSTING.md`](./CLOUDFLARE-HOSTING.md).

---

## What moved

| App | Before | After | Verified |
|---|---|---|---|
| jsquared_blog | Vercel + Vercel-managed Turso (`database-beige`) | Worker `jsquared-blog`, apex + www, DB `jsquared-blog` in Turso group `webdevjev` | yes |
| WebDevBlog | Vercel + `database-yellow` | Worker `webdevblog`, DB `webdevblog` | yes |
| farmers-market | Vercel + `database-sky` | code prepared, **not deployed** (missing Vercel-only credentials) | build only |

Database copies were made with a schema-and-data copy (tables created in
foreign-key order, rows inserted in batches, indexes/triggers after) and
verified by comparing per-table row counts. FTS5 shadow tables are skipped and
rebuilt by their virtual table.

| Database | Rows copied | Row-count check |
|---|---|---|
| jsquared-blog | 151 across 13 tables | PASS |
| farmers-market | 624 across 7 tables | PASS |
| webdevblog | 9 across 2 tables | PASS |

The original Vercel-managed databases were **read only** in this migration and
were not modified or deleted.

---

## Evidence

**Blog, live on the apex and www (2026-10-30):**

```
/                      200   93586
/api/posts             200   11864   (real posts)
/feed.xml              200    1105   (contains "First Adventure")
/api/auth/providers    200     197   callbackUrl = https://jsquaredadventures.com/api/auth/callback/github
/api/auth/csrf         200      80
/sitemap.xml           200    7106
```

**Database write through the live site:** `POST /api/posts/<id>/view` returned
`202 {"counted":true}` and `posts.view_count` went 47 → 48 in the new Turso DB.

**Auth:** the OAuth start endpoint returns a GitHub authorize URL with
`redirect_uri=https://jsquaredadventures.com/api/auth/callback/github` — the same
callback Vercel used, so no GitHub OAuth app change is required.

**Cron routes:** `/api/cron/publish-scheduled` with `Authorization: Bearer
$CRON_SECRET` → `200 {"scanned":0,...}`, without → `401`.

**WebDevBlog:** `/`, `/blog`, `/projects`, `/feed.xml`, `/api/auth/providers`
all `200`; `/admin` `307` (auth guard). Feed contains real posts from the
migrated DB.

**Builds:** `tsc --noEmit` 0 errors on the blog; WebDevBlog has the same 4
pre-existing `.next/types` errors before and after the change (no new ones).

---

## Changes that were required

1. **vinext on Cloudflare** — `vite.config.ts`, `cloudflare.config.ts`,
   `worker-entry.ts`, `deploy:cf` script (see the guide).
2. **Worker secrets** — `cf deploy` rewrites bindings and drops secrets, and
   `cf workers secrets bulk` stored empty values in this CLI version. The deploy
   script now deploys first, then `PUT`s each secret to the REST endpoint.
3. **`process.env` on Workers** — it is a frozen proxy carrying plain vars only.
   Secrets never appear there and writes are silently ignored. `worker-entry.ts`
   publishes `globalThis.__RUNTIME_ENV__`; `src/lib/env.ts` merges it and exposes
   `getEnvSource()`. Modules that read config directly
   (`cron-auth`, `rate-limit`, `email/resend`, comment notifications, newsletter)
   now use it.
4. **`next-auth` v4 CJS interop** — the default export (and the GitHub provider)
   arrive wrapped one or two `.default` layers deep under Vite. Both apps resolve
   all shapes; without this `/api/auth/*` threw `(0, x.default) is not a function`.
5. **Cron triggers** — `worker-entry.ts` maps the schedules to the app's cron
   routes and injects the bearer token.
6. **DNS** — apex and www CNAMEs to Vercel were replaced by Worker custom
   domains (the pre-change records are saved for rollback).

---

## Open items

1. **Login has not been completed end to end** — the OAuth redirect is correct
   but no browser session was signed in during the migration. First admin login
   should be confirmed by the owner.
2. **farmers-market needs three Vercel-only values** before it can deploy:
   `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `UNSPLASH_ACCESS_KEY`.
3. **Image optimisation is off** (no Cloudflare Images binding); remote images go
   through `@unpic/react`, local images are served as-is.
4. **Sentry source maps and `typedRoutes` are partial** under vinext (the
   compatibility report marks both partial).
5. **The preview Worker** still builds with production URLs; it is a scratch
   environment, not a staging replica.

---

## Full Vercel inventory (2026-10-30)

**The Vercel account is suspended.** Every deployment returns `HTTP 402
Payment Required` with `x-vercel-error: DEPLOYMENT_DISABLED`, and the API
returns an empty project list even with a team key (projects 404 by ID). So
these apps were already offline — the migration is restoring service, not just
changing hosts.

| Project | Kind | Vercel URL | Status |
|---|---|---|---|
| jsquared_blog | Next.js + Turso | jsquaredadventures.com | **migrated**, live |
| WebDevBlogsite | Next.js + Turso | web-dev-blogsite.vercel.app | **migrated**, live |
| TODO.tsx | Next.js + Turso | todo-tsx-eight.vercel.app | **migrated**, live |
| Carolina | static HTML | carolina-two.vercel.app | **migrated**, live |
| React-Tic-Tac-Toe | Vite | react-tic-tac-toe-gamma-six.vercel.app | **migrated**, live |
| LinkTree-Clone | Vite | link-tree-clone-mu.vercel.app | **migrated**, live |
| unit_converter_PWA | Vite PWA | unit-converter-pwa.vercel.app | **migrated**, live |
| Business_standard_template.ts | Vite | business-standard-template-ts.vercel.app | **migrated**, live |
| unit_converter (frontend) | Vite | unit-converter-frontend.vercel.app | **frontend migrated** |
| farmers-market | Next.js + Turso | first-mongoose-express-app.vercel.app | prepared, **blocked on 3 credentials** |
| WebDevBlogArchive | Express + Docker | web-dev-blog-archive.vercel.app | **not migrated** (needs a container) |

New Cloudflare URLs (all `*.servicesorsubscriptions-natural894.workers.dev`):
`carolina`, `react-tic-tac-toe`, `linktree-clone`, `unit-converter-pwa`,
`business-standard-template`, `unit-converter`, `todo-tsx`, `webdevblog`.

Still open:

- **farmers-market** needs `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
  `UNSPLASH_ACCESS_KEY`; the app's env schema rejects startup without them.
- **WebDevBlogArchive** is an Express server with a `Dockerfile` — it is a
  container candidate for templetonbak, not a Worker.
- **unit_converter backend** lives on Render (`unit-converter-backend.onrender.com`)
  and did not respond (`timeout`) — unrelated to Vercel, but the deployed
  frontend needs it.
