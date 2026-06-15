import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { adminRouteFailureResponse, logAdminRouteFailure } from "@/lib/admin-route-errors";
import { requireAdminSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { categories, mediaAssets } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getPostRevisionById } from "@/server/dal/post-revisions";

const paramsSchema = z.object({
  postId: z.string().trim().min(1).max(128),
  revisionId: z.string().trim().min(1).max(128),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ postId: string; revisionId: string }> },
): Promise<NextResponse> {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`admin-post-revision:${session.user.id}:${getClientIp(request)}`, 120, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  const paramsParse = paramsSchema.safeParse(await context.params);
  if (!paramsParse.success) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const { postId, revisionId } = paramsParse.data;

  try {
    const revision = await getPostRevisionById(postId, revisionId);
    if (!revision) {
      return NextResponse.json({ error: "Revision not found" }, { status: 404 });
    }

    let categoryName: string | null = null;
    let featuredImageUrl: string | null = null;
    let featuredImageAlt: string | null = null;

    if (revision.categoryId) {
      const db = getDb();
      const catRows = await db
        .select({ name: categories.name })
        .from(categories)
        .where(eq(categories.id, revision.categoryId))
        .limit(1);
      categoryName = catRows[0]?.name ?? null;
    }

    if (revision.featuredImageId) {
      const db = getDb();
      const mediaRows = await db
        .select({ secureUrl: mediaAssets.secureUrl, altText: mediaAssets.altText })
        .from(mediaAssets)
        .where(eq(mediaAssets.id, revision.featuredImageId))
        .limit(1);
      featuredImageUrl = mediaRows[0]?.secureUrl ?? null;
      featuredImageAlt = mediaRows[0]?.altText ?? null;
    }

    return NextResponse.json({
      id: revision.id,
      postId: revision.postId,
      revisionNum: revision.revisionNum,
      title: revision.title,
      excerpt: revision.excerpt,
      contentJson: revision.contentJson,
      layoutType: revision.layoutType ?? null,
      categoryId: revision.categoryId ?? null,
      categoryName,
      featuredImageId: revision.featuredImageId ?? null,
      featuredImageUrl,
      featuredImageAlt,
      locationName: revision.locationName ?? null,
      locationLat: revision.locationLat ?? null,
      locationLng: revision.locationLng ?? null,
      locationZoom: revision.locationZoom ?? null,
      songTitle: revision.songTitle ?? null,
      songArtist: revision.songArtist ?? null,
      songUrl: revision.songUrl ?? null,
      savedByUserId: revision.savedByUserId,
      savedAt: revision.savedAt.toISOString(),
      label: revision.label,
    });
  } catch (error) {
    logAdminRouteFailure("[admin revision detail] failed to load revision", { postId, revisionId, error });
    return adminRouteFailureResponse("Failed to load revision");
  }
}
