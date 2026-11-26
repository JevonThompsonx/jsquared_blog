# WorkOS Magic Auth and admin access repair — review

**Date:** 2026-11-25
**Branch:** `t3/blog-audit-hardening-optimization`
**Plan:** [`../plans/2026-11-25-workos-magic-auth-access.md`](../plans/2026-11-25-workos-magic-auth-access.md)
**State:** live in production release `20261125T2019`; final smoke and reviews passed.
**Self-score:** 96/100 (identity 30/30, authorization 25/25, Magic Auth UX 14/15, security 15/15, verification 8/10, docs 4/5).

## Objective

Make WorkOS AuthKit email Magic Auth the normal sign-in path for every reader and
admin, preserve the GitHub-created local identity, and give the selected owner
identities equivalent admin access without generating or exposing passwords.

## Evidence grades

- **PROVEN:** observed command output, test result, file diff, live API/browser check.
- **NOT VERIFIED:** requires a manual browser/inbox action or future production soak.

## Requirements confirmed by owner

- Admins: `owner-proton`, `owner-jevon`,
  `owner-gmail`, `github-owner`, plus service admin
  `service-admin`.
- Magic Auth is available to all users, not only admins.
- Preserve local IDs, profiles, content FKs, and media ownership.
- Keep Cloudflare Access removed from `/admin`; keep `next.` Access-gated.
- No passwords or one-time codes generated, printed, or persisted by the app.

## Findings and root causes

1. WorkOS had no identity for the owner/admin emails; local admin rows existed but
   could not be used to sign in.
2. The GitHub-created WorkOS identity mapped to a local reader and was not in the
   admin allowlist.
3. Magic Auth was disabled. The owner enabled Magic Auth and passkeys in the
   staging dashboard.
4. The dashboard Sign-up URL override pointed at `/api/auth/signup`, causing
   AuthKit's hosted sign-up screen to redirect back to the same endpoint until the
   rate limiter returned 429. The owner cleared the override.
5. The Playwright fixture script still required a password, and current docs still
   described password-only auth and a removed Cloudflare Access gate.
6. Default Playwright port 3000 was occupied by Open WebUI, causing silent reuse of
   the wrong server.
7. A signed-in non-admin saw the same sign-in CTA as an anonymous visitor and could
   loop instead of switching accounts.

## Production identity cutover (PROVEN)

- WAL-safe DB backup:
  `/srv/blog/shared/backups/blog-pre-magic-auth-20261125T192008Z.db`
  (`integrity_check=ok`, mode `600 blog:blog`).
- Env backup:
  `/srv/blog/shared/backups/blog-pre-magic-auth-20261125T192008Z.env`
  (mode `600 blog:blog`).
- Previous release: `/srv/blog/releases/20261125T0001`.
- Live repair release: `/srv/blog/releases/20261125T2019`; `/srv/blog/current`
  switched and `jsquared-blog.service` restarted with `/api/health` `ok`.
- Added `github-owner` to `ADMIN_ALLOWED_EMAILS`; preserved the three
  owner emails and service admin.
- Promoted the existing GitHub-created local row in place. Its WorkOS user,
  local `users.id`, profile, and FK counts were unchanged.
- Created verified WorkOS identities for the three owner inboxes and service admin
  through Magic Auth. Each mapped to its existing local admin row.
- All smoke sessions were revoked.
- The temporary reader identity and all local test rows were removed.

### Identity/audit result

```json
{
  "users": 12,
  "profiles": 12,
  "workosAccounts": 5,
  "duplicateNormalizedEmails": 0,
  "duplicateProviderSubjects": 0,
  "legacyWorkosLinks": 0,
  "orphanWorkosLinks": 0,
  "allowlistedNonAdmins": 0,
  "providerEmailMismatch": 0,
  "providerEmailMissing": 0,
  "duplicateWorkosLinksPerUser": 0,
  "allowlistedAdminsWithoutWorkos": 0,
  "adminEmailsNotAllowlisted": 4
}
```

`adminEmailsNotAllowlisted=4` is an expected warning from legacy/e2e admin rows;
it is non-fatal and those rows cannot authorize without current allowlist
membership. SQLite `integrity_check=ok`, `foreign_key_check` clean, 20 migrations.

### Five-admin equivalence (PROVEN)

A WorkOS Magic Auth session was minted for each admin and exercised against:

- `/api/admin/session` — `role=admin`, expected local ID;
- `/admin`, `/admin/posts/new`, `/admin/wishlist`, `/admin/categories`,
  `/admin/tags`, `/admin/seasons` — all HTTP 200;
- normalized admin navigation href set — identical hash for all five;
- WorkOS and local IDs — unchanged;
- session revocation — successful for all five.

### Reader negative smoke (PROVEN)

A temporary non-allowlisted Magic Auth reader received:

- `/api/account/profile` — 200;
- `/api/admin/posts` — 401;
- `/api/admin/session` — `{"session":null}`.

The temporary WorkOS user, local auth link/profile/user, and session were removed.

### Magic Auth/session properties (PROVEN)

- `authenticationMethod=MagicAuth`;
- `emailVerified=true`;
- sealed session validated;
- access token contained `auth_time`;
- `auth_time` was preserved across refresh;
- the GitHub-created account authenticated with Magic Auth as the same WorkOS user;
- the owner confirmed receipt of a staging one-time-code email.

