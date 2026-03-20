import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { getRequestSupabaseUser } from "@/lib/supabase/server";
import { ensurePublicAppUser } from "@/server/auth/public-users";
import { isPostBookmarked, togglePostBookmark } from "@/server/dal/bookmarks";

export async function GET(
  request: Request,
  context: { params: Promise<{ postId: string }> },
): Promise<NextResponse> {
  const { postId } = await context.params;
  const supabaseUser = await getRequestSupabaseUser(request);
  if (!supabaseUser) {
    return NextResponse.json({ bookmarked: false });
  }
  const publicUser = await ensurePublicAppUser(supabaseUser);
  const bookmarked = await isPostBookmarked(postId, publicUser.id);
  return NextResponse.json({ bookmarked });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ postId: string }> },
): Promise<NextResponse> {
  const { postId } = await context.params;

  // 20 bookmark toggles per minute per IP
  const rl = await checkRateLimit(`bookmark:${getClientIp(request)}`, 20, 60_000);
  if (!rl.allowed) return tooManyRequests(rl);

  const supabaseUser = await getRequestSupabaseUser(request);
  if (!supabaseUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const publicUser = await ensurePublicAppUser(supabaseUser);
  const result = await togglePostBookmark(postId, publicUser.id);
  return NextResponse.json(result, { status: result.bookmarked ? 201 : 200 });
}
