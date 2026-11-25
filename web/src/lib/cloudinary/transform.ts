/**
 * Cloudinary delivery helpers.
 *
 * f_auto → delivers WebP/AVIF based on the browser's Accept header
 * q_auto → lets Cloudinary pick the optimal quality level for the image
 * w_<n>  → resizes at the CDN instead of shipping the full-size original
 * c_limit → never upscales and preserves aspect ratio
 *
 * All helpers are pure and safe to call on non-Cloudinary URLs — those are
 * returned unchanged.
 */

const CLOUDINARY_HOST = "res.cloudinary.com";
const CLOUDINARY_UPLOAD_MARKER = "/image/upload/";

type CloudinaryParts = {
  /** Everything up to and including `/image/upload/`. */
  head: string;
  /** Existing transformation tokens, or null when the URL has none. */
  transforms: string[] | null;
  /** Everything after the transformation segment (version + public id). */
  rest: string;
};

function parseCloudinaryUploadUrl(url: string): CloudinaryParts | null {
  if (!url.includes(CLOUDINARY_HOST)) {
    return null;
  }

  const markerIndex = url.indexOf(CLOUDINARY_UPLOAD_MARKER);
  if (markerIndex === -1) {
    return null;
  }

  const head = url.slice(0, markerIndex + CLOUDINARY_UPLOAD_MARKER.length);
  const tail = url.slice(head.length);
  const slashIndex = tail.indexOf("/");

  if (slashIndex === -1) {
    return { head, transforms: null, rest: tail };
  }

  const firstSegment = tail.slice(0, slashIndex);

  if (isTransformationSegment(firstSegment)) {
    return {
      head,
      transforms: firstSegment.split(","),
      rest: tail.slice(slashIndex + 1),
    };
  }

  return { head, transforms: null, rest: tail };
}

/**
 * Distinguishes a transformation segment from a version (`v1234`) or a public
 * id. Public ids may contain underscores, so a dot (file extension) or a
 * segment whose prefix is not a known Cloudinary parameter disqualifies it.
 */
const TRANSFORM_PARAM_PREFIXES = new Set([
  "a",
  "ac",
  "ar",
  "b",
  "bo",
  "c",
  "co",
  "d",
  "dn",
  "dpr",
  "du",
  "e",
  "f",
  "fl",
  "fn",
  "g",
  "h",
  "if",
  "l",
  "o",
  "p",
  "q",
  "r",
  "so",
  "t",
  "u",
  "vc",
  "vs",
  "w",
  "x",
  "y",
  "z",
]);

function isTransformationSegment(segment: string): boolean {
  if (!segment || segment.includes(".")) {
    return false;
  }

  if (/^v\d+$/.test(segment)) {
    return false;
  }

  if (segment.includes(",")) {
    return true;
  }

  const prefix = segment.split("_")[0]?.toLowerCase() ?? "";
  return TRANSFORM_PARAM_PREFIXES.has(prefix);
}

function serialiseCloudinaryUrl(
  parts: CloudinaryParts,
  tokens: string[],
): string {
  if (tokens.length === 0) {
    return `${parts.head}${parts.rest}`;
  }

  return `${parts.head}${tokens.join(",")}/${parts.rest}`;
}

function withWidthTokens(
  existing: string[],
  width: number,
  addForceStrip: boolean,
): string[] {
  const keys = new Set(existing.map((token) => token.split("_")[0]));
  const tokens = [
    `w_${width}`,
    ...existing.filter((token) => token.split("_")[0] !== "w"),
  ];

  if (!keys.has("c")) {
    tokens.push("c_limit");
  }
  if (!keys.has("f")) {
    tokens.push("f_auto");
  }
  if (!keys.has("q")) {
    tokens.push("q_auto");
  }

  return addForceStrip ? withForceStrip(tokens) : tokens;
}

/**
 * Cloudinary flag that clears embedded IPTC/Exif/XMP metadata. Flags can be
 * chained with dots (`fl_progressive.force_strip`), so merge instead of adding
 * a second `fl_` parameter that Cloudinary would treat as a replacement.
 */
