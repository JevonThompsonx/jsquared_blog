import type { Metadata } from "next";

import { cdnSocialImageUrl } from "@/lib/cloudinary/transform";
import { SITE_URL } from "@/lib/utils";

type Alternates = NonNullable<Metadata["alternates"]>;

export type OgImage = {
  url: string;
  width?: number;
  height?: number;
  type?: string;
  alt?: string;
};

export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Resolves a site-relative path to an absolute URL on the canonical host.
 * Absolute URLs are returned unchanged so callers can pass CDN images safely.
 */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Builds `alternates` for an indexable route. Pass `feedPath` for routes that
 * also expose an RSS feed so the alternate link advertises it.
 */
export function buildAlternates(path: string, feedPath?: string): Alternates {
  const alternates: Alternates = { canonical: absoluteUrl(path) };

  if (feedPath) {
    alternates.types = { "application/rss+xml": absoluteUrl(feedPath) };
  }

  return alternates;
}

function inferImageType(url: string): string {
  const extension = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(url)?.[1]?.toLowerCase();

  return (extension && IMAGE_MIME_BY_EXTENSION[extension]) || "image/jpeg";
}

/**
 * Builds Open Graph image metadata with dimensions and MIME type.
 *
 * Cloudinary uploads are rewritten to a fixed 1200×630 JPEG derivative so the
 * declared width/height are guaranteed to match the delivered asset. Other
 * hosts keep their original URL and only get a MIME type hint, because their
 * dimensions are unknown.
 */
export function buildOgImage(url: string, alt?: string): OgImage {
  const transformed = cdnSocialImageUrl(url);

  if (transformed) {
    return {
      url: absoluteUrl(transformed),
      width: DEFAULT_OG_IMAGE_WIDTH,
      height: DEFAULT_OG_IMAGE_HEIGHT,
      type: "image/jpeg",
      alt,
    };
  }

  const absolute = absoluteUrl(url);
  return { url: absolute, type: inferImageType(absolute), alt };
}

/**
 * Site-wide default social image for the root layout owner.
 *
 * Served from `/public/images/og-default.jpg` (verified 1200×630 JPEG by the
 * asset workstream), so the declared dimensions match the delivered file.
 */
export function getDefaultOgImage(): OgImage {
  return {
    url: absoluteUrl("/images/og-default.jpg"),
    width: DEFAULT_OG_IMAGE_WIDTH,
    height: DEFAULT_OG_IMAGE_HEIGHT,
    type: "image/jpeg",
    alt: "J²Adventures — travel stories from the road",
  };
}
