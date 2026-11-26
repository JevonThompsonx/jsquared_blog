# Production hardening deploy — 2026-11-26

**Branch:** `t3/blog-audit-hardening-optimization`
**Deployed release:** `/srv/blog/releases/20261126T044107`
**Commit:** `bd528182b1185996a424ff23c33401998ebe710a`
**Previous release:** `/srv/blog/releases/20261125T2019`

## Scope

WorkOS Magic Auth follow-up hardening: impersonation denial, safe auth-failure
logging, public CSRF guards, runtime env fail-fast, health/readiness probes,
migration runner and ledger reconciler, schema snapshots, CI audit/migration
gates, and the versioned `deploy/blog/` host contract.

## Schema repair before deploy

The live database was ledgered at 20/27 with seven missing migrations and four
legacy hashes. `0010_phase6_indexes` and `0023_post_revisions_metadata` had never
applied; `0011`, `0013`, `0014`, and `0020` had applied without ledger rows; `0026`
was pending. Because Drizzle only applies migrations newer than the last ledger
timestamp, `0010`/`0023` could not be applied by the normal runner.

After a WAL-safe backup (`/srv/blog/shared/backups/blog-20261126-0434.db`):

1. Applied the six missing indexes from `0010` and all seven columns from `0023`
   in one `BEGIN IMMEDIATE` transaction as `blog`.
2. Ran the migration runner: `0026` applied with its duplicate-email preflight.
3. Ran the ledger reconciler dry-run, then `--apply`: four legacy hashes updated,
   six rows inserted.
4. `verify-schema.mjs`: **27/27 rows, 0 hash mismatches, 0 missing; 21 tables,
   45 indexes; no missing tables/columns/indexes; no extra tables.**

## Deploy gates

- Runtime env preflight covers `CRON_SECRET`, `ADMIN_ALLOWED_EMAILS`,
  `NEXT_PUBLIC_SITE_URL`, WorkOS runtime values, `RATE_LIMIT_DRIVER`,
  `LOCAL_MEDIA_ROOT`, `HOSTNAME`, and `PORT=3010`.
- `TURSO_DATABASE_URL` must be `file:/srv/blog/shared/blog.db`; the DB exists and
  is non-empty.
- A required backup helper runs as `blog`; the new snapshot must be non-empty and
  pass `pragma quick_check` before migrations.
- Migrations and schema verification run as `blog`; the release is `root:blog`
  read-only and only `.next/cache` is `blog:blog`.
- The switch moves the symlink, restarts the service, polls `/api/health`, and
  re-verifies the previous release on rollback.

## Verification evidence

- `pnpm run test`: **189 files / 1,596 tests passed**.
- `pnpm run typecheck`: passed.
- `pnpm run lint`: 0 errors, 2 pre-existing warnings.
- `pnpm audit --prod --audit-level=high`: exit 0 (3 moderate).
- `pnpm run db:generate`: no schema changes.
- `next build` + `package-standalone.mjs`: passed.
- Packaged migration/verify/reconcile on a fresh DB: 27/27, schema passed.
- `pnpm run test:e2e`: 6 passed, 63 skipped, 0 failed. Skips are fixture-gated;
  authenticated WorkOS/DB fixtures were not supplied this cycle.
- `deploy/blog/verify-host.sh`: passed on templetonbak.
- `/api/health` (local and public): `status=ok`, `database`, `databaseWrite`,
  `schema`, and `media` true.
- Smoke: `/`, `/about`, and a published post return 200; cross-site newsletter
  POST returns 403; `/_next/image` returns 200 and writes to
  `.next/cache/images`.
- `journalctl` after deploy: no EACCES, unhandled rejection, or cache write errors.
- Independent final security recheck: **PASS** on `bd52818` after ownership,
  preflight, backup, PATH/runuser, and reconcile fixes.

## Remaining owner actions

- Add a Kuma monitor for `https://jsquaredadventures.com/api/health`
  (10-second timeout, keyword `"status":"ok"`).
- Renew the Cloudflare API token before 2026-12-01.
- Sentry remains unset by owner decision.
- Observe the next post-reboot soak.
