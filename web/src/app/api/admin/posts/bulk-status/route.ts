import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { requireAdminSession } from "@/lib/auth/session";
import { publishPosts, unpublishPosts } from "@/server/posts/publish";

const bulkStatusSchema = z.object({
  postIds: z.array(z.string().trim().min(1)).min(1).max(100),
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

  const rl = await checkRateLimit(`admin-posts-bulk-status:${session.user.id}:${getClientIp(request)}`, 20, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  try {
    const body = bulkStatusSchema.parse(await request.json());
    const result = body.status === "published"
      ? await publishPosts(body.postIds)
      : await unpublishPosts(body.postIds);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Invalid bulk update request" }, { status: 400 });
  }
}
