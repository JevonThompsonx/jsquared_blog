import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { listPublishedPosts, listPublishedPostsByCategory, listPublishedPostsByTagSlug } from "@/server/queries/posts";

// GET /api/posts
// Query: limit (1–50, default 20), offset (>=0, default 0), search (string <=200),
//        category (string <=100), tag (string <=100)
// Output: { posts: BlogPost[]; limit: number; offset: number; hasMore: boolean }
// Auth: public (rate-limited)

const postsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(50)),
  offset: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : 0))
    .pipe(z.number().int().min(0)),
  search: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  tag: z.string().max(100).optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  // 60 requests per minute per IP
  const rl = await checkRateLimit(`posts:${getClientIp(request)}`, 60, 60_000);
  if (!rl.allowed) return tooManyRequests(rl);

  const { searchParams } = new URL(request.url);

  const parse = postsQuerySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
  });

  if (!parse.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const { limit, offset, search, category, tag } = parse.data;

  let posts;
  if (category) {
    posts = await listPublishedPostsByCategory(category, limit, offset);
  } else if (tag) {
    posts = await listPublishedPostsByTagSlug(tag, limit, offset);
  } else {
    posts = await listPublishedPosts(limit, offset, search);
  }

  return NextResponse.json({
    posts,
    limit,
    offset,
    hasMore: posts.length === limit,
  });
}
