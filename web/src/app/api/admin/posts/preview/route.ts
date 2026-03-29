import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { requireAdminSession } from "@/lib/auth/session";
import { createPostPreviewAccess } from "@/server/posts/preview";

const createPreviewSchema = z.object({
  postId: z.string().min(1),
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

  try {
    const body = createPreviewSchema.parse(await request.json());
    const preview = await createPostPreviewAccess(body.postId, session.user.id);
    return NextResponse.json(preview, { status: 201 });
  } catch (error) {
    const isNotFound = error instanceof Error && error.message.toLowerCase().includes("not found");
    return NextResponse.json({ error: isNotFound ? "Post not found" : "Invalid preview request" }, { status: isNotFound ? 404 : 400 });
  }
}
