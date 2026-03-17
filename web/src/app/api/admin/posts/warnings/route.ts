import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { derivePostContent } from "@/server/posts/content";

const postWarningsSchema = z.object({
  contentJson: z.string().min(1),
  excerpt: z.string().nullable().optional(),
});

// POST /api/admin/posts/warnings
// Body: { contentJson: string; excerpt?: string | null }
// Response: { warnings: TiptapImageAltWarning[]; excerpt: string | null }
// Auth: Admin (Auth.js GitHub)
// UI: validate editor content for non-blocking warnings while typing or before publish
export async function POST(request: Request): Promise<NextResponse> {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = postWarningsSchema.parse(await request.json());
    const content = derivePostContent(body.contentJson, body.excerpt ?? null);
    return NextResponse.json({ warnings: content.imageAltWarnings, excerpt: content.excerpt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
