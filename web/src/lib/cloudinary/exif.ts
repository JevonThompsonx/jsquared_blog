import "server-only";

/**
 * Parsed EXIF data extracted from a Cloudinary upload response.
 * All fields are nullable — most images (screenshots, generated) have no EXIF.
 */
export type ParsedExif = {
  takenAt: Date | null;
  lat: number | null;
  lng: number | null;
  cameraMake: string | null;
  cameraModel: string | null;
  lensModel: string | null;
  aperture: number | null;
  shutterSpeed: string | null;
  iso: number | null;
};

/**
 * Raw EXIF shape returned by Cloudinary when `image_metadata=1` is requested.
 * Fields are present only when the image carries EXIF; all are optional strings
 * (Cloudinary serialises everything as strings in the `image_metadata` object).
 */
export type CloudinaryRawExif = {
  DateTimeOriginal?: string;
  GPSLatitude?: string;
  GPSLatitudeRef?: string;
  GPSLongitude?: string;
  GPSLongitudeRef?: string;
  Make?: string;
  Model?: string;
  LensModel?: string;
  FNumber?: string;
  ExposureTime?: string;
  ISOSpeedRatings?: string | number | number[];
};

// ---------------------------------------------------------------------------
// GPS rational parsing
// ---------------------------------------------------------------------------

/**
 * Parse a GPS rational string such as `"48/1, 51/1, 2880/100"` into decimal
 * degrees.  Returns null if the string is absent or cannot be parsed.
 */
export function parseGpsRational(
  value: string | undefined,
  ref: string | undefined,
): number | null {
  if (!value) return null;

  // Each component is "numerator/denominator"
  const parts = value.split(",").map((s) => s.trim());
  if (parts.length !== 3) return null;

  const components = parts.map((part) => {
    const [num, den] = part.split("/").map(Number);
    if (
      num === undefined ||
      den === undefined ||
      !Number.isFinite(num) ||
      !Number.isFinite(den) ||
      den === 0
    ) {
      return null;
    }
    return num / den;
  });

  if (components.some((c) => c === null)) return null;

  const [degrees, minutes, seconds] = components as [number, number, number];
  const decimal = degrees + minutes / 60 + seconds / 3600;

  // South and West are negative
  const normalizedRef = ref?.trim().toUpperCase();
  if (normalizedRef === "S" || normalizedRef === "W") {
    return -decimal;
  }

  return decimal;
}

// ---------------------------------------------------------------------------
// EXIF datetime parsing
// ---------------------------------------------------------------------------

/**
 * Parse an EXIF datetime string such as `"2024:06:15 14:22:33"` into a Date.
 * Returns null if the string is absent, malformed, or results in an invalid
 * Date (e.g. "0000:00:00 00:00:00").
 */
export function parseExifDatetime(value: string | undefined): Date | null {
  if (!value) return null;

  // Replace the first two colons in the date portion with dashes so that
  // `Date.parse` can handle it: "2024:06:15 14:22:33" → "2024-06-15 14:22:33"
  const normalised = value.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
  const ts = Date.parse(normalised);

  if (Number.isNaN(ts) || ts <= 0) return null;
  return new Date(ts);
}

// ---------------------------------------------------------------------------
// FNumber (aperture) rational parsing
// ---------------------------------------------------------------------------

/**
 * Parse an FNumber string such as `"28/10"` or `"2.8"` into a float.
 * Returns null if the string is absent or cannot be parsed.
 */
export function parseFNumber(value: string | undefined): number | null {
  if (!value) return null;

  if (value.includes("/")) {
    const [num, den] = value.split("/").map(Number);
    if (
      num === undefined ||
      den === undefined ||
      !Number.isFinite(num) ||
      !Number.isFinite(den) ||
      den === 0
    ) {
      return null;
    }
    return num / den;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// ---------------------------------------------------------------------------
// ISO normalisation
// ---------------------------------------------------------------------------

/**
 * Normalise an ISO value that may be a number, a numeric string, or an array
 * (Cloudinary sometimes wraps it in a single-element array).
 * Returns an integer or null.
 */
export function parseIso(
  value: string | number | number[] | undefined,
): number | null {
  if (value === undefined || value === null) return null;

  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) return null;

  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

// ---------------------------------------------------------------------------
// Shutter speed normalisation
// ---------------------------------------------------------------------------

/**
 * Normalise a shutter speed / exposure time value.
 * Cloudinary returns it as a rational string `"1/250"` or a decimal `"0.004"`.
 * We store it as a human-readable string (`"1/250"`) — or convert a decimal to
 * a fraction when it's a "round" reciprocal (e.g. `"0.004"` → `"1/250"`).
 */
export function parseShutterSpeed(value: string | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // Already a fraction
  if (trimmed.includes("/")) {
    const [num, den] = trimmed.split("/").map(Number);
    if (
      num === undefined ||
      den === undefined ||
      !Number.isFinite(num) ||
      !Number.isFinite(den) ||
      den === 0
    ) {
      return null;
    }
    return `${num}/${den}`;
  }

  // Decimal — try to express as 1/N
  const decimal = Number(trimmed);
  if (!Number.isFinite(decimal) || decimal <= 0) return null;

  if (decimal >= 1) {
    // Whole seconds (e.g. "2" or "2.5")
    return trimmed;
  }

  const reciprocal = Math.round(1 / decimal);
  return `1/${reciprocal}`;
}

// ---------------------------------------------------------------------------
// Top-level parser
// ---------------------------------------------------------------------------

/**
 * Parse a raw Cloudinary EXIF object (from `image_metadata`) into a
 * strongly-typed `ParsedExif` struct.  All fields are null-safe — pass an
 * empty object or `undefined` and you'll get all-null back.
 */
export function parseCloudinaryExif(
  raw: CloudinaryRawExif | undefined | null,
): ParsedExif {
  if (!raw) {
    return {
      takenAt: null,
      lat: null,
      lng: null,
      cameraMake: null,
      cameraModel: null,
      lensModel: null,
      aperture: null,
      shutterSpeed: null,
      iso: null,
    };
  }

  return {
    takenAt: parseExifDatetime(raw.DateTimeOriginal),
    lat: parseGpsRational(raw.GPSLatitude, raw.GPSLatitudeRef),
    lng: parseGpsRational(raw.GPSLongitude, raw.GPSLongitudeRef),
    cameraMake: raw.Make?.trim() || null,
    cameraModel: raw.Model?.trim() || null,
    lensModel: raw.LensModel?.trim() || null,
    aperture: parseFNumber(raw.FNumber),
    shutterSpeed: parseShutterSpeed(raw.ExposureTime),
    iso: parseIso(raw.ISOSpeedRatings),
  };
}
