# Blog host contract (templetonbak)

Versioned copy of the files the blog origin needs on the host. The application
release is still built from the repository; this directory owns the systemd
units, the SQLite backup helper, and the deploy/verify gates.

## Contents

| File                            | Live path                             | Mode | Owner     |
| ------------------------------- | ------------------------------------- | ---- | --------- |
| `jsquared-blog.service`         | `/etc/systemd/system/`                | 644  | root:root |
| `jsquared-blog-publish.service` | `/etc/systemd/system/`                | 644  | root:root |
| `jsquared-blog-publish.timer`   | `/etc/systemd/system/`                | 644  | root:root |
| `jsquared-blog-backup.service`  | `/etc/systemd/system/`                | 644  | root:root |
| `jsquared-blog-backup.timer`    | `/etc/systemd/system/`                | 644  | root:root |
| `jsquared-blog-backup`          | `/usr/local/bin/jsquared-blog-backup` | 755  | root:root |

Host paths and permissions:

- `/srv/blog` and `/srv/blog/releases`: `750 root:blog`
- `/srv/blog/shared`: `770 blog:blog`
- `/srv/blog/shared/.env`: `600 blog:blog`
- `/srv/blog/shared/media`: `775 blog:blog`
- `/srv/blog/current` is a symlink to `/srv/blog/releases/<UTC timestamp>`

The service account can read releases but cannot replace the `current` symlink
or add code. Only root deploys.

## Install the units

```bash
sudo install -m 644 deploy/blog/jsquared-blog.service         /etc/systemd/system/
sudo install -m 644 deploy/blog/jsquared-blog-publish.service /etc/systemd/system/
sudo install -m 644 deploy/blog/jsquared-blog-publish.timer   /etc/systemd/system/
sudo install -m 644 deploy/blog/jsquared-blog-backup.service  /etc/systemd/system/
sudo install -m 644 deploy/blog/jsquared-blog-backup.timer    /etc/systemd/system/
sudo install -m 755 deploy/blog/jsquared-blog-backup          /usr/local/bin/jsquared-blog-backup
sudo systemctl daemon-reload
sudo systemctl enable --now jsquared-blog.service jsquared-blog-publish.timer jsquared-blog-backup.timer
```

## Verify the host

```bash
sudo deploy/blog/verify-host.sh
```

It is read-only. It compares every unit and the backup helper byte-for-byte
against the live copies, checks modes and ownership, verifies both timers are
enabled and active, checks `User=blog`, and confirms `/srv/blog/current`
resolves inside `/srv/blog/releases`.

## Deploy

Deploy only from a committed ref that is already checked out:

```bash
git switch --detach <commit-or-tag>
sudo deploy/blog/deploy.sh <commit-or-tag>
```

The script refuses a dirty worktree, a ref that is not `HEAD`, a missing
runtime variable, a database path that does not match the backup helper, or a
missing backup helper. It builds the standalone release, packages it, keeps the
release root-owned/read-only and makes `.next/cache` writable by `blog`, records
and verifies a WAL-safe SQLite backup, applies migrations as `blog`, verifies the
schema and ledger, writes `RELEASE.json`, switches `/srv/blog/current`, restarts
the service, and polls `http://127.0.0.1:3010/api/health`. A failed health check
switches back to the previous release and re-checks its health. The three newest
releases are kept.

The preflight reads `/srv/blog/shared/.env` but prints only variable names. It
requires a 16+ character `CRON_SECRET`, a valid admin email, an HTTPS
`NEXT_PUBLIC_SITE_URL`, an HTTPS `/callback` redirect, `WORKOS_CLIENT_ID`,
`WORKOS_ISSUER`, a 32+ character `WORKOS_COOKIE_PASSWORD`, `LOCAL_MEDIA_ROOT`,
`HOSTNAME`, `PORT=3010`, and either `RATE_LIMIT_DRIVER=memory` or Upstash
credentials.

If a legacy ledger hash or missing ledger row is known, add `--reconcile`. That
runs the one-time reconciliation (DDL effects verified, no writes on missing
effects) immediately before migrations. Repairs involving DML/PRAGMA statements
are refused unless the operator runs the reconciler directly with
`--allow-unverifiable` after reviewing those statements:

```bash
sudo deploy/blog/deploy.sh <commit-or-tag> --reconcile
```

If reconciliation reports missing effects, the database is genuinely behind:
apply the DDL from those named migrations first (or restore the pre-migration
backup), then re-run reconciliation and `verify-schema.mjs`. Do not insert ledger
rows for effects that do not exist.

## Rollback

```bash
sudo ln -sfn /srv/blog/releases/<previous> /srv/blog/current
sudo systemctl restart jsquared-blog.service
curl -fsS http://127.0.0.1:3010/api/health
```

Migration 0026 is additive (a case-insensitive unique index); the previous
release can run against it. For database rollback, stop the service, restore a
backup from `/srv/blog/shared/backups/`, delete `blog.db-wal` and `blog.db-shm`,
`chown blog:blog`, then start the service.

## Environment

`/srv/blog/shared/.env` is mode `600 blog:blog` and is never copied into a
release or committed. Production boot fails fast when `CRON_SECRET`,
`ADMIN_ALLOWED_EMAILS`, `NEXT_PUBLIC_SITE_URL`, or the WorkOS runtime values are
missing or invalid. Errors name the variable only and never echo values.

## Constraints

- Do not disable or retime the daily ~04:00 host reboot; schedule deploys in the
  late-morning window.
- Do not re-enable the Cloudflare Worker cron schedules while this origin runs.
- `deploy.sh` runs migrations before the switch; do not reorder that gate.
