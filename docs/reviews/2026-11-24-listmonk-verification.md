# Listmonk Newsletter — Verification Record

**Date:** 2026-11-23/24
**Branch:** `t3/blog-audit-hardening-optimization` (deployed)
**Worker version:** `c4455401-dcec-42b9-8332-0a716c066327`
**Commit:** `b1eb1e2` (code `dbde353`/`0949040`; docs final)

---

## What changed

**Local service**
- New unprivileged gaia LXC `152` (`listmonk`), `192.168.50.152` / `10.50.2.152`, 2 vCPU / 2 GiB / 20 GiB.
- Docker Compose: `listmonk/listmonk` 6.2.0 + `postgres:17-alpine`; data on a named Postgres volume; Listmonk uploads volume.
- Cloudflare Tunnel (gaia `b02bdabc-…`) → `http://10.50.2.152:9000`.
- DNS `listmonk.jsquaredadventures.com` (proxied CNAME to the tunnel).
- Access apps: `/admin*` and `/api*`; four owner emails + `blog-newsletter-v3` service token (`non_identity` policy).
- Public `/subscription/*` and `/public/*` stay open for confirmation/unsubscribe.
- SMTP: Resend `smtp.resend.com:465`, user `resend`, dedicated sending key; HELO `listmonk.jsquaredadventures.com`; from `newsletter@mail.jsquaredadventures.com`.
- List: `J² Adventures`, public, **double opt-in**, UUID `05c12689-41c6-472e-9b9f-2b3e935ec75c`.

**Blog**
- `web/src/lib/email/listmonk.ts`: server-only client for `POST /api/public/subscription`; Access service-token headers; 8 s abort; accepts `{data:{has_optin:true}}`; typed errors.
- `web/src/server/services/newsletter.ts`: Listmonk-only; returns `subscribed` or `skipped`.
- `web/src/app/api/newsletter/route.ts`: keeps Zod + rate limit; 201 subscribed / 202 skipped / 400 invalid / 429 throttled.
- UI: 201 → “Check your inbox to confirm your subscription.”
- Privacy page: self-hosted Listmonk, double opt-in, Resend as relay only.
- Deploy script config keys + env schema updated.
- Local backup: `web/scripts/backup-blog-data.mjs` (Turso SQL dump + image mirror) and `backup:data` script.

**Backups/monitoring**
- CT152 added to `pbs-gaia-guests` (PBS 02:00).
- Daily `pg_dump` systemd timer on CT152, 01:30, 14-day retention; first dump 72 KiB.
- User systemd timer `jsquared-backup.timer` on templetonBak, 01:30, runs the Turso/image backup.

---

## Live verification

| Check | Result |
|---|---|
| `POST /api/newsletter` live, valid email | **201** `{"status":"subscribed"}` |
| Invalid email | **400** `{"error":"Invalid newsletter signup request"}` |
| Listmonk subscriber/list state | `j2adventurez@gmail.com` → `J² Adventures` → `unconfirmed` |
| Confirmation page `GET /subscription/optin/<uuid>` | **200**, title “Confirm subscription - J² Adventures” |
| Confirmation POST `confirm=true` | **200**, title “Confirmed - J² Adventures”; DB status **confirmed** |
| Unsubscribe page + POST `blocklist=true` | **200**, title “Unsubscribed - J² Adventures”; DB status **unsubscribed** |
| Repeat signup for an already-confirmed/blocked address | **201** `{"status":"subscribed"}` (uniform, no enum) |
| `/admin` anonymous | **302** → Cloudflare Access |
| `/api/lists` anonymous | **302** → Access |
| `/` (Listmonk public root) | **403** (WAF blocks the secondary signup page) |
| `/subscription/form` | **302** → Access (the blog API is the signup path) |
| `/subscription/optin/<uuid>` | **200** public |
| `/archive` | **404** (public archive disabled) |
| `/api/public/subscription` with service token | **200** `{"data":{"has_optin":true}}` |
| `/api/public/subscription` without token | **302** → Access |
| Privacy page | contains “Listmonk (self-hosted)” and “double opt-in” |
| Existing tunnel hostnames (`cloud.`, `seafile.`) | unchanged (302) |
| `*.workers.dev` | 404 |
| Backup service | `status=0/SUCCESS`; `/var/backups/listmonk/listmonk-2026-11-24.dump` |
| Local backup timer | first run success; `/home/hermes/backups/jsquared_blog/2026-11-24` (153 rows, 8/9 images, 0 critical failures) |
| Backup flag regression | `--prune 90` no longer becomes the output dir; no `web/--prune`; dated set written under the backup root |
| Host compose pin | `/opt/listmonk/docker-compose.yml` replaced with the repo digest-pinned file; app recreated on `listmonk/listmonk:v6.2.0` |
| Worker list binding | live blog signup created `j2adventurez@gmail.com` on `J² Adventures` `unconfirmed` (test row deleted afterward) |

**Gates:** typecheck PASS, lint 0 errors, 173 files / 1348 tests PASS, Next build PASS, vinext build PASS, deploy health `/api/posts` 200, 28 Worker secrets verified.

**Independent review:** APPROVE after fixing the repeat/already-confirmed acknowledgement (P1), gating `/subscription/form`, pinning image digests, and correcting the `--prune` backup-argument regression (B-1).

**Final verifier:** **PASS — 98/100** (infra 20/20, double opt-in 24/25, code 20/20, backups 15/15, privacy/docs 10/10, rollback/regression 9/10). All eight acceptance criteria pass; the two lost points are only because confirmation/unsubscribe transitions were primary-recorded rather than re-executed in the final read-only pass.

---

## Cost/decision record

- Cloudflare Images Basic **$5/mo cancelled** (`cancel_at_period_end=true`, effective 2026-12-05). All 17 assets exported first (47 MB) to `/home/hermes/backups/2026-11-23/images`; no published content referenced `imagedelivery.net`.
- Full local origin/DB/images was **not** migrated: it saves no meaningful money (Workers/Turso/Cloudinary/Resend free tiers; only Images Basic was paid), and home WAN/power + PBS gaps (roadman PBS offline, no UPS/offsite) make it a reliability regression. Local **backup copies** of DB/images are now produced daily instead.
- `pbs-roadman` CT137 is stopped because `/mnt/usb` is missing (`No such device`); roadman guest backups have been failing since ~Nov 17. Physical USB check required. This does not affect the new Listmonk host on gaia.

## Not verified / limitations

1. **Inbox delivery** — the opt-in email was accepted by Listmonk with no SMTP errors, but the Resend account key is send-only, so the delivered message could not be read back/confirmed in an inbox.
2. **`/subscription`** returns 404; the working public form is `/subscription/form`, and opt-in links use `/subscription/optin/<uuid>`. This is Listmonk's route shape, not a tunnel/DNS failure.
3. **Listmonk SMTP env** is not applied via `LISTMONK_smtp__*`; SMTP is configured in the admin settings UI (persisted in Postgres). The `.env` SMTP values are harmless defaults but the UI is authoritative.
4. **Full local app/DB/images** remains a deliberate no-go until backup/offsite/UPS and Access multi-AUD work are done.

## Rollback

- **Blog:** unset `LISTMONK_URL`/`LISTMONK_LIST_UUID` and `pnpm run deploy:cf`; `/api/newsletter` returns 202 skipped, form shows unavailable. No data loss.
- **Listmonk:** stop CT152; remove the tunnel ingress + DNS + Access apps from the saved config. Subscriber data remains in Postgres/PBS.
- **Cost:** re-subscribe Cloudflare Images if the exported assets are ever needed in the dashboard.
