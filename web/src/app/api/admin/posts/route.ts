import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { requireAdminSession } from "@/lib/auth/session";
import { parseAdminPostListSearchParams } from "@/server/forms/admin-post-list";
import { listAdminPostRecords } from "@/server/dal/admin-posts";

// GET /api/admin/posts
// Query: { query?|search?, category?, status?, page?, pageSize?, sort? }
// Response: { posts, totalCount, page, pageSize, totalPages, filters }
// Auth: Admin (Auth.js GitHub)
// UI: bind dashboard list controls to URL state and fetch filtered paginated results
export async function GET(request: Request): Promise<NextResponse> {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`admin-posts-list:${session.user.id}:${getClientIp(request)}`, 120, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  const url = new URL(request.url);
  const filters = parseAdminPostListSearchParams({
    search: url.searchParams.get("search") ?? undefined,
    query: url.searchParams.get("query") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
  });

  return NextResponse.json(await listAdminPostRecords(filters));
}
