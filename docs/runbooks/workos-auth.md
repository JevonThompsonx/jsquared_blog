# WorkOS AuthKit runbook

**Status:** cut over to production 2026-11-24 (release `20261125T0001`).
**Last updated:** 2026-11-24

## Current auth model

Readers and admins use the same WorkOS AuthKit hosted identity provider and the
same host-scoped `wos-session` cookie. Better Auth, Auth.js, GitHub OAuth, and
Cloudflare Access JWT verification are no longer application auth sources.
Cloudflare Access remains the outer `/admin` edge gate during rollout.

| Setting | Value |
|---|---|
| SDKs | `@workos-inc/authkit-nextjs@4.6.3`, `@workos-inc/node@12.4.0` |
| Runtime mode | Public-client / keyless PKCE; no `WORKOS_API_KEY` |
| Session cookie | `wos-session`, HttpOnly, SameSite=Lax, Secure in production, Path=/ |
| Cookie lifetime | 14 days (`WORKOS_COOKIE_MAX_AGE=1209600`) |
| Access-token lifetime | 5 minutes (WorkOS staging dashboard) |
| WorkOS session maximum | 14 days (dashboard) |
| WorkOS inactivity limit | 7 days (dashboard) |
| Admin freshness | `auth_time` no older than 24 hours (`checkRecentAuth`) |

## Verified staging dashboard values

The orchestrator verified these values on 2026-11-24. Implementation did not
access the dashboard or secret material.

Callbacks (apex is default):

- `https://jsquaredadventures.com/callback`
- `https://www.jsquaredadventures.com/callback`
- `https://next.jsquaredadventures.com/callback`
- `http://localhost:3000/callback`

Other redirects:

- Initiate login URI: `https://jsquaredadventures.com/api/auth/login`
- Sign-up URL: `https://jsquaredadventures.com/api/auth/signup`
- Sign-out URIs: apex, `www`, `next`, and localhost roots; apex is default

AuthKit configuration:

- Email + Password enabled
- Signups enabled
- No social providers
- Password minimum 12 characters with the existing complexity policy
- `example.com` is intentionally reserved by the staging **Test Organization**
  and forces SSO. Do not use `example.com` accounts for email/password reader
  smoke tests; use an owner-controlled non-example inbox for real delivery.

`web/scripts/configure-workos-redirects.mjs` can reconcile the callback list
idempotently, but it is not needed for the already-verified staging environment.
Do not run it as part of routine deployment.

## Environment

Required app variables:

```sh
WORKOS_CLIENT_ID=client_...
WORKOS_ISSUER=https://api.workos.com/user_management/client_...
NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://jsquaredadventures.com/callback
WORKOS_COOKIE_PASSWORD=<32+ character secret>
WORKOS_COOKIE_MAX_AGE=1209600
ADMIN_ALLOWED_EMAILS=admin@example.com,second@example.com
```

`WORKOS_ISSUER` must exactly equal the `iss` claim from the OIDC discovery
document, not the AuthKit OAuth host. The app rejects a non-HTTPS issuer,
credentials/query/hash in the issuer, an unapproved callback, a missing or
invalid `WORKOS_COOKIE_MAX_AGE`, and a non-empty `WORKOS_API_KEY`. It also rejects
`WORKOS_COOKIE_DOMAIN`, a cookie name other than `wos-session`, and a SameSite
value other than `Lax`.

`NEXT_PUBLIC_WORKOS_REDIRECT_URI` is the approved default/fallback. Login,
signup, callback, and logout derive the browser-facing origin per request from
`Host`/`x-forwarded-host`, restricted to apex, `www`, `next`, and localhost/loopback
aliases. Untrusted hosts are rejected. The `www` and `next` hosts therefore keep
their own host-scoped sessions and callbacks.

Legacy Better Auth / Auth.js variables may remain in the env file for one code
rollback cycle. The WorkOS schema treats them as optional and does not read them.

## Request and identity flow

