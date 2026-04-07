import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { getRequestSupabaseUser } from "@/lib/supabase/server";
import { ensurePublicAppUser, getPublicAppUserBySupabaseId } from "@/server/auth/public-users";
import { canCommentOnPost, canReplyToComment, createCommentRecord, listCommentsForPost } from "@/server/dal/comments";
import { createCommentSchema, commentSortSchema, postCommentsParamsSchema } from "@/server/forms/comments";
import { sendCommentNotification } from "@/server/services/comment-notifications";

export async function GET(request: Request, context: { params: Promise<{ postId: string }> }): Promise<NextResponse> {
  const paramsParse = postCommentsParamsSchema.safeParse(await context.params);
  if (!paramsParse.success) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  const rl = await checkRateLimit(`comments-list:${getClientIp(request)}`, 120, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  const { postId } = paramsParse.data;
  const url = new URL(request.url);
  const sortParse = commentSortSchema.safeParse(url.searchParams.get("sort") ?? "likes");
  if (!sortParse.success) {
    return NextResponse.json({ error: "Invalid sort option" }, { status: 400 });
  }

  try {
    if (!(await canCommentOnPost(postId))) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const supabaseUser = await getRequestSupabaseUser(request);
    const currentUser = supabaseUser ? await getPublicAppUserBySupabaseId(supabaseUser.id) : null;
    const comments = await listCommentsForPost(postId, currentUser?.id ?? null, sortParse.data);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error("[post-comments] Failed to load comments", { postId, sort: sortParse.data, error });
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ postId: string }> }): Promise<NextResponse> {
  const paramsParse = postCommentsParamsSchema.safeParse(await context.params);
  if (!paramsParse.success) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  const { postId } = paramsParse.data;

  const supabaseUser = await getRequestSupabaseUser(request);
  if (!supabaseUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 5 new comments per minute per authenticated user and IP
  const rl = await checkRateLimit(`comment:${supabaseUser.id}:${getClientIp(request)}`, 5, 60_000);
  if (!rl.allowed) return tooManyRequests(rl);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parse = createCommentSchema.safeParse(payload);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid comment payload" }, { status: 400 });
  }

  try {
    if (!(await canCommentOnPost(postId))) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (parse.data.parentId) {
      const canReply = await canReplyToComment(postId, parse.data.parentId);
      if (!canReply) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }
    }

    const publicUser = await ensurePublicAppUser(supabaseUser);
    const comment = await createCommentRecord(postId, publicUser.id, parse.data.content, parse.data.parentId ?? null);
    try {
      await sendCommentNotification(comment);
    } catch (error) {
      console.error(`[post-comments] Failed to send notification for post ${postId}`, error);
    }

    try {
      const comments = await listCommentsForPost(postId, publicUser.id, "newest");
      return NextResponse.json({ comments }, { status: 201 });
    } catch (error) {
      console.error(`[post-comments] Failed to refresh comments after create for post ${postId}`, error);
      return NextResponse.json({}, { status: 201 });
    }
  } catch (error) {
    console.error(`[post-comments] Failed to create comment for post ${postId}`, error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
