import { NextResponse } from "next/server";

import { cdnImageUrl } from "@/lib/cloudinary/transform";
import { getRequestSupabaseUser } from "@/lib/supabase/server";
import { ensurePublicAppUser } from "@/server/auth/public-users";
import { listBookmarkedPosts } from "@/server/dal/bookmarks";

export async function GET(request: Request) {
  const supabaseUser = await getRequestSupabaseUser(request);
  if (!supabaseUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const publicUser = await ensurePublicAppUser(supabaseUser);
  const rawPosts = await listBookmarkedPosts(publicUser.id);
  const posts = rawPosts.map((post) => ({
    ...post,
    imageUrl: cdnImageUrl(post.imageUrl),
  }));
  return NextResponse.json({ posts });
}
