# MODERNIZATION_TODO — jsquared_blog (feat/phase1-modernization)

> Created 2026-09-03. Prioritized remaining work after the E2E `webServer` port-flag fix (`e29a13a`).
> Branch contract: work here, PR to `main` only when gates are green.

## P0 — E2E quarantine vs dummy DB env (done 2026-09-03, needs CI proof)

- CI (`ci.yml`) injects dummy services (`TURSO_DATABASE_URL=https://test-db.turso.io`,
  `SUPABASE_URL=https://test.supabase.co`, …) for **all** jobs, so DB-backed Playwright
  specs fail against unreachable hosts instead of skipping. Reported wall-clock signal:
  21/48 E2E failing with dummy URLs (**NOT VERIFIED** here — no Playwright browsers on
  this host; treat as reported, re-prove in CI).
- Fix applied: `web/tests/e2e/helpers/db-env-guard.ts` + `skipIfDummyDbEnv()` wired into
  all 20 specs at file scope. Dummy/placeholder/missing Turso/Supabase URLs → whole file
  skips with a clear reason; real-cred runs unaffected. `file:` Turso URLs count as real
  (local SQLite). Verified: `tsc --noEmit` + `eslint` (see gate log); E2E itself NOT
  VERIFIED locally — confirm in CI (`test:e2e` job should report skipped, not failed).
- Follow-up: if CI `e2e` still red, either provision real preview creds as repo secrets
  (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SUPABASE_URL`, …) or mark `e2e` non-required
  until then. Do NOT weaken unit gates (`lint`/`typecheck`/`test`/`build` stay required).

## P1 — Worktree cleanup (done 2026-09-03)

- Removed stale `.worktrees/t_67551002` (`wt/dry-run-vercel-59-20260829`, commit `61de0fb`)
  via `git worktree remove --force` after backing up `git worktree list` output.
- Verify: `git worktree list` shows only the main checkout. Do not re-create dry-run
  worktrees inside the repo without removing them same-turn.

## P1 — eslint-disable inventory (documented 2026-09-03, do NOT mass-remove)

- Count: 20 `eslint-disable` comments under `web/src` + `web/tests` (2026-09-03).
- Policy: leave in place; each must keep its justification. Remove one only when the
  underlying cause is fixed in the same change, with gate proof.

## P2 — Format scripts (done 2026-09-03)

- Added `format` / `format:check` (`prettier --write .` / `prettier --check .`) to root and
  `web` `package.json`; added root + `web` `.prettierignore` (`.next/`, `test-results/`,
  `playwright-report/`, `coverage/`, `.worktrees/`, `playwright/.auth/`).
- Run `pnpm run format` from root before pushing style-heavy changes.

## Deferred / watch

- `docs/ROADMAP.md` + `docs/branches/` remain the feature-tracking source of truth;
  update them when P0–P2 items are CI-proven.
- E2E with real creds still needs a full green run before `e2e` becomes a required check.
