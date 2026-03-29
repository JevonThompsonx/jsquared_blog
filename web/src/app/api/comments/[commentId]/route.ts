import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { getRequestSupabaseUser } from "@/lib/supabase/server";
import { ensurePublicAppUser } from "@/server/auth/public-users";
import { deleteCommentRecord } from "@/server/dal/comments";

const commentIdSchema = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/);

export async function DELETE(
  request: Request,
  context: { params: Promise<{ commentId: string }> },
): Promise<NextResponse> {
  const { commentId: rawCommentId } = await context.params;
  const parseId = commentIdSchema.safeParse(rawCommentId);
  if (!parseId.success) {
    return NextResponse.json({ error: "Invalid comment ID" }, { status: 400 });
  }
  const commentId = parseId.data;

  const supabaseUser = await getRequestSupabaseUser(request);
  if (!supabaseUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`comment-delete:${supabaseUser.id}:${getClientIp(request)}`, 20, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  const publicUser = await ensurePublicAppUser(supabaseUser);
  const deleted = await deleteCommentRecord(commentId, publicUser.id);
  if (!deleted) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
