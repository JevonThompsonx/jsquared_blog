import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { publishPosts, unpublishPosts } from "@/server/posts/publish";

const bulkStatusSchema = z.object({
  postIds: z.array(z.string().min(1)).min(1).max(100),
  status: z.enum(["published", "draft"]),
});

// POST /api/admin/posts/bulk-status
// Body: { postIds: string[]; status: "published" | "draft" }
// Response: PostPublishResult
// Auth: Admin (Auth.js GitHub)
// UI: bulk publish/unpublish selected rows and display updated/unchanged/missing counts
export async function POST(request: Request): Promise<NextResponse> {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = bulkStatusSchema.parse(await request.json());
    const result = body.status === "published"
      ? await publishPosts(body.postIds)
      : await unpublishPosts(body.postIds);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bulk update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
