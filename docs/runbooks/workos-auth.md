# WorkOS AuthKit runbook

**Status:** live in production release `20261125T2019` on 2026-11-25. Final smoke
evidence is recorded in
[`../reviews/2026-11-25-workos-magic-auth-access.md`](../reviews/2026-11-25-workos-magic-auth-access.md).
**Last updated:** 2026-11-25

## Current auth model

Readers and admins use the same WorkOS AuthKit hosted identity provider and the
same host-scoped `wos-session` cookie. The Node runtime is a public/keyless PKCE
client and never receives `WORKOS_API_KEY`.

`/admin` and `/api/admin/*` are **app-gated only**. The Cloudflare Blog Admin
Access app was deleted on 2026-11-24. `next.` remains behind the separate Blog
Staging Access app.

| Setting                 | Value                                                               |
| ----------------------- | ------------------------------------------------------------------- |
| SDKs                    | `@workos-inc/authkit-nextjs@4.6.3`, `@workos-inc/node@12.4.0`       |
| Runtime mode            | Public-client / keyless PKCE; no `WORKOS_API_KEY`                   |
| Session cookie          | `wos-session`, HttpOnly, SameSite=Lax, Secure in production, Path=/ |
| Cookie lifetime         | 14 days (`WORKOS_COOKIE_MAX_AGE=1209600`)                           |
| Access-token lifetime   | 5 minutes                                                           |
| WorkOS session maximum  | 14 days                                                             |
| WorkOS inactivity limit | 7 days                                                              |
| Admin freshness         | `auth_time` no older than 24 hours                                  |
| Magic-code lifetime     | 10 minutes                                                          |

## Verified staging dashboard values

Verified on 2026-11-25 against the live AuthKit page and WorkOS API:

Callbacks (apex is default):

- `https://jsquaredadventures.com/callback`
- `https://www.jsquaredadventures.com/callback`
- `https://next.jsquaredadventures.com/callback`
- `http://localhost:3000/callback`

Other redirects:

- Initiate login URI: `https://jsquaredadventures.com/api/auth/login`
- Sign-up URI: **empty / not configured**
- Sign-out URIs: apex, `www`, `next`, and localhost roots; apex is default

Authentication methods:

- Email Magic Auth (one-time code) — enabled for readers and admins
- Passkeys — enabled
- Email + Password — enabled in WorkOS only; the app stores no passwords
- Google, Microsoft, GitHub, and Apple OAuth — configured
- Signups — enabled
- `example.com` remains reserved by the staging Test Organization and forces SSO

### Critical: keep the dashboard Sign-up URL empty

AuthKit treats the dashboard **Sign-up URL** as an override for its hosted
`/sign-up` screen. If it is set to `/api/auth/signup`, the hosted screen redirects
back to the app endpoint, which starts the same flow again until the rate limiter
returns 429. The owner observed this as a browser “cannot connect” error.

Correct flow: app `/signup` → `/api/auth/signup` → AuthKit hosted `/sign-up`.

Do not “fix” the loop by pointing the dashboard field at `/signup`; that also
loops. Clear the field and save.

## Admin identity matrix

All five identities have the same binary local `admin` role and therefore the same
application permissions. No per-admin permission tier exists. Exact addresses
live in the protected production env; labels are used here to avoid expanding the
public admin-account list.

| Identity        | Local row                                                      | Sign-in methods                       |
| --------------- | -------------------------------------------------------------- | ------------------------------------- |
| `owner-proton`  | existing `workos-admin-*` row                                  | Magic Auth, passkey, OAuth            |
| `owner-jevon`   | existing `access-user-*` row                                   | Magic Auth, passkey, OAuth            |
| `owner-gmail`   | existing `workos-admin-*` row                                  | Magic Auth, passkey, OAuth            |
| `github-owner`  | existing GitHub-created `workos-user-*` row, promoted in place | GitHub, Magic Auth, passkey, OAuth    |
| `service-admin` | existing service-admin row                                     | Magic Auth; shared-inbox risk applies |

There are **no application passwords to recover**. To sign in:

1. Open `/login` (or `/admin` → Sign in with WorkOS).
2. Enter the exact protected email associated with your identity.
3. Choose **Email sign-in code** and enter the six-digit code from the inbox.
4. Codes expire after 10 minutes. Staging email subjects are prefixed `[STAGING]`.

The GitHub-created account keeps the same WorkOS user and local `users.id` when
using Magic Auth. WorkOS links credentials by verified email.

## Environment

Required app variables:

```sh
WORKOS_CLIENT_ID=client_...
WORKOS_ISSUER=https://api.workos.com/user_management/client_...
NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://jsquaredadventures.com/callback
WORKOS_COOKIE_PASSWORD=<32+ character secret>
WORKOS_COOKIE_MAX_AGE=1209600
ADMIN_ALLOWED_EMAILS=<protected owner allowlist>
```

