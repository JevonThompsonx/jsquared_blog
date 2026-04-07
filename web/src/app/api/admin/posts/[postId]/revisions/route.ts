import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { requireAdminSession } from "@/lib/auth/session";
import { countPostRevisions, listPostRevisions, postExistsById } from "@/server/dal/post-revisions";

const postIdParamsSchema = z.object({ postId: z.string().trim().min(1).max(128) });

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// GET /api/admin/posts/[postId]/revisions?page=1&pageSize=20
// Response: { revisions: PostRevisionRecord[], total: number, page: number, pageSize: number, totalPages: number }
// Auth: Admin (Auth.js GitHub)
export async function GET(
  request: Request,
  context: { params: Promise<{ postId: string }> },
): Promise<NextResponse> {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`admin-post-revisions:${session.user.id}:${getClientIp(request)}`, 120, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  const paramsParse = postIdParamsSchema.safeParse(await context.params);
  if (!paramsParse.success) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  const { postId } = paramsParse.data;

  const url = new URL(request.url);
  const paginationParse = paginationSchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });

  if (!paginationParse.success) {
    return NextResponse.json({ error: "Invalid pagination params" }, { status: 400 });
  }

  const { page, pageSize } = paginationParse.data;

  try {
    const exists = await postExistsById(postId);
    if (!exists) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const offset = (page - 1) * pageSize;
    const [revisions, total] = await Promise.all([
      listPostRevisions(postId, pageSize, offset),
      countPostRevisions(postId),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      revisions: revisions.map((r) => ({
        id: r.id,
        postId: r.postId,
        revisionNum: r.revisionNum,
        title: r.title,
        excerpt: r.excerpt,
        savedByUserId: r.savedByUserId,
        savedAt: r.savedAt.toISOString(),
        label: r.label,
      })),
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error("[admin post revisions] failed to load revisions", { postId, page, pageSize, error });
    return NextResponse.json({ error: "Failed to load revisions" }, { status: 500 });
  }
}
