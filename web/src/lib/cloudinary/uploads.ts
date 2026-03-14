import "server-only";

import { createHash } from "node:crypto";

import { getCloudinaryConfig } from "@/lib/cloudinary/server";

export async function uploadEditorialImage(file: File) {
  const config = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "j2adventures/editorial";
  const signature = createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${config.apiSecret}`)
    .digest("hex");

  const uploadFormData = new FormData();
  uploadFormData.append("file", file);
  uploadFormData.append("api_key", config.apiKey);
  uploadFormData.append("timestamp", String(timestamp));
  uploadFormData.append("folder", folder);
  uploadFormData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
    method: "POST",
    body: uploadFormData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${errorText}`);
  }

  const payload = await response.json() as {
    secure_url: string;
    public_id: string;
    format?: string;
    width?: number;
    height?: number;
    bytes?: number;
  };

  return {
    provider: "cloudinary",
    cloudName: config.cloudName,
    imageUrl: payload.secure_url,
    publicId: payload.public_id,
    format: payload.format ?? null,
    width: payload.width ?? null,
    height: payload.height ?? null,
    bytes: payload.bytes ?? null,
  };
}
