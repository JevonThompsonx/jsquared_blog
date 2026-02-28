import { supabase, supabaseAnonKey, supabaseUrl } from "../supabase";

const BUCKET_NAME = "jsquared_blog";

/**
 * Upload an image directly to Supabase Storage from the client.
 * Bypasses the Cloudflare Worker which has body size limitations.
 */
export async function uploadImageToStorage(
  file: File,
  accessToken?: string
): Promise<string> {
  console.log("Starting uploadImageToStorage for:", file.name);

  let token = accessToken;

  if (!token) {
    // Verify we have an authenticated session before upload
    console.log("Checking session...");
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Session error:", sessionError);
      throw new Error(`Authentication error: ${sessionError.message}`);
    }

    let session = sessionData.session;
    if (!session) {
      console.warn("No active session found, attempting refresh...");
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error("Session refresh error:", refreshError);
        throw new Error(`Authentication error: ${refreshError.message}`);
      }
      session = refreshData.session ?? null;
    }

    if (!session) {
      console.error("No active session found for storage upload");
      throw new Error("You must be logged in to upload images. Please refresh the page and try again.");
    }

    token = session.access_token;
    console.log("Session valid, proceeding with upload. User:", session.user.email);
  }

  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const extension = file.name.split(".").pop() || "webp";
  const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "_");
  const uniqueFileName = `${timestamp}-${baseName}.${extension}`;

  console.log(`Uploading to bucket '${BUCKET_NAME}' as '${uniqueFileName}' (${(file.size / 1024).toFixed(0)}KB)`);

  // Create a timeout promise to prevent hanging indefinitely
  const timeoutMs = 60000; // 60 second timeout
  const uploadPromise = fetch(
    `${supabaseUrl}/storage/v1/object/${BUCKET_NAME}/${encodeURIComponent(uniqueFileName)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false",
      },
      body: file,
    }
  ).then(async (response) => {
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Upload failed with status ${response.status}`);
    }
    return null;
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Upload timed out after ${timeoutMs / 1000} seconds. Check your Supabase Storage bucket permissions.`)), timeoutMs);
  });

  try {
    await Promise.race([uploadPromise, timeoutPromise]);
  } catch (error: unknown) {
    console.error("Supabase Storage upload error:", error);
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`);
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- return value is raw JSON from the API with no shared type definition
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- return value is raw JSON from the API with no shared type definition
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- return value is raw JSON from the API with no shared type definition
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
