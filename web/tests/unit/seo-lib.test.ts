import { describe, expect, it } from "vitest";

import {
  absoluteUrl,
  buildAlternates,
  buildOgImage,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
  getDefaultOgImage,
} from "@/lib/seo";

describe("absoluteUrl", () => {
  it("prefixes site-relative paths with the canonical origin", () => {
    expect(absoluteUrl("/wishlist/banff")).toBe(
      "https://jsquaredadventures.com/wishlist/banff",
    );
  });

  it("adds a leading slash when the path is missing one", () => {
    expect(absoluteUrl("about")).toBe("https://jsquaredadventures.com/about");
  });

  it("leaves absolute URLs untouched", () => {
    expect(absoluteUrl("https://images.example.com/photo.jpg")).toBe(
      "https://images.example.com/photo.jpg",
    );
  });
});

describe("buildAlternates", () => {
  it("returns an absolute canonical", () => {
    expect(buildAlternates("/tags")).toEqual({
      canonical: "https://jsquaredadventures.com/tags",
    });
  });

  it("adds an RSS alternate when a feed path is supplied", () => {
    expect(buildAlternates("/tag/hiking", "/tag/hiking/feed.xml")).toEqual({
      canonical: "https://jsquaredadventures.com/tag/hiking",
      types: {
        "application/rss+xml":
          "https://jsquaredadventures.com/tag/hiking/feed.xml",
      },
    });
  });
});

describe("buildOgImage", () => {
  it("requests a fixed-size JPEG derivative for Cloudinary uploads", () => {
    const image = buildOgImage(
      "https://res.cloudinary.com/demo/image/upload/v123/trail.jpg",
      "Trail",
    );

    expect(image).toEqual({
      url: `https://res.cloudinary.com/demo/image/upload/c_fill,w_${DEFAULT_OG_IMAGE_WIDTH},h_${DEFAULT_OG_IMAGE_HEIGHT},f_jpg,q_auto,fl_force_strip/v123/trail.jpg`,
      width: DEFAULT_OG_IMAGE_WIDTH,
      height: DEFAULT_OG_IMAGE_HEIGHT,
      type: "image/jpeg",
      alt: "Trail",
    });
  });

  it("replaces an existing Cloudinary transform instead of chaining a second segment", () => {
    const image = buildOgImage(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_640/v123/trail.jpg",
      "Trail",
    );

    expect(image.url).toBe(
      `https://res.cloudinary.com/demo/image/upload/c_fill,w_${DEFAULT_OG_IMAGE_WIDTH},h_${DEFAULT_OG_IMAGE_HEIGHT},f_jpg,q_auto,fl_force_strip/v123/trail.jpg`,
    );
  });

  it("keeps non-Cloudinary URLs and only declares the inferred MIME type", () => {
    const image = buildOgImage("/images/trail.webp", "Trail");

    expect(image).toEqual({
      url: "https://jsquaredadventures.com/images/trail.webp",
      type: "image/webp",
      alt: "Trail",
    });
    expect(image.width).toBeUndefined();
    expect(image.height).toBeUndefined();
  });
});

describe("getDefaultOgImage", () => {
  it("returns the documented 1200x630 default image reference", () => {
    const image = getDefaultOgImage();

    expect(image.width).toBe(1200);
    expect(image.height).toBe(630);
    expect(image.type).toBe("image/jpeg");
    expect(image.url).toBe(
      "https://jsquaredadventures.com/images/og-default.jpg",
    );
  });
});
