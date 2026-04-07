import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { requireAdminSession } from "@/lib/auth/session";
import { uploadEditorialImage, validateUploadedImage } from "@/lib/cloudinary/uploads";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`admin-upload-image:${session.user.id}:${getClientIp(request)}`, 20, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  try {
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    await validateUploadedImage(file, {
      allowedTypes: ALLOWED_TYPES,
      maxBytes: MAX_BYTES,
    });

    const upload = await uploadEditorialImage(file);

    return NextResponse.json(upload, { status: 201 });
  } catch (error) {
    console.error("[api/admin/uploads/images] Upload failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    if (error instanceof Error) {
      if (error.message === "Only JPEG, PNG, WebP, or GIF images are allowed" || error.message === "Image must be under 10 MB" || error.message === "Uploaded file content does not match a supported image format") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    const status = error instanceof Error && error.message.includes("not configured") ? 503 : 500;
    const safeMessage = status === 503 ? "Upload service unavailable" : "Upload failed";
    return NextResponse.json({ error: safeMessage }, { status });
  }
}
