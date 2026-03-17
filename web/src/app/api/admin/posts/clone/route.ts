import { NextResponse } from "next/server";
import { z } from "zod";

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

  try {
    const body = clonePostSchema.parse(await request.json());
    const result = await clonePostById(body.postId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Clone failed";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
