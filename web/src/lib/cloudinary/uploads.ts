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

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

const uploadValidationOptionsSchema = z.object({
  allowedTypes: z.array(z.enum(SUPPORTED_IMAGE_TYPES)).nonempty().readonly(),
  maxBytes: z.number().int().positive(),
});

type UploadValidationOptions = z.infer<typeof uploadValidationOptionsSchema>;

function hasPngSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a;
}

function hasJpegSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 3
    && bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[2] === 0xff;
}

function hasGifSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 6) {
    return false;
  }

  const header = String.fromCharCode(...bytes.slice(0, 6));
  return header === "GIF87a" || header === "GIF89a";
}

function hasWebpSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 12) {
    return false;
  }

  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  return riff === "RIFF" && webp === "WEBP";
}

function matchesImageSignature(type: string, bytes: Uint8Array): boolean {
  switch (type) {
    case "image/jpeg":
      return hasJpegSignature(bytes);
    case "image/png":
      return hasPngSignature(bytes);
    case "image/webp":
      return hasWebpSignature(bytes);
    case "image/gif":
      return hasGifSignature(bytes);
    default:
      return false;
  }
}

export async function validateUploadedImage(file: File, options: UploadValidationOptions): Promise<void> {
  const parsedOptions = uploadValidationOptionsSchema.parse(options);

  if (!parsedOptions.allowedTypes.includes(file.type as (typeof SUPPORTED_IMAGE_TYPES)[number])) {
    throw new Error("Only JPEG, PNG, WebP, or GIF images are allowed");
  }

  if (file.size > parsedOptions.maxBytes) {
    const maxMb = parsedOptions.maxBytes / (1024 * 1024);
    throw new Error(`Image must be under ${Number.isInteger(maxMb) ? maxMb : maxMb.toFixed(1)} MB`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesImageSignature(file.type, bytes)) {
    throw new Error("Uploaded file content does not match a supported image format");
  }
}

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
