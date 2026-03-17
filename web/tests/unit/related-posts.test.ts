import { describe, expect, it } from "vitest";

import { getRelatedPostScore, rankRelatedPosts } from "@/lib/related-posts";
import type { BlogPost } from "@/types/blog";

function makePost(
  id: string,
  createdAt: string,
  options?: {
    category?: string | null;
    tags?: Array<{ id: string; name: string; slug: string }>;
  },
): BlogPost {
  return {
    id,
    slug: `post-${id}`,
    title: `Post ${id}`,
    description: null,
    excerpt: null,
    imageUrl: null,
    category: options?.category ?? null,
    createdAt,
    status: "published",
    tags: options?.tags ?? [],
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

describe("related post scoring", () => {
  it("rewards matching category, shared tags, and nearby publish date", () => {
    const current = makePost("1", "2026-04-15T12:00:00.000Z", {
      category: "Hiking",
      tags: [
        { id: "a", name: "Alps", slug: "alps" },
        { id: "b", name: "Camping", slug: "camping" },
      ],
    });
    const candidate = makePost("2", "2026-05-01T12:00:00.000Z", {
      category: "Hiking",
      tags: [
        { id: "c", name: "Camping", slug: "camping" },
        { id: "d", name: "Trails", slug: "trails" },
      ],
    });

    expect(getRelatedPostScore(current, candidate)).toBe(6);
  });

  it("ranks stronger matches ahead of recent-only fallbacks", () => {
    const current = makePost("1", "2026-04-15T12:00:00.000Z", {
      category: "Hiking",
      tags: [{ id: "a", name: "Alps", slug: "alps" }],
    });
    const strongMatch = makePost("2", "2026-04-20T12:00:00.000Z", {
      category: "Hiking",
      tags: [{ id: "b", name: "Alps", slug: "alps" }],
    });
    const fallback = makePost("3", "2026-04-22T12:00:00.000Z", {
      category: "Road Trips",
      tags: [],
    });

    expect(rankRelatedPosts(current, [fallback, strongMatch], 2)).toEqual([strongMatch, fallback]);
  });

  it("deduplicates candidates and excludes the current post", () => {
    const current = makePost("1", "2026-04-15T12:00:00.000Z");
    const duplicate = makePost("2", "2026-04-20T12:00:00.000Z");

    expect(rankRelatedPosts(current, [current, duplicate, duplicate], 3)).toEqual([duplicate]);
  });
});