const FORCE_STRIP_FLAG = "force_strip";

function hasForceStrip(url: string): boolean {
  return /(?:^|[,/])fl_(?:[^.]+\.)*force_strip(?:[.,/]|$)/i.test(url);
}

function withForceStrip(tokens: string[]): string[] {
  const flagIndex = tokens.findIndex((token) => token.startsWith("fl_"));

  if (flagIndex === -1) {
    return [...tokens, `fl_${FORCE_STRIP_FLAG}`];
  }

  const flags = tokens[flagIndex].slice(3).split(".");
  if (flags.includes(FORCE_STRIP_FLAG)) {
    return tokens;
  }

  const updated = [...tokens];
  updated[flagIndex] = `fl_${[...flags, FORCE_STRIP_FLAG].join(".")}`;
  return updated;
}

function normaliseWidth(width: number): number {
  return Math.max(1, Math.round(width));
}

/**
 * Applies width-aware, automatic format/quality, and metadata-stripping
 * transformations to a stored URL.
 *
 * - `cdnImageUrl(url)` keeps the legacy shape: `f_auto,q_auto,fl_force_strip`
 *   is added once; URLs that already carry `f_auto`/`q_auto` get the strip flag
 *   merged into their existing transformation segment (and are returned as-is
 *   when it is already present).
 * - `cdnImageUrl(url, width)` merges `w_<width>,c_limit` into the existing
 *   transformation segment (or adds a new one), replacing any width already in
 *   the URL so repeated calls are idempotent. `fl_force_strip` is merged into
 *   an existing `fl_` flag or added, never duplicated.
 */
export function cdnImageUrl(url: string | null, width?: number): string | null {
  if (!url) return null;

  const parts = parseCloudinaryUploadUrl(url);
  if (!parts) return url;

  if (width === undefined) {
    if (!parts.transforms) {
      return serialiseCloudinaryUrl(parts, [
        "f_auto",
        "q_auto",
        `fl_${FORCE_STRIP_FLAG}`,
      ]);
    }

    const alreadyAutomatic = parts.transforms.some(
      (token) => token.startsWith("f_") || token.startsWith("q_"),
    );

    if (alreadyAutomatic) {
      if (hasForceStrip(url)) {
        return url;
      }

      return serialiseCloudinaryUrl(parts, withForceStrip(parts.transforms));
    }

    // Preserve the historical shape: a separate f_auto,q_auto segment in front
    // of transforms that were stored without it.
    const prefix = hasForceStrip(url)
      ? ["f_auto", "q_auto"]
      : ["f_auto", "q_auto", `fl_${FORCE_STRIP_FLAG}`];
    return `${parts.head}${prefix.join(",")}/${parts.transforms.join(",")}/${parts.rest}`;
  }

  const tokens = withWidthTokens(
    parts.transforms ?? [],
    normaliseWidth(width),
    !hasForceStrip(url),
  );
  return serialiseCloudinaryUrl(parts, tokens);
}

/**
 * Builds a width-descriptor `srcSet` for Cloudinary URLs. Returns `undefined`
 * for non-Cloudinary URLs (or when no usable width is supplied) so callers can
 * fall back to a plain `src`.
 */
export function cdnImageSrcSet(
  url: string | null,
  widths: readonly number[],
): string | undefined {
  if (!url || !parseCloudinaryUploadUrl(url)) {
    return undefined;
  }

  const uniqueWidths = Array.from(
    new Set(
      widths
        .filter((width) => Number.isFinite(width) && width > 0)
        .map(normaliseWidth),
    ),
  ).sort((a, b) => a - b);

  const entries = uniqueWidths
    .map((width) => {
      const variant = cdnImageUrl(url, width);
      return variant ? `${variant} ${width}w` : null;
    })
    .filter((entry): entry is string => entry !== null);

  return entries.length > 0 ? entries.join(", ") : undefined;
}

/**
 * `next/image` loader that keeps the width contract while pointing every
 * candidate at Cloudinary instead of the Next image optimizer (which redirects
 * to the full-size original in this deployment).
 */
