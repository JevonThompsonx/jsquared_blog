import "server-only";

import {
  isListmonkConfigured,
  subscribeToListmonk,
} from "@/lib/email/listmonk";
import type { SubscribeToNewsletterValues } from "@/server/forms/newsletter";

export type NewsletterSubscriptionResult =
  { status: "subscribed" } | { status: "skipped"; reason: "missing-config" };

export function isNewsletterConfigured(): boolean {
  return isListmonkConfigured();
}

export async function subscribeToNewsletter(
  input: SubscribeToNewsletterValues,
): Promise<NewsletterSubscriptionResult> {
  if (!isNewsletterConfigured()) {
    return { status: "skipped", reason: "missing-config" };
  }

  const name = [input.firstName, input.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .trim();

  await subscribeToListmonk({
    email: input.email,
    ...(name ? { name } : {}),
  });

  return { status: "subscribed" };
}
