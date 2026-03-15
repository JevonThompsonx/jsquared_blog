import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";
import { ensurePublicAppUser, getPublicAppUserBySupabaseId } from "@/server/auth/public-users";
import { canCommentOnPost, createCommentRecord, listCommentsForPost } from "@/server/dal/comments";
import { createCommentSchema, commentSortSchema } from "@/server/forms/comments";

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

export async function GET(request: Request, context: { params: Promise<{ postId: string }> }) {
  const { postId } = await context.params;
  const url = new URL(request.url);
  const sortParse = commentSortSchema.safeParse(url.searchParams.get("sort") ?? "likes");
  if (!sortParse.success) {
    return NextResponse.json({ error: "Invalid sort option" }, { status: 400 });
  }

  const supabaseUser = await getRequestSupabaseUser(request);
  const currentUser = supabaseUser ? await getPublicAppUserBySupabaseId(supabaseUser.id) : null;
  const comments = await listCommentsForPost(postId, currentUser?.id ?? null, sortParse.data);
  return NextResponse.json({ comments });
}

export async function POST(request: Request, context: { params: Promise<{ postId: string }> }) {
  const { postId } = await context.params;
  const supabaseUser = await getRequestSupabaseUser(request);
  if (!supabaseUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await canCommentOnPost(postId))) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parse = createCommentSchema.safeParse(payload);
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.flatten().fieldErrors }, { status: 400 });
  }

  const publicUser = await ensurePublicAppUser(supabaseUser);
  await createCommentRecord(postId, publicUser.id, parse.data.content, parse.data.parentId ?? null);
  const comments = await listCommentsForPost(postId, publicUser.id, "newest");
  return NextResponse.json({ comments }, { status: 201 });
}
