import { describe, expect, it } from "vitest";

import {
  cdnBlurDataUrl,
  cdnImageLoader,
  cdnImageSrcSet,
  cdnImageUrl,
  cdnSocialImageUrl,
  enhanceProseImagesHtml,
  getCloudinaryDimensions,
} from "@/lib/cloudinary/transform";
import { buildCloudinaryImageUrl } from "@/lib/cloudinary/urls";

describe("cdnImageUrl", () => {
  it("returns null for null input", () => {
    expect(cdnImageUrl(null)).toBeNull();
  });

  it("inserts f_auto,q_auto,fl_force_strip transforms into a plain Cloudinary URL", () => {
    const input =
      "https://res.cloudinary.com/demo/image/upload/v1234/sample.jpg";
    const expected =
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,fl_force_strip/v1234/sample.jpg";
    expect(cdnImageUrl(input)).toBe(expected);
  });

  it("adds the metadata-strip flag to a URL that already has f_auto", () => {
    const already =
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1234/sample.jpg";
    const expected =
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,fl_force_strip/v1234/sample.jpg";
    expect(cdnImageUrl(already)).toBe(expected);
  });

  it("does not double-apply fl_force_strip", () => {
    const already =
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,fl_force_strip/v1234/sample.jpg";
    expect(cdnImageUrl(already)).toBe(already);
  });

  it("merges the metadata-strip flag into an existing fl_ flag", () => {
    const input =
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,fl_progressive/v1234/sample.jpg";
    expect(cdnImageUrl(input)).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,fl_progressive.force_strip/v1234/sample.jpg",
    );
  });

  it("adds the strip flag to a URL that already has q_auto only", () => {
    const already =
      "https://res.cloudinary.com/demo/image/upload/q_auto/v1234/sample.jpg";
    expect(cdnImageUrl(already)).toBe(
      "https://res.cloudinary.com/demo/image/upload/q_auto,fl_force_strip/v1234/sample.jpg",
    );
  });

  it("passes through non-Cloudinary URLs unchanged", () => {
    const url = "https://example.com/photo.jpg";
    expect(cdnImageUrl(url)).toBe(url);
  });

  it("handles Cloudinary URLs with existing named transforms", () => {
    const input =
      "https://res.cloudinary.com/demo/image/upload/w_800/v1234/sample.jpg";
    const expected =
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,fl_force_strip/w_800/v1234/sample.jpg";
    expect(cdnImageUrl(input)).toBe(expected);
  });
});

describe("cdnImageUrl width-aware variants", () => {
  const base = "https://res.cloudinary.com/demo/image/upload/v1234/sample.jpg";

  it("adds a width with c_limit, auto format/quality, and metadata stripping", () => {
    expect(cdnImageUrl(base, 400)).toBe(
      "https://res.cloudinary.com/demo/image/upload/w_400,c_limit,f_auto,q_auto,fl_force_strip/v1234/sample.jpg",
    );
  });

  it("merges the width into an existing f_auto,q_auto segment instead of prefixing a second one", () => {
    const input =
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1234/sample.jpg";
    expect(cdnImageUrl(input, 400)).toBe(
      "https://res.cloudinary.com/demo/image/upload/w_400,f_auto,q_auto,c_limit,fl_force_strip/v1234/sample.jpg",
    );
  });

  it("replaces an existing width and keeps its crop mode", () => {
    const input =
      "https://res.cloudinary.com/demo/image/upload/w_800,c_limit,f_auto,q_auto/v1234/sample.jpg";
    expect(cdnImageUrl(input, 400)).toBe(
      "https://res.cloudinary.com/demo/image/upload/w_400,c_limit,f_auto,q_auto,fl_force_strip/v1234/sample.jpg",
    );
  });

  it("does not duplicate fl_force_strip when resizing an already-stripped URL", () => {
    const input =
      "https://res.cloudinary.com/demo/image/upload/w_800,c_limit,f_auto,q_auto,fl_force_strip/v1234/sample.jpg";
    const output = cdnImageUrl(input, 400);

    expect(output).toBe(
      "https://res.cloudinary.com/demo/image/upload/w_400,c_limit,f_auto,q_auto,fl_force_strip/v1234/sample.jpg",
    );
    expect(output?.match(/fl_force_strip/g)).toHaveLength(1);
  });

  it("is idempotent when called twice with the same width", () => {
    const once = cdnImageUrl(base, 640);
    expect(cdnImageUrl(once, 640)).toBe(once);
  });

  it("leaves non-Cloudinary URLs untouched when a width is supplied", () => {
    expect(cdnImageUrl("https://example.com/photo.jpg", 400)).toBe(
      "https://example.com/photo.jpg",
    );
  });

  it("does not mistake a public id with an underscore for a transformation segment", () => {
    const input = "https://res.cloudinary.com/demo/image/upload/my_photo.jpg";
    expect(cdnImageUrl(input, 400)).toBe(
      "https://res.cloudinary.com/demo/image/upload/w_400,c_limit,f_auto,q_auto,fl_force_strip/my_photo.jpg",
    );
  });
});

