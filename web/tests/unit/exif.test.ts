import { describe, expect, it } from "vitest";

import {
  parseCloudinaryExif,
  parseExifDatetime,
  parseFNumber,
  parseGpsRational,
  parseIso,
  parseShutterSpeed,
} from "@/lib/cloudinary/exif";

// ---------------------------------------------------------------------------
// parseGpsRational
// ---------------------------------------------------------------------------

describe("parseGpsRational", () => {
  it("parses a standard North latitude rational", () => {
    // 48° 51' 28.8" N = 48 + 51/60 + 28.8/3600 ≈ 48.858
    const result = parseGpsRational("48/1, 51/1, 2880/100", "N");
    expect(result).toBeCloseTo(48.858, 2);
  });

  it("parses a South latitude as negative", () => {
    const result = parseGpsRational("33/1, 51/1, 0/1", "S");
    expect(result).toBeCloseTo(-33.85, 2);
  });

  it("parses a West longitude as negative", () => {
    const result = parseGpsRational("122/1, 25/1, 0/1", "W");
    expect(result).toBeCloseTo(-122.4167, 2);
  });

  it("parses an East longitude as positive", () => {
    const result = parseGpsRational("2/1, 20/1, 45/1", "E");
    expect(result).toBeCloseTo(2.3458, 2);
  });

  it("returns null for undefined value", () => {
    expect(parseGpsRational(undefined, "N")).toBeNull();
  });

  it("returns null for wrong number of components", () => {
    expect(parseGpsRational("48/1, 51/1", "N")).toBeNull();
  });

  it("returns null for a malformed rational (division by zero)", () => {
    expect(parseGpsRational("48/0, 51/1, 0/1", "N")).toBeNull();
  });

  it("returns null for a non-numeric component", () => {
    expect(parseGpsRational("abc/1, 51/1, 0/1", "N")).toBeNull();
  });

  it("handles missing ref as positive", () => {
    const result = parseGpsRational("48/1, 51/1, 2880/100", undefined);
    expect(result).toBeCloseTo(48.858, 2);
  });
});

// ---------------------------------------------------------------------------
// parseExifDatetime
// ---------------------------------------------------------------------------