`WORKOS_ISSUER` must exactly equal the access-token `iss` claim. The app rejects a
non-HTTPS issuer, credentials/query/hash in the issuer, an unapproved callback, a
missing or invalid `WORKOS_COOKIE_MAX_AGE`, a non-empty `WORKOS_API_KEY`,
`WORKOS_COOKIE_DOMAIN`, a cookie name other than `wos-session`, and a SameSite
value other than `Lax`.

Login, signup, callback, and logout derive the browser-facing origin from
`Host`/`x-forwarded-host`, restricted to apex, `www`, `next`, and loopback. The
loopback callback intentionally remains `http://localhost:3000/callback`; a real
sign-in started on port 3100 therefore delivers the authorization code to whatever
listens on port 3000. That code is single-use, and the intended app flow cannot
exchange it because the PKCE verifier is host-scoped; port 3000 must not be treated
as a trusted auth sink. Local Playwright on port 3100 validates pages and redirect
initiation, while full hosted auth smoke targets production.

Legacy Better Auth / Auth.js variables may remain for one code-rollback cycle.
The WorkOS schema treats them as optional and does not read them.

## Request and identity flow

1. `/login` or `/signup` renders a hosted-flow notice with no local password form.
2. `/api/auth/login` or `/api/auth/signup` rate-limits the request, validates
   `returnTo`/`redirectTo` and optional clamped `maxAge`, then calls the SDK with
   the approved per-request callback.
3. AuthKit completes PKCE and calls `/callback`.
4. `handleAuth` uses an explicit validated public `baseURL`, never the internal
   `127.0.0.1:3010` origin.
5. `onSuccess` maps the verified WorkOS identity before accepting the session:
   - existing WorkOS subject link wins;
   - otherwise normalized verified email links the existing local `users.id`;
   - otherwise a `workos-user-<subject>` reader and profile are created;
   - callback mapping never promotes, even when the email is allowlisted;
   - unverified, invalid, synthetic `@legacy.supabase.local`, and conflicting
     identities fail closed.
6. Callback failures redirect to `/login?error=<fixed code>` with `no-store`; raw
   provider errors and arbitrary return paths are never reflected.
7. Admin requests require current allowlist membership, live local admin role,
   and `auth_time <= 24h`. A stale session gets a forced-reauth link with
   `maxAge=300`.
8. A signed-in non-admin visiting `/admin` gets an explicit denial and one
   **Sign out and switch account** action, not a sign-in loop.

Logout sends WorkOS the configured public root. A five-minute HttpOnly
`j2-auth-return` cookie restores a validated same-origin subpath such as `/admin`.

## Operator scripts

Run from `web/`. Secrets belong in the operator shell, never in source or the app
service environment.

```bash
# Reconcile callbacks only for an intentional, separately approved change.
WORKOS_API_KEY=... pnpm run workos:configure-redirects

# Update one explicitly selected env file; removes WORKOS_API_KEY.
WORKOS_ENV_FILE=/path/to/blog.env \
WORKOS_CLIENT_ID=client_... \
WORKOS_ISSUER=https://api.workos.com/user_management/client_... \
NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://jsquaredadventures.com/callback \
WORKOS_COOKIE_PASSWORD=... \
pnpm run workos:apply-env

# Read-only identity audit. Fatal findings exit 2; parity warnings do not.
WORKOS_ENV_FILE=/path/to/blog.env pnpm run workos:audit-identities

# Promote existing allowlisted local rows only. Dry-run by default.
# Missing, duplicate, competing-link, or provider-email-mismatch rows block apply.
WORKOS_ENV_FILE=/path/to/blog.env pnpm run workos:provision-admins
WORKOS_ENV_FILE=/path/to/blog.env pnpm run workos:provision-admins --apply

# Real-SDK standalone header smoke after packaging.
pnpm run test:authkit-smoke /path/to/release

# Capture a one-hour Playwright fixture using Magic Auth (no password).
WORKOS_API_KEY=... E2E_WORKOS_EMAIL=owner@example.com \
WORKOS_CLIENT_ID=client_... WORKOS_COOKIE_PASSWORD=... \
E2E_BASE_URL=https://jsquaredadventures.com E2E_WORKOS_MAX_AGE=3600 \
pnpm run e2e:capture-workos-state

# Operator-only hosted signup smoke; does not submit the form or request a code.
E2E_BASE_URL=https://jsquaredadventures.com E2E_AUTHKIT_HOSTED_SMOKE=1 \
pnpm exec playwright test tests/e2e/authkit-hosted-signup.spec.ts
```

The fixture script uses the code returned by `createMagicAuth` in memory and
stores only `sealedSession`. The artifact is `0600` under a `0700`
`playwright/.auth` directory. Revoke the WorkOS session and delete the fixture
after smoke.

Provisioning is all-or-nothing and prints counts only. If `missing` or `blocked`
is non-zero, fix the local identity state and rerun the dry-run; do not hand-insert
an admin row.

## Audit severity

Fatal (exit 2):