### Signup redirect fix (PROVEN)

Before: `/signup` → `/api/auth/signup` → AuthKit `/sign-up` → `/api/auth/signup`
until 429.

After clearing the dashboard Sign-up URL and resetting the in-memory rate-limit
bucket, a real Chromium session reached:

- host: `pensive-picture-47-staging.authkit.app`;
- path: `/sign-up`;
- visible fields: First name, Last name, Email;
- no loop, browser error, or 429.

### Production edge verification (PROVEN)

After deploy and Cloudflare cache purge:

- apex `/`, `/about`, `/login`, `/signup`, `/forgot-password`,
  `/reset-password`, `/verify-email`, `/admin`, `/api/health` — 200;
- anonymous `/api/admin/posts` — 401;
- anonymous `/api/auth/session` — `{"session":null}`;
- `/callback` without a code — 302 to the fixed login error;
- `next.` — 302 behind Access;
- hosted `/signup` reached AuthKit's `/sign-up` page with no loop;
- temporary WorkOS smoke user and reader rows removed; no fixture files remain.

## Code changes

- Magic Auth copy on sign-in/sign-up/recovery screens; no local password form.
- Fixed callback error codes with non-reflective messages and `no-store` redirects.
- Non-sensitive viewer state and single sign-out/switch-account action for
  signed-in non-admins.
- Magic Auth Playwright fixture capture using the SDK-returned code in memory;
  one-hour default lifetime; `0600` artifact in `0700` directory; loopback-only
  HTTP; no password env.
- Provisioning promotes existing rows only and refuses missing, duplicate,
  competing-link, or provider-email-mismatch cases.
- Identity audit adds provider-email and admin/WorkOS parity counts with fatal vs
  warning severity.
- Playwright defaults to `127.0.0.1:3100`; hosted-signup smoke is operator-gated.
- Current docs corrected for Magic Auth/passkeys/OAuth, Access removal, empty
  dashboard Sign-up URL, and password-free operations.

## Automated verification

- `pnpm run test` — **184 files / 1,541 tests passed**.
- `pnpm run typecheck` — passed.
- `pnpm run lint` — 0 errors; 2 unchanged warnings in `cdn-image.tsx` and
  `worker-entry.ts`.
- `git diff --check` and Prettier check — passed.
- `pnpm run build:node` — passed; 36 static pages generated.
- Standalone packaging — passed; `sharp`, `@libsql/client`, AuthKit, and WorkOS
  modules resolved from the packaged release.
- Packaged AuthKit anonymous smoke — `anonymousAbout`, `loginInitiation`,
  `perHostCallbacks`, `hostileHostRejected` all PASS.
- Production-targeted auth E2E — **6/6 passed**.
- Hosted signup regression against production — **1/1 passed**.
- Targeted local auth E2E on managed Next `127.0.0.1:3100` — **4/4 passed**.
- Authenticated admin Playwright smoke with a Magic Auth fixture — **5/5 passed**;
  fixture session revoked and files deleted.
- Full local E2E with a production DB copy — 43 passed, 16 skipped, 9 failed in
  unrelated stale/environment-dependent specs (search route expectations,
  duplicate-heading selectors, newsletter source label, missing Travel category,
  and author fixture). All auth specs passed.

## Independent review

- Security review: **PASS** after repairs; no critical/high/medium finding. Fixture
  host mismatch, non-loopback HTTP fixture transport, directory permissions,
  synthetic test identities, and stale Access docs were repaired.
- Code review: **PASS** after repairs; no authz/secret defect. Fixture-host
  mismatch and documentation deliverable were repaired; local callback constraint
  documented; review test gaps closed.
- Final code re-check: **PASS** after correcting the remaining Cloudflare summary
  row, account-page password copy, and loopback callback explanation.

## Remaining risks / NOT VERIFIED

- Production deliberately uses WorkOS **staging** as its identity environment
  (owner decision, 2026-11-25) because expected volume is low and the operational
  model is accepted. Emails carry `[STAGING]`, environments do not migrate
  automatically, and no production-environment migration is planned now. Revisit
  if volume, SLA, compliance, or support needs change.
- Real stale-session re-authentication round trip in a manual browser.
- Interactive GitHub OAuth was not re-run; the pre-existing WorkOS identity was
  preserved and Magic Auth resolved to the same subject.
- `service-admin` is a shared/service inbox; mailbox access is
  effectively admin access.
- The next templetonbak daily reboot/soak is not yet observed.
- Full local E2E remains red only in unrelated stale/environment-dependent specs;
  see the exact list above.

## Rollback

- Code: restore release `20261125T0001` and restart.
- Role: demote only the GitHub-created row to `reader`; avoid full DB restore unless
  corruption requires it.
- Env: restore the recorded env backup, reapply `600 blog:blog`, restart.
- WorkOS: never delete the pre-existing GitHub identity. For a full identity
  rollback, revoke sessions and remove local links before deleting newly created
  WorkOS users, then audit.
- Edge: recreate Blog Admin Access only for a deliberate rollback; never modify
  Blog Staging.
