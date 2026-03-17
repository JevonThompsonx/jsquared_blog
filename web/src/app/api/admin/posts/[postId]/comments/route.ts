import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/session";
import { listCommentsForAdmin } from "@/server/dal/comments";
import { commentSortSchema, postCommentsParamsSchema } from "@/server/forms/comments";

// GET /api/admin/posts/[postId]/comments?sort=likes|newest|oldest
// Response: { comments: Array<{ id: string; postId: string; authorId: string; authorDisplayName: string; authorAvatarUrl: string | null; content: string; parentId: string | null; createdAt: string; updatedAt: string; likeCount: number; userHasLiked: boolean; canDelete: boolean; visibility: "visible" | "hidden" | "deleted"; isFlagged: boolean; moderatedAt: string | null; moderatedByUserId: string | null; canLike: boolean }> }
// Auth: Admin (Auth.js GitHub)
// UI: fetch the full moderation-aware thread for a post so admins can review hidden/flagged/deleted comments without losing original content
export async function GET(request: Request, context: { params: Promise<{ postId: string }> }): Promise<NextResponse> {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paramsParse = postCommentsParamsSchema.safeParse(await context.params);
  if (!paramsParse.success) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  const { postId } = paramsParse.data;
  const url = new URL(request.url);
  const sortParse = commentSortSchema.safeParse(url.searchParams.get("sort") ?? "likes");
  if (!sortParse.success) {
    return NextResponse.json({ error: "Invalid sort option" }, { status: 400 });
  }

  const comments = await listCommentsForAdmin(postId, sortParse.data);
  return NextResponse.json({ comments });
}
