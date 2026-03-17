import { describe, expect, it } from "vitest";

import { cdnImageUrl } from "@/lib/cloudinary/transform";
import { buildCloudinaryImageUrl } from "@/lib/cloudinary/urls";

describe("cdnImageUrl", () => {
  it("returns null for null input", () => {
    expect(cdnImageUrl(null)).toBeNull();
  });

  it("inserts f_auto,q_auto transform into a plain Cloudinary URL", () => {
    const input = "https://res.cloudinary.com/demo/image/upload/v1234/sample.jpg";
    const expected = "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1234/sample.jpg";
    expect(cdnImageUrl(input)).toBe(expected);
  });

  it("does not double-transform a URL that already has f_auto", () => {
    const already = "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1234/sample.jpg";
    expect(cdnImageUrl(already)).toBe(already);
  });

  it("does not double-transform a URL that already has q_auto only", () => {
    const already = "https://res.cloudinary.com/demo/image/upload/q_auto/v1234/sample.jpg";
    expect(cdnImageUrl(already)).toBe(already);
  });

  it("passes through non-Cloudinary URLs unchanged", () => {
    const url = "https://example.com/photo.jpg";
    expect(cdnImageUrl(url)).toBe(url);
  });

  it("handles Cloudinary URLs with existing named transforms", () => {
    const input = "https://res.cloudinary.com/demo/image/upload/w_800/v1234/sample.jpg";
    const expected = "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/w_800/v1234/sample.jpg";
    expect(cdnImageUrl(input)).toBe(expected);
  });
});

describe("buildCloudinaryImageUrl", () => {
  const cloudName = "testcloud";
  const publicId = "folder/image";

  it("builds a URL with default WebP format and auto quality", () => {
    const url = buildCloudinaryImageUrl(cloudName, publicId);
    expect(url).toContain("res.cloudinary.com/testcloud");
    expect(url).toContain("f_webp");
    expect(url).toContain("q_auto");
    expect(url).toContain("c_limit");
    expect(url).toContain("folder/image");
  });

  it("includes width transform when specified", () => {
    const url = buildCloudinaryImageUrl(cloudName, publicId, { width: 800 });
    expect(url).toContain("w_800");
  });

  it("allows overriding the format", () => {
    const url = buildCloudinaryImageUrl(cloudName, publicId, { format: "jpg" });
    expect(url).toContain("f_jpg");
  });

  it("allows specifying a numeric quality", () => {
    const url = buildCloudinaryImageUrl(cloudName, publicId, { quality: 80 });
    expect(url).toContain("q_80");
  });
});
