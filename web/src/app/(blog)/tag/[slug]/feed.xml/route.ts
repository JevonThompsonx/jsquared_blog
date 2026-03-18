import { z } from "zod";

import { getTagFeedHref } from "@/lib/utils";
import { getTagBySlug } from "@/server/dal/posts";
import { buildRssXml, createRssResponse } from "@/server/feeds/rss";
import { listPublishedPostsByTagSlug } from "@/server/queries/posts";

const paramsSchema = z.object({
  slug: z.string().trim().min(1).max(120),
});

export async function GET(_request: Request, context: { params: Promise<unknown> }): Promise<Response> {
  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return new Response("Invalid tag", { status: 400 });
  }

  const tag = await getTagBySlug(parsedParams.data.slug);
  if (!tag) {
    return new Response("Not found", { status: 404 });
  }

  const posts = await listPublishedPostsByTagSlug(tag.slug, 100, 0);

  return createRssResponse(
    buildRssXml({
      title: `${tag.name} - J²Adventures`,
      description: tag.description ?? `Latest J²Adventures posts tagged ${tag.name}.`,
      siteUrl: `https://jsquaredadventures.com/tag/${tag.slug}`,
      selfUrl: `https://jsquaredadventures.com${getTagFeedHref(tag.slug)}`,
      posts,
    }),
  );
}
