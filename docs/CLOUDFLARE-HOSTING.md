# Running this site on Cloudflare (operations guide)

The blog (`jsquaredadventures.com`) runs as a **Cloudflare Worker** built by
[vinext](https://vinext.dev), with its database in **your own Turso account**.
Vercel is no longer in the request path.

Last verified: 2026-10-30.

---

## 1. What runs where

| Piece | Where | Notes |
|---|---|---|
| Web app | Cloudflare Worker `jsquared-blog` | Custom domains `jsquaredadventures.com` + `www` |
| Preview copy | Cloudflare Worker `jsquared-blog-preview` | `*.workers.dev`; safe to break |
| Database | Turso, org *yours* (`webdevjev` group, `aws-us-west-2`) | DB name `jsquared-blog` |
| Images | Cloudinary (unchanged) | same account as before |
| Email | Resend (unchanged) | same account as before |
| Auth | GitHub OAuth (unchanged app) | callback `https://jsquaredadventures.com/api/auth/callback/github` |
| DNS | Cloudflare zone `jsquaredadventures.com` | apex + www are Worker custom domains |
| Crons | Cloudflare Cron Triggers | 00:00 UTC publish, 06:00 UTC Supabase keep-awake |

The Vercel project still exists as a rollback target, but nothing points at it.

---

## 2. Deploying a change

```bash
cd ~/Projects/jsquared_blog/web
export CLOUDFLARE_ACCOUNT_ID=...      # or put it in web/.env
export CLOUDFLARE_API_TOKEN=...       # Workers Scripts: Edit + Account Settings: Read

pnpm run deploy:cf                    # defaults to the production Worker
```

The script targets `jsquared-blog` unless `CLOUDFLARE_WORKER_NAME` is set. It
verifies that every secret actually persisted after upload and fails the run if
any are missing.

`deploy:cf` does four things, in this order:

1. `vite build` (via `vinext-cloudflare deploy`) and upload the Worker.
2. Re-apply **every runtime value as a Worker secret**.
3. Register the cron triggers.
4. Hit `/api/posts` and fail loudly if it is not `200`.

**Do not run `pnpm run deploy:vinext` on its own.** A bare code deploy rewrites
the Worker's binding list and *drops the secrets*, so the site 500s until they
are re-applied. `deploy:cf` exists to make that impossible.

Preview worker instead:

```bash
CLOUDFLARE_WORKER_NAME=jsquared-blog-preview \
PUBLIC_WORKER_URL=https://jsquared-blog-preview.servicesorsubscriptions-natural894.workers.dev \
pnpm run deploy:cf
```

---

## 3. Configuration and secrets

Non-secret values live in `web/cloudflare.config.ts` as plain-text bindings
(`NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`). Everything else is a **secret**,
uploaded from the repo-root `.env` by `scripts/deploy-cloudflare.mjs`.

Why it is built this way: on Workers `process.env` is a frozen proxy that only
carries plain vars. Worker secrets arrive on the `env` object passed to `fetch`,
so `web/worker-entry.ts` copies them onto `globalThis.__RUNTIME_ENV__` before the
app loads, and `src/lib/env.ts` merges that over `process.env`. Any new module
that reads configuration directly should call `getEnvSource()` rather than
touching `process.env`.

**Rotate one value:**

```bash
# edit the value in ~/Projects/jsquared_blog/.env, then:
cd ~/Projects/jsquared_blog/web && pnpm run deploy:cf
```

There is no separate "update secret" command to remember — the deploy script
always re-uploads the current `.env`.

**Where the secrets are stored:** `.env` on this machine (mode 600) and as
encrypted Worker secrets in Cloudflare. They are never committed to git and
never appear in the Worker's plain-text bindings table.

---

## 4. The database (Turso)

The site's data now lives in **your** Turso account, not the Vercel-managed one.

- Dashboard: <https://app.turso.tech> → group `webdevjev` → database `jsquared-blog`
- The connection string and token are `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`
  in `.env`.

**Rotate the database token**

```bash
curl -X POST -H "Authorization: Bearer $TURSO_PLATFORM_API_KEY" \
  https://api.turso.tech/v1/databases/jsquared-blog/auth/tokens \
  -d '{"authorization":"full-access","expiration":"never"}'
```

Put the returned `jwt` into `.env` as `TURSO_AUTH_TOKEN`, then `pnpm run deploy:cf`.

**Back up the database**

```bash
turso db shell jsquared-blog ".dump" > ~/backups/jsquared-blog-$(date +%F).sql
```

(If the `turso` CLI is not installed: `curl -sSfL https://get.tur.so/install.sh | bash`.)

**Migrations** are unchanged: `pnpm run db:migrate` from `web/`, pointed at the
same `TURSO_DATABASE_URL`.

---

## 5. Crons

`vercel.json` crons were replaced by Worker Cron Triggers:

| Schedule (UTC) | Route |
|---|---|
| `0 0 * * *` | `/api/cron/publish-scheduled` |
| `0 6 * * *` | `/api/cron/keep-supabase-awake` |

`worker-entry.ts` maps the schedule string to the route and calls it with
`Authorization: Bearer $CRON_SECRET`. List or change them:

```bash
curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/jsquared-blog/schedules"
```

The endpoint expects a **bare JSON array**: `[{"cron":"0 0 * * *"}]`.

---

## 6. Logs and debugging

```bash
cd ~/Projects/jsquared_blog/web
npx wrangler tail jsquared-blog --format pretty
```

The Worker logs a one-line binding summary (`[entry] bindings(n): ...`, names
only) and `[entry] runtimeEnv ...` lengths on cold start — enough to tell
"config missing" from "application bug" without printing any secret.

Common symptoms:

| Symptom | Cause |
|---|---|
| `error code: 1101` + "Missing or invalid environment variables" | secrets were dropped — redeploy with `pnpm run deploy:cf` |
| Empty pages, `listAllSeasons failed` | database token invalid or DB unreachable |
| `/api/auth/*` 500 | `next-auth` interop regression (see `route.ts` resolver) |
| Cron route 500 | `CRON_SECRET` missing |

---

## 6b. Admin access (Cloudflare Access)

`/admin` and `/api/admin` (apex **and** `www`) sit behind the Zero Trust
application **Blog Admin**. Allowed identities:

- `jnshaver@protonmail.com`
- `jevonx@protonmail.com`
- `blog@jsquaredadventures.com`

Session 24 h. Team domain `https://jsquaredadventures.cloudflareaccess.com`,
app AUD `e5a22e0584856f704d952060106a1f4be380a89b06f3814ee4f1a853ac160234`.

The Worker verifies the signed `Cf-Access-Jwt-Assertion` (JWKS + issuer +
audience) in `src/lib/auth/cloudflare-access.ts`, then maps the email to a local
`users` row so authored content keeps a real foreign key.

**Access is the only admin path in production.** When `CF_ACCESS_*` is set,
`requireAdminSession()` returns null for any request without a valid Access JWT —
there is no GitHub fallback, so the `*.workers.dev` hostname cannot be used to
reach admin data. GitHub OAuth remains only for local development.

**Never trust `Cf-Access-Authenticated-User-Email` on its own** — the Worker is
also reachable on `*.workers.dev`, where a client can set that header itself.

Add or remove an admin: Zero Trust → Access → Applications → **Blog Admin** →
Policies → **Blog admins**. Rotating the app (new AUD) means updating
`CF_ACCESS_AUD` in `.env` and redeploying.

Verify gating without a browser:

```bash
curl -sI https://jsquaredadventures.com/admin | grep -i location
# → https://jsquaredadventures.cloudflareaccess.com/cdn-cgi/access/login/...
```

---

## 7. Rolling back

**A deploy:** Cloudflare keeps versions. In the dashboard: Worker
`jsquared-blog` → Deployments → pick a previous version → *Rollback*.
Secrets are per-version, so a rollback keeps the config that version had.

**To Vercel entirely:** the Vercel project was never deleted. Restore the DNS
records:

```
CNAME  jsquaredadventures.com      -> 633c8eb4ed72aabf.vercel-dns-017.com  (DNS only)
CNAME  www.jsquaredadventures.com  -> 633c8eb4ed72aabf.vercel-dns-017.com  (DNS only)
```

Delete the two Worker custom domains first (Workers → `jsquared-blog` →
Settings → Domains), otherwise the records conflict.

---

## 8. Adding another app

The pattern is identical for `webdevblog` and `farmers-market`:

1. `npx vinext init --platform=cloudflare --name <app> --cdn-cache=workers-cache --data-cache=none --image-optimization=none`
2. Copy `cloudflare.config.ts`, `worker-entry.ts`, `scripts/deploy-cloudflare.mjs`.
3. Add `"deploy:cf": "node scripts/deploy-cloudflare.mjs"` to `package.json`.
4. Point the app's env module at `globalThis.__RUNTIME_ENV__` (see
   `src/lib/env.ts` here — `getEnvSource()`).
5. `bun run deploy:cf` (or `pnpm run deploy:cf`).
6. Attach a custom domain:
   `PUT /accounts/{id}/workers/domains` with
   `{"environment":"production","hostname":"<host>","service":"<app>","zone_id":"<zone>"}`.
   Delete any existing DNS record for that hostname first.

Each app needs its **own** GitHub OAuth app (GitHub allows one callback URL per
OAuth app), so a new hostname means a new OAuth app or an updated callback.