1. `/login` or `/signup` renders a hosted-flow notice.
2. `/api/auth/login` or `/api/auth/signup` rate-limits the request, validates
   `returnTo`/`redirectTo` and optional clamped `maxAge`, then calls the SDK with
   the approved per-request callback.
3. AuthKit completes PKCE and calls `/callback`.
4. `handleAuth` receives an explicit `baseURL` derived from the validated public
   callback origin. It never uses the internal `127.0.0.1:3010` request origin.
5. `onSuccess` maps the verified WorkOS identity before the session is accepted:
   - existing WorkOS subject link wins;
   - otherwise a normalized verified email links the existing local `users.id`;
   - otherwise a `workos-user-<subject>` reader and profile are created;
   - callback mapping never promotes a user, even when the email is allowlisted;
   - unverified, invalid, synthetic `@legacy.supabase.local`, and conflicting
     identities fail closed.
6. Local admins are provisioned explicitly with `workos:provision-admins`.
7. The proxy forwards trusted AuthKit headers to server components, strips
   client-supplied/internal headers, preserves CSP nonces and CSRF checks, and
   strips pending PKCE cookies from ordinary anonymous responses.
8. Reader APIs resolve `withAuth()` through `getRequestPublicUser()`.
9. Admin requests additionally require current allowlist membership, a live
   local `users.role === 'admin'`, and recent authentication. A live stale session
   is offered `/api/auth/login?returnTo=%2Fadmin&maxAge=300` for forced reauth.
   Session revalidation never re-promotes a demoted user.

Logout sends WorkOS the configured public root as `return_to`. When a safe
subpath such as `/admin` was requested, a five-minute HttpOnly
`j2-auth-return` cookie carries only that validated relative path; the proxy
consumes it on the root request and redirects same-origin. This avoids depending
on unconfigured WorkOS sign-out subpaths.

The migration is additive: `users`, `profiles`, content FKs, and the legacy
`session`, `account`, and `verification` tables remain. Migration
`0025_workos_identity.sql` adds the unique `(provider, provider_user_id)` index.

## Operator scripts

Run from `web/`. Secrets belong in the operator shell, never in source or the
app service environment.

```bash
# Reconcile callbacks only when intentionally changing dashboard configuration.
WORKOS_API_KEY=... pnpm run workos:configure-redirects

# Update one explicitly selected env file; preserves legacy variables and
# removes WORKOS_API_KEY. Prints no values.
WORKOS_ENV_FILE=/path/to/blog.env \
WORKOS_CLIENT_ID=client_... \
WORKOS_ISSUER=https://api.workos.com/user_management/client_... \
NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://jsquaredadventures.com/callback \
WORKOS_COOKIE_PASSWORD=... \
pnpm run workos:apply-env

# Read-only integrity audit; prints counts, never emails or user IDs.
WORKOS_ENV_FILE=/path/to/blog.env pnpm run workos:audit-identities

# Provision allowlisted local admins. Dry-run by default; --apply writes.
WORKOS_ENV_FILE=/path/to/blog.env pnpm run workos:provision-admins
WORKOS_ENV_FILE=/path/to/blog.env pnpm run workos:provision-admins --apply

# Real-SDK standalone header smoke after packaging.
pnpm run test:authkit-smoke /path/to/release

# Capture a Playwright fixture using the SDK sealedSession. Operator-only.
WORKOS_API_KEY=... E2E_WORKOS_EMAIL=... E2E_WORKOS_PASSWORD=... \
WORKOS_CLIENT_ID=client_... WORKOS_COOKIE_PASSWORD=... \
E2E_BASE_URL=http://localhost:3000 \
pnpm run e2e:capture-workos-state
```

The capture script calls
`authenticateWithPassword({ session: { sealSession: true, cookiePassword } })`
and stores only the returned `sealedSession`. It writes
`playwright/.auth/admin.json` plus `admin.meta.json` by default, does not depend
on `iron-session` directly, and never stores raw access/refresh tokens.

