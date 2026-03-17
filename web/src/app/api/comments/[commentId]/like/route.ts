import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { getRequestSupabaseUser } from "@/lib/supabase/server";
import { ensurePublicAppUser } from "@/server/auth/public-users";
import { commentExists, toggleCommentLikeRecord } from "@/server/dal/comments";

export async function POST(request: Request, context: { params: Promise<{ commentId: string }> }): Promise<NextResponse> {
  const { commentId } = await context.params;

  // 30 like toggles per minute per IP (generous to allow rapid clicking)
  const rl = await checkRateLimit(`like:${getClientIp(request)}`, 30, 60_000);
  if (!rl.allowed) return tooManyRequests(rl);

  const supabaseUser = await getRequestSupabaseUser(request);
  if (!supabaseUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await commentExists(commentId))) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const publicUser = await ensurePublicAppUser(supabaseUser);
  const result = await toggleCommentLikeRecord(commentId, publicUser.id);
  return NextResponse.json(result, { status: result.liked ? 201 : 200 });
}
