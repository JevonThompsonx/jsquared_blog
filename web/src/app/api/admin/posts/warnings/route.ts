import { NextResponse } from "next/server";
import { z } from "zod";

import { adminRouteFailureResponse, logAdminRouteFailure } from "@/lib/admin-route-errors";
import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { requireAdminSession } from "@/lib/auth/session";
import { derivePostContent } from "@/server/posts/content";

const postWarningsSchema = z.object({
  contentJson: z.string().min(1),
  excerpt: z.string().nullable().optional(),
});

// POST /api/admin/posts/warnings
// Body: { contentJson: string; excerpt?: string | null }
// Response: { warnings: TiptapImageAltWarning[]; excerpt: string | null }
// Auth: Admin (Auth.js GitHub)
// UI: validate editor content for non-blocking warnings while typing or before publish
export async function POST(request: Request): Promise<NextResponse> {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`admin-posts-warnings:${session.user.id}:${getClientIp(request)}`, 60, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  let body: z.infer<typeof postWarningsSchema>;

  try {
    body = postWarningsSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid warnings request" }, { status: 400 });
  }

  try {
    const content = derivePostContent(body.contentJson, body.excerpt ?? null);
    return NextResponse.json({ warnings: content.imageAltWarnings, excerpt: content.excerpt });
  } catch (error) {
    if (error instanceof Error && error.message === "Content must be valid Tiptap JSON") {
      return NextResponse.json({ error: "Invalid warnings request" }, { status: 400 });
    }

    logAdminRouteFailure("[admin post warnings] failed to derive warnings", {
      adminUserId: session.user.id,
      error,
    });
    return adminRouteFailureResponse("Failed to validate warnings");
  }
}
