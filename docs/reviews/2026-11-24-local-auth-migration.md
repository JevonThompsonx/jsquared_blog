# Local reader auth migration — 2026-11-24

Status: **PASS (conditional)**. Public readers now sign in against the local
Better Auth stack (now on templetonbak). Supabase Auth is removed from the runtime.

## Objective

Replace Supabase Auth for public readers with a fully local system that supports
signup, email verification, login, logout, password reset, and change password.
Self-service email change is out of scope in v1. Existing Supabase users were
not migrated; data loss was accepted.
Admin auth (Cloudflare Access + Auth.js GitHub fallback) is unchanged.

## Decision: Better Auth, mapped onto the existing `users` table

The audit recommended hand-rolling auth because Better Auth normally owns its
own `user` table and would force an FK rewrite. A spike proved Better Auth can
map its `user` model onto the existing table:

- `drizzleAdapter(getDb(), { provider: "sqlite", schema: { users, session, account, verification } })`
- `user.modelName: "users"`, `user.fields.email: "primaryEmail"`
- signup wrote `users.name/primary_email/email_verified`, stored a scrypt hash in
  `account.password`, and issued a `session` row.

This keeps every existing FK (`comments.author_id`, `post_bookmarks.user_id`,
`profiles.user_id`, etc.) on `users.id` and avoids ~600 lines of security-critical
crypto/session code. Better Auth also provides origin checks, rate limits,
cookie handling, verification/reset tokens, and session revocation.

## Schema

Migration `drizzle/0024_easy_rachel_grey.sql` (additive):

- `users.name`, `users.email_verified`, `users.image`
- unique index `users_primary_email_unique`
- `session`, `account`, `verification` tables and indexes

Applied with the real Drizzle migrator to a copy of the live DB, then swapped in.
`__drizzle_migrations` is 19. `integrity_check=ok`, `foreign_key_check` empty.

## Data cleanup

Deleted the three legacy reader users and all `auth_accounts` rows with
`provider='supabase'`, plus their profiles/bookmarks/comments/likes. Kept 8
rows: the GitHub/Access admins plus four `legacy-user-*` rows that posts/media
still reference. Those four have synthetic `@legacy.supabase.local` emails, no
credential account, and `email_verified=0`; they cannot sign in. Backfilled
`users.name` from `profiles.display_name`.

## Flows

| Flow | Behavior |
|---|---|
| Signup | name/email/password (12–128); creates user, credential account, profile; sends 24 h verification email |
| Verify | `/verify-email` button posts the token; page load does not consume it |
| Login | generic invalid-credentials error; unverified accounts get a resend action |
| Forgot/reset | always generic “if an account exists”; 1 h token; reset revokes all sessions |
| Change password | requires current password; revokes other sessions |
| Change email | disabled in v1; account email is read-only |
| Logout | deletes the session row and clears cookies |

## Verified evidence

Local standalone + real HTTP against a copy of production:

- signup 200, unverified sign-in **403 `EMAIL_NOT_VERIFIED`**
- verification token from the console transport verified the address
- sign-in set `better-auth.session_token` (`HttpOnly`, `Secure`, `SameSite=Lax`,
  14 days) and a 5-minute `session_data` cookie
- `/api/account/profile` 200 with the cookie, 401 after logout
- bookmark 201, comment 201
- cross-site PATCH **403**; missing-Origin PATCH in production **403**
- reset request 200 generic; reset 200; old session **401**, old password
  **401**, new password **200**

Production (apex through Cloudflare, release `20261124T1620`):

- `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`,
  `/privacy` all 200
- signup → console verification link on apex → verify 200 → sign-in 200 →
  profile 200 → bookmark 201 → comment 201 → reset 200 → old session 401
- CSP contains no Supabase/Cloudinary/imagedelivery/Unsplash origins
- `/api/public-auth/get-session` is `null` for anonymous visitors
- test user, comment, bookmark, sessions, verification rows deleted afterwards;
  transport switched to Resend and the service restarted

## Security properties

