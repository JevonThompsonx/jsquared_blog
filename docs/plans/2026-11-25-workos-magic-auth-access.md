# WorkOS Magic Auth and admin access repair

**Date:** 2026-11-25
**Branch:** `t3/blog-audit-hardening-optimization`
**Risk tier:** CONSEQUENTIAL (authentication, production identity state, admin authorization)

## Objective

Make WorkOS AuthKit email Magic Auth the normal sign-in path for every reader and
admin, preserve the existing GitHub-created local identity, and give the selected
owner identities equivalent admin access without generating or exposing passwords.

## Requirements lock

The owner confirmed:

- Admin identities: `owner-proton`, `owner-jevon`,
  `owner-gmail`, and the existing GitHub-created WorkOS identity
  `github-owner`.
- Keep `service-admin` as the service admin.
- Magic Auth (email one-time code) is available to all users, not only admins.
- Preserve local user IDs, profiles, content foreign keys, and media ownership.
- Keep Cloudflare Access removed from `/admin`; keep `next.` Access-gated.
- Do not generate, invent, print, or store user passwords or one-time codes.

Interpretation: enable/use the existing AuthKit email-code path environment-wide.
Do not disable configured OAuth providers unless the owner explicitly asks for a
magic-code-only policy.

## Evidence established before implementation

- Production release `20261125T0001` is active on templetonbak at
  `127.0.0.1:3010`; 20 migrations; `integrity_check=ok`; no FK violations.
- Production `ADMIN_ALLOWED_EMAILS` contains the three owner emails plus
  `service-admin`. Their local rows already have `role='admin'`.
- `github-owner` is a verified WorkOS identity linked to local row
  `workos-user-user_01M8A0F15YFB4X4N1K6F2WFSV7`, currently `role='reader'`.
- WorkOS contains no identity yet for the three owner emails.
- The owner enabled **Magic Auth and passkeys** in the staging WorkOS dashboard
  during this task. A live API smoke against the temporary identity returned
  `authenticationMethod=MagicAuth`, `emailVerified=true`, validated the sealed
  session, and revoked it successfully.
- The live AuthKit sign-in page presents **Continue with email** plus Google,
  Microsoft, GitHub, and Apple. Email login now supports a one-time code; no app
  password is required.
- Runtime identity mapping requires verified email and never auto-promotes.
  Admin access requires current allowlist membership, local `role='admin'`, and
  `auth_time <= 24h`.
- `web/scripts/capture-workos-storage-state.ts` still requires
  `E2E_WORKOS_PASSWORD` and calls `authenticateWithPassword`, so the authenticated
  E2E fixture path does not match the live login method.
- `web/tests/e2e/smoke.spec.ts` still asserts removed signup password fields and a
  GitHub admin button. A production-targeted run reproduced both failures.
- The default Playwright URL (`localhost:3000`) is occupied by Open WebUI on this
  host. Playwright sees its 200 SPA response and silently reuses it instead of
  starting Next; local E2E must use a free port (3100) or an explicit base URL.
- A signed-in non-admin sees the same admin sign-in CTA as an anonymous visitor,
  which can silently loop instead of offering account switch/sign-out.
- Current docs incorrectly describe WorkOS as email/password-only with no social
  providers and, in some places, still describe Cloudflare Access on `/admin`.

## Acceptance criteria

1. `github-owner` remains linked to the same local user ID and profile,
   is promoted to `admin`, and is added to the live admin allowlist.
2. Each selected owner email can obtain a verified WorkOS identity through Magic
   Auth and maps to its existing local admin row without changing that row's ID.
3. All five admin identities can open `/admin`, `/api/admin/session`, and the
   existing admin navigation destinations with equivalent permissions.
4. A non-allowlisted reader remains unable to access `/admin` or `/api/admin/*`.
5. The GitHub-created account can use both GitHub and Magic Auth with the same
   verified email and still resolve to the same WorkOS/local identity.
6. AuthKit notice/recovery UI accurately explains one-time email codes and keeps
   safe return paths; no local password form is implied.
7. A signed-in non-admin visiting `/admin` gets an explicit reader/not-authorized
   state and a sign-out/switch-account action, not a silent sign-in loop.
8. The Playwright fixture capture uses Magic Auth and never persists raw codes or
   tokens.
9. Stale auth E2E assertions are updated to the hosted AuthKit UI.
10. Admin provisioning refuses missing/conflicting identities and the audit
    surfaces provider-email/admin-link parity defects; no synthetic admin row is
    created by the repaired script.
11. Unit tests, typecheck, lint, production build, packaging, and relevant E2E
    pass with no new warnings or security findings.
12. Production identity/role changes are backed up, verified, and documented;
    rollback steps are recorded.
13. No secret, password, one-time code, access token, or refresh token is printed
    or committed.

## Scoring rubric (fixed before implementation)

- Identity correctness and ID/FK preservation: 30
- Admin/reader authorization and equivalent access: 25
- Magic Auth UX and fixture path: 15
- Security invariants and secret handling: 15
- Automated and live verification: 10
- Documentation and rollback: 5

