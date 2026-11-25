# WorkOS AuthKit migration implementation plan

Date: 2026-11-24
Status: approved for implementation
Branch: `t3/blog-audit-hardening-optimization`
Production origin: templetonbak Node/Next standalone on `127.0.0.1:3010`

## Objective

Replace both public-reader Better Auth and admin Auth.js/GitHub authentication
with WorkOS AuthKit. Preserve local SQLite `users`, `profiles`, content foreign
keys, and admin authorization that is at least as restrictive as today. Use the
owner-supplied WorkOS staging environment in production now.

## Locked constraints

- WorkOS AuthKit hosted UI is the identity provider for readers and admins.
- No dual-run of Better Auth and WorkOS reader cookies.
- App runtime uses AuthKit public-client/keyless mode: do not put
  `WORKOS_API_KEY` in the app environment.
- Keep local `users.id`; map WorkOS identities to existing users by verified,
  normalized email on first login.
- Admin gate: verified WorkOS email + `ADMIN_ALLOWED_EMAILS` +
  `users.role === 'admin'` + recent authentication (`auth_time` <= 24 hours).
- Keep Better Auth tables and legacy env vars for one rollback cycle.
- Node origin only. Do not modify or deploy the Cloudflare Worker.
- No secrets in source, tests, logs, docs, commits, or subagent prompts.
- Do not change production env, DB, services, Cloudflare, or the WorkOS
  dashboard during implementation. The orchestrator owns cutover.

## Verified environment

- `@workos-inc/authkit-nextjs@4.6.3` and `@workos-inc/node@12.4.0` are current.
- WorkOS staging client is AuthKit-enabled; OIDC discovery succeeds.
- Staging environment currently has zero redirect URIs and zero users.
- Live DB: 8 users (5 admin, 3 author), 8 profiles, 0 comments, 0 bookmarks,
  0 Better Auth sessions/accounts/verification rows; integrity check is `ok`.
- `ADMIN_ALLOWED_EMAILS` has 4 email entries.
- Secret material is in `/home/hermes/.secrets/workos-jsquared.json` mode 600.
  Implementation must not read or echo it.

## Acceptance criteria

1. WorkOS `wos-session` is the only reader/admin session; the Better Auth
   catch-all route and Auth.js route are removed.
2. Reader sign-in/signup/callback/logout preserve only safe relative return
   paths and never redirect to an untrusted origin.
3. First WorkOS login maps to an existing `users.id` by verified normalized
   email, or creates a new local user. Existing FKs and legacy rows remain.
4. Unverified WorkOS email never links or authorizes.
5. Admin access requires a live WorkOS session, verified email, current
   allowlist membership, local admin role, and `auth_time` <= 24 hours.
6. Cross-site reader/admin mutations remain blocked; app rate limits remain.
7. CSP nonce behavior remains intact; AuthKit internal `x-workos-*` headers
   never reach the browser.
8. Unit, typecheck, lint, build, and unauthenticated E2E checks pass.
9. Migration is additive/reversible; Better Auth tables remain.
10. Docs, env examples, CI, scripts, and runbooks describe the new flow and
    rollback path.

## Fixed scoring rubric

PASS threshold: 90/100. A critical security failure is an automatic FAIL.

| Category | Points |
|---|---:|
| Reader flows | 20 |
| Identity mapping/data integrity | 15 |
| Admin authorization | 20 |
| Security | 15 |
| Tests/build/lint/typecheck | 15 |
| Ops/docs/rollback | 10 |
| Code quality/cleanup | 5 |

## Architecture

### Reader

`/login` or `/signup` -> same-origin initiation route -> WorkOS hosted AuthKit
-> `/callback` -> local identity mapping -> sealed host-scoped session cookie ->
safe return path.

### Admin

`/admin` -> WorkOS session -> verified email -> `ADMIN_ALLOWED_EMAILS` -> local
`users.role === 'admin'` -> recent-auth check. Reader sessions are denied.
Cloudflare Access remains as an outer gate during rollout; removal is an
orchestrator-owned post-soak operation.

### Identity mapping

Use `auth_accounts` with `provider='workos'` and a unique
`(provider, provider_user_id)` index.

1. Reject `user.emailVerified !== true`.
2. Normalize email with lowercase + trim.
3. Resolve an existing WorkOS account link first.
4. Otherwise resolve a local user by normalized email and link it.
5. Otherwise create `users.id = 'workos-user-' + user.id`, role `reader`, plus
   a profile.
6. If the verified email is allowlisted, promote the local user to `admin`.
7. Never auto-relink an email already owned by a different WorkOS identity.
8. Never link synthetic `@legacy.supabase.local` rows.

Use a transaction plus unique-index conflict handling/retry so concurrent first
logins cannot create duplicate users or links.

### Sessions and security

- `wos-session`: HttpOnly, Secure in production, SameSite=Lax, Path=/,
  host-scoped; no `WORKOS_COOKIE_DOMAIN`.
