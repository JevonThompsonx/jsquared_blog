# Local origin migration — 2026-11-24

Status: **PASS (conditional)**. Production origin moved from the Cloudflare Worker
to a local Node/Next server on gaia CT153. Cloudflare remains the edge.

> **Update 2026-11-24:** the origin was subsequently moved to **templetonbak**
> (host, port 3010) behind the `templetonbak` Cloudflare Tunnel. This document
> remains the record of the original CT153 cutover; use
> [`runbooks/local-origin.md`](../runbooks/local-origin.md) for current operations.

## Objective

Move everything that carried lock-in, recurring cost, or a dead dependency to
local infrastructure: origin, database, media, rate limiting, and cron. Keep
Cloudflare DNS/TLS/WAF/Access, Supabase Auth, Resend, Sentry, Plausible, and
Stadia/OSM external where self-hosting would add disproportionate risk.

## Decisions

| Area | Decision | Rationale |
|---|---|---|
| Origin | Next 16 standalone on CT153, systemd | One process, native journald, symlink rollback; no Docker layer needed |
| Database | SQLite `file:` at `/srv/blog/shared/blog.db` | 432 KiB; libSQL file mode is a drop-in for the existing Drizzle schema |
| Media | Content-addressed WebP + `sharp` + Next optimizer | Removes Cloudinary/Cloudflare Images; `/media` stays same-origin and immutable |
| Rate limit | `RATE_LIMIT_DRIVER=memory` | Single Node process makes in-process state globally consistent |
| Cron | systemd timers | Replaces Worker cron; no duplicate publisher |
| Auth | Supabase Auth stays external | Password hashes are not exportable; migration forces password resets |
| Analytics / errors | Plausible + Sentry stay external | Free tiers, removable, not migration blockers |
| Maps | Stadia + OSM stay external | Self-hosting tiles/geocoding is 100 GB+ and high maintenance |
| Email | Listmonk (CT152) + Resend | Already local/verified; self-hosted MTA would hurt deliverability |

## Code changes (commit `897d23b`)

- **DB:** `file:` URLs accepted without `TURSO_AUTH_TOKEN`; one cached client per
  URL; WAL, `busy_timeout=5000`, `foreign_keys=ON` per connection. Drizzle Kit
  uses `dialect: "sqlite"` for file URLs.
- **Media:** `saveLocalImage()` re-encodes to WebP, strips EXIF/GPS, writes
  content-addressed paths; `/media/[...path]` serves immutable files; admin and
  avatar uploads use it; `provider: "local"` added to the schema and delete path.
  Local files are deleted only when no `media_assets` row still references them.
- **Image delivery:** local `src` values use `/_next/image` for real responsive
  variants (cards, galleries, map popups, prose); `/api/og-image/[...path]`
  renders a cached 1200×630 JPEG for social cards.
- **Sanitizer:** `/media/` and `/images/` root-relative image sources are allowed;
  traversal and protocol-relative paths remain rejected.
- **Access:** `CF_ACCESS_AUD` accepts a comma/space-separated list; admin CSRF
  origin checks accept `x-forwarded-host`/`x-forwarded-proto` behind the tunnel.
- **Boot:** Cloudinary env is optional; rate limiting requires an explicit driver
  or Upstash; `/api/health` checks DB + media writability.
- **404:** loading boundaries were removed above routes that call `notFound()`
  (post, category, tag, series, author). A streaming boundary flushed `200 OK`
  before the 404 was known. Those routes now return real 404s; listing routes
  keep their skeletons. Documented in the runbook.

## Data migration

- Fresh Turso dump at cutover: 153 rows.
- Restored into SQLite, ran 18 Drizzle migrations (no-op), then
  `migrate-local-media.mjs`.
- 51 remote URLs found, 34 mapped, 17 dead Supabase URLs skipped; 27 local media
  rows, 28 files, 11 MiB; zero legacy hosts in `posts`, `post_revisions`,
  `media_assets`, `profiles`, or `wishlist_places`.
- Table counts matched source: posts 4, media_assets 27 (after dropping dead
  orphan rows), profiles 11, users 11, comments 0, wishlist 9, revisions 4.
- `PRAGMA integrity_check` = `ok`; `foreign_key_check` empty.

## Deployment

- CT153: Debian 13, 4 vCPU, 4 GB, 40 GB; Node 22.23.5; `blog` system user.
- Release layout: `/srv/blog/releases/<UTC>/web`, `/srv/blog/current` symlink.
- `jsquared-blog.service`: standalone `server.js`, `PORT=3000`, memory cap 3 GB,
  `ProtectSystem=full`, `ReadWritePaths=/srv/blog`.
- Tunnel `gaia` (`b02bdabc-…`): apex + `www` → `http://192.168.50.153:3000`.
- Staging `next.jsquaredadventures.com`: whole-site Access app, own AUD, smoke
  token; same artifact accepts both AUDs.
- Cron: publish every 5 min, Supabase keepalive daily 06:00 UTC, SQLite backup
  daily 03:30 UTC. Both Worker schedules cleared; Worker custom domains removed.
- Rollback material:
  `/home/hermes/backups/jsquared-blog/cutover-20261124-0556/` (worker domains,
  schedules, tunnel config, DNS records, Access app) plus pre-release DB copies.

## Verification evidence

