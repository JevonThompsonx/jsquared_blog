import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { requireAdminSession } from "@/lib/auth/session";
import { moderateCommentsSchema } from "@/server/forms/comments";
import { moderateCommentsByIds } from "@/server/dal/comments";

// POST /api/admin/comments/moderate
// Body: { commentIds: string[]; action: "hide" | "unhide" | "delete" | "flag" | "unflag" }
// Response: { action: string; updatedCount: number; unchangedCount: number; missingIds: string[]; comments: Array<{ commentId: string; postId: string; visibility: "visible" | "hidden" | "deleted"; isFlagged: boolean; moderatedAt: string | null; moderatedByUserId: string | null; changed: boolean }> }
// Auth: Admin (Auth.js GitHub)
// UI: optimistic-update the targeted comments, then reconcile with the returned per-comment moderation state
export async function POST(request: Request): Promise<NextResponse> {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`admin-comments-moderate:${session.user.id}:${getClientIp(request)}`, 30, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  let body: { commentIds: string[]; action: "hide" | "unhide" | "delete" | "flag" | "unflag" };

  try {
    body = moderateCommentsSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid moderation request" }, { status: 400 });
  }

  try {
    const result = await moderateCommentsByIds(body.commentIds, body.action, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin comment moderation] failed to moderate comments", {
      action: body.action,
      commentIds: body.commentIds,
      adminUserId: session.user.id,
      error,
    });
    return NextResponse.json({ error: "Failed to moderate comments" }, { status: 500 });
  }
}
