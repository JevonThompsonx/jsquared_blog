import { z } from "zod";

import { getCategoryFeedHref, SITE_URL } from "@/lib/utils";
import { getCategoryNameBySlug } from "@/server/dal/categories";
import { buildRssXml, createRssResponse } from "@/server/feeds/rss";
import { listPublishedPostsByCategory } from "@/server/queries/posts";

const paramsSchema = z.object({
  category: z.string().trim().min(1).max(120),
});

function normalizeCategoryParam(rawParams: unknown): string | null {
  const parsedParams = paramsSchema.safeParse(rawParams);
  if (!parsedParams.success) {
    return null;
  }

  let decodedCategory: string;

  try {
    decodedCategory = decodeURIComponent(parsedParams.data.category);
  } catch {
    return null;
  }

  const normalizedCategory = decodedCategory.trim();

  return normalizedCategory.length > 0 ? normalizedCategory : null;
}

export async function GET(_request: Request, context: { params: Promise<unknown> }): Promise<Response> {
  const category = normalizeCategoryParam(await context.params);
  if (!category) {
    return new Response("Invalid category", { status: 400 });
  }

  const displayName = (await getCategoryNameBySlug(category)) ?? category;
  const posts = await listPublishedPostsByCategory(category, 100, 0);

  return createRssResponse(
    buildRssXml({
      title: `${displayName} - J²Adventures`,
      description: `Latest J²Adventures posts filed under ${displayName}.`,
      siteUrl: `${SITE_URL}/category/${encodeURIComponent(category)}`,
      selfUrl: `${SITE_URL}${getCategoryFeedHref(category)}`,
      posts,
    }),
  );
}