## Cutover (orchestrator-owned)

1. Confirm the verified dashboard values above and the staging test users.
2. Back up `/srv/blog/shared/blog.db`.
3. Apply migration 0025 to a temporary DB copy and run the identity audit.
4. Update `/srv/blog/shared/.env` with the keyless WorkOS values; confirm
   `WORKOS_API_KEY` is absent from the app service environment. Preserve the
   file's `blog:blog` ownership and mode `600` after any scripted update.
5. From `web/`, run `pnpm run build:node`, then
   `node scripts/package-standalone.mjs /path/to/new-release`.
6. Verify both WorkOS packages resolve from the packaged `web/node_modules`.
7. Switch the release symlink, restart `jsquared-blog.service`, health-check,
   and purge Cloudflare cache.
8. Cloudflare Access removal from `/admin` is operator-owned: delete (or
   disable) only the Blog Admin Access app after the live reader smoke passes.
   Keep Blog Staging (`next.`) Access-gated. The deleted app definition is
   backed up operator-side for rollback; do not delete the backup.
9. Perform the live reader/admin smoke below, then record evidence in
   [`../reviews/2026-11-24-workos-migration.md`](../reviews/2026-11-24-workos-migration.md).

## Live smoke checklist

Do not put credentials, cookies, tokens, or full email addresses in reports.

- Anonymous `/login` and `/signup` show hosted-flow notices and no password form.
- Use an owner-controlled non-example inbox for email/password smoke; `example.com`
  is reserved for the staging Test Organization SSO path.
- Anonymous `/about` with `Accept: text/html` has no `wos-auth-verifier` cookie and
  no AuthKit-induced `no-store`; real login initiation still sets the verifier.
- Hostile return paths redirect to `/`, never an external origin.
- Reader signup verifies email, maps to one local user/profile, and preserves an
  existing user's comments/bookmarks when the verified email matches.
- Unverified email cannot create a link or authorize a reader/admin request.
- Reader logout clears `wos-session` and returns to the public root.
- Allowlisted local admin signs in and reaches `/admin`.
- Non-allowlisted reader, local non-admin, stale/missing `auth_time`, and removed
  allowlist entries are denied.
- Cross-site admin mutations remain 403; same-origin mutations still work.
- CSP contains a real per-request nonce; browser responses contain no
  `x-workos-*` headers.
- Prefetch requests retain trusted session headers.

## Rollback

1. Restore the previous release symlink and restart the service. The previous
   Better Auth/Auth.js code can still read the retained legacy env vars/tables.
2. Restore the DB only if migration 0025 or identity mapping corrupted data.
   The migration itself only adds an index and does not delete rows.
3. WorkOS-created users have stable local IDs and remain harmless to the old
   release. Legacy Better Auth sessions were not migrated; readers may need to
   sign in again after a code rollback.
4. Cloudflare Access rollback (if admin must go behind Access again):
   recreate the Blog Admin app from the operator-side backup
   (`cloudflare-access-blog-backup-20261124.json`), then purge cache.
   Do not touch the Blog Staging app.

## Troubleshooting

- **Every session rejected:** compare `WORKOS_ISSUER` with the OIDC discovery
  `issuer`; the AuthKit host is not the access-token issuer.
- **Callback redirects to `127.0.0.1`:** the callback is not using the validated
  public `baseURL`; verify `NEXT_PUBLIC_WORKOS_REDIRECT_URI`.
- **`withAuth` says middleware is missing:** the request bypassed `proxy.ts` or
  the route is excluded from the matcher. Prefetch must not be excluded.
- **Login succeeds but admin is denied:** check verified email, current
  `ADMIN_ALLOWED_EMAILS`, local role, and `auth_time` freshness independently.
- **Vitest cannot resolve AuthKit's `next/cache` import:** unit tests use the
  dedicated components stub in `vitest.config.ts`; production builds use the
  real SDK.