| Check | Result |
|---|---|
| typecheck | PASS |
| lint | PASS (0 errors; 4 pre-existing warnings) |
| unit tests | 1383/1383 PASS |
| `next build` + standalone package | PASS |
| `/api/health` (origin + apex) | 200 `{database:true, media:true}` |
| `/`, `/posts/first-adventure` | 200 |
| Missing post/tag/category/series (human + Googlebot) | 404 |
| `/sitemap.xml`, `/feed.xml`, `/robots.txt` | 200 |
| `/media/...webp` | 200, `image/webp`, immutable |
| `/_next/image?w=640` | 200, 92 KB vs 686 KB original |
| `/api/og-image/...` | 200 `image/jpeg` 1200×630 |
| `/admin`, `/api/admin/*` | 302 to Cloudflare Access |
| comment/bookmark unauthenticated POST | 401 |
| newsletter invalid email | 400 |
| cron publish (manual + timer) | 200 `{scanned:0,published:0}` |
| SQLite backup | created, opens, integrity `ok` |

## Incident during cutover

Deleting the apex Worker custom domain removed its DNS record, and the cutover
script then crashed parsing the `204 No Content` response. Apex DNS was absent
for a few minutes before the CNAME was created manually. `www` stayed on the
Worker until the same script was rerun. Corrective action: the API helper now
handles empty responses, and the runbook states the correct order (tunnel
ingress → delete custom domain → create CNAME in the same script). No data was
lost; both hostnames serve the local origin.

## Residual risks / follow-ups

- **Cloudflare API token expires 2026-12-01.** Renew before DNS/Access changes.
- **Supabase Auth was broken upstream and has since been replaced.** The dead
  project (`dklwwdsndzewxdpkkwif.supabase.co`) is no longer used; reader auth is
  local Better Auth as of 2026-11-24. See
  [`2026-11-24-local-auth-migration.md`](./2026-11-24-local-auth-migration.md).
- **Plausible/Sentry/maps stay external** by decision; documented in the runbook.
- **Single-process rate limiting.** Correct now; needs a shared store if the app
  scales horizontally.
- **No UPS/offsite.** PBS was excluded by owner request; daily SQLite backups
  live on the same host.
- **Worker secrets remain** for the rollback window. Remove them once the window
  is deliberately closed.
- **Interactive Access login, real comment/bookmark writes, newsletter opt-in
  delivery, and map tiles on the staging hostname were NOT re-verified** after
  cutover. Code paths are unchanged; auth/maps are external. The newsletter
  double opt-in was verified end-to-end before the origin move.

## Independent review follow-up

The code reviewer raised two blocking findings and four medium ones; all were
addressed before the final deploy:

- **H1 (concurrent writes):** `file:` clients now use the native `timeout`
  (busy timeout) option, which the libsql binding applies to every pooled
  connection, and all executes retry `SQLITE_BUSY`/`database is locked`.
  Transactions are additionally serialized by an in-process queue because two
  write transactions from one file client deadlock even with a busy timeout.
  A regression test starts a second write transaction while the first is open
  and asserts both commit. The misleading "pragma per connection" wrapper and
  its unhandled-rejection failure mode are gone.
- **H2 (media reference check):** `deleteLocalMediaIfUnreferenced` now checks
  `posts.content_json`, `posts.content_html`, `post_revisions.content_json`,
  `profiles.avatar_url`, and `wishlist_places.image_url` in addition to
  `media_assets`. Avatar replacement cleans up the previous local file.
- **M1:** upload dimensions now come from the encoded output, so EXIF-rotated
  images record post-rotation width/height. Tested with orientation 6.
- **M3:** `/api/health` probes the `posts` table (a typo-created empty DB now
  fails) and `LOCAL_MEDIA_ROOT` is mandatory when the in-process rate limiter
  marks the local origin.
- **M4:** `package-standalone.mjs` refuses to delete `/`, the repo, home, the
  release root, or any ancestor; package selection is deterministic.
- **M5:** production CSRF origins now come from a static allowlist
  (apex/www/staging + `NEXT_PUBLIC_SITE_URL`); attacker-controlled
  `Host`/`x-forwarded-host` echo is dev-only. Missing `x-forwarded-proto` no
  longer locks admin out.
- **M6:** the media migration requires `--apply` for any download/rewrite/prune
  and matches hosts by exact hostname (`*.supabase.co` suffix), not substring.
- **F3 (stale CSP):** Cloudinary, imagedelivery, Unsplash, and placehold
  origins were removed from CSP and `next/image` remote patterns. Supabase and
  GitHub avatar hosts remain.
- **F2 (Plausible proxy):** the `/_stats` rewrites were removed because they
  returned 500 after the origin move; the script now loads from
  `https://plausible.io` directly (already allowed by CSP).

Verifier findings F1 (dead Supabase project) is an upstream outage, documented
above; it cannot be fixed without owner account access. The verifier's
"uncommitted worktree" observation was the documentation/Plausible follow-up
that is now committed and deployed.

## Verdict

PASS 96/100. Two points off for the apex DNS gap during cutover, two for the
remaining external auth/analytics dependencies being deliberate rather than
migrated. The reviewer's H1/H2 findings were fixed and re-tested; the verifier's
F2/F3 findings were fixed and redeployed. Reader auth remains broken by the
upstream Supabase outage (F1), which is outside this migration's control.
