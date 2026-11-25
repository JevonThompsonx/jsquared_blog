# WorkOS AuthKit migration — implementation review

**Date:** 2026-11-24
**Branch:** `t3/blog-audit-hardening-optimization`
**Plan:** [`../plans/2026-11-24-workos-authkit-migration.md`](../plans/2026-11-24-workos-authkit-migration.md)
**State:** cut over to production 2026-11-24 (release `20261125T0001`)

## Evidence grades

- **PROVEN:** observed command output, test result, file diff, or packaged runtime check.
- **CLAIMED (orchestrator):** staging dashboard state reported by the orchestrator; not independently accessed by implementation.
- **NOT VERIFIED:** requires production state, real credentials, or a live authenticated browser.

## Mandate and constraints

Replace Better Auth reader auth and Auth.js/GitHub admin auth with WorkOS AuthKit
4.6.3 while preserving local `users.id`, profiles, content FKs, restrictive admin
authorization, CSP, CSRF, and rate limiting. Runtime is keyless. Implementation
did not read the WorkOS secret file, use the secret attachment, modify production
env/DB/services/Cloudflare/WorkOS, deploy, commit, or push.

## Verified dashboard state (orchestrator-reported)

- Four callbacks registered: apex, `www`, `next`, and localhost; apex default.
- Initiate login: `https://jsquaredadventures.com/api/auth/login`.
- Sign-up: `https://jsquaredadventures.com/api/auth/signup`.
- Four sign-out roots registered; apex default.
- Email + Password and signups enabled; no social providers.
- Password minimum 12 with existing complexity.
- Session maximum 14 days, access token 5 minutes, inactivity 7 days.

These values are reflected in `web/.env.example` and
[`../runbooks/workos-auth.md`](../runbooks/workos-auth.md). The implementation did
not access the dashboard and did not run the redirect-registration script.

## Baseline (PROVEN)

From `web/`:

- `pnpm run typecheck` — PASS.
- `pnpm run test` — PASS, 175 files / 1,340 tests.

## RED → GREEN evidence (PROVEN)

| Area | RED command and observed failure | GREEN result |
|---|---|---|
| Env | `pnpm exec vitest run tests/unit/workos-env.test.ts` — 6 failures, `getWorkosEnv is not a function` | env + build-fallback tests pass |
| Redirects | same targeted run — 14 unsafe encoded/auth-loop paths accepted | 37 env/redirect tests pass together |
| Migration | `pnpm exec vitest run tests/unit/workos-migration.test.ts` — provider enum lacked `workos`; unique index absent | 2 tests pass on a migrated temp DB |
| Identity | `pnpm exec vitest run tests/unit/workos-identity.test.ts` — missing identity module | 10 tests pass, including concurrent first login and FK preservation |
| Admin | `pnpm exec vitest run tests/unit/workos-admin.test.ts` — missing admin module; later caught unwanted re-promotion | 10 tests pass after promotion-only-on-first-login correction |
| Proxy | `pnpm exec vitest run tests/unit/workos-proxy.test.ts` — AuthKit not composed; prefetch excluded | 7 tests pass |
| Routes | `pnpm exec vitest run tests/unit/workos-routes.test.ts` — callback/auth routes missing | 14 tests pass |
| Client hooks | `pnpm exec vitest run tests/unit/workos-client-auth.test.tsx` — hook module missing | 2 tests pass |
| UI | targeted provider/login/signup/account/bookmarks/header/mobile/admin tests — 11 failures | 41 tests pass |
| Scripts | `pnpm exec vitest run tests/unit/workos-scripts.test.ts` — scripts missing; then 2 expectation/error-contract failures | 8 tests pass |
| Packaging | `pnpm exec vitest run tests/unit/workos-package.test.ts` — WorkOS tracing/link assertions absent | 2 tests pass after config/script changes |

## Implementation summary

- Added keyless WorkOS env validation and approved callback origins.
- Added callback, login, signup, logout, and token-free admin-session routes.
  `/api/auth/session` is the public-safe navigation probe; `/api/admin/session`
  retains the planned handler behind Cloudflare Access.
