import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { getRequestSupabaseUser } from "@/lib/supabase/server";
import { uploadAvatarImage, validateUploadedImage } from "@/lib/cloudinary/uploads";
import { ensurePublicAppUser } from "@/server/auth/public-users";
import { updateProfileFields } from "@/server/dal/profiles";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request): Promise<NextResponse> {
  const supabaseUser = await getRequestSupabaseUser(request);
  if (!supabaseUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`account-avatar:${supabaseUser.id}:${getClientIp(request)}`, 10, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
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

  try {
    await validateUploadedImage(file, {
      allowedTypes: ALLOWED_TYPES,
      maxBytes: MAX_BYTES,
    });

    const { imageUrl } = await uploadAvatarImage(file);
    const appUser = await ensurePublicAppUser(supabaseUser);
    await updateProfileFields(appUser.id, { avatarUrl: imageUrl });
    return NextResponse.json({ avatarUrl: imageUrl }, { status: 201 });
  } catch (error) {
    console.error("[avatar upload]", error);
    if (error instanceof Error) {
      if (error.message === "Only JPEG, PNG, WebP, or GIF images are allowed" || error.message === "Image must be under 5 MB" || error.message === "Uploaded file content does not match a supported image format") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    const status = error instanceof Error && error.message.includes("not configured") ? 503 : 500;
    const safeMessage = status === 503 ? "Upload service unavailable" : "Upload failed";
    return NextResponse.json({ error: safeMessage }, { status });
  }
}
