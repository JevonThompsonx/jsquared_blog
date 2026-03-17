import { NextResponse } from "next/server";

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

  try {
    const body = moderateCommentsSchema.parse(await request.json());
    const result = await moderateCommentsByIds(body.commentIds, body.action, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Moderation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
