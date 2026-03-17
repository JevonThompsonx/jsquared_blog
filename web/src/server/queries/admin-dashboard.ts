import "server-only";

import type { AdminPostListFilters } from "@/server/dal/admin-posts";
import { getAdminPostCounts, listAdminPostRecords, listAdminCategories } from "@/server/dal/admin-posts";

export async function getAdminDashboardData(filters?: Partial<AdminPostListFilters>) {
  const [counts, posts] = await Promise.all([
    getAdminPostCounts(),
    listAdminPostRecords(filters),
  ]);

  return {
    counts,
    posts,
  };
}

export async function getAdminDashboardMetadata() {
  const [categories] = await Promise.all([
    listAdminCategories(),
  ]);

  return {
    categories,
  };
}
