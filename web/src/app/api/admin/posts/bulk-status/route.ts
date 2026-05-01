import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { requireAdminSession } from "@/lib/auth/session";
import { publishPosts, unpublishPosts } from "@/server/posts/publish";
import { deactivateLinkedWishlistPlaces } from "@/server/dal/admin-wishlist-places";

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

    if (body.status === "published" && result.updatedPostIds.length > 0) {
      try {
        await deactivateLinkedWishlistPlaces(result.updatedPostIds);
        revalidatePath("/wishlist");
      } catch (err) {
        console.error("[bulk-status] deactivateLinkedWishlistPlaces failed:", err);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid bulk update request" }, { status: 400 });
    }
    console.error("[bulk-status] Failed to update posts", error);
    return NextResponse.json({ error: "Failed to update posts" }, { status: 500 });
  }
}