describe("cdnImageSrcSet", () => {
  it("builds sorted, de-duplicated width descriptors", () => {
    const srcSet = cdnImageSrcSet(
      "https://res.cloudinary.com/demo/image/upload/v1234/sample.jpg",
      [800, 400, 400],
    );

    expect(srcSet).toBe(
      "https://res.cloudinary.com/demo/image/upload/w_400,c_limit,f_auto,q_auto,fl_force_strip/v1234/sample.jpg 400w, " +
        "https://res.cloudinary.com/demo/image/upload/w_800,c_limit,f_auto,q_auto,fl_force_strip/v1234/sample.jpg 800w",
    );
  });

  it("returns undefined for non-Cloudinary URLs and empty width lists", () => {
    expect(
      cdnImageSrcSet("https://example.com/photo.jpg", [400, 800]),
    ).toBeUndefined();
    expect(
      cdnImageSrcSet(
        "https://res.cloudinary.com/demo/image/upload/v1234/sample.jpg",
        [],
      ),
    ).toBeUndefined();
  });
});

describe("cdnImageLoader", () => {
  it("routes Cloudinary sources through the width-aware transform", () => {
    expect(
      cdnImageLoader({
        src: "https://res.cloudinary.com/demo/image/upload/v1234/sample.jpg",
        width: 828,
      }),
    ).toBe(
      "https://res.cloudinary.com/demo/image/upload/w_828,c_limit,f_auto,q_auto,fl_force_strip/v1234/sample.jpg",
    );
  });

  it("passes non-Cloudinary sources through unchanged", () => {
    expect(cdnImageLoader({ src: "/images/welcome.webp", width: 1200 })).toBe(
      "/images/welcome.webp",
    );
  });
});

describe("getCloudinaryDimensions", () => {
  it("reads explicit width and height tokens", () => {
    expect(
      getCloudinaryDimensions(
        "https://res.cloudinary.com/demo/image/upload/w_800,h_600,c_fill/v1234/sample.jpg",
      ),
    ).toEqual({ width: 800, height: 600 });
  });

  it("returns null when only one dimension is pinned", () => {
    expect(
      getCloudinaryDimensions(
        "https://res.cloudinary.com/demo/image/upload/w_800/v1234/sample.jpg",
      ),
    ).toBeNull();
  });
});

describe("cdnBlurDataUrl", () => {
  it("replaces existing transforms instead of chaining a second segment", () => {
    const blur = cdnBlurDataUrl(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_800/v1234/sample.jpg",
    );

    expect(blur).toBeDefined();
    const decoded = decodeURIComponent(blur ?? "");
    expect(decoded).toContain(
      "https://res.cloudinary.com/demo/image/upload/w_10,e_blur:1000,f_auto,q_auto,fl_force_strip/v1234/sample.jpg",
    );
    expect(decoded).not.toContain("f_auto,q_auto/w_800");
  });
});

describe("cdnSocialImageUrl", () => {
  it("replaces delivery transforms with a single fixed 1200x630 JPEG segment", () => {
    expect(
      cdnSocialImageUrl(
        "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,fl_force_strip/v1234/sample.jpg",
      ),
    ).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,h_630,f_jpg,q_auto,fl_force_strip/v1234/sample.jpg",
    );
  });

  it("returns null for non-Cloudinary sources so callers can use the site default", () => {
    expect(cdnSocialImageUrl("https://example.com/photo.jpg")).toBeNull();
    expect(cdnSocialImageUrl(null)).toBeNull();
  });
});

