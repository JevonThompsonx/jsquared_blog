import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { requireAdminSession } from "@/lib/auth/session";
import { getPostRevisionById } from "@/server/dal/post-revisions";

const paramsSchema = z.object({
  postId: z.string().min(1).max(128),
  revisionId: z.string().min(1).max(128),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ postId: string; revisionId: string }> },
): Promise<NextResponse> {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`admin-post-revision:${session.user.id}:${getClientIp(request)}`, 120, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  const paramsParse = paramsSchema.safeParse(await context.params);
  if (!paramsParse.success) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const { postId, revisionId } = paramsParse.data;

  const revision = await getPostRevisionById(postId, revisionId);
  if (!revision) {
    return NextResponse.json({ error: "Revision not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: revision.id,
    postId: revision.postId,
    revisionNum: revision.revisionNum,
    title: revision.title,
    excerpt: revision.excerpt,
    contentJson: revision.contentJson,
    savedByUserId: revision.savedByUserId,
    savedAt: revision.savedAt.toISOString(),
    label: revision.label,
  });
}
