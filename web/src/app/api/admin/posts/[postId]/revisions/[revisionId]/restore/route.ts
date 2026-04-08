import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { adminRouteFailureResponse, logAdminRouteFailure } from "@/lib/admin-route-errors";
import { requireAdminSession } from "@/lib/auth/session";
import {
  getPostRevisionById,
  restorePostRevisionAtomically,
} from "@/server/dal/post-revisions";
import { derivePostContent } from "@/server/posts/content";

// POST /api/admin/posts/[postId]/revisions/[revisionId]/restore
// Body: none
// Response: { postId: string, restoredRevisionId: string, newRevisionId: string }
// Auth: Admin (Auth.js GitHub)
//
// Restores a post's title/content/excerpt to the state captured in the target revision.
// Before overwriting, creates a new "pre-restore" revision of the current state so the
// admin can undo the restore if needed.

const restoreParamsSchema = z.object({
  postId: z.string().trim().min(1).max(128),
  revisionId: z.string().trim().min(1).max(128),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ postId: string; revisionId: string }> },
): Promise<NextResponse> {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`admin-post-revision-restore:${session.user.id}:${getClientIp(request)}`, 10, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  const paramsParse = restoreParamsSchema.safeParse(await context.params);
  if (!paramsParse.success) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const { postId, revisionId } = paramsParse.data;

  try {
    // Fetch the revision to restore (scoped to postId for safety)
    const revision = await getPostRevisionById(postId, revisionId);
    if (!revision) {
      return NextResponse.json({ error: "Revision not found" }, { status: 404 });
    }

    // Derive HTML + plain-text from the revision's contentJson.
    // If the contentJson is invalid Tiptap, derivePostContent throws — return 422.
    let derived: ReturnType<typeof derivePostContent>;
    try {
      derived = derivePostContent(revision.contentJson, revision.excerpt);
    } catch {
      return NextResponse.json(
        { error: "Revision content is not valid Tiptap JSON and cannot be restored" },
        { status: 422 },
      );
    }

    const restoreResult = await restorePostRevisionAtomically({
      postId,
      revision,
      derivedContent: {
        canonicalContentJson: derived.canonicalContentJson,
        contentHtml: derived.contentHtml,
        contentPlainText: derived.contentPlainText,
        excerpt: derived.excerpt,
      },
      savedByUserId: session.user.id,
    });

    if (!restoreResult) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    try {
      revalidatePath("/");
      revalidatePath("/admin");
      revalidatePath(`/posts/${restoreResult.slug}`);
    } catch (error) {
      logAdminRouteFailure("[admin revision restore] failed to revalidate after restore", { postId, revisionId, error });
    }

    return NextResponse.json({
      postId,
      restoredRevisionId: revisionId,
      newRevisionId: restoreResult.newRevisionId,
    });
  } catch (error) {
    logAdminRouteFailure("[admin revision restore] failed to restore revision", { postId, revisionId, error });
    return adminRouteFailureResponse("Failed to restore revision");
  }
}
