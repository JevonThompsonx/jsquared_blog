import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { captureException } from "@/lib/sentry";
import { rejectCrossSiteMutation } from "@/lib/auth/csrf";
import { getRequestPublicUser } from "@/server/auth/public-users";
import { isPostBookmarked, togglePostBookmark } from "@/server/dal/bookmarks";

const postIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);

export async function GET(
  request: Request,
  context: { params: Promise<{ postId: string }> },
): Promise<NextResponse> {
  const params = await context.params;
  const parsedPostId = postIdSchema.safeParse(params.postId);
  if (!parsedPostId.success) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }
  const postId = parsedPostId.data;

  try {
    const publicUser = await getRequestPublicUser(request);
    if (!publicUser) {
      return NextResponse.json({ bookmarked: false });
    }

    const rl = await checkRateLimit(
      `bookmark-status:${publicUser.id}:${getClientIp(request)}`,
      60,
      60_000,
    );
    if (!rl.allowed) {
      return tooManyRequests(rl);
    }

    const bookmarked = await isPostBookmarked(postId, publicUser.id);
    return NextResponse.json({ bookmarked });
  } catch (error) {
    console.error("[post bookmark:get]", error);
    captureException(error, { route: "post-bookmark", postId, action: "get" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ postId: string }> },
): Promise<NextResponse> {
  const crossSite = rejectCrossSiteMutation(request);
  if (crossSite) return crossSite;

  const params = await context.params;
  const parsedPostId = postIdSchema.safeParse(params.postId);
  if (!parsedPostId.success) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }
  const postId = parsedPostId.data;

  try {
    const publicUser = await getRequestPublicUser(request);
    if (!publicUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Scope mutation throttling to the authenticated user and client IP.
    const rl = await checkRateLimit(
      `bookmark:${publicUser.id}:${getClientIp(request)}`,
      20,
      60_000,
    );
    if (!rl.allowed) return tooManyRequests(rl);

    const result = await togglePostBookmark(postId, publicUser.id);
    return NextResponse.json(result, { status: result.bookmarked ? 201 : 200 });
  } catch (error) {
    console.error("[post bookmark:post]", error);
    captureException(error, {
      route: "post-bookmark",
      postId,
      action: "toggle",
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
