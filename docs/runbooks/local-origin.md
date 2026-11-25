# Local origin runbook (templetonbak)

Status: **production origin on templetonbak since 2026-11-24**. Cloudflare
remains the edge; the application, database, media, cron, and rate limiting run
on the always-on HP Z2 host. The older gaia CT153 release and database are kept
as a rollback copy but are stopped.

## Topology

| Piece | Where |
|---|---|
| Edge | Cloudflare DNS, TLS, WAF, Access, cache |
| Tunnel | `templetonbak` (`ede2f4c2-4793-4d94-b4c5-8237fba8b10f`) via the host Docker `cloudflared` |
| Ingress | `jsquaredadventures.com`, `www.jsquaredadventures.com`, `next.` → `http://127.0.0.1:3010` |
| App | templetonbak host, Debian 13, Node 26, systemd `jsquared-blog.service` as user `blog` |
| Release | `/srv/blog/releases/<UTC timestamp>/web` + `/srv/blog/current` symlink |
| Database | `/srv/blog/shared/blog.db` (SQLite, WAL) |
| Media | `/srv/blog/shared/media/` served at `/media/*` |
| Uploads | admin/avatar routes write content-addressed WebP via `sharp` |
| Rate limit | in-process (`RATE_LIMIT_DRIVER=memory`); single Node process |
| Cron | systemd timers on templetonbak (`jsquared-blog-publish`, `-backup`) |
| Backups | `sqlite3 .backup` daily 03:30 UTC, 14-day retention; templetonbak restic includes `/srv/blog/shared` (DB + media) offsite |
| Staging | `next.jsquaredadventures.com` (whole site behind Access) |

The Cloudflare Worker `jsquared-blog` is **retained as a rollback artifact only**.
Its custom domains, cron schedules, and DNS records were removed at cutover.

## Deploy

Build on templetonbak (the production host) from the repo root:

```bash
cd web
set -a; . ../../.env; set +a
export TURSO_DATABASE_URL="file:$PWD/../local/blog.db"
export LOCAL_MEDIA_ROOT="$PWD/../local/media"
export RATE_LIMIT_DRIVER=memory NEXT_OUTPUT=standalone NODE_ENV=production
pnpm run build:node
node scripts/package-standalone.mjs /tmp/j2-release
```

`package-standalone.mjs` copies `.next/standalone`, `.next/static`, and
`public/`, then recreates the runtime symlinks that Next does not trace
(`sharp`, `@libsql/client`, `@libsql/core`) and strips local `*.env*` files.
Without those links the release only works on a machine that already has the
pnpm workspace.

Ship and switch on templetonbak:

```bash
TS=$(date -u +%Y%m%dT%H%M)
sudo mkdir -p "/srv/blog/releases/$TS"
tar -C /tmp/j2-release -cf - . | sudo tar -C "/srv/blog/releases/$TS" -xf -
sudo chown -R blog:blog "/srv/blog/releases/$TS"
sudo ln -sfn "/srv/blog/releases/$TS" /srv/blog/current
sudo systemctl restart jsquared-blog
sleep 4
curl -fsS http://127.0.0.1:3010/api/health
```

`/srv/blog` is mode 750 `blog:blog`; use `sudo` for release and symlink changes.
The service runs as `blog` and binds only `127.0.0.1:3010`; Cloudflare Tunnel
reaches it locally.

Keep three releases. If the health endpoint returns 503, inspect
`journalctl -u jsquared-blog -n 100 --no-pager`; switch `current` back to the
previous release and restart.

## Environment

`/srv/blog/shared/.env`, mode `600 blog:blog`, loaded by systemd:

- Required: `TURSO_DATABASE_URL=file:/srv/blog/shared/blog.db`,
  `LOCAL_MEDIA_ROOT=/srv/blog/shared/media`, `RATE_LIMIT_DRIVER=memory`,
  `WORKOS_CLIENT_ID`, exact `WORKOS_ISSUER`, approved
  `NEXT_PUBLIC_WORKOS_REDIRECT_URI`, `WORKOS_COOKIE_PASSWORD` (32+ chars),
  `WORKOS_COOKIE_MAX_AGE=1209600`, `ADMIN_ALLOWED_EMAILS`, and `CRON_SECRET`.
- `WORKOS_API_KEY` and `WORKOS_COOKIE_DOMAIN` must not be set in the app service.
- `CF_ACCESS_TEAM_DOMAIN` / `CF_ACCESS_AUD` are legacy app vars; Cloudflare Access
  is still configured at the edge as the outer `/admin` gate during soak.
- Legacy Better Auth / Auth.js env vars may remain for one code-rollback cycle.
- Cloudinary, Upstash, and `TURSO_AUTH_TOKEN` are no longer set in production.
- Never copy this file into a release directory or commit it.

## Cron

