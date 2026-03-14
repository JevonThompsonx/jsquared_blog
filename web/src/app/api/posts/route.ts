import { NextResponse } from "next/server";

import { listPublishedPosts } from "@/server/queries/posts";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 20);
  const offset = Number(searchParams.get("offset") ?? 0);
  const search = searchParams.get("search") ?? undefined;

  const posts = await listPublishedPosts(limit, offset, search);

  return NextResponse.json({
    posts,
    limit,
    offset,
    search: search ?? null,
    hasMore: posts.length === limit,
  });
}
