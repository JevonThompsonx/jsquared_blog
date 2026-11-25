# Listmonk runbook (self-hosted newsletter)

**Host:** gaia Proxmox node, unprivileged LXC `152` (`listmonk`), `192.168.50.152` / `10.50.2.152`.
**Public URL:** `https://listmonk.jsquaredadventures.com`
**Tunnel:** gaia tunnel `b02bdabc-7733-4c67-aa23-aacd5f9dabf9`; ingress points at `http://10.50.2.152:9000`.
**Access:** `/admin*`, `/api*`, and `/subscription/form` require Cloudflare Access. The blog Worker uses the `blog-newsletter-v3` service token. `/subscription/optin/*` and `/public/*` stay public (confirmation, unsubscribe).

## Layout

```
/opt/listmonk/
  docker-compose.yml
  .env                 # mode 600, contains DB + admin + Resend SMTP secrets
  uploads/             # Listmonk media (if used)
```

Postgres runs in `listmonk_db` with a named volume. Listmonk runs in `listmonk_app`, bound to `10.50.2.152:9000` and loopback only.

## Rebuild / source of truth

The committed files under `deploy/listmonk/` are the reproducible source:

```bash
install -d -m 700 /opt/listmonk
cp deploy/listmonk/docker-compose.yml /opt/listmonk/docker-compose.yml
cp deploy/listmonk/.env.example /opt/listmonk/.env   # fill values, chmod 600
cp deploy/listmonk/listmonk-backup.sh /usr/local/bin/listmonk-backup
chmod 755 /usr/local/bin/listmonk-backup
cp deploy/listmonk/listmonk-backup.service deploy/listmonk/listmonk-backup.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now listmonk-backup.timer
cd /opt/listmonk && docker compose up -d
```

The compose images are pinned to the verified `listmonk` v6.2.0 and Postgres 17 digests.

## Health

```bash
ssh root@100.96.0.2
pct exec 152 -- docker ps
pct exec 152 -- curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:9000/
curl -fsS -o /dev/null -w '%{http_code}\n' https://listmonk.jsquaredadventures.com/public/custom.css
curl -sI https://listmonk.jsquaredadventures.com/admin | head -1   # 302 → Access
```

## SMTP

Settings → SMTP in the admin UI, or the `LISTMONK_smtp__*` values in `/opt/listmonk/.env`:

- Host `smtp.resend.com`, port `465`, SSL, auth `login`
- Username `resend`, password = a dedicated Resend sending key (not the app key)
- From `newsletter@mail.jsquaredadventures.com`
- HELO hostname `listmonk.jsquaredadventures.com`

Use the admin **Test** button after changing. A Resend key with contacts/read scope is not needed.

## Lists

The blog uses one list with `optin = double` and `send_optin = true`. Its UUID is in the blog Worker secret `LISTMONK_LIST_UUID`.

Do not set the list to single opt-in: the blog's confirmation copy and privacy page assume double opt-in.

## Backups

- Nightly `pg_dump` timer on CT152: `/var/backups/listmonk/listmonk-YYYY-MM-DD.dump`, 14-day retention.
- Add CT152 to the `pbs-gaia-guests` vzdump job (PBS run 02:00).
- Restore drill:

```bash
pct exec 152 -- docker exec listmonk_db pg_restore --clean --if-exists \
  -U listmonk -d listmonk_restore /var/backups/listmonk/<file>.dump
```

Create `listmonk_restore` first; never restore over the live DB without a snapshot.

## Rotate credentials

1. **Resend SMTP key:** create a new sending key, update `/opt/listmonk/.env`, `docker compose up -d` in `/opt/listmonk`, test SMTP, delete the old key.
2. **Listmonk admin password:** Admin → Settings → Users.
3. **Access service token:** create a new token in Zero Trust, add it to both Listmonk Access policies, update the root `.env` `LISTMONK_ACCESS_CLIENT_*`, `pnpm run deploy:cf`, then delete the old token.
4. **DB password:** update `.env` and the Postgres role, then restart both containers.

## Rollback

- **Blog:** unset `LISTMONK_URL` / `LISTMONK_LIST_UUID` and redeploy. `/api/newsletter` returns 202 skipped; the form shows "not available".
- **Host:** stop CT152; the public hostname returns 502 while DNS/tunnel remain. Remove the ingress rule and DNS record from the saved config to fully retire it.
- **List data:** restore the latest `pg_dump` into a scratch DB, verify `subscribers`/`lists`, then swap.
