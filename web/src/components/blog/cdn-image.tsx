"use client";

import Image, { type ImageProps } from "next/image";

import { cdnImageLoader } from "@/lib/cloudinary/transform";

type CdnImageProps = Omit<ImageProps, "loader">;

/**
 * Client boundary for images.
 *
 * `next/image` is a Client Component, so a `loader` function cannot be passed
 * from a Server Component (React throws "Functions cannot be passed directly to
 * Client Components"). This wrapper owns the function and only uses the
 * Cloudinary loader for Cloudinary sources; local/other images keep Next's
 * default optimizer.
 */
export function CdnImage({ src, ...props }: CdnImageProps) {
  const useCloudinaryLoader =
    typeof src === "string" && src.includes("res.cloudinary.com");

  return (
    <Image
      {...props}
      loader={useCloudinaryLoader ? cdnImageLoader : undefined}
      src={src}
    />
  );
}
