/**
 * Applies Cloudinary automatic format + quality transformations to a stored URL.
 *
 * f_auto → delivers WebP/AVIF based on the browser's Accept header
 * q_auto → lets Cloudinary pick the optimal quality level for the image
 *
 * Safe to call on non-Cloudinary URLs or URLs that already have transformations —
 * those are returned unchanged.
 */
export function cdnImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (!url.includes("res.cloudinary.com")) return url;
  // Already transformed — don't double-apply
  if (url.includes("f_auto") || url.includes("q_auto")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
}
