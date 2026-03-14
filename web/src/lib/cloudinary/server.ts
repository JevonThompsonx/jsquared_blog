import "server-only";

import { getServerEnv } from "@/lib/env";

function normalizeCloudName(value: string): string {
  const trimmedValue = value.trim();

  if (trimmedValue.startsWith("cloudinary://")) {
    const match = trimmedValue.match(/@([^/?#]+)/);
    if (match?.[1]) {
      return match[1].trim().toLowerCase();
    }
  }

  return trimmedValue.toLowerCase();
}

export function getCloudinaryConfig() {
  const env = getServerEnv();

  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary is not configured yet.");
  }

  return {
    cloudName: normalizeCloudName(env.CLOUDINARY_CLOUD_NAME),
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  };
}
