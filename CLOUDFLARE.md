# Cloudflare hosting

The blog runs on **Cloudflare Workers**, not Vercel. Vercel is suspended
(HTTP 402 / `DEPLOYMENT_DISABLED`) and is no longer in the request path.

| | |
|---|---|
| Production Worker | `jsquared-blog` |
| Custom domains | `jsquaredadventures.com`, `www.jsquaredadventures.com` |
| Preview Worker | `jsquared-blog-preview` (`*.workers.dev`) |
| Database | Turso, own account, group `webdevjev`, database `jsquared-blog` |
| Admin gate | Cloudflare Access app **Blog Admin** on `/admin` + `/api/admin` |

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

`/admin` and `/api/admin` are behind the **Cloudflare Access** application
*Blog Admin*. Allowed emails:

- `jnshaver@protonmail.com`
- `jevonx@protonmail.com`
- `blog@jsquaredadventures.com`

Session 24 h. The Worker verifies the signed `Cf-Access-Jwt-Assertion` against
the team JWKS and the app AUD (`CF_ACCESS_AUD`), then maps the email to a `users`
row (`access-user-<sha256>`). A bare email header is never trusted, because the
Worker is also reachable on its own hostname.

GitHub OAuth still works as a fallback (`requireAdminSession` tries Access first).
It can be removed once Access is confirmed for all admins.

## Runtime configuration

Values live in `../.env` (mode 600, never committed) and are uploaded as Worker
**secrets** by `web/scripts/deploy-cloudflare.mjs`. Add a value to
`CONFIG_KEYS` there and to the zod schema in `src/lib/env.ts`.

On Workers `process.env` is a frozen proxy: plain vars only, secrets absent,
writes ignored. `web/worker-entry.ts` publishes the bindings on
`globalThis.__RUNTIME_ENV__` and `src/lib/env.ts` merges them (`getEnvSource()`).
Any new module reading configuration server-side must use `getEnvSource()`.

## Pending

1. **Confirm a real Access login end-to-end** — the JWT path is deployed but has
   only been verified structurally (`/admin` → 302 to the Access login). Sign in
   as an allowed address and check that the dashboard loads and saves.
2. After that works, **retire the GitHub OAuth fallback** (remove the provider and
   `AUTH_GITHUB_*` from the runtime config, drop the login UI).
3. Optional: enable Cloudflare Images for `next/image` optimisation; Sentry source
   maps are partial under vinext.

Full detail: `docs/CLOUDFLARE-HOSTING.md` (operations) and
`docs/CLOUDFLARE-MIGRATION.md` (migration record + Vercel inventory).