export function cdnImageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
}): string {
  // Local media lives on this origin, so it goes through Next's optimizer
  // instead of Cloudinary. Without this, every width descriptor points at the
  // same full-size file.
  if (LOCAL_MEDIA_PATH_PATTERN.test(src)) {
    return localOptimizedImageUrl(src, width);
  }

  return cdnImageUrl(src, width) ?? src;
}

/**
 * Width/height explicitly encoded in a Cloudinary transformation segment.
 * Returns null unless the URL pins both dimensions.
 */
export function getCloudinaryDimensions(
  url: string | null,
): { width: number; height: number } | null {
  if (!url) return null;

  const parts = parseCloudinaryUploadUrl(url);
  if (!parts?.transforms) return null;

  let width: number | null = null;
  let height: number | null = null;

  for (const token of parts.transforms) {
    if (token.startsWith("w_")) {
      const parsed = Number.parseInt(token.slice(2), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        width = parsed;
      }
    } else if (token.startsWith("h_")) {
      const parsed = Number.parseInt(token.slice(2), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        height = parsed;
      }
    }
  }

  return width !== null && height !== null ? { width, height } : null;
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
 *
 * Works on URLs that already carry width/format transforms: the transformation
 * segment is replaced rather than prefixed, so the blur request never chains a
 * second (potentially upscaling) transformation.
 */
export function cdnBlurDataUrl(url: string | null): string | undefined {
  if (!url) return undefined;

  const parts = parseCloudinaryUploadUrl(url);
  if (!parts) return undefined;

  const blurUrl = serialiseCloudinaryUrl(parts, [
    "w_10",
    "e_blur:1000",
    "f_auto",
    "q_auto",
    `fl_${FORCE_STRIP_FLAG}`,
  ]);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><image href="${escapeSvgAttribute(blurUrl)}" width="100" height="100" preserveAspectRatio="none"/></svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;

/**
 * Builds a fixed 1200×630 JPEG social/OG derivative from a Cloudinary upload.
 *
 * Replaces any transformation segment already present (e.g. the delivery
 * `f_auto,q_auto,fl_force_strip` added by cdnImageUrl) instead of chaining a
 * second segment, so the declared dimensions and `image/jpeg` type match what
 * Cloudinary actually delivers. Returns null for non-Cloudinary URLs, whose
 * intrinsic dimensions cannot be guaranteed.
 */
export function cdnSocialImageUrl(url: string | null): string | null {
  if (!url) return null;

  // Self-hosted media gets a fixed-size JPEG derivative from the app, so the
  // declared 1200×630 dimensions are guaranteed regardless of the source.
  if (
    /^\/media\/[A-Za-z0-9][A-Za-z0-9/_.-]*\.(?:avif|gif|jpe?g|png|webp)$/.test(
      url,
    )
  ) {
    return `/api/og-image/${url.slice("/media/".length)}`;
  }

  const parts = parseCloudinaryUploadUrl(url);
  if (!parts) return null;

  return serialiseCloudinaryUrl(parts, [
    "c_fill",
    `w_${SOCIAL_IMAGE_WIDTH}`,
    `h_${SOCIAL_IMAGE_HEIGHT}`,
    "f_jpg",
    "q_auto",
    `fl_${FORCE_STRIP_FLAG}`,
  ]);
}

const PROSE_IMAGE_WIDTH = 1200;
const PROSE_IMAGE_SRCSET_WIDTHS = [600, 1200] as const;
const PROSE_IMAGE_SIZES = "(max-width: 768px) 100vw, 680px";

/**
 * Local media paths (`/media/yyyy/mm/hash-slug.webp`) are served by the app's
 * own image optimizer. Only widths Next.js knows about are accepted by
 * `/_next/image`, so this list must stay a subset of `deviceSizes`.
 */
const LOCAL_MEDIA_PATH_PATTERN =
  /^\/media\/[A-Za-z0-9][A-Za-z0-9/_-]*\.(?:avif|gif|jpe?g|png|webp)$/;
const LOCAL_PROSE_SRCSET_WIDTHS = [640, 1080, 1200] as const;

function localOptimizedImageUrl(src: string, width: number): string {
  const params = new URLSearchParams({ url: src, w: String(width), q: "75" });
  return `/_next/image?${params.toString()}`;
}

function localImageSrcSet(src: string): string | undefined {
  if (!LOCAL_MEDIA_PATH_PATTERN.test(src)) {
    return undefined;
  }

  return LOCAL_PROSE_SRCSET_WIDTHS.map(
    (width) => `${localOptimizedImageUrl(src, width)} ${width}w`,
  ).join(", ");
}
const IMG_TAG_PATTERN = /<img\b[^>]*>/gi;
const SRC_ATTRIBUTE_PATTERN = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
const GALLERY_INDEX_ATTRIBUTE_PATTERN = /\sdata-gallery-idx(?=[\s=/>])/i;

function hasAttribute(tag: string, name: string): boolean {
  return new RegExp(`\\s${name}(?=[\\s=/>])`, "i").test(tag);
}

function addAttributes(tag: string, attributes: string): string {
  const selfClosing = /\/\s*>$/.test(tag);
  const closing = selfClosing ? "/>" : ">";
  const body = tag.slice(0, tag.length - closing.length).replace(/\s+$/, "");
  return `${body} ${attributes}${selfClosing ? " />" : ">"}`;
}

function ensureAttribute(tag: string, name: string, value: string): string {
  return hasAttribute(tag, name)
    ? tag
    : addAttributes(tag, `${name}="${value}"`);
}

function enhanceProseImageTag(tag: string): string {
  const srcMatch = SRC_ATTRIBUTE_PATTERN.exec(tag);
  if (!srcMatch) return tag;

  const rawSrc = srcMatch[1] ?? srcMatch[2] ?? "";
  if (!rawSrc) return tag;

  let enhanced = tag;
  const displayUrl = cdnImageUrl(rawSrc, PROSE_IMAGE_WIDTH);

  if (displayUrl && displayUrl !== rawSrc) {
    enhanced = enhanced.replace(srcMatch[0], ` src="${displayUrl}"`);
  }

  const dimensions = displayUrl ? getCloudinaryDimensions(displayUrl) : null;
  if (dimensions) {
    enhanced = ensureAttribute(enhanced, "width", String(dimensions.width));
    enhanced = ensureAttribute(enhanced, "height", String(dimensions.height));
  }

  enhanced = ensureAttribute(enhanced, "loading", "lazy");
  enhanced = ensureAttribute(enhanced, "decoding", "async");

  const srcSet = displayUrl
    ? (cdnImageSrcSet(displayUrl, PROSE_IMAGE_SRCSET_WIDTHS) ??
      localImageSrcSet(rawSrc))
    : localImageSrcSet(rawSrc);
  if (srcSet) {
    enhanced = ensureAttribute(enhanced, "srcset", srcSet);
    enhanced = ensureAttribute(enhanced, "sizes", PROSE_IMAGE_SIZES);
  }

  // Only gallery-bound images (data-gallery-idx is added server-side after
  // sanitisation) get button semantics; otherwise a keyboard "button" would
  // point at nothing.
  if (GALLERY_INDEX_ATTRIBUTE_PATTERN.test(enhanced)) {
    enhanced = ensureAttribute(enhanced, "tabindex", "0");
    enhanced = ensureAttribute(enhanced, "role", "button");
    enhanced = ensureAttribute(enhanced, "aria-label", "Open image in gallery");
  }

  return enhanced;
}

/**
 * Rewrites `<img>` tags in sanitized prose HTML so they are CDN-resized,
 * responsive, lazy, and keyboard-operable without touching any attributes the
 * editor already stored. Pure string transform — no DOM required, so it runs
 * identically during SSR and hydration.
 */
export function enhanceProseImagesHtml(html: string): string {
  if (!html.includes("<img")) {
    return html;
  }

  return html.replace(IMG_TAG_PATTERN, enhanceProseImageTag);
}
