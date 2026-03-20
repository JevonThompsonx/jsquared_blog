import "server-only";

import {
  addResendContactToSegmentByEmail,
  createResendContact,
  getResendApiKey,
  getResendContactByEmail,
  listResendContactSegmentsByEmail,
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

function getNewsletterProperties(source?: string): Record<string, string> | undefined {
  if (!source) {
    return undefined;
  }

  return { source };
}

export function isNewsletterConfigured(): boolean {
  return Boolean(getResendApiKey() && getNewsletterSegmentId());
}

export function getNewsletterEnvSetupInstructions(): string[] {
  return [
    "Set `RESEND_API_KEY` to a server-side Resend API key.",
    "Create a Resend Segment for newsletter subscribers.",
    "Set `RESEND_NEWSLETTER_SEGMENT_ID` to that Segment ID.",
    "Leave the route deployed even when unset; it returns a non-fatal skipped result for safe rollouts.",
  ];
}

export async function subscribeToNewsletter(input: SubscribeToNewsletterValues): Promise<NewsletterSubscriptionResult> {
  const segmentId = getNewsletterSegmentId();
  if (!segmentId || !getResendApiKey()) {
    return { status: "skipped", reason: "missing-config" };
  }

  const existingContact = await getResendContactByEmail(input.email);
  const properties = getNewsletterProperties(input.source);

  if (!existingContact) {
    await createResendContact({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      unsubscribed: false,
      properties,
    });

    await addResendContactToSegmentByEmail(input.email, segmentId);

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
    properties: {
      ...existingContact.properties,
      ...properties,
    },
  });
  if (!isInNewsletterSegment) {
    await addResendContactToSegmentByEmail(input.email, segmentId);
  }

  return { status: "subscribed", source: "updated" };
}