describe("parseExifDatetime", () => {
  it("parses a standard EXIF datetime string", () => {
    const result = parseExifDatetime("2024:06:15 14:22:33");
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
    expect(result?.getMonth()).toBe(5); // June = 5 (0-indexed)
    expect(result?.getDate()).toBe(15);
  });

  it("returns null for undefined input", () => {
    expect(parseExifDatetime(undefined)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseExifDatetime("")).toBeNull();
  });

  it("returns null for an all-zero datetime", () => {
    // Many cameras write this when date is not set
    expect(parseExifDatetime("0000:00:00 00:00:00")).toBeNull();
  });

  it("returns null for a completely invalid string", () => {
    expect(parseExifDatetime("not-a-date")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseFNumber
// ---------------------------------------------------------------------------

describe("parseFNumber", () => {
  it("parses a rational FNumber string", () => {
    expect(parseFNumber("28/10")).toBeCloseTo(2.8);
  });

  it("parses a decimal FNumber string", () => {
    expect(parseFNumber("4.0")).toBeCloseTo(4.0);
  });

  it("parses an integer FNumber string", () => {
    expect(parseFNumber("8")).toBe(8);
  });

  it("returns null for undefined", () => {
    expect(parseFNumber(undefined)).toBeNull();
  });

  it("returns null for a zero denominator rational", () => {
    expect(parseFNumber("5/0")).toBeNull();
  });

  it("returns null for a zero value", () => {
    expect(parseFNumber("0")).toBeNull();
  });

  it("returns null for a non-numeric string", () => {
    expect(parseFNumber("abc")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseIso
// ---------------------------------------------------------------------------

describe("parseIso", () => {
  it("parses a plain number", () => {
    expect(parseIso(400)).toBe(400);
  });

  it("parses a numeric string", () => {
    expect(parseIso("1600")).toBe(1600);
  });

  it("parses a single-element array (Cloudinary quirk)", () => {
    expect(parseIso([800])).toBe(800);
  });

  it("rounds a float ISO value", () => {
    expect(parseIso(399.9)).toBe(400);
  });

  it("returns null for undefined", () => {
    expect(parseIso(undefined)).toBeNull();
  });

  it("returns null for an empty array", () => {
    expect(parseIso([])).toBeNull();
  });

  it("returns null for zero", () => {
    expect(parseIso(0)).toBeNull();
  });

  it("returns null for a non-numeric string", () => {
    expect(parseIso("auto")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseShutterSpeed
// ---------------------------------------------------------------------------

describe("parseShutterSpeed", () => {
  it("returns a rational string as-is", () => {
    expect(parseShutterSpeed("1/250")).toBe("1/250");
  });

  it("converts a fast decimal to 1/N form", () => {
    // 1/500 = 0.002
    expect(parseShutterSpeed("0.002")).toBe("1/500");
  });

  it("converts a moderately fast decimal to 1/N form", () => {
    // 1/60 ≈ 0.01667
    const result = parseShutterSpeed("0.016667");
    expect(result).toMatch(/^1\/\d+$/);
  });

  it("returns whole seconds as-is", () => {
    expect(parseShutterSpeed("2")).toBe("2");
  });

  it("returns null for undefined", () => {
    expect(parseShutterSpeed(undefined)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseShutterSpeed("")).toBeNull();
  });

  it("returns null for a zero decimal", () => {
    expect(parseShutterSpeed("0")).toBeNull();
  });

  it("returns null for a malformed rational (zero denominator)", () => {
    expect(parseShutterSpeed("1/0")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseCloudinaryExif (integration)
// ---------------------------------------------------------------------------

describe("parseCloudinaryExif", () => {
  it("returns all-null for undefined input", () => {
    const result = parseCloudinaryExif(undefined);
    expect(result.takenAt).toBeNull();
    expect(result.lat).toBeNull();
    expect(result.lng).toBeNull();
    expect(result.cameraMake).toBeNull();
    expect(result.cameraModel).toBeNull();
    expect(result.lensModel).toBeNull();
    expect(result.aperture).toBeNull();
    expect(result.shutterSpeed).toBeNull();
    expect(result.iso).toBeNull();
  });

  it("returns all-null for an empty object", () => {
    const result = parseCloudinaryExif({});
    expect(result.takenAt).toBeNull();
    expect(result.lat).toBeNull();
    expect(result.iso).toBeNull();
  });

  it("parses a fully-populated EXIF object", () => {
    const result = parseCloudinaryExif({
      DateTimeOriginal: "2024:06:15 14:22:33",
      GPSLatitude: "48/1, 51/1, 2880/100",
      GPSLatitudeRef: "N",
      GPSLongitude: "2/1, 20/1, 2700/100",
      GPSLongitudeRef: "E",
      Make: "Apple",
      Model: "iPhone 15 Pro",
      LensModel: "iPhone 15 Pro back triple camera 6.765mm f/1.78",
      FNumber: "178/100",
      ExposureTime: "1/120",
      ISOSpeedRatings: 100,
    });

    expect(result.takenAt).toBeInstanceOf(Date);
    expect(result.takenAt?.getFullYear()).toBe(2024);
    expect(result.lat).toBeCloseTo(48.858, 2);
    expect(result.lng).toBeGreaterThan(0);
    expect(result.cameraMake).toBe("Apple");
    expect(result.cameraModel).toBe("iPhone 15 Pro");
    expect(result.lensModel).toContain("iPhone");
    expect(result.aperture).toBeCloseTo(1.78, 1);
    expect(result.shutterSpeed).toBe("1/120");
    expect(result.iso).toBe(100);
  });

  it("handles ISO as an array", () => {
    const result = parseCloudinaryExif({ ISOSpeedRatings: [200] });
    expect(result.iso).toBe(200);
  });

  it("handles ISO as a string", () => {
    const result = parseCloudinaryExif({ ISOSpeedRatings: "3200" });
    expect(result.iso).toBe(3200);
  });

  it("trims and nullifies empty camera make/model strings", () => {
    const result = parseCloudinaryExif({ Make: "  ", Model: "" });
    expect(result.cameraMake).toBeNull();
    expect(result.cameraModel).toBeNull();
  });
});