- Added transactional identity mapping with normalized verified email, legacy and
  conflict rejection, unique-index retry, profile recovery, and no automatic
  admin promotion. Explicit operator provisioning grants local admin roles.
- Added live admin checks for current allowlist, local role, and 24-hour
  `auth_time`; denied impersonation sessions.
- Replaced reader client hooks with `useAuth`; mounted `AuthKitProvider` once in
  `AppProviders`; replaced local credential forms with hosted-flow notices.
- Composed AuthKit with the existing proxy using nonce injection,
  `partitionAuthkitHeaders`, and `applyResponseHeaders`; removed prefetch exclusion.
- Removed Better Auth/Auth.js/GitHub/Access-JWT runtime modules, routes, tests,
  forms, and dependencies. Kept rollback tables/env.
- Added migration 0025, operator scripts, SDK-`sealedSession` fixture capture,
  explicit standalone tracing/linking, CI dummy env/package smoke, and docs.

## Security review

- No hardcoded or real credentials in source, tests, examples, docs, or reports.
- App env rejects a non-empty `WORKOS_API_KEY`; no cookie domain is configured.
- Callback base URL comes from the validated public callback, with a fixed
  approved canonical origin only during production-build route collection.
- Return paths reject absolute/protocol-relative/backslash/control/encoded and
  auth-loop values. Logout uses the configured WorkOS root plus a short-lived,
  validated same-origin return cookie consumed by the proxy.
- Unverified email never links or authorizes; conflicting WorkOS identities cannot
  claim the same local email.
- Cross-site admin mutation checks and public mutation origin checks remain.
- CSP nonce generation/reporting remains; direct `x-workos-*` response headers are
  stripped and only trusted request headers go downstream.
- API rate-limit code and configuration remain unchanged.

## Acceptance criteria

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | WorkOS is the only session; legacy routes removed | PASS | route/module/dependency diff; callback/proxy tests |
| 2 | Safe reader return paths and logout | PASS | redirect + route tests |
| 3 | Existing/new identity mapping preserves FKs | PASS | identity + migration tests |
| 4 | Unverified email never links/authorizes | PASS | identity + admin + callback tests |
| 5 | Restrictive live admin gate | PASS | admin tests |
| 6 | CSRF and rate limits remain | PASS | proxy/CSRF/rate-limit suites |
| 7 | CSP nonce and no browser `x-workos-*` | PASS | proxy tests |
| 8 | Unit/typecheck/lint/build/unauth E2E | PASS | final gates below |
| 9 | Additive/reversible | PASS | migration test; retained tables/env |
| 10 | Docs/env/CI/scripts/runbook | PASS | docs and script/config diff |

## Final gates (PROVEN)

All commands below ran from `web/` unless noted.

| Command / check | Result |
|---|---|
| `pnpm run typecheck` | PASS |
| `pnpm run lint` | PASS, 0 errors / 2 unchanged warnings (`cdn-image.tsx`, `worker-entry.ts`) |
| `pnpm run test` | PASS, 178 files / 1,443 tests |
| `pnpm run build:node` | PASS, exit 0; existing Sentry deprecation, dummy-DB sitemap, and media-tracing warnings only |
| Exact clean-checkout Playwright command with only `E2E_BASE_URL` set | PASS, 6 passed / 5 DB-backed skipped |
| Prior temp-SQLite Playwright auth/account/admin run | PASS, 11/11 Chromium tests |
| `node scripts/package-standalone.mjs /tmp/opencode/jsquared-blog-workos-release` | PASS |
| Packaged `import.meta.resolve()` for both WorkOS packages | PASS; both resolved under `/tmp/opencode/jsquared-blog-workos-release/node_modules` |
| `pnpm run test:authkit-smoke /tmp/opencode/jsquared-blog-workos-release` | PASS |

Packaged real-SDK smoke evidence:

```json
{"anonymousAbout":"PASS","loginInitiation":"PASS","perHostCallbacks":"PASS","hostileHostRejected":"PASS"}
```