describe("enhanceProseImagesHtml", () => {
  const cloudinarySrc =
    "https://res.cloudinary.com/demo/image/upload/v1234/photo.jpg";

  it("resizes, adds srcSet, and marks gallery images keyboard-operable", () => {
    const html = `<p>Before</p><img src="${cloudinarySrc}" alt="Trail" data-gallery-idx="2"><p>After</p>`;
    const enhanced = enhanceProseImagesHtml(html);

    expect(enhanced).toContain(
      'src="https://res.cloudinary.com/demo/image/upload/w_1200,c_limit,f_auto,q_auto,fl_force_strip/v1234/photo.jpg"',
    );
    expect(enhanced).toContain('srcset="');
    expect(enhanced).toContain("600w");
    expect(enhanced).toContain("1200w");
    expect(enhanced).toContain('sizes="(max-width: 768px) 100vw, 680px"');
    expect(enhanced).toContain('loading="lazy"');
    expect(enhanced).toContain('decoding="async"');
    expect(enhanced).toContain('tabindex="0"');
    expect(enhanced).toContain('role="button"');
    expect(enhanced).toContain('aria-label="Open image in gallery"');
    expect(enhanced).toContain('data-gallery-idx="2"');
    expect(enhanced).toContain("<p>Before</p>");
    expect(enhanced).toContain("<p>After</p>");
  });

  it("does not add button semantics to images outside the gallery", () => {
    const html = `<img src="${cloudinarySrc}" alt="Trail">`;
    const enhanced = enhanceProseImagesHtml(html);

    expect(enhanced).not.toContain('role="button"');
    expect(enhanced).not.toContain('tabindex="0"');
    expect(enhanced).toContain('loading="lazy"');
  });

  it("preserves editor-provided dimensions", () => {
    const html = `<img src="${cloudinarySrc}" alt="Trail" width="900" height="600" data-gallery-idx="0">`;
    const enhanced = enhanceProseImagesHtml(html);

    expect(enhanced).toContain('width="900"');
    expect(enhanced).toContain('height="600"');
    expect(enhanced).not.toContain('height="1200"');
  });

  it("fills dimensions from Cloudinary transformation tokens when missing", () => {
    const html =
      '<img src="https://res.cloudinary.com/demo/image/upload/w_800,h_450/v1234/photo.jpg" alt="Trail">';
    const enhanced = enhanceProseImagesHtml(html);

    expect(enhanced).toContain('width="1200"');
    expect(enhanced).toContain('height="450"');
  });

  it("leaves non-Cloudinary sources alone while keeping them lazy", () => {
    const html =
      '<img src="/images/local.jpg" alt="Local" data-gallery-idx="1">';
    const enhanced = enhanceProseImagesHtml(html);

    expect(enhanced).toContain('src="/images/local.jpg"');
    expect(enhanced).not.toContain("srcset=");
    expect(enhanced).toContain('loading="lazy"');
    expect(enhanced).toContain('decoding="async"');
    expect(enhanced).toContain('role="button"');
  });

  it("is idempotent", () => {
    const html = `<img src="${cloudinarySrc}" alt="Trail" data-gallery-idx="3">`;
    const once = enhanceProseImagesHtml(html);

    expect(enhanceProseImagesHtml(once)).toBe(once);
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

describe("enhanceProseImagesHtml — local media", () => {
  const localSrc = "/media/2026/11/a79493f1c6fad250-first-adventure.webp";

  it("adds a Next image-optimizer srcset for local /media images", () => {
    const enhanced = enhanceProseImagesHtml(
      `<img src="${localSrc}" alt="Lake">`,
    );

    expect(enhanced).toContain(`src="${localSrc}"`);
    expect(enhanced).toContain('srcset="');
    expect(enhanced).toContain("640w");
    expect(enhanced).toContain("1080w");
    expect(enhanced).toContain("1200w");
    expect(enhanced).toContain("url=%2Fmedia%2F2026%2F11%2F");
    expect(enhanced).toContain('sizes="(max-width: 768px) 100vw, 680px"');
  });

  it("never emits srcset for values that escape the media root", () => {
    const enhanced = enhanceProseImagesHtml(
      `<img src="/media/../../etc/passwd.webp" alt="bad">`,
    );

    expect(enhanced).not.toContain("srcset=");
  });

  it("leaves relative non-media images untouched", () => {
    const enhanced = enhanceProseImagesHtml(
      '<img src="/images/us.webp" alt="me">',
    );

    expect(enhanced).not.toContain("srcset=");
    expect(enhanced).toContain('src="/images/us.webp"');
  });
});

describe("cdnSocialImageUrl — local media", () => {
  it("maps a local media path to the fixed-size OG derivative route", () => {
    expect(
      cdnSocialImageUrl("/media/2026/11/a79493f1c6fad250-first-adventure.webp"),
    ).toBe("/api/og-image/2026/11/a79493f1c6fad250-first-adventure.webp");
  });

  it("does not map traversal or non-media paths", () => {
    expect(cdnSocialImageUrl("/media/../../etc/passwd.webp")).toBeNull();
    expect(cdnSocialImageUrl("/images/us.webp")).toBeNull();
  });
});
