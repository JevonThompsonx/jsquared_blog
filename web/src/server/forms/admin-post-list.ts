import { z } from "zod";

import { adminPostListFiltersSchema } from "@/server/dal/admin-posts";

export const adminPostListSearchParamsSchema = z.object({
  search: z.string().trim().optional(),
  query: z.string().trim().optional(),
  category: z.string().trim().optional(),
  status: z.enum(["all", "draft", "published", "scheduled"]).optional(),
  page: z.string().trim().optional(),
  pageSize: z.string().trim().optional(),
  sort: z.enum(["updated-desc", "created-desc", "created-asc", "published-desc", "title-asc", "views-desc", "newest", "oldest", "title"]).optional(),
});

function normalizeStatus(status: string | undefined): "draft" | "published" | "scheduled" | undefined {
  if (!status || status === "all") {
    return undefined;
  }

  return z.enum(["draft", "published", "scheduled"]).parse(status);
}

function normalizeSort(sort: string | undefined): "updated-desc" | "created-desc" | "created-asc" | "published-desc" | "title-asc" | "views-desc" | undefined {
  switch (sort) {
    case "newest":
      return "created-desc";
    case "oldest":
      return "created-asc";
    case "title":
      return "title-asc";
    case "updated-desc":
    case "created-desc":
    case "created-asc":
    case "published-desc":
    case "title-asc":
    case "views-desc":
      return sort;
    default:
      return undefined;
  }
}

export function parseAdminPostListSearchParams(searchParams: Record<string, string | string[] | undefined>) {
  const normalized = adminPostListSearchParamsSchema.parse({
    search: typeof searchParams.search === "string" ? searchParams.search : undefined,
    query: typeof searchParams.query === "string" ? searchParams.query : undefined,
    category: typeof searchParams.category === "string" ? searchParams.category : undefined,
    status: typeof searchParams.status === "string" ? searchParams.status : undefined,
    page: typeof searchParams.page === "string" ? searchParams.page : undefined,
    pageSize: typeof searchParams.pageSize === "string" ? searchParams.pageSize : undefined,
    sort: typeof searchParams.sort === "string" ? searchParams.sort : undefined,
  });

  return adminPostListFiltersSchema.parse({
    query: normalized.query ?? normalized.search,
    category: normalized.category && normalized.category !== "all" ? normalized.category : undefined,
    status: normalizeStatus(normalized.status),
    page: normalized.page,
    pageSize: normalized.pageSize,
    sort: normalizeSort(normalized.sort),
  });
}