PASS requires **>=90/100** and no unresolved material finding. 60-89 is PARTIAL;
below 60 is FAIL.

## Implementation plan

### 1. Regression tests first (RED)

- Update/add `web/tests/e2e/smoke.spec.ts` assertions for the hosted AuthKit notice
  and the `Sign in with WorkOS` link; scope selectors to main content so newsletter
  email inputs cannot satisfy auth assertions.
- Add component tests for Magic Auth copy and safe return-path propagation on
  sign-in, sign-up, forgot-password, reset-password, and verify-email screens.
- Update `web/tests/unit/workos-scripts.test.ts` so storage-state capture exercises
  `createMagicAuth` + `authenticateWithMagicAuth`, requires no password, and never
  stores the code/raw tokens.
- Add admin-page coverage proving a signed-in non-admin sees a switch-account/sign-out
  action while an anonymous visitor sees sign-in.
- Add callback tests for fixed, non-enumerating error-code redirects.
- Add provisioning/audit tests proving missing or conflicting rows are refused,
  existing IDs are promoted in place, and provider-email/parity defects surface.
- Add authorization coverage that all allowlisted admin fixtures receive the same
  session shape and that non-allowlisted/readers remain denied.

Run the targeted tests and record the intended RED failures before production code
changes.

### 2. Minimal runtime/script changes (GREEN)

- Update `web/src/components/auth/authkit-notice.tsx` and auth page metadata to
  describe email one-time codes, not local password forms.
- Extend the admin access-state result with non-sensitive viewer/signed-in state
  from the existing WorkOS session read; use it only for UI recovery actions.
- Convert callback failures to fixed, non-enumerating error codes on `/login`
  instead of a bare 400, without logging or returning identity details. Allowed
  codes: `unverified_email`, `invalid_email`, `legacy_email`, `identity_conflict`,
  `expired_link`, and `unknown`; the login page renders a fixed message and never
  reflects raw error text. Do not preserve arbitrary `returnTo` through an error
  redirect.
- Harden admin provisioning so it only promotes existing rows and refuses
  missing/duplicate/provider-email-mismatch cases; never create synthetic admin
  rows. Extend the identity audit with provider-email and admin/WorkOS parity
  counts.
- Update `web/src/app/admin/page.tsx` to render sign-out/switch-account for a
  signed-in non-admin.
- Convert `web/scripts/capture-workos-storage-state.ts` to Magic Auth. Remove
  `E2E_WORKOS_PASSWORD` from required inputs and current setup documentation. Use
  the challenge's returned `code` directly, never log it, and default fixture
  lifetime to one hour unless an operator explicitly overrides it.
- Change the default Playwright base URL to a free local port (`3100`) and update
  setup/runbook examples so Open WebUI on port 3000 cannot be silently reused.
- Keep all authorization checks, callback no-promotion behavior, PKCE/state,
  cookie, CSP, CSRF, and rate-limit invariants unchanged.

### 3. Documentation

- Update current README, setup, architecture, env example, and WorkOS runbook to
  reflect Magic Auth plus configured OAuth providers.
- Correct current Cloudflare/Access documentation: `/admin` is app-gated only;
  `next.` remains Access-gated.
- Record the admin identity matrix and the no-password operating procedure.
- Append cutover/smoke evidence to a new review document; preserve historical
  plan/review documents as dated records.

### 4. Production cutover

Preflight:

- Create a WAL-safe backup with
  `sudo -u blog sqlite3 /srv/blog/shared/blog.db ".backup '<backup>.db"` and verify
  it with `pragma integrity_check`. Copy `/srv/blog/shared/.env` separately, mode
  `600`, and record both paths plus the previous release target.
- Record current WorkOS user IDs and local IDs without printing secrets.
- Confirm the AuthKit email-code screen, passkey option, and OAuth methods from the
  live hosted UI.
- Gate on a Magic Auth API smoke that proves `auth_time` exists and survives token
  refresh. This was executed successfully before the production writes.

Changes:

1. Add `github-owner` to `ADMIN_ALLOWED_EMAILS`; preserve
   `service-admin` and the three owner emails. Edit atomically,
   preserve `600 blog:blog`, restart `jsquared-blog.service`, and health-check.
2. Promote the existing GitHub-created local row with the provisioning script;
   verify its ID/profile/FKs are unchanged. Run the script with an explicit
   `TURSO_DATABASE_URL=file:/srv/blog/shared/blog.db` and verify `blog.db*`
   ownership remains `blog:blog` afterward.
3. Use the `code` returned by WorkOS `createMagicAuth` to establish/verify the
   three owner identities and the service admin. Never print or persist the code;
   revoke each session immediately after the check.
4. Build and package the repaired code, copy it to
   `/srv/blog/releases/<UTC timestamp>`, switch `/srv/blog/current`, restart the
   service, and health-check before final UX smoke. The rollback release is the
   previously active `20261125T0001`.