| Timer | Schedule | Action |
|---|---|---|
| `jsquared-blog-publish.timer` | every 5 min, UTC | `GET /api/cron/publish-scheduled` |
| `jsquared-blog-backup.timer` | daily 03:30 UTC | SQLite hot backup + 14-day prune |

The publish service authenticates with `Authorization: Bearer $CRON_SECRET`.
Check:

```bash
systemctl list-timers --no-pager | grep jsquared
systemctl start jsquared-blog-publish.service
journalctl -u jsquared-blog-publish.service -n 20 --no-pager
```

The Worker schedules are empty on purpose. Do not re-enable them while the
local origin is live — both would publish the same scheduled posts.

## Data migration (one-off, rerunnable)

1. Dump Turso:

   ```bash
   cd web
   node scripts/backup-blog-data.mjs /tmp/j2-final
   ```

2. Restore + migrate:

   ```bash
   sqlite3 /tmp/final.db < /tmp/j2-final/turso.sql
   TURSO_DATABASE_URL=file:/tmp/final.db pnpm run db:migrate
   node scripts/migrate-local-media.mjs /tmp/final.db /srv/blog/shared/media          # dry run
   node scripts/migrate-local-media.mjs /tmp/final.db /srv/blog/shared/media --apply  # write
   ```

3. Without `--apply` the script only lists the URLs it would migrate. With
   `--apply` it downloads referenced images, re-encodes them to WebP, rewrites
   every table/column that can hold an image URL, drops dead orphan media rows,
   and fails if a legacy host survives in a published field. Host matching is
   exact (`res.cloudinary.com`, `imagedelivery.net`, `images.unsplash.com`,
   `*.supabase.co`).
   Re-running it against the same DB makes no further changes.

## Rollback

Application-only (no data written since deploy):

```bash
sudo ln -sfn /srv/blog/releases/<previous> /srv/blog/current
sudo systemctl restart jsquared-blog
```

Host rollback to CT153: re-enable and start `jsquared-blog` there, re-add the
apex/`www`/`next` hostnames to the `gaia` tunnel pointing at
`http://192.168.50.153:3000`, switch the three DNS CNAMEs back to the `gaia`
tunnel, and purge Cloudflare's cache. The CT153 release and DB are the
pre-move copy; writes made on templetonbak after the move are not in it.

Database rollback: `sudo systemctl stop jsquared-blog`, restore the desired
`/srv/blog/shared/backups/blog-*.db` over `blog.db`, `sudo chown blog:blog`,
`sudo systemctl start jsquared-blog`. Any rows written after that backup are
lost; export them first if the rollback is not an emergency.

Worker rollback (only meaningful if you also accept the pre-cutover Turso
state): re-attach the custom domains and cron schedules from
`/home/hermes/backups/jsquared-blog/cutover-*/`, delete the apex/www tunnel
CNAMEs, and purge Cloudflare's cache. The exact API payloads are in the
cutover directory's JSON files.

**Do not rebuild the Worker from current `main`/HEAD for a rollback.** The local
media routes import `sharp` and `node:fs`, which workerd cannot bundle. The
rollback artifact is the Worker script already deployed before the cutover; if a
source rebuild is ever required, build from `02fdaca` (the last Worker-only
commit).

## Known limitations

- **Reader and admin auth use WorkOS AuthKit.** The app runtime is keyless and
  uses the host-scoped `wos-session` cookie; Better Auth/Auth.js code is removed,
  while their tables/env remain for one rollback cycle. See
  [`workos-auth.md`](./workos-auth.md) for flows, cutover, smoke, and rollback.
- **Staging and production share one process and one database.** Smoke accounts
  created on `next.` are production rows; clean them up.
- **templetonbak reboots daily at ~04:00 local** (owner-approved) and has a
  WiFi-only uplink. Expect a short 5xx window during the reboot; this is the
  tradeoff for moving off the always-on Proxmox node.
- **CT153 is standby, not live.** Its `jsquared-blog.service` is disabled and
  its timers are off; its `/srv/blog` copy is the rollback material.
- **Plausible and Sentry stay external** (free tiers). They are removable, but
  they are not part of the origin migration.
- **Maps stay external** (Stadia + OpenStreetMap). Self-hosting tiles/geocoding
  is 100 GB+ and high maintenance.
- **Never add `loading.tsx` above a route that calls `notFound()`.** A streaming
  loading boundary flushes `200 OK` before the 404 is known; the route then
  renders the not-found UI with a success status. This is why the post,
  category, tag, series, and author routes no longer have loading skeletons.
  Listing routes without `notFound()` keep theirs.
- **Single-process rate limiting.** `RATE_LIMIT_DRIVER=memory` is correct for one
  Node process. Scaling to multiple instances requires a shared store.
- **Cloudflare API token expires 2026-12-01.** Renew it before changing DNS,
  Access, or tunnel configuration.
