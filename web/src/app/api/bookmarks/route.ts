import { NextResponse } from "next/server";

import { cdnImageUrl } from "@/lib/cloudinary/transform";
import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { captureException } from "@/lib/sentry";
import { getRequestPublicUser } from "@/server/auth/public-users";
import { listBookmarkedPosts } from "@/server/dal/bookmarks";

export async function GET(request: Request): Promise<NextResponse> {
  const publicUser = await getRequestPublicUser(request);
  if (!publicUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(
    `bookmarks-list:${publicUser.id}:${getClientIp(request)}`,
    60,
    60_000,
  );
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  try {
    const rawPosts = await listBookmarkedPosts(publicUser.id);
    const posts = rawPosts.map((post) => ({
      ...post,
      imageUrl: cdnImageUrl(post.imageUrl),
    }));
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("[api/bookmarks] Failed to load bookmarks", {
      userId: publicUser.id,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    captureException(error, { route: "bookmarks", userId: publicUser.id });
    return NextResponse.json(
      { error: "Failed to load bookmarks" },
      { status: 500 },
    );
  }
}
