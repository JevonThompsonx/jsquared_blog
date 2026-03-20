import { NextResponse } from "next/server";

import { getRequestSupabaseUser } from "@/lib/supabase/server";
import { uploadAvatarImage } from "@/lib/cloudinary/uploads";
import { ensurePublicAppUser } from "@/server/auth/public-users";
import { updateProfileFields } from "@/server/dal/profiles";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request): Promise<NextResponse> {
  const supabaseUser = await getRequestSupabaseUser(request);
  if (!supabaseUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, or GIF images are allowed" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
  }

  try {
    const { imageUrl } = await uploadAvatarImage(file);
    const appUser = await ensurePublicAppUser(supabaseUser);
    await updateProfileFields(appUser.id, { avatarUrl: imageUrl });
    return NextResponse.json({ avatarUrl: imageUrl }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("[avatar upload]", message);
    const status = message.includes("not configured") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
