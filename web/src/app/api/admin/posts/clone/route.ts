import { NextResponse } from "next/server";
import { z } from "zod";

import { adminRouteFailureResponse, logAdminRouteFailure } from "@/lib/admin-route-errors";
import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { requireAdminSession } from "@/lib/auth/session";
import { clonePostById } from "@/server/posts/clone";

const clonePostSchema = z.object({
  postId: z.string().trim().min(1),
});

// POST /api/admin/posts/clone
// Body: { postId: string }
// Response: { postId: string; slug: string; title: string; status: "draft" }
// Auth: Admin (Auth.js GitHub)
// UI: clone a post into a new draft, then navigate to the cloned edit screen
export async function POST(request: Request): Promise<NextResponse> {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`admin-posts-clone:${session.user.id}:${getClientIp(request)}`, 20, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  let body: z.infer<typeof clonePostSchema>;

  try {
    body = clonePostSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid clone request" }, { status: 400 });
  }

  try {
    const result = await clonePostById(body.postId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const isNotFound = error instanceof Error && error.message.toLowerCase().includes("not found");
    if (isNotFound) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    logAdminRouteFailure("[admin post clone] failed to clone post", {
      postId: body.postId,
      adminUserId: session.user.id,
      error,
    });
    return adminRouteFailureResponse("Failed to clone post");
  }
}
