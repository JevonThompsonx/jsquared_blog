import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";
import { ensurePublicAppUser } from "@/server/auth/public-users";
import { commentExists, toggleCommentLikeRecord } from "@/server/dal/comments";

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

export async function POST(request: Request, context: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await context.params;
  const supabaseUser = await getRequestSupabaseUser(request);
  if (!supabaseUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await commentExists(commentId))) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const publicUser = await ensurePublicAppUser(supabaseUser);
  const result = await toggleCommentLikeRecord(commentId, publicUser.id);
  return NextResponse.json(result, { status: result.liked ? 201 : 200 });
}