- scrypt password hashes; no plaintext or reversible storage.
- HttpOnly/Secure/SameSite=Lax cookies; no tokens in localStorage.
- Password reset revokes every session.
- Verification/reset tokens single-use and time-limited.
- Signup is enumeration-neutral (Better Auth returns a synthetic success for
  existing addresses); login/reset responses are generic.
- Better Auth origin checks plus `rejectCrossSiteMutation` on app mutations.
- Better Auth rate limits: sign-in/sign-up/change-password 3/10 s; reset/resend
  3/60 s; custom signup/reset 5/hour.
- Auth emails sent through Resend; console transport is guarded and only for
  smoke/testing.

## Gates

| Check | Result |
|---|---|
| typecheck | PASS |
| lint | PASS (0 errors; 4 pre-existing warnings) |
| unit tests | 1335/1335 PASS (173 files) |
| `build:node` + package | PASS |
| local auth integration | PASS (signup, verification, unverified block, reset, old-password rejection) |
| production HTTP smoke | PASS (above) |
| production DB | 8 users, 0 comments, 0 bookmarks, 19 migrations, auth tables present |

## Residual risks / not verified

- **Real Resend delivery for auth mail was not observed in an inbox.** A live
  reset request for an owner alias returned 200 and produced no
  `[auth] Failed to send` journal entry, so the Resend API accepted the send;
  inbox placement/SPF/DKIM remains unverified.
- **Interactive browser flows** (clicking through the new pages) were exercised
  by HTTP and unit tests, not a real browser session. The pages render 200 and
  the client calls the same endpoints.
- **Cloudflare Access login** remains interactive/unverified, unchanged from the
  origin migration.
- **Staging shares production's DB/process.** Smoke accounts are production rows
  and must be cleaned up.
- Sessions are host-scoped; signing in on `www.` does not authenticate the apex.
- Expired sessions/verification rows are not pruned automatically.
- Rate limits are in-process and reset on restart.

## Rollback

Code: switch `/srv/blog/current` to release `20261124T0639` or earlier; the old
code ignores the new tables/columns. Auth data: restore
`/srv/blog/shared/backups/blog-pre-auth-20261124T1524.db`. Users created after
that backup are lost. Do not rebuild the Worker from HEAD.

## Review follow-up

- **H1 (email change):** disabled in v1. The previous `changeEmail` config relied
  on Better Auth's fallback verification path, did not require the current
  password, and could report success without delivering to the typed address.
  The account screen now states that email changes are owner-managed.
- **M2 (auth base URL):** deployed environments must set an explicit
  `BETTER_AUTH_URL`/`NEXT_PUBLIC_SITE_URL`; `NEXTAUTH_URL` (which the env loader
  defaults to localhost) is no longer accepted. HTTPS is required unless
  `AUTH_ALLOW_LOCAL_ORIGIN=1` is explicitly set for a loopback smoke.
  `instrumentation.ts` imports the env module so validation runs at process
  start, not on the first auth route.
- **M3 (unique email vs admin login):** `ensureGitHubAdminUser` now links to an
  existing row that owns the email instead of raising a unique violation. The
  migration runbook includes a duplicate-email preflight that must return no
  rows before the index is applied.
- **M4 (tests):** the integration test now asserts that a password reset zeroes
  the user's session rows; the production CSRF branch is covered by
  `auth-csrf.test.ts`; account-settings and bookmarks-page component tests were
  restored with Better Auth mocks.
- **L1:** CSRF localhost origins are only allowed outside production.
- **L4:** auth-email transport failures are reported to Sentry while remaining
  non-throwing for enumeration safety.
- **Secret incident:** the verifier printed the 64-character
  `BETTER_AUTH_SECRET` while probing the env file. The secret was rotated
  immediately and the service restarted; all reader sessions were invalidated.
  The value in this document and in production is the new one.

## Verdict

PASS 96/100. Two points for unverified real inbox delivery, two for browser-level
UI verification not being run. The review's blocking findings were fixed and
re-tested; the verifier's exposed secret was rotated before final verification.
