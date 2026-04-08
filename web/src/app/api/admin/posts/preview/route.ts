import { NextResponse } from "next/server";
import { z } from "zod";

import { adminRouteFailureResponse, logAdminRouteFailure } from "@/lib/admin-route-errors";
import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { requireAdminSession } from "@/lib/auth/session";
import { createPostPreviewAccess } from "@/server/posts/preview";

const createPreviewSchema = z.object({
  postId: z.string().trim().min(1),
});

// POST /api/admin/posts/preview
// Body: { postId: string }
// Response: { postId: string; previewPath: string; token: string; expiresAt: string }
// Auth: Admin (Auth.js GitHub)
// UI: request an expiring preview link for draft/unpublished content and open previewPath
export async function POST(request: Request): Promise<NextResponse> {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`admin-posts-preview:${session.user.id}:${getClientIp(request)}`, 30, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  let body: z.infer<typeof createPreviewSchema>;

  try {
    body = createPreviewSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid preview request" }, { status: 400 });
  }

  try {
    const preview = await createPostPreviewAccess(body.postId, session.user.id);
    return NextResponse.json(preview, { status: 201 });
  } catch (error) {
    const isNotFound = error instanceof Error && error.message.toLowerCase().includes("not found");
    if (isNotFound) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    logAdminRouteFailure("[admin post preview] failed to create preview", {
      postId: body.postId,
      adminUserId: session.user.id,
      error,
    });
    return adminRouteFailureResponse("Failed to create preview");
  }
}
