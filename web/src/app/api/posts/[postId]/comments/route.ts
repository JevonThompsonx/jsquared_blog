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

  const { postId } = paramsParse.data;
  const url = new URL(request.url);
  const sortParse = commentSortSchema.safeParse(url.searchParams.get("sort") ?? "likes");
  if (!sortParse.success) {
    return NextResponse.json({ error: "Invalid sort option" }, { status: 400 });
  }

  const supabaseUser = await getRequestSupabaseUser(request);
  const currentUser = supabaseUser ? await getPublicAppUserBySupabaseId(supabaseUser.id) : null;
  const comments = await listCommentsForPost(postId, currentUser?.id ?? null, sortParse.data);
  return NextResponse.json({ comments });
}

export async function POST(request: Request, context: { params: Promise<{ postId: string }> }): Promise<NextResponse> {
  const paramsParse = postCommentsParamsSchema.safeParse(await context.params);
  if (!paramsParse.success) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  const { postId } = paramsParse.data;

  // 5 new comments per minute per IP
  const rl = await checkRateLimit(`comment:${getClientIp(request)}`, 5, 60_000);
  if (!rl.allowed) return tooManyRequests(rl);

  const supabaseUser = await getRequestSupabaseUser(request);
  if (!supabaseUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await canCommentOnPost(postId))) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parse = createCommentSchema.safeParse(payload);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten().fieldErrors }, { status: 400 });
  }

  if (parse.data.parentId) {
    const canReply = await canReplyToComment(postId, parse.data.parentId);
    if (!canReply) {
      return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
    }
  }

  const publicUser = await ensurePublicAppUser(supabaseUser);
  const comment = await createCommentRecord(postId, publicUser.id, parse.data.content, parse.data.parentId ?? null);
  await sendCommentNotification(comment);
  const comments = await listCommentsForPost(postId, publicUser.id, "newest");
  return NextResponse.json({ comments }, { status: 201 });
}
