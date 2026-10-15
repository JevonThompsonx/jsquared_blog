# Comment notifications — manual smoke test (PLAN 4.2)

Prerequisites — set these env vars in web/.env.local:
  RESEND_API_KEY=<your Resend API key>
  RESEND_FROM_EMAIL=<a verified sender address in your Resend account>
  COMMENT_NOTIFICATION_TO_EMAIL=<address that should receive the notification>

Steps:
  1. Start the dev server:
       pnpm run dev

  2. Log in as a public Supabase user (sign up at /signup if needed).

  3. Navigate to any published post that has comments enabled.

  4. Post a top-level comment.
       → Expected: a notification email arrives at COMMENT_NOTIFICATION_TO_EMAIL
         with subject "New comment on <post title>"
         and the comment author name + excerpt in the body.

  5. Reply to that comment using the reply button.
       → Expected: a second notification email arrives with
         subject "New reply on <post title>".

  6. Remove RESEND_API_KEY from .env.local and restart dev server.

  7. Post another comment.
       → Expected: comment still succeeds (201) with no errors in the UI;
         no email is sent; server logs show "skipped: missing-config".

Notes:
  - Notifications are non-blocking: a send failure never rejects the comment POST.
  - The service logs [comment notifications] errors to the server console on send failure.
  - RESEND_FROM_EMAIL must be a verified domain/address in your Resend account.
  - If COMMENT_NOTIFICATION_TO_EMAIL is not set the service skips silently.
