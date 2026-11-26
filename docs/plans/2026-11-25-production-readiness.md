# Production readiness hardening

**Date:** 2026-11-25
**Branch:** `t3/blog-audit-hardening-optimization`
**Baseline commit/tag:** `2ae2306` / `prod-live-20261125T2019`

## Owner decisions

- WorkOS staging is the accepted production identity environment.
- Reader impersonation is denied application-side.
- Sentry is deferred; journal and Kuma cover this release.
- Version the blog deploy contract only, not the host-wide restic script.
- Commit/tag/push and deploy now.
- Cloudflare token renewal is an owner action before 2026-12-01.

## Implementation order

1. B2: commit `web/drizzle/meta/0025_snapshot.json`.
2. B3: add `migrate-database.mjs`, `verify-schema.mjs`, `reconcile-migration-ledger.mjs`, package `drizzle-orm`, and deploy gates.
3. H5: add `0026` case-insensitive email index migration and schema.
4. B4/B5/M2: fail-fast production env validation.
5. H1/H6: log/Sentry auth failures and reject impersonated readers.
6. M3: cross-site guards for newsletter/view.
7. H2: health write/schema probes.
8. M4: remove inline global-error style.
9. H7: production audit gate.
10. H4: version host units/scripts and update deploy docs.
11. Docs/runbook updates.
12. Full validation, deployment, and evidence.

## TDD-first requirements

Each code change must have a failing test before implementation and a passing
targeted test after implementation. No tests may be deleted to make a change pass.

## Acceptance criteria

- Ledger reconciles to 27/27 with matching hashes.
- `db:generate` produces no diff.
- Production boot fails on missing `CRON_SECRET`, empty/invalid
  `ADMIN_ALLOWED_EMAILS`, or invalid `NEXT_PUBLIC_SITE_URL`.
- Impersonated readers and callbacks are denied without local identity writes.
- Auth/admin failures log only error name/code and never PII/tokens.
- Newsletter/view cross-site requests are 403 in production.
- Health reports 503 for read/write/schema/media failures.
- `deploy/blog/verify-host.sh` passes on templetonbak.
- All unit/type/lint/build/package/E2E gates pass.
- No secret, code, token, or PII is printed or committed.

## Production schema repair (2026-11-25 20:34 UTC)

The live database was ledgered at 20/27 with seven missing migrations and four
legacy hashes. Two migrations had never applied (`0010_phase6_indexes`,
`0023_post_revisions_metadata`); four were applied without ledger rows
(`0011`, `0013`, `0014`, `0020`); `0026` was pending. Drizzle only applies
migrations newer than the last ledger timestamp, so `0010`/`0023` could not be
applied by the normal runner.

Repair sequence (taken after a WAL-safe backup
`/srv/blog/shared/backups/blog-20261126-0434.db`):

1. Applied the six missing indexes from `0010` and all seven columns from `0023`
   in one `BEGIN IMMEDIATE` transaction as `blog`.
2. Ran the migration runner; it applied `0026` and its normalized-email preflight.
3. Ran the ledger reconciler dry-run, then `--apply`: four legacy hashes updated,
   six ledger rows inserted.
4. `verify-schema.mjs`: **27/27 rows, 0 hash mismatches, 0 missing; 21 tables,
   45 indexes; no missing tables/columns/indexes; no extra tables.**

Live health stayed `ok` throughout. The pre-repair backup remains the rollback
point for this schema change.

## Rollback

- Code: restore previous release `20261125T2019`.
- DB: restore pre-migration backup, delete WAL/SHM, chown, start.
- Migration 0026: drop the index and remove its ledger row.
- Env: restore the backup env file.

## Final deployment and verification (2026-11-26 04:41 UTC)

- Release `/srv/blog/releases/20261126T044107` from commit `bd52818` is current;
  previous `20261125T2019` remains available for rollback.
- Deploy applied 0 migrations (ledger already 27/27), verified the schema, and
  recorded backup `blog-20261126-0441.db` passing `pragma quick_check`.
- Release is `root:blog` read-only; `.next/cache` is `blog:blog`.
- `/api/health` local and public: `ok` with database, databaseWrite, schema, and
  media true.
- Smoke: `/`, `/about`, and a published post 200; cross-site newsletter POST 403;
  `/_next/image` 200 with an image-cache write; journal clean.
- `verify-host.sh` passed; unit tests 1,596 pass; typecheck/lint/build/package
  pass; production audit gate green; `db:generate` no diff.
- E2E: 6 passed, 63 fixture-gated skips, 0 failed (authenticated fixtures not
  supplied this cycle).
- Independent final security recheck: **PASS**.

## Remaining owner actions

- Kuma `/api/health` monitor creation is owner-gated by API/UI access.
- Sentry DSN remains unset unless supplied later.
- Cloudflare token renewal remains an owner action before 2026-12-01.
- The next post-reboot soak is not observed yet.