5. Exercise each sealed session against production `/api/admin/session`, `/admin`,
   and representative admin routes; compare visible navigation/permissions. Do not
   enable remote admin mutation tests.
6. Create one temporary non-allowlisted reader through Magic Auth, verify admin
   denial and the new switch-account UI, then clean up in FK-safe order:
   `comment_likes`/comments/bookmarks as applicable → `auth_accounts` → `profiles`
   → `users` → WorkOS user. Revoke the session first.
7. Verify the GitHub identity resolves to the same local row through Magic Auth;
   retain the pre-existing WorkOS/local subject and ID.
8. Revoke every smoke session, delete the temporary WorkOS smoke user, and remove
   its secret file after final smoke completion.
9. Purge Cloudflare cache and rerun anonymous edge checks.

Execution note: identity/allowlist work was completed before the UX release was
ready, after the WAL-safe backup and API preflight. The backend identity/role state
was verified independently, then release `20261125T2019` passed the final UI,
hosted-signup, five-admin parity, reader-negative, and authenticated Playwright
gates.

### 5. Verification

- `pnpm run test`
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run build:node`
- `node scripts/package-standalone.mjs <temp-release>`
- Packaged anonymous AuthKit smoke
- Production-targeted auth E2E with a migrated SQLite copy for DB-gated specs
- Authenticated Playwright smoke using a Magic Auth sealed fixture
- Independent security/code review, repair if material, then primary self-review

### 6. Rollback

- Code: point `/srv/blog/current` to `20261125T0001` (or the recorded previous
  release) and restart `jsquared-blog.service`.
- DB: prefer a targeted rollback of the GitHub-created row to `role='reader'`.
  Restore the WAL-safe pre-cutover SQLite backup only for corruption or an
  emergency; a full restore loses writes made after the backup.
- Env: restore the backed-up `/srv/blog/shared/.env`, reapply `blog:blog`/`600`,
  and restart the service.
- WorkOS: retain a record of newly created user IDs. If a full identity rollback
  is explicitly required, revoke sessions and remove local `auth_accounts` links
  before deleting the corresponding WorkOS users; never delete the pre-existing
  GitHub identity. Pair any WorkOS deletion with the matching local cleanup and
  rerun the identity audit. The owner may separately disable the newly enabled
  Magic Auth/passkey methods in the dashboard if that policy is reversed.
- Edge: purge Cloudflare cache after rollback.

## Plan review disposition

Independent plan review initially returned CHANGES REQUIRED. Material findings were
addressed as follows:

- Added the missing build/package/release/symlink/restart deploy gate.
- Specified WAL-safe SQLite `.backup`, verified backup paths, and targeted role
  rollback instead of defaulting to a full DB restore.
- Specified FK-safe local cleanup before WorkOS identity deletion and a post-
  rollback identity audit.
- Proved Magic Auth `auth_time` exists and survives refresh before production
  changes.
- Specified explicit DB targeting and `blog:blog` ownership verification.
- Specified atomic env editing with `600 blog:blog` preservation.
- Defined the fixed callback error-code contract and removed arbitrary error-path
  return targets.
- Required one-hour default E2E fixture lifetime and returned-code handling.
- Added the port-3000/Open-WebUI collision and 3100 default.

## Independent review disposition

Code and security reviews initially returned CHANGES REQUIRED with no critical or
high runtime-security defect. Material findings were repaired:

- Unified fixture and Playwright defaults on `http://127.0.0.1:3100`.
- Restricted fixture HTTP cookies to loopback and forced `playwright/.auth` to
  `0700`.
- Replaced real owner emails in unit fixtures with synthetic addresses.
- Added explicit provider-code mapping, impersonation viewer denial, and an
  operator-gated hosted-signup regression test.
- Corrected current docs for Magic Auth/passkeys/OAuth, Access removal, the empty
  dashboard Sign-up URL, and password-free fixture capture.

The local `localhost:3000` callback allowlist remains unchanged by design; local
port-3100 E2E covers pages/redirect initiation, while full hosted auth smoke uses
production.

## Risks and NOT VERIFIED until execution

- Real inbox delivery/placement of WorkOS `[STAGING]` Magic Auth emails.
- Manual browser entry of a one-time code is not interactively recorded; SDK and
  hosted-code-screen smoke passed, and the owner confirmed code-email receipt.
- Whether all configured OAuth providers should remain available after the owner's
  magic-code preference; this plan retains them.
- The real stale-session re-authentication round trip. Magic Auth `auth_time`
  presence and preservation across refresh are PROVEN.
- Production deliberately uses WorkOS staging as the identity environment (owner
  decision, 2026-11-25; low volume). Emails are `[STAGING]`-prefixed and no
  environment migration is planned unless volume/SLA/compliance needs change.
- Local E2E port 3000 is occupied by Open WebUI; the default moves to 3100 to
  prevent silent reuse. Production-targeted auth E2E already passes.
