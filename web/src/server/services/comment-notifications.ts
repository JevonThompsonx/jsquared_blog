// MANUAL SMOKE TEST STEPS for PLAN 4.2:
//
// Prerequisites — set these env vars in web/.env.local:
//   RESEND_API_KEY=<your Resend API key>
//   RESEND_FROM_EMAIL=<a verified sender address in your Resend account>
//   COMMENT_NOTIFICATION_TO_EMAIL=<address that should receive the notification>
//
// Steps:
//   1. Start the dev server:
//        bun run dev
//
//   2. Log in as a public Supabase user (sign up at /signup if needed).
//
//   3. Navigate to any published post that has comments enabled.
//
//   4. Post a top-level comment.
//        → Expected: a notification email arrives at COMMENT_NOTIFICATION_TO_EMAIL
//          with subject "New comment on <post title>"
//          and the comment author name + excerpt in the body.
//
//   5. Reply to that comment using the reply button.
//        → Expected: a second notification email arrives with
//          subject "New reply on <post title>".
//
//   6. Remove RESEND_API_KEY from .env.local and restart dev server.
//
//   7. Post another comment.
//        → Expected: comment still succeeds (201) with no errors in the UI;
//          no email is sent; server logs show "skipped: missing-config".
//
// Notes:
//   - Notifications are non-blocking: a send failure never rejects the comment POST.
//   - The service logs [comment notifications] errors to the server console on send failure.
//   - RESEND_FROM_EMAIL must be a verified domain/address in your Resend account.
//   - If COMMENT_NOTIFICATION_TO_EMAIL is not set the service skips silently.

import "server-only";

import { z } from "zod";

import { getResendConfig, sendResendEmail } from "@/lib/email/resend";
import { getCanonicalPostUrl } from "@/lib/utils";
import type { CommentNotificationRecord } from "@/server/dal/comments";

const COMMENT_NOTIFICATION_TO_ENV_KEY = "COMMENT_NOTIFICATION_TO_EMAIL";
const commentNotificationRecipientSchema = z.string().email();

export type CommentNotificationPayload = {
  commentId: string;
  postTitle: string;
  postUrl: string;
  authorDisplayName: string;
  kind: "comment" | "reply";
  content: string;
  createdAtIso: string;
};

export type CommentNotificationResult =
  | { status: "sent" }
  | { status: "skipped"; reason: "missing-config" }
  | { status: "failed"; reason: "send-error" };

function getNotificationRecipient(): string | null {
  const recipient = process.env[COMMENT_NOTIFICATION_TO_ENV_KEY]?.trim();
  if (!recipient) {
    return null;
  }

  const parsedRecipient = commentNotificationRecipientSchema.safeParse(recipient);
  return parsedRecipient.success ? parsedRecipient.data : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCommentExcerpt(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length <= 280 ? normalized : `${normalized.slice(0, 277)}...`;
}

export function buildCommentNotificationPayload(comment: CommentNotificationRecord): CommentNotificationPayload {
  return {
    commentId: comment.id,
    postTitle: comment.post.title,
    postUrl: getCanonicalPostUrl(comment.post),
    authorDisplayName: comment.authorDisplayName,
    kind: comment.parentId ? "reply" : "comment",
    content: getCommentExcerpt(comment.content),
    createdAtIso: comment.createdAt.toISOString(),
  };
}

export function buildCommentNotificationEmail(payload: CommentNotificationPayload): { subject: string; html: string; text: string } {
  const kindLabel = payload.kind === "reply" ? "New reply" : "New comment";
  const subject = `${kindLabel} on ${payload.postTitle}`;
  const html = [
    `<h1>${escapeHtml(kindLabel)}</h1>`,
    `<p><strong>Post:</strong> <a href="${escapeHtml(payload.postUrl)}">${escapeHtml(payload.postTitle)}</a></p>`,
    `<p><strong>Author:</strong> ${escapeHtml(payload.authorDisplayName)}</p>`,
    `<p><strong>Type:</strong> ${escapeHtml(payload.kind)}</p>`,
    `<p><strong>Submitted:</strong> ${escapeHtml(payload.createdAtIso)}</p>`,
    `<blockquote>${escapeHtml(payload.content)}</blockquote>`,
  ].join("");
  const text = [
    kindLabel,
    `Post: ${payload.postTitle}`,
    `URL: ${payload.postUrl}`,
    `Author: ${payload.authorDisplayName}`,
    `Type: ${payload.kind}`,
    `Submitted: ${payload.createdAtIso}`,
    "",
    payload.content,
  ].join("\n");

  return { subject, html, text };
}

export async function sendCommentNotification(comment: CommentNotificationRecord): Promise<CommentNotificationResult> {
  const recipient = getNotificationRecipient();
  const resendConfig = getResendConfig();

  if (!recipient || !resendConfig) {
    return { status: "skipped", reason: "missing-config" };
  }

  const payload = buildCommentNotificationPayload(comment);
  const email = buildCommentNotificationEmail(payload);

  try {
    await sendResendEmail({
      to: recipient,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    return { status: "sent" };
  } catch (error) {
    console.error("[comment notifications] failed to send email", {
      commentId: comment.id,
      postId: comment.post.id,
      kind: payload.kind,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return { status: "failed", reason: "send-error" };
  }
}
