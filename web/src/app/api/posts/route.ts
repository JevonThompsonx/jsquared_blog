import { NextResponse } from "next/server";

import { listPublishedPosts, listPublishedPostsByCategory, listPublishedPostsByTagSlug } from "@/server/queries/posts";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 20);
  const offset = Number(searchParams.get("offset") ?? 0);
  const search = searchParams.get("search") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;

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