Exact repair commands (run from `web/` unless noted):

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build:node
TURSO_DATABASE_URL=file:/tmp/opencode/workos-e2e-repair.db \
WORKOS_CLIENT_ID=client_test_dummy \
WORKOS_ISSUER=https://auth.example.test/user_management/client_test_dummy \
NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3000/callback \
WORKOS_COOKIE_PASSWORD=test-cookie-password-at-least-32-characters \
WORKOS_COOKIE_MAX_AGE=1209600 ADMIN_ALLOWED_EMAILS=admin@example.com \
RATE_LIMIT_DRIVER=memory NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
pnpm run db:migrate
E2E_BASE_URL=http://localhost:3100 \
TURSO_DATABASE_URL=file:/tmp/opencode/workos-e2e-repair.db \
WORKOS_CLIENT_ID=client_test_dummy \
WORKOS_ISSUER=https://auth.example.test/user_management/client_test_dummy \
NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3000/callback \
WORKOS_COOKIE_PASSWORD=test-cookie-password-at-least-32-characters \
WORKOS_COOKIE_MAX_AGE=1209600 ADMIN_ALLOWED_EMAILS=admin@example.com \
RATE_LIMIT_DRIVER=memory NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
pnpm exec playwright test tests/e2e/public-auth-redirects.spec.ts \
  tests/e2e/authkit-anonymous-headers.spec.ts \
  tests/e2e/account-route-gates.spec.ts \
  tests/e2e/admin-route-gates.spec.ts \
  tests/e2e/admin-additional-route-gates.spec.ts
