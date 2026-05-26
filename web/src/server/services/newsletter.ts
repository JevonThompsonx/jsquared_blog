import "server-only";

import {
  addResendContactToSegmentByEmail,
  createResendContact,
  getResendApiKey,
  getResendConfig,
  getResendContactByEmail,
  listResendContactSegmentsByEmail,
  sendResendEmail,
  updateResendContactByEmail,
} from "@/lib/email/resend";
import type { SubscribeToNewsletterValues } from "@/server/forms/newsletter";

const NEWSLETTER_SEGMENT_ID_ENV_KEY = "RESEND_NEWSLETTER_SEGMENT_ID";

export type NewsletterSubscriptionResult =
  | { status: "subscribed"; source: "created" | "updated" }
  | { status: "already-subscribed" }
  | { status: "skipped"; reason: "missing-config" };

function getNewsletterSegmentId(): string | null {
  const segmentId = process.env[NEWSLETTER_SEGMENT_ID_ENV_KEY]?.trim();
  return segmentId ? segmentId : null;
}

export function isNewsletterConfigured(): boolean {
  return Boolean(getResendApiKey() && getNewsletterSegmentId());
}

export function buildWelcomeEmail(input: { email: string; firstName?: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const displayName = input.firstName ?? "adventurer";
  const subject = "Welcome to Jevon and Jessica's adventure blog";
  const html = [
    `<h1>Welcome to J² Adventures, ${escapeHtml(displayName)}!</h1>`,
    `<p>You're now subscribed to the newsletter! You'll get updates on new posts, trail reports, and adventures.</p>`,
    `<p>Every great adventure begins with a single step — and you've just taken yours. Whether you're here for trail tales, gear chatter, or just to see what trouble Jevon and Jessica get into next, we're glad to have you along for the ride.</p>`,
    `<p>Grab a map, lace up your boots, and keep an eye on your inbox. The next trail report is already brewing.</p>`,
    `<p>If you ever want to unsubscribe, just click the unsubscribe link in any email.</p>`,
    `<p>Happy trails,<br/>Jevon & Jessica</p>`,
  ].join("");
  const text = [
    `Welcome to J² Adventures, ${displayName}!`,
    "",
    "You're now subscribed to the newsletter! You'll get updates on new posts, trail reports, and adventures.",
    "",
    "Every great adventure begins with a single step — and you've just taken yours. Whether you're here for trail tales, gear chatter, or just to see what trouble Jevon and Jessica get into next, we're glad to have you along for the ride.",
    "",
    "Grab a map, lace up your boots, and keep an eye on your inbox. The next trail report is already brewing.",
    "",
    "If you ever want to unsubscribe, just click the unsubscribe link in any email.",
    "",
    "Happy trails,",
    "Jevon & Jessica",
  ].join("\n");
  return { subject, html, text };
}

export async function sendNewsletterWelcomeEmail(input: {
  email: string;
  firstName?: string;
}): Promise<"sent" | "skipped"> {
  const config = getResendConfig();
  if (!config) {
    console.warn("[newsletter] welcome email skipped: missing resend config");
    return "skipped";
  }

  const email = buildWelcomeEmail(input);

  try {
    await sendResendEmail({
      to: input.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    return "sent";
  } catch (error) {
    console.error("[newsletter] failed to send welcome email", {
      email: input.email,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return "skipped";
  }
}

export async function subscribeToNewsletter(input: SubscribeToNewsletterValues): Promise<NewsletterSubscriptionResult> {
  const segmentId = getNewsletterSegmentId();
  if (!segmentId || !getResendApiKey()) {
    return { status: "skipped", reason: "missing-config" };
  }

  const existingContact = await getResendContactByEmail(input.email);

  if (!existingContact) {
    await createResendContact({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      unsubscribed: false,
    });

    await addResendContactToSegmentByEmail(input.email, segmentId);

    sendNewsletterWelcomeEmail({ email: input.email, firstName: input.firstName });

    return { status: "subscribed", source: "created" };
  }

  const existingSegments = await listResendContactSegmentsByEmail(input.email);
  const isInNewsletterSegment = existingSegments.some((segment) => segment.id === segmentId);

  if (!existingContact.unsubscribed) {
    if (!isInNewsletterSegment) {
      await addResendContactToSegmentByEmail(input.email, segmentId);
      return { status: "subscribed", source: "updated" };
    }

    return { status: "already-subscribed" };
  }

  await updateResendContactByEmail({
    email: input.email,
    unsubscribed: false,
    firstName: input.firstName ?? existingContact.firstName ?? undefined,
    lastName: input.lastName ?? existingContact.lastName ?? undefined,
  });
  if (!isInNewsletterSegment) {
    await addResendContactToSegmentByEmail(input.email, segmentId);
  }

  sendNewsletterWelcomeEmail({ email: input.email, firstName: input.firstName });

  return { status: "subscribed", source: "updated" };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
