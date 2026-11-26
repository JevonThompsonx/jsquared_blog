# Cloudflare hosting

The blog's **production origin is a local Node/Next server on templetonbak**,
reachable only through the `templetonbak` Cloudflare Tunnel. Cloudflare still
provides DNS, TLS, WAF, caching, and the Access gate on `next.`. Vercel is suspended
(HTTP 402 / `DEPLOYMENT_DISABLED`) and is not in the request path.

|                   |                                                                |
| ----------------- | -------------------------------------------------------------- |
| Edge              | Cloudflare DNS/TLS/WAF; Access on `next.`                      |
| Tunnel            | `templetonbak` `ede2f4c2-…` (host Docker `cloudflared`)        |
| Origin            | `http://127.0.0.1:3010` (`jsquared-blog.service`, user `blog`) |
| Public hostnames  | `jsquaredadventures.com`, `www.jsquaredadventures.com`         |
| Staging           | `next.jsquaredadventures.com` (whole site behind Access)       |
| Database          | SQLite at `/srv/blog/shared/blog.db`                           |
| Media             | `/srv/blog/shared/media/`                                      |
| Admin gate        | WorkOS AuthKit (app-level) on `/admin` + `/api/admin`          |
| Rollback artifact | Worker `jsquared-blog` (no custom domains, no cron)            |

Operations, deploy, and rollback: [`docs/runbooks/local-origin.md`](./docs/runbooks/local-origin.md).

## Legacy Worker path (rollback only)

The Worker `jsquared-blog` and its 28 secrets are retained for a short rollback
window, but it no longer owns the apex/www custom domains and both Workers'
cron schedules are empty. The deploy instructions below apply **only** when
deliberately rolling back to the Worker:

```bash
cd web
pnpm run deploy:cf
```

## Deploy

```bash
cd web
pnpm run deploy:cf     # build → upload → re-apply secrets → crons → health check
```

Never run a bare `vinext-cloudflare deploy`: it rewrites the Worker's binding list
and drops the secrets, leaving the site on `error code: 1101` until they are
re-applied. `deploy:cf` exists to make that impossible.

Preview: `CLOUDFLARE_WORKER_NAME=jsquared-blog-preview pnpm run deploy:cf`.

## Admin access

`/admin` and `/api/admin/*` are **app-gated only** by WorkOS AuthKit. The
Cloudflare **Blog Admin** Access app was deleted on 2026-11-24; its definition is
backed up operator-side for a deliberate rollback. `next.` remains behind the
**Blog Staging** Access app.

Admin authorization requires all of:

- a live WorkOS session with verified email;
- current `ADMIN_ALLOWED_EMAILS` membership;
- a live local `users.role = 'admin'`;
- `auth_time` no older than 24 hours.

Readers and admins can use email Magic Auth (one-time code), passkeys, or
configured OAuth providers. No application password is created or stored. The
WorkOS dashboard **Sign-up URL override must remain empty**; pointing it at
`/api/auth/signup` makes the hosted sign-up page redirect back to the same endpoint
in a loop.

The rollback Worker source still verifies the signed `Cf-Access-Jwt-Assertion`
against the team JWKS and app AUD. That path is rollback-only; the current Node
origin never trusts a Cloudflare Access JWT as an application credential.

**`*.workers.dev` is disabled on both Workers** (2026-11-23). Production is only
reachable through the custom domains. Re-enable a default hostname temporarily only
for a deliberate preview, and never while a Worker holds production secrets.

## Edge posture (2026-11-23)

- Always Use HTTPS: on
- Minimum TLS: 1.2
- HSTS: enabled at the edge (2 years, includeSubDomains, preload) in addition to
  the app's header
- Early Hints: on
- Cache rule: `sitemap.xml`, `robots.txt`, `feed.xml` cached 1 h at the edge
- Admin/API/account/bookmarks/preview/login/signup/callback/settings responses
  are `no-store` from `web/src/proxy.ts`

## Newsletter — self-hosted Listmonk

The newsletter does **not** use Resend contacts. It runs on gaia LXC `152`
(`listmonk`, `10.50.2.152:9000`) behind the gaia tunnel:

| Item        | Value                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------- |
| Public host | `listmonk.jsquaredadventures.com`                                                                 |
| Tunnel      | `b02bdabc-7733-4c67-aa23-aacd5f9dabf9` → `http://10.50.2.152:9000`                                |
| Access      | `/admin*`, `/api*`, `/subscription/form` (four owner emails + `blog-newsletter-v3` service token) |
| Public      | `/subscription/optin/*`, `/public/*`                                                              |
| List        | `J² Adventures`, double opt-in; UUID in Worker secret `LISTMONK_LIST_UUID`                        |
| SMTP        | Resend SMTP (`smtp.resend.com:465`, user `resend`, dedicated sending key)                         |
| Backups     | CT152 in `pbs-gaia-guests` + daily `pg_dump` timer                                                |

The blog Worker calls `POST /api/public/subscription` with the Access service
token. Runbook: [`docs/runbooks/listmonk.md`](./docs/runbooks/listmonk.md).

## Runtime configuration

Values live in `../.env` (mode 600, never committed) and are uploaded as Worker
**secrets** by `web/scripts/deploy-cloudflare.mjs`. Add a value to
`CONFIG_KEYS` there and to the zod schema in `src/lib/env.ts`.

On Workers `process.env` is a frozen proxy: plain vars only, secrets absent,
writes ignored. `web/worker-entry.ts` publishes the bindings on
`globalThis.__RUNTIME_ENV__` and `src/lib/env.ts` merges them (`getEnvSource()`).
Any new module reading configuration server-side must use `getEnvSource()`.

## Pending

1. Nothing blocking. Sign in at `/admin` with an allowlisted address and an email
   one-time code, passkey, or configured OAuth provider; the dashboard loads
   directly with no Cloudflare Access or GitHub-only step.
2. Optional: enable Cloudflare Images for `next/image` optimisation; Sentry source
   maps are partial under vinext.

Full detail: `docs/CLOUDFLARE-HOSTING.md` (operations) and
`docs/CLOUDFLARE-MIGRATION.md` (migration record + Vercel inventory).
