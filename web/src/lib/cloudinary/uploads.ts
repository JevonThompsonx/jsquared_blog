import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";

import { getCloudinaryConfig } from "@/lib/cloudinary/server";

const avatarUploadResponseSchema = z.object({
  secure_url: z.string().url(),
});

const editorialUploadResponseSchema = z.object({
  secure_url: z.string().url(),
  public_id: z.string(),
  format: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  bytes: z.number().optional(),
});

export async function uploadAvatarImage(file: File) {
  const config = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "j2adventures/avatars";
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

  const payload = avatarUploadResponseSchema.parse(await response.json());
  return { imageUrl: payload.secure_url };
}

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

  const payload = editorialUploadResponseSchema.parse(await response.json());

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