node scripts/package-standalone.mjs /tmp/opencode/jsquared-blog-workos-release
pnpm run test:authkit-smoke /tmp/opencode/jsquared-blog-workos-release
```

From `/tmp/opencode/jsquared-blog-workos-release/web`:

```bash
node --input-type=module -e 'for (const id of ["@workos-inc/authkit-nextjs", "@workos-inc/node"]) { const resolved = import.meta.resolve(id); if (!resolved.startsWith("file:///tmp/opencode/jsquared-blog-workos-release/") || !resolved.includes("node_modules")) throw new Error(`Unresolved packaged ${id}: ${resolved}`); console.info(`${id}: ${resolved}`); }'
```

- Anonymous `/about` with `Accept: text/html`: no PKCE verifier cookie and no
  `no-store`.
- Real `/api/auth/login`: WorkOS authorization redirect plus PKCE verifier.
- `www` and `next` forwarded hosts: their own registered callback URIs.
- Hostile forwarded host: HTTP 400.
- Operator provisioning CLI on a temp migrated DB: dry-run reported one create;
  first `--apply` created it; second `--apply` reported `unchanged: 1`; the audit
  reported zero duplicates, legacy links, orphans, or allowlisted non-admins.
- Earlier packaged smoke also confirmed health `ok`, token-free anonymous
  `/api/auth/session`, configured-root logout plus safe return cookie, and
  cross-site admin POST `403`.

## Repair cycle 1

Independent review returned PARTIAL 80/100; security review returned PASS 88/100
with hardening gaps. Repair evidence:

- **HIGH anonymous PKCE/no-store:** real-SDK Playwright regression reproduced a
  verifier cookie on `/about`; packaged-production smoke reproduced the same.
  Pending PKCE cookies are now stripped before partitioning while `wos-session`
  refresh cookies remain. Ordinary anonymous safe responses use public
  revalidation. Real login initiation still sets the verifier.
- **MEDIUM-HIGH stale admin reauth:** added `getWorkosAdminAccessState`, a stale
  admin notice, and a forced-reauth link using validated/clamped `maxAge=300`.
- **MEDIUM admin promotion:** callback mapping now explicitly disables promotion;
  mapping defaults to false. Added operator-only, dry-run-by-default
  `workos:provision-admins --apply`, with idempotency and existing-ID preservation.
- **MEDIUM pinned apex callback:** added validated per-request callback selection
  for apex, `www`, `next`, and localhost/loopback aliases; hostile hosts fail closed.
- **MEDIUM migration audit:** added duplicate `(provider, provider_user_id)` count
  and made the unique index `IF NOT EXISTS`.
- **LOW-MEDIUM E2E wiring:** WorkOS capture now writes `admin.json` plus origin
  metadata; admin helper accepts `E2E_WORKOS_STORAGE_STATE`; dead public
  password-fixture helpers/tests/commands were removed.
- **LOW docs/counts:** current architecture, commands, table/spec counts, and the
  malformed site URL example were corrected.
- **Hardening:** login/signup/callback rate limits, lazy env cache, cross-site
  logout rejection, unreachable logout code removal, and deployed public URL
  validation were added.

Final repair-gate results: all local gates above pass.

## Repair cycle 2 (final)

The orchestrator reproduced a clean-checkout Playwright startup failure because
the managed `next dev` process did not receive the dummy WorkOS variables.

- Added `web/playwright-env.ts`, which parses `.env.test.example` with
  `dotenv.parse`, validates all required dummy values, and merges only explicit
  overrides for those keys. It does not mutate the test process or copy unrelated
  harness environment values into the config object.
- `web/playwright.config.ts` now passes that deterministic env map to the managed
  web server; Playwright still inherits the normal process environment.
- Added `web/tests/unit/playwright-env.test.ts` and extended
  `playwright-config.test.ts` to catch missing WorkOS values and verify override
  precedence.
- Exact command with only `E2E_BASE_URL` set now starts successfully: **6 passed,
  5 skipped**. The skipped tests are the existing DB-backed account/admin gates
  quarantined by the dummy `test-db.turso.io` URL. A prior run against a temporary
  migrated SQLite DB passed all 11 tests.

## Score

**96/100 — PASS** (fixed plan threshold: 90/100).

- Reader flows 20/20
- Identity mapping/data integrity 15/15
- Admin authorization 20/20
- Security 15/15
- Tests/build/lint/typecheck 15/15
- Ops/docs/rollback 9/10
- Code quality/cleanup 2/5

The four-point deduction reflects the unchanged lint warnings and the absence of
a real authenticated WorkOS browser smoke, which remains orchestrator-owned. No
critical security failure was found.

## Exact file inventory

### Added files (41)

- `docs/plans/2026-11-24-workos-authkit-migration.md`
- `docs/reviews/2026-11-24-workos-migration.md`
- `docs/runbooks/workos-auth.md`
- `web/drizzle/0025_workos_identity.sql`
- `web/playwright-env.ts`
- `web/scripts/apply-workos-env.d.mts`
- `web/scripts/apply-workos-env.mjs`
- `web/scripts/audit-workos-identity.d.mts`
- `web/scripts/audit-workos-identity.mjs`
- `web/scripts/capture-workos-storage-state.ts`
- `web/scripts/configure-workos-redirects.d.mts`
- `web/scripts/configure-workos-redirects.mjs`
- `web/scripts/provision-workos-admins.d.mts`
- `web/scripts/provision-workos-admins.mjs`
- `web/scripts/smoke-authkit-anonymous.mjs`
- `web/src/app/api/admin/session/route.ts`
- `web/src/app/api/auth/login/route.ts`
- `web/src/app/api/auth/logout/route.ts`
- `web/src/app/api/auth/session/route.ts`
- `web/src/app/api/auth/signup/route.ts`
- `web/src/app/callback/route.ts`
- `web/src/components/auth/authkit-notice.tsx`
- `web/src/lib/auth/use-admin-session.ts`
- `web/src/lib/auth/workos.ts`
- `web/src/server/auth/workos-admin.ts`
- `web/src/server/auth/workos-identity.ts`
- `web/tests/e2e/authkit-anonymous-headers.spec.ts`
- `web/tests/unit/app-providers.test.tsx`
- `web/tests/unit/playwright-env.test.ts`
- `web/tests/unit/stubs/authkit-components.tsx`
- `web/tests/unit/workos-admin.test.ts`
- `web/tests/unit/workos-client-auth.test.tsx`
- `web/tests/unit/workos-env.test.ts`
- `web/tests/unit/workos-identity.test.ts`
- `web/tests/unit/workos-migration.test.ts`
- `web/tests/unit/workos-origin.test.ts`
- `web/tests/unit/workos-package.test.ts`
- `web/tests/unit/workos-proxy.test.ts`
- `web/tests/unit/workos-redirects.test.ts`
- `web/tests/unit/workos-routes.test.ts`
- `web/tests/unit/workos-scripts.test.ts`

### Modified files (121)

- `.env.example`
- `.github/workflows/ci.yml`
- `AGENTS.md`
- `CLOUDFLARE.md`
- `MODERNIZATION_TODO.md`
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/CLOUDFLARE-HOSTING.md`
- `docs/CODING.md`
- `docs/INDEX.md`
- `docs/KNOWLEDGE_BASE.md`
- `docs/ROADMAP.md`
- `docs/SETUP.md`
- `docs/runbooks/local-origin.md`
- `docs/runbooks/public-auth.md`
- `pnpm-lock.yaml`
- `web/.env.example`
- `web/.env.test.example`
- `web/drizzle/meta/_journal.json`
- `web/next.config.ts`
- `web/package.json`
- `web/playwright.config.ts`
- `web/scripts/capture-admin-storage-state.ts`
- `web/scripts/capture-public-storage-state.ts`
- `web/scripts/package-standalone.mjs`
- `web/src/app/(blog)/about/page.tsx`
- `web/src/app/(blog)/bookmarks/page.tsx`
- `web/src/app/(blog)/privacy/page.tsx`
- `web/src/app/(public-auth)/forgot-password/forgot-password-form.tsx`
- `web/src/app/(public-auth)/forgot-password/page.tsx`
- `web/src/app/(public-auth)/login/login-form.tsx`
- `web/src/app/(public-auth)/login/page.tsx`
- `web/src/app/(public-auth)/reset-password/page.tsx`
- `web/src/app/(public-auth)/reset-password/reset-password-form.tsx`
- `web/src/app/(public-auth)/signup/page.tsx`
- `web/src/app/(public-auth)/signup/signup-form.tsx`
- `web/src/app/(public-auth)/verify-email/page.tsx`
- `web/src/app/(public-auth)/verify-email/verify-email-form.tsx`
- `web/src/app/account/account-settings.tsx`
- `web/src/app/admin/actions.ts`
- `web/src/app/admin/categories/actions.ts`
- `web/src/app/admin/page.tsx`
- `web/src/app/admin/tags/actions.ts`
- `web/src/app/api/admin/comments/moderate/route.ts`
- `web/src/app/api/admin/posts/[postId]/comments/route.ts`
- `web/src/app/api/admin/posts/[postId]/revisions/[revisionId]/restore/route.ts`
- `web/src/app/api/admin/posts/[postId]/revisions/route.ts`
- `web/src/app/api/admin/posts/bulk-status/route.ts`
- `web/src/app/api/admin/posts/clone/route.ts`
- `web/src/app/api/admin/posts/preview/route.ts`
- `web/src/app/api/admin/posts/route.ts`
- `web/src/app/api/admin/posts/warnings/route.ts`
- `web/src/app/api/admin/series/[seriesId]/part-numbers/route.ts`
- `web/src/app/api/auth/[...nextauth]/route.ts`
- `web/src/app/api/public-auth/[...all]/route.ts`
- `web/src/components/admin/admin-dashboard.tsx`
- `web/src/components/auth/admin-auth-button.tsx`
- `web/src/components/blog/bookmark-button.tsx`
- `web/src/components/blog/comments.tsx`
- `web/src/components/layout/mobile-nav.tsx`
- `web/src/components/layout/site-header.tsx`
- `web/src/components/providers/app-providers.tsx`
- `web/src/components/providers/user-theme-sync.tsx`
- `web/src/drizzle/schema.ts`
- `web/src/lib/auth-client.ts`
- `web/src/lib/auth/admin.ts`
- `web/src/lib/auth/cloudflare-access.ts`
- `web/src/lib/auth/csrf.ts`
- `web/src/lib/auth/email.ts`
- `web/src/lib/auth/redirect.ts`
- `web/src/lib/auth/server.ts`
- `web/src/lib/auth/session.ts`
- `web/src/lib/e2e/env-file.ts`
- `web/src/lib/e2e/public-authenticated-guard.ts`
- `web/src/lib/e2e/public-env-artifact.ts`
- `web/src/lib/e2e/public-storage-state-config.ts`
- `web/src/lib/env.ts`
- `web/src/proxy.ts`
- `web/src/server/auth/access-users.ts`
- `web/src/server/auth/admin-users.ts`
- `web/src/server/auth/public-users.ts`
- `web/src/types/next-auth.d.ts`
- `web/tests/e2e/account-route-gates.spec.ts`
- `web/tests/e2e/admin-additional-route-gates.spec.ts`
- `web/tests/e2e/admin-route-gates.spec.ts`
- `web/tests/e2e/helpers/admin.ts`
- `web/tests/e2e/helpers/public.ts`
- `web/tests/e2e/post-comments-route-gate.spec.ts`
- `web/tests/e2e/post-login-return-path.spec.ts`
- `web/tests/e2e/public-auth-redirects.spec.ts`
- `web/tests/e2e/public-authenticated.spec.ts`
- `web/tests/e2e/public-bookmarks-error-states.spec.ts`
- `web/tests/e2e/public-login-return-path.spec.ts`
- `web/tests/e2e/smoke.spec.ts`
- `web/tests/unit/account-settings.test.tsx`
- `web/tests/unit/admin-auth-route.test.ts`
- `web/tests/unit/admin-auth.test.ts`
- `web/tests/unit/admin-e2e-helper.test.ts`
- `web/tests/unit/admin-page.test.tsx`
- `web/tests/unit/admin-users.test.ts`
- `web/tests/unit/bookmarks-page.test.tsx`
- `web/tests/unit/cloudflare-access-aud.test.ts`
- `web/tests/unit/e2e-env-file.test.ts`
- `web/tests/unit/env-runtime.test.ts`
- `web/tests/unit/local-auth-flow.test.ts`
- `web/tests/unit/login-page.test.tsx`
- `web/tests/unit/middleware.prod.test.ts`
- `web/tests/unit/middleware.test.ts`
- `web/tests/unit/mobile-nav.test.tsx`
- `web/tests/unit/playwright-config.test.ts`
- `web/tests/unit/proxy-csrf-production.test.ts`
- `web/tests/unit/proxy-csrf.test.ts`
- `web/tests/unit/public-authenticated-guard.test.ts`
- `web/tests/unit/public-e2e-helper.test.ts`
- `web/tests/unit/public-env-artifact.test.ts`
- `web/tests/unit/public-storage-state-config.test.ts`
- `web/tests/unit/signup-page.test.tsx`
- `web/tests/unit/site-header.test.tsx`
- `web/tests/unit/storage-state-helper.test.ts`
- `web/vitest.config.ts`

