import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { requireAdminSession } from "@/lib/auth/session";
import { clonePostById } from "@/server/posts/clone";

const clonePostSchema = z.object({
  postId: z.string().min(1),
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

  try {
    const body = clonePostSchema.parse(await request.json());
    const result = await clonePostById(body.postId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const isNotFound = error instanceof Error && error.message.toLowerCase().includes("not found");
    return NextResponse.json({ error: isNotFound ? "Post not found" : "Invalid clone request" }, { status: isNotFound ? 404 : 400 });
  }
}
