import "server-only";

import { getAdminPostCounts, listAdminPostRecords } from "@/server/dal/admin-posts";

export async function getAdminDashboardData() {
  const [counts, posts] = await Promise.all([
    getAdminPostCounts(),
    listAdminPostRecords(24),
  ]);

  return {
    counts,
    posts,
  };
}
