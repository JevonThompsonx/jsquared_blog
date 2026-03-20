import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { ensurePublicAppUser } from "@/server/auth/public-users";
import { deleteCommentRecord } from "@/server/dal/comments";

const commentIdSchema = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/);

async function getRequestSupabaseUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  const env = getServerEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const result = await supabase.auth.getUser();
  return result.data.user ?? null;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ commentId: string }> },
): Promise<NextResponse> {
  const { commentId: rawCommentId } = await context.params;
  const parseId = commentIdSchema.safeParse(rawCommentId);
  if (!parseId.success) {
    return NextResponse.json({ error: "Invalid comment ID" }, { status: 400 });
  }
  const commentId = parseId.data;

  const supabaseUser = await getRequestSupabaseUser(request);
  if (!supabaseUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicUser = await ensurePublicAppUser(supabaseUser);
  const deleted = await deleteCommentRecord(commentId, publicUser.id);
  if (!deleted) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
