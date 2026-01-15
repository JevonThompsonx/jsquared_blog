import { supabase } from "../supabase";

const BUCKET_NAME = "jsquared_blog";

/**
 * Upload an image directly to Supabase Storage from the client.
 * Bypasses the Cloudflare Worker which has body size limitations.
 */
export async function uploadImageToStorage(file: File): Promise<string> {
  console.log("Starting uploadImageToStorage for:", file.name);

  // First, verify we have an authenticated session (with timeout)
  console.log("Checking session...");

  const sessionPromise = supabase.auth.getSession();
  const sessionTimeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Session check timed out. Please refresh the page.")), 10000);
  });

  let session;
  try {
    const result = await Promise.race([sessionPromise, sessionTimeout]);
    session = result.data?.session;
    if (result.error) {
      console.error("Session error:", result.error);
      throw new Error(`Authentication error: ${result.error.message}`);
    }
  } catch (err: any) {
    console.error("Session check failed:", err);
    throw err;
  }

  if (!session) {
    console.error("No active session found for storage upload");
    throw new Error("You must be logged in to upload images. Please refresh the page and try again.");
  }

  console.log("Session valid, proceeding with upload. User:", session.user.email);

  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const extension = file.name.split(".").pop() || "webp";
  const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "_");
  const uniqueFileName = `${timestamp}-${baseName}.${extension}`;

  console.log(`Uploading to bucket '${BUCKET_NAME}' as '${uniqueFileName}' (${(file.size / 1024).toFixed(0)}KB)`);

  // Create a timeout promise to prevent hanging indefinitely
  const timeoutMs = 60000; // 60 second timeout
  const uploadPromise = supabase.storage
    .from(BUCKET_NAME)
    .upload(uniqueFileName, file, {
      contentType: file.type,
      upsert: false,
    });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Upload timed out after ${timeoutMs / 1000} seconds. Check your Supabase Storage bucket permissions.`)), timeoutMs);
  });

  const { error } = await Promise.race([uploadPromise, timeoutPromise]);

  if (error) {
    console.error("Supabase Storage upload error:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  console.log("Upload successful, getting public URL...");

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(uniqueFileName);

  console.log("Public URL:", urlData.publicUrl);

  return urlData.publicUrl;
}

/**
 * Delete an image from Supabase Storage.
 */
export async function deleteImageFromStorage(imageUrl: string): Promise<void> {
  // Extract filename from URL
  const urlParts = imageUrl.split("/");
  const fileName = urlParts[urlParts.length - 1];

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([fileName]);

  if (error) {
    console.error("Supabase Storage delete error:", error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

/**
 * Add an image record to the post_images table.
 * If sortOrder is not provided, the server will assign the next available order.
 */
export async function addImageRecord(
  postId: number,
  imageUrl: string,
  token: string,
  sortOrder?: number,
  focalPoint?: string,
  altText?: string
): Promise<any> {
  const body: { image_url: string; sort_order?: number; focal_point?: string; alt_text?: string } = { image_url: imageUrl };
  if (sortOrder !== undefined) {
    body.sort_order = sortOrder;
  }
  if (focalPoint) {
    body.focal_point = focalPoint;
  }
  if (altText) {
    body.alt_text = altText;
  }

  const response = await fetch(`/api/posts/${postId}/images/record`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to add image record");
  }

  return response.json();
}

/**
 * Update the focal point of an existing image.
 */
export async function updateImageFocalPoint(
  postId: number,
  imageId: number,
  focalPoint: string,
  token: string
): Promise<any> {
  const response = await fetch(`/api/posts/${postId}/images/${imageId}/focal-point`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ focal_point: focalPoint }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to update focal point");
  }

  return response.json();
}

/**
 * Update the alt text of an existing image.
 */
export async function updateImageAltText(
  postId: number,
  imageId: number,
  altText: string,
  token: string
): Promise<any> {
  const response = await fetch(`/api/posts/${postId}/images/${imageId}/alt-text`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ alt_text: altText }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to update alt text");
  }

  return response.json();
}