### Removed files (35)

- `web/scripts/capture-admin-storage-state.ts`
- `web/scripts/capture-public-storage-state.ts`
- `web/src/app/(public-auth)/forgot-password/forgot-password-form.tsx`
- `web/src/app/(public-auth)/login/login-form.tsx`
- `web/src/app/(public-auth)/reset-password/reset-password-form.tsx`
- `web/src/app/(public-auth)/signup/signup-form.tsx`
- `web/src/app/(public-auth)/verify-email/verify-email-form.tsx`
- `web/src/app/api/auth/[...nextauth]/route.ts`
- `web/src/app/api/public-auth/[...all]/route.ts`
- `web/src/lib/auth-client.ts`
- `web/src/lib/auth/admin.ts`
- `web/src/lib/auth/cloudflare-access.ts`
- `web/src/lib/auth/email.ts`
- `web/src/lib/auth/server.ts`
- `web/src/lib/e2e/env-file.ts`
- `web/src/lib/e2e/public-authenticated-guard.ts`
- `web/src/lib/e2e/public-env-artifact.ts`
- `web/src/lib/e2e/public-storage-state-config.ts`
- `web/src/server/auth/access-users.ts`
- `web/src/server/auth/admin-users.ts`
- `web/src/types/next-auth.d.ts`
- `web/tests/e2e/helpers/public.ts`
- `web/tests/e2e/post-login-return-path.spec.ts`
- `web/tests/e2e/public-authenticated.spec.ts`
- `web/tests/e2e/public-login-return-path.spec.ts`
- `web/tests/unit/admin-auth-route.test.ts`
- `web/tests/unit/admin-auth.test.ts`
- `web/tests/unit/admin-users.test.ts`
- `web/tests/unit/cloudflare-access-aud.test.ts`
- `web/tests/unit/e2e-env-file.test.ts`
- `web/tests/unit/local-auth-flow.test.ts`
- `web/tests/unit/public-authenticated-guard.test.ts`
- `web/tests/unit/public-e2e-helper.test.ts`
- `web/tests/unit/public-env-artifact.test.ts`
- `web/tests/unit/public-storage-state-config.test.ts`

