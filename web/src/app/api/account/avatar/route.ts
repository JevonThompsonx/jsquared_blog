import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { rejectCrossSiteMutation } from "@/lib/auth/csrf";
import { getRequestPublicUser } from "@/server/auth/public-users";
import { validateUploadedImage } from "@/lib/cloudinary/uploads";
import { saveLocalImage } from "@/lib/media/local-storage";
import { getProfileByUserId, updateProfileFields } from "@/server/dal/profiles";
import { deleteLocalMediaIfUnreferenced } from "@/server/media/cleanup";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request): Promise<NextResponse> {
  const crossSite = rejectCrossSiteMutation(request);
  if (crossSite) return crossSite;

  const appUser = await getRequestPublicUser(request);
  if (!appUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(
    `account-avatar:${appUser.id}:${getClientIp(request)}`,
    10,
    60_000,
  );
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
    return NextResponse.json(
      { error: "Image file is required" },
      { status: 400 },
    );
  }

  try {
    await validateUploadedImage(file, {
      allowedTypes: ALLOWED_TYPES,
      maxBytes: MAX_BYTES,
    });

    const { imageUrl } = await saveLocalImage(file, { kind: "avatar" });
    const previous = await getProfileByUserId(appUser.id);
    await updateProfileFields(appUser.id, { avatarUrl: imageUrl });

    if (previous?.avatarUrl?.startsWith("/media/")) {
      try {
        await deleteLocalMediaIfUnreferenced(
          previous.avatarUrl.slice("/media/".length),
        );
      } catch (error) {
        console.error(
          "[avatar upload] Failed to delete previous avatar",
          error,
        );
      }
    }

    return NextResponse.json({ avatarUrl: imageUrl }, { status: 201 });
  } catch (error) {
    console.error("[avatar upload]", error);
    if (error instanceof Error) {
      if (
        error.message === "Only JPEG, PNG, WebP, or GIF images are allowed" ||
        error.message === "Image must be under 5 MB" ||
        error.message ===
          "Uploaded file content does not match a supported image format"
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    const errorCode =
      error && typeof error === "object" && "code" in error
        ? String((error as NodeJS.ErrnoException).code)
        : "";
    const storageUnavailable =
      (error instanceof Error && error.message.includes("not configured")) ||
      ["EACCES", "ENOSPC", "EROFS", "EMFILE"].includes(errorCode);
    const status = storageUnavailable ? 503 : 500;
    const safeMessage =
      status === 503 ? "Upload service unavailable" : "Upload failed";
    return NextResponse.json({ error: safeMessage }, { status });
  }
}
