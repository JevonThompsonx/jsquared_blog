import { describe, expect, it } from "vitest";

import {
  escapeXml,
  formatSeasonYear,
  getCategoryHref,
  getPostHref,
  getSeasonKey,
  getSeasonLabel,
  getSeriesHref,
  getTagHref,
  groupPostsBySeason,
  slugify,
  toPostSlug,
} from "@/lib/utils";
import type { BlogPost } from "@/types/blog";

function makePost(id: string, createdAt: string): BlogPost {
  return {
    id,
    slug: `post-${id}`,
    title: `Post ${id}`,
    description: null,
    excerpt: null,
    imageUrl: null,
    category: null,
    createdAt,
    status: "published",
    tags: [],
    images: [],
    source: "turso",
    locationName: null,
    locationLat: null,
    locationLng: null,
    locationZoom: null,
    iovanderUrl: null,
    commentCount: 0,
  };
}

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

describe("formatSeasonYear", () => {
  it("formats winter dates in January and February", () => {
    expect(formatSeasonYear("2026-01-15T12:00:00.000Z")).toBe("Winter 2026");
    expect(formatSeasonYear("2026-02-28T12:00:00.000Z")).toBe("Winter 2026");
  });

  it("formats spring, summer, and fall dates", () => {
    expect(formatSeasonYear("2026-03-20T12:00:00.000Z")).toBe("Spring 2026");
    expect(formatSeasonYear("2026-07-04T12:00:00.000Z")).toBe("Summer 2026");
    expect(formatSeasonYear("2026-10-01T12:00:00.000Z")).toBe("Fall 2026");
  });

  it("rolls December into the following winter year", () => {
    expect(formatSeasonYear("2025-12-15T12:00:00.000Z")).toBe("Winter 2026");
  });

  it("handles leap-year dates", () => {
    expect(formatSeasonYear("2024-02-29T12:00:00.000Z")).toBe("Winter 2024");
  });
});

describe("season helpers", () => {
  it("creates sortable season keys", () => {
    expect(getSeasonKey("2025-12-15T12:00:00.000Z")).toBe("2026-1");
    expect(getSeasonKey("2026-03-01T12:00:00.000Z")).toBe("2026-2");
    expect(getSeasonKey("2026-06-01T12:00:00.000Z")).toBe("2026-3");
    expect(getSeasonKey("2026-09-01T12:00:00.000Z")).toBe("2026-4");
  });

  it("reuses season-year labels", () => {
    expect(getSeasonLabel("2026-04-10T12:00:00.000Z")).toBe("Spring 2026");
  });
});

describe("groupPostsBySeason", () => {
  it("returns an empty array for empty input", () => {
    expect(groupPostsBySeason([])).toEqual([]);
  });

  it("returns a single season group when all posts match", () => {
    const posts = [
      makePost("1", "2026-03-10T12:00:00.000Z"),
      makePost("2", "2026-05-01T12:00:00.000Z"),
    ];

    expect(groupPostsBySeason(posts)).toEqual([
      {
        key: "2026-2",
        label: "Spring 2026",
        posts,
      },
    ]);
  });

  it("preserves group order and post order for mixed seasons", () => {
    const winter = makePost("1", "2025-12-20T12:00:00.000Z");
    const springA = makePost("2", "2026-04-10T12:00:00.000Z");
    const springB = makePost("3", "2026-03-01T12:00:00.000Z");
    const fall = makePost("4", "2025-09-15T12:00:00.000Z");

    expect(groupPostsBySeason([winter, springA, springB, fall])).toEqual([
      {
        key: "2026-1",
        label: "Winter 2026",
        posts: [winter],
      },
      {
        key: "2026-2",
        label: "Spring 2026",
        posts: [springA, springB],
      },
      {
        key: "2025-4",
        label: "Fall 2025",
        posts: [fall],
      },
    ]);
  });

  it("merges later pages into an existing season group without reordering", () => {
    const firstPage = [
      makePost("1", "2026-07-15T12:00:00.000Z"),
      makePost("2", "2026-06-01T12:00:00.000Z"),
    ];
    const nextPage = [
      makePost("3", "2026-08-02T12:00:00.000Z"),
      makePost("4", "2026-03-12T12:00:00.000Z"),
    ];

    expect(groupPostsBySeason([...firstPage, ...nextPage])).toEqual([
      {
        key: "2026-3",
        label: "Summer 2026",
        posts: [firstPage[0], firstPage[1], nextPage[0]],
      },
      {
        key: "2026-2",
        label: "Spring 2026",
        posts: [nextPage[1]],
      },
    ]);
  });

  it("groups December with the following winter year", () => {
    const december = makePost("1", "2025-12-05T12:00:00.000Z");
    const january = makePost("2", "2026-01-03T12:00:00.000Z");

    expect(groupPostsBySeason([december, january])).toEqual([
      {
        key: "2026-1",
        label: "Winter 2026",
        posts: [december, january],
      },
    ]);
  });
});
