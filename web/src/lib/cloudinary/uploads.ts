import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";

import { getCloudinaryConfig } from "@/lib/cloudinary/server";
import { type CloudinaryRawExif, parseCloudinaryExif } from "@/lib/cloudinary/exif";

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
  image_metadata: z
    .object({
      DateTimeOriginal: z.string().optional(),
      GPSLatitude: z.string().optional(),
      GPSLatitudeRef: z.string().optional(),
      GPSLongitude: z.string().optional(),
      GPSLongitudeRef: z.string().optional(),
      Make: z.string().optional(),
      Model: z.string().optional(),
      LensModel: z.string().optional(),
      FNumber: z.string().optional(),
      ExposureTime: z.string().optional(),
      ISOSpeedRatings: z.union([z.string(), z.number(), z.array(z.number())]).optional(),
    })
    .optional(),
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
  // image_metadata=1 must be included in the signature string (sorted alphabetically with other params)
  const signature = createHash("sha1")
    .update(`folder=${folder}&image_metadata=1&timestamp=${timestamp}${config.apiSecret}`)
    .digest("hex");

  const uploadFormData = new FormData();
  uploadFormData.append("file", file);
  uploadFormData.append("api_key", config.apiKey);
  uploadFormData.append("timestamp", String(timestamp));
  uploadFormData.append("folder", folder);
  uploadFormData.append("image_metadata", "1");
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
  const exif = parseCloudinaryExif(payload.image_metadata as CloudinaryRawExif | undefined);

  return {
    provider: "cloudinary",
    cloudName: config.cloudName,
    imageUrl: payload.secure_url,
    publicId: payload.public_id,
    format: payload.format ?? null,
    width: payload.width ?? null,
    height: payload.height ?? null,
    bytes: payload.bytes ?? null,
    exif,
  };
}
