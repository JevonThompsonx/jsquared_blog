import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { incrementPostViewCount } from "@/server/dal/posts";
import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";

const paramsSchema = z.object({
  postId: z.string().trim().min(1),
});

const VIEW_COOKIE_PREFIX = "j2-viewed-post-";
const VIEW_COOKIE_TTL_SECONDS = 60 * 60 * 8;

export async function POST(request: Request, context: { params: Promise<{ postId: string }> }): Promise<NextResponse> {
  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  const { postId } = parsedParams.data;
  const viewedCookieName = `${VIEW_COOKIE_PREFIX}${postId}`;
  const cookieStore = await cookies();

  if (cookieStore.get(viewedCookieName)?.value === "1") {
    return NextResponse.json({ counted: false }, { status: 200 });
  }

  const rateLimit = await checkRateLimit(`post-view:${postId}:${getClientIp(request)}`, 20, 60_000);
  if (!rateLimit.allowed) {
    return tooManyRequests(rateLimit);
  }

  await incrementPostViewCount(postId);

  cookieStore.set(viewedCookieName, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VIEW_COOKIE_TTL_SECONDS,
  });

  return NextResponse.json({ counted: true }, { status: 202 });
}
