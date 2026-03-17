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

function escapeSvgAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Generates a base64-encoded SVG data URI that loads a tiny, heavily blurred
 * version of the image from Cloudinary to use as a real image blur placeholder
 * for Next.js <Image blurDataURL={...} />.
 */
export function cdnBlurDataUrl(url: string | null): string | undefined {
  if (!url || !url.includes("res.cloudinary.com")) return undefined;

  // Generate a very small, heavily blurred version of the image
  const blurUrl = url.replace("/upload/", "/upload/w_10,e_blur:1000,f_auto,q_auto/");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><image href="${escapeSvgAttribute(blurUrl)}" width="100" height="100" preserveAspectRatio="none"/></svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