- duplicate normalized emails;
- duplicate provider subjects;
- duplicate WorkOS links for one local user;
- legacy WorkOS links;
- orphan WorkOS links;
- allowlisted non-admin rows;
- non-null provider email that differs from local primary email.

Warnings (counts only):

- missing provider email;
- allowlisted admin without a WorkOS link;
- local admin email no longer in the allowlist.

`adminEmailsNotAllowlisted` is expected to be non-zero because legacy/e2e admin
rows remain. It does not grant access without current allowlist membership.

## Live smoke checklist

- Anonymous `/login` and `/signup` show hosted-flow notices and no password form.
- `/signup` reaches `pensive-picture-47-staging.authkit.app/sign-up` and shows the
  email field; it does not loop to `/api/auth/signup`.
- Magic Auth API returns `authenticationMethod=MagicAuth`, verified email, a valid
  sealed session, and an access token with `auth_time`.
- `auth_time` is preserved across token refresh.
- The GitHub-created identity authenticates with Magic Auth as the same WorkOS
  user and same local `users.id`.
- All five admin identities return `role=admin`, preserve their local IDs, render
  the same admin navigation, and can open representative admin routes.
- A non-allowlisted reader gets profile access, admin API 401, null admin session,
  and the switch-account UI.
- Unverified email, local non-admin, stale/missing `auth_time`, impersonation, and
  removed allowlist entries are denied.
- Cross-site admin mutations remain 403.
- Anonymous `/about` has no PKCE verifier cookie or AuthKit-induced `no-store`;
  real login initiation still sets the verifier.
- CSP contains a real per-request nonce; browser responses contain no `x-workos-*`.
- `/admin` is not Access-gated; `next.` remains Access-gated.

## Production identity cutover record

The 2026-11-25 cutover used:

- WAL-safe backup: `/srv/blog/shared/backups/blog-pre-magic-auth-20261125T192008Z.db`
- env backup: `/srv/blog/shared/backups/blog-pre-magic-auth-20261125T192008Z.env`
- previous release: `/srv/blog/releases/20261125T0001`
- live repair release: `/srv/blog/releases/20261125T2019`
- WorkOS identities created for the three owner inboxes and service admin;
- GitHub-created local row promoted in place, ID/profile/FKs unchanged;
- all smoke sessions revoked.

## Rollback

1. Code: point `/srv/blog/current` to `20261125T2019` (tag
   `prod-live-20261125T2019`) and restart `jsquared-blog.service`.
2. Role-only: set the GitHub-created row back to `reader` rather than restoring the
   whole DB. Use the full WAL-safe backup only for corruption/emergency; it loses
   later writes.
3. Env: restore the backed-up `.env`, reapply `600 blog:blog`, and restart.
4. WorkOS: never delete the pre-existing GitHub identity. If a full identity
   rollback is ordered, revoke sessions and remove local `auth_accounts` links
   before deleting the corresponding WorkOS users, then rerun the audit.
5. Edge: recreate the Blog Admin Access app from the operator-side backup only if
   `/admin` must be re-gated. Do not touch Blog Staging. Purge cache after a switch.

## Troubleshooting

- **`authentication_method_not_allowed: Magic Auth is disabled`:** enable Magic
  Auth in the staging WorkOS dashboard and save. The hosted UI alone is not proof;
  verify with the API.
- **Signup loops or returns 429:** clear the dashboard Sign-up URL override. If the
  in-memory rate-limit bucket is exhausted, restart `jsquared-blog.service` once.
- **Every session rejected:** compare `WORKOS_ISSUER` with the OIDC discovery
  `issuer`; the AuthKit host is not the access-token issuer.
- **Login succeeds but admin is denied:** check verified email, current allowlist,
  local role, provider/local email parity, and `auth_time` independently.
- **`identity_conflict`:** a different WorkOS subject already owns the email or the
  subject is linked to a different local row. Do not delete links blindly.
- **Admin stays stale after re-auth:** confirm the new access token contains
  `auth_time`; missing `auth_time` fails closed by design.
- **Local E2E hits Open WebUI:** use the default `127.0.0.1:3100`, not port 3000.
- **Vitest cannot resolve AuthKit's `next/cache` import:** unit tests use the
  dedicated components stub in `vitest.config.ts`; production uses the real SDK.

## WorkOS environment decision

Production deliberately uses the WorkOS **staging** environment (owner decision,
2026-11-25). Expected volume is low, the owner accepts the operational model, and
no environment migration is planned at this time.

Implications:

- WorkOS staging is isolated from the separate production environment; users and
  connections do not carry over automatically.
- Transactional email subjects carry `[STAGING]`.
- WorkOS documents the same rate limits for staging and production.
- There is no production SLA for the staging environment.

Compensating controls are the keyless app runtime, verified-email identity
mapping, current allowlist plus live local admin role, 24-hour admin freshness,
WorkOS/OAuth account security, Cloudflare WAF/TLS, database backups, service
restart policy, and external uptime monitoring. Revisit the environment choice if
volume, compliance, SLA, or support requirements change.