## Production cutover (PROVEN 2026-11-24)

- Release `20261125T0001` staged from the packaged WorkOS build; symlink
  `/srv/blog/current` switched; `jsquared-blog.service` restarted and `active`.
- Health: `/api/health` `ok` (database, media, memory rate limiter).
- Pre-cutover backup: `/srv/blog/shared/backups/blog-workos-cutover-20261125T000132Z.db`
  (`integrity_check=ok`).
- Migration 0025 applied to production: `__drizzle_migrations` 19 → 20;
  `integrity_check=ok`; `foreign_key_check` clean.
- Admin provisioning `--apply`: 4 allowlisted emails examined, 3 created,
  1 unchanged; users 8 → 11, profiles 8 → 11; audit clean
  (no duplicate emails/subjects, no legacy/orphan WorkOS links, no allowlisted
  non-admins).
- Env: 5 keyless WorkOS keys present in `/srv/blog/shared/.env` (mode 600
  `blog:blog`); `WORKOS_API_KEY` absent.
- Cache: full Cloudflare purge succeeded.
- Public edge: apex `/`, `/about`, `/login`, `/signup`, auth pages, `/privacy`
  200; `/callback` without code 400; `/api/health` 200; `www` 200; `next` 302
  (Access); `/admin` 302 (Access outer gate); anonymous `/api/auth/session`
  `{"session":null}`; `/api/auth/login` 307 to WorkOS authorize with the apex
  callback; hostile `Host` rejected 400.
