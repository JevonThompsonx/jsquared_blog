import { z } from "zod";

import { getCategoryFeedHref } from "@/lib/utils";
import { buildRssXml, createRssResponse } from "@/server/feeds/rss";
import { listPublishedPostsByCategory } from "@/server/queries/posts";

const paramsSchema = z.object({
  category: z.string().trim().min(1).max(120),
});

export async function GET(_request: Request, context: { params: Promise<unknown> }): Promise<Response> {
  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return new Response("Invalid category", { status: 400 });
  }

  const category = decodeURIComponent(parsedParams.data.category);
  const posts = await listPublishedPostsByCategory(category, 100, 0);

  return createRssResponse(
    buildRssXml({
      title: `${category} - J²Adventures`,
      description: `Latest J²Adventures posts filed under ${category}.`,
      siteUrl: `https://jsquaredadventures.com/category/${encodeURIComponent(category)}`,
      selfUrl: `https://jsquaredadventures.com${getCategoryFeedHref(category)}`,
      posts,
    }),
  );
}
