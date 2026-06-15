import "server-only";

import { createHash } from "node:crypto";

import { getCloudinaryConfig } from "@/lib/cloudinary/server";
import { captureException } from "@/lib/sentry";

export type CloudinaryDestroyTarget = {
  publicId: string;
  resourceType: "image" | "video";
};

const CLOUDINARY_DESTROY_PATH = "/image/destroy";

function buildSignature(params: Record<string, string>, apiSecret: string): string {
  const sorted = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join("&");
  return createHash("sha1").update(`${sorted}${apiSecret}`).digest("hex");
}

export async function destroyCloudinaryAsset(target: CloudinaryDestroyTarget): Promise<void> {
  const config = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    public_id: target.publicId,
    timestamp: String(timestamp),
  };
  const signature = buildSignature(params, config.apiSecret);

  const formData = new FormData();
  formData.append("public_id", target.publicId);
  formData.append("api_key", config.apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}${CLOUDINARY_DESTROY_PATH}`,
    { method: "POST", body: formData },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary destroy failed: ${errorText}`);
  }
}

export function logCloudinaryCleanupError(asset: CloudinaryDestroyTarget, error: unknown): void {
  captureException(error, {
    component: "posts.delete",
    cloudinaryPublicId: asset.publicId,
    cloudinaryResourceType: asset.resourceType,
  });
  console.error(
    `[posts.delete] Failed to destroy cloudinary asset ${asset.publicId} (${asset.resourceType})`,
    error,
  );
}