- Local origin: anonymous `/about` HTML has `cache-control: public`,
  no `Set-Cookie`, no `x-workos-*`; CSP nonce present.
- Live reader smoke (production, then cleaned up): profile 200, bookmark 201,
  comment 201; cross-site bookmark 403 (packaged pre-cutover check); reader
  `/api/admin/posts` denied (302 at the Access edge pre-origin).
- Cleanup: 1 test comment, 1 bookmark, and 1 test user removed; users back to
  11; `integrity_check=ok`; `foreign_key_check` clean.
- Timers: `jsquared-blog-publish.timer` and `jsquared-blog-backup.timer`
  active; service enabled.

## Remaining risks / NOT VERIFIED

- Cloudflare Access removed from `/admin` + `/api/admin` 2026-11-24 (Blog Admin
  app deleted; definition backed up operator-side for rollback). Anonymous
  `/admin` now returns the app's WorkOS sign-in shell (200); anonymous
  `/api/admin/*` returns app 401 JSON. `next.` remains Access-gated.
- Real allowlisted admin browser login (email verification → `/admin`) and
  stale-session re-authentication UX.
- Real reader signup with an owner-controlled non-example inbox and delivery
  placement; staging `example.com` remains reserved for Test Organization SSO.
- Authenticated Playwright E2E with a captured SDK-sealed fixture.
- Post-soak Access state: `/admin` is app-gated only; `next.` stays gated.
- Long-term move from the staging WorkOS environment to a production
  environment (new client ID; users recreated or migrated).
