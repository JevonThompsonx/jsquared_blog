import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { subscribeToNewsletterSchema } from "@/server/forms/newsletter";
import { isNewsletterConfigured, subscribeToNewsletter } from "@/server/services/newsletter";

// POST /api/newsletter
// Body: { email: string, firstName?: string, lastName?: string, source?: string }
// Response: { status: "subscribed" | "already-subscribed" | "skipped" }
// Auth: Public
export async function POST(request: Request): Promise<NextResponse> {
  const rl = await checkRateLimit(`newsletter:${getClientIp(request)}`, 5, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parse = subscribeToNewsletterSchema.safeParse(payload);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid newsletter signup request" }, { status: 400 });
  }

  if (!isNewsletterConfigured()) {
    return NextResponse.json(
      {
        status: "skipped",
        reason: "missing-config",
      },
      { status: 202 },
    );
  }

  const result = await subscribeToNewsletter(parse.data);
  return NextResponse.json(result, { status: result.status === "already-subscribed" ? 200 : 201 });
}
