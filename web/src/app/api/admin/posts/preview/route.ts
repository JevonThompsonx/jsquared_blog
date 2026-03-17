import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { createPostPreviewAccess } from "@/server/posts/preview";

const createPreviewSchema = z.object({
  postId: z.string().min(1),
});

// POST /api/admin/posts/preview
// Body: { postId: string }
// Response: { postId: string; previewPath: string; token: string; expiresAt: string }
// Auth: Admin (Auth.js GitHub)
// UI: request an expiring preview link for draft/unpublished content and open previewPath
export async function POST(request: Request): Promise<NextResponse> {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = createPreviewSchema.parse(await request.json());
    const preview = await createPostPreviewAccess(body.postId, session.user.id);
    return NextResponse.json(preview, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview creation failed";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
