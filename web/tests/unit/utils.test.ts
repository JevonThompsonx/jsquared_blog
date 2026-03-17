import { describe, expect, it } from "vitest";

import {
  escapeXml,
  getCategoryHref,
  getPostHref,
  getSeriesHref,
  getTagHref,
  slugify,
  toPostSlug,
} from "@/lib/utils";

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("normalizes accented characters", () => {
    expect(slugify("Café au lait")).toBe("cafe-au-lait");
  });

  it("strips special characters", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });

  it("collapses multiple hyphens", () => {
    expect(slugify("hello---world")).toBe("hello-world");
  });

  it("trims leading and trailing whitespace", () => {
    expect(slugify("  hello world  ")).toBe("hello-world");
  });

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });
});

describe("toPostSlug", () => {
  it("uses existing slug when present", () => {
    expect(toPostSlug({ id: "1", title: "Ignored", slug: "my-slug" })).toBe("my-slug");
  });

  it("builds slug from id + title when slug is empty", () => {
    expect(toPostSlug({ id: "42", title: "Hello, Coastal Trails!", slug: "" })).toBe("42-hello-coastal-trails");
  });

  it("slugifies the title portion", () => {
    expect(toPostSlug({ id: "7", title: "Café & Mountains", slug: "" })).toBe("7-cafe-mountains");
  });
});

describe("getPostHref", () => {
  it("returns /posts/ prefixed path using the slug", () => {
    expect(getPostHref({ id: "1", title: "Test", slug: "my-post" })).toBe("/posts/my-post");
  });

  it("builds slug from id+title when slug is blank", () => {
    expect(getPostHref({ id: "5", title: "Big Adventure", slug: "" })).toBe("/posts/5-big-adventure");
  });
});

describe("getCategoryHref", () => {
  it("returns /category/ prefixed path", () => {
    expect(getCategoryHref("Travel")).toBe("/category/Travel");
  });

  it("encodes special characters in category name", () => {
    expect(getCategoryHref("Food & Drink")).toBe("/category/Food%20%26%20Drink");
  });
});

describe("getTagHref", () => {
  it("returns /tag/ prefixed path", () => {
    expect(getTagHref("adventure")).toBe("/tag/adventure");
  });

  it("preserves hyphens in slug", () => {
    expect(getTagHref("van-life")).toBe("/tag/van-life");
  });
});

describe("getSeriesHref", () => {
  it("returns /series/ prefixed path", () => {
    expect(getSeriesHref("pacific-crest")).toBe("/series/pacific-crest");
  });
});

describe("escapeXml", () => {
  it("escapes ampersands", () => {
    expect(escapeXml("Fish & Chips")).toBe("Fish &amp; Chips");
  });

  it("escapes angle brackets", () => {
    expect(escapeXml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes double quotes", () => {
    expect(escapeXml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeXml("it's")).toBe("it&apos;s");
  });

  it("returns plain strings unchanged", () => {
    expect(escapeXml("hello world")).toBe("hello world");
  });
});