- `WORKOS_COOKIE_MAX_AGE=1209600` (14 days).
- Set `WORKOS_ISSUER` to the exact OIDC discovery issuer.
- Use `NEXT_PUBLIC_WORKOS_REDIRECT_URI` (the SDK's actual variable name).
- Use `checkRecentAuth({ maxAge: 86400 })` for admin freshness where possible.
- Keep `rejectCrossSiteMutation`, proxy admin CSRF checks, CSP, and API rate
  limits.
- AuthKit is a top-level navigation; no new CSP origin is required unless a
  concrete console violation proves otherwise.

## Plan review corrections (mandatory)

1. Add `'workos'` to the Drizzle `authAccounts.provider` enum.
2. Mount `AuthKitProvider` only once, inside `AppProviders`; do not also wrap it
   in the root layout.
3. `handleAuth` must receive an explicit `baseURL` derived from a validated
   public origin (`apex`, `www`, `next`, or localhost). Do not let the callback
   redirect to the internal `127.0.0.1:3010` origin.
4. Test/storage-state scripts should use the `sealedSession` returned by
   `authenticateWithPassword({ session: { sealSession: true, cookiePassword } })`.
   Do not add a direct `iron-session` dependency or manually seal sessions.
5. Use `handleAuthkitProxy` / `partitionAuthkitHeaders` / `applyResponseHeaders`;
   `handleAuthkitHeaders` is deprecated in v4.6.3.
6. The proxy matcher must not exclude prefetch requests, otherwise `withAuth`
   can lose its trusted session headers.

## File plan

### Add

- `web/src/lib/auth/workos.ts`
- `web/src/app/callback/route.ts`
- `web/src/app/api/auth/login/route.ts`
- `web/src/app/api/auth/signup/route.ts`
- `web/src/app/api/admin/session/route.ts`
- `web/drizzle/0025_workos_identity.sql` and migration journal entry
- `web/scripts/configure-workos-redirects.mjs`
- `web/scripts/apply-workos-env.mjs`
- `web/scripts/audit-workos-identity.mjs`
- `web/scripts/capture-workos-storage-state.ts`
- WorkOS unit tests: identity, admin session, redirects, callback, proxy, env
- `docs/runbooks/workos-auth.md`
- `docs/reviews/2026-11-24-workos-migration.md` (cutover evidence later)

### Change

- `web/package.json`, `pnpm-lock.yaml`
- `web/src/drizzle/schema.ts` (provider enum + indexes)
- `web/src/proxy.ts`
- `web/src/components/providers/app-providers.tsx`
- `web/src/lib/auth/session.ts`
- `web/src/server/auth/public-users.ts`
- Reader/admin UI components and auth notice pages listed in the assessor
  inventory
- `web/src/lib/env.ts`, `web/vitest.config.ts`, CI workflow, env examples
- Architecture, setup, privacy, changelog, roadmap, README, AGENTS, docs index

### Remove

- Better Auth server/client/email modules and catch-all route
- Auth.js/GitHub admin modules, NextAuth route/types, Access JWT modules
- Obsolete admin-user/access-user helpers and auth tests
- Local login/signup/reset/verify forms replaced by hosted-flow notices

### Keep for rollback

- Better Auth `session`, `account`, and `verification` tables
- Legacy auth env vars (optional, not required by the new schema)

## Implementation sequence

1. Inspect current state and run baseline typecheck/tests.
2. Add failing env/identity/proxy/callback/admin tests.
3. Add dependencies and implement WorkOS env validation.
4. Add and test the additive migration on a temp DB copy.
5. Implement identity mapping and admin authorization.
6. Integrate AuthKit into the existing proxy without losing CSP/CSRF.
7. Add callback and sign-in/signup initiation routes.
8. Replace reader/admin session resolution.
9. Migrate UI to `AuthKitProvider` / `useAuth`; remove legacy forms/modules.
10. Update scripts, CI, env examples, tests, and docs.
11. Run all targeted and full checks; package standalone and verify WorkOS
    modules resolve from the packaged output.

Stop and report if a check fails, if assumptions conflict with the code, or if
scope must expand beyond authentication.

## Test requirements

- RED-first for each new module; show failing output before implementation.
- Identity: existing/new user, normalization, unverified, legacy, conflict,
  idempotency, concurrent first login, admin promotion.
- Admin: allowlisted verified admin, reader denial, unverified denial, stale or
  missing `auth_time`, removed allowlist entry.
- Redirects: absolute, protocol-relative, backslash, control-character, encoded
  and auth-loop inputs.
- Proxy: AuthKit headers/cookies preserved, internal headers stripped, CSP and
  CSRF unchanged, prefetch receives session headers.
- Callback: trusted `baseURL`, mapping failure fails closed.
- Build/package: WorkOS runtime dependencies resolve from standalone output.

Do not call the real WorkOS API in unit tests. Do not use real credentials in
E2E. Authenticated live smoke is orchestrator-owned after review.

## Cutover and rollback (orchestrator-owned)

1. Register callback URIs idempotently with the WorkOS API.
2. Owner confirms dashboard Initiate login URI, default Sign-out URI, email +
   password/signup settings, session settings, and test users.
3. Back up DB, apply migration, update `/srv/blog/shared/.env`, build/package,
   switch release symlink, restart, health-check, purge cache.
4. Verify reader and admin flows, then keep Cloudflare Access during soak.
5. Rollback code by restoring the previous release symlink; restore DB only for
   corruption. Legacy env and tables remain available.

## Dashboard values

Callbacks:

- `https://jsquaredadventures.com/callback`
- `https://www.jsquaredadventures.com/callback`
- `https://next.jsquaredadventures.com/callback`
- `http://localhost:3000/callback`

Default callback: `https://jsquaredadventures.com/callback`

Initiate login URI: `https://jsquaredadventures.com/api/auth/login`

Default Sign-out URI: `https://jsquaredadventures.com/`

Also allow the `www`, `next`, and localhost roots as sign-out URIs.

## Implementation report required

Return:

- PASS/PARTIAL/FAIL against acceptance criteria
- changed files
- exact commands and results for typecheck, lint, tests, build, package smoke
- RED/GREEN evidence for new tests
- unresolved risks or blockers
- no secrets or credential values
