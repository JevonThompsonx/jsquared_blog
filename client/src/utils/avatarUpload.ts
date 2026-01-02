import { supabase } from "../supabase";
import imageCompression from "browser-image-compression";

const BUCKET_NAME = "jsquared_blog";
const AVATAR_PREFIX = "avatars/";

// Compression options for avatars (smaller than regular images)
const avatarCompressionOptions = {
  maxSizeMB: 0.1, // 100KB max for avatars
  maxWidthOrHeight: 256,
  useWebWorker: true,
  fileType: "image/webp" as const,
  initialQuality: 0.85,
};

/**
 * Upload an avatar image to Supabase Storage.
 * Compresses the image and stores it in the avatars/ folder.
 */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  console.log("Starting avatar upload for user:", userId);

  // Verify session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error("You must be logged in to upload an avatar.");
  }

  // Compress the image
  console.log(`Compressing avatar: ${(file.size / 1024).toFixed(0)}KB`);
  const compressedFile = await imageCompression(file, avatarCompressionOptions);
  console.log(`Compressed to: ${(compressedFile.size / 1024).toFixed(0)}KB`);

  // Generate unique filename
  const timestamp = Date.now();
  const fileName = `${AVATAR_PREFIX}${userId}-${timestamp}.webp`;

  console.log(`Uploading avatar to '${fileName}'`);

  // Upload to storage (upsert to replace old avatars)
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, compressedFile, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadError) {
    console.error("Avatar upload error:", uploadError);
    throw new Error(`Failed to upload avatar: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  console.log("Avatar uploaded:", urlData.publicUrl);

  return urlData.publicUrl;
}

/**
 * Delete an old avatar from Supabase Storage.
 * Only deletes if the URL is from our storage bucket.
 */
export async function deleteOldAvatar(avatarUrl: string): Promise<void> {
  if (!avatarUrl.includes(BUCKET_NAME)) return; // Not a Supabase URL
  if (!avatarUrl.includes(AVATAR_PREFIX)) return; // Not an avatar

  // Extract filename from URL
  const urlParts = avatarUrl.split("/");
  const fileIndex = urlParts.findIndex((part) => part === BUCKET_NAME);
  if (fileIndex === -1) return;

  const filePath = urlParts.slice(fileIndex + 1).join("/");

  console.log("Deleting old avatar:", filePath);

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

  if (error) {
    console.error("Failed to delete old avatar:", error);
    // Don't throw - deletion failure shouldn't block new avatar upload
  }
}
