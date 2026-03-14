import { NextResponse } from "next/server";

import { listPublishedPosts } from "@/server/queries/posts";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 20);
  const offset = Number(searchParams.get("offset") ?? 0);

  const posts = await listPublishedPosts(limit, offset);

  return NextResponse.json({
    posts,
    limit,
    offset,
    hasMore: posts.length === limit,
  });
}
