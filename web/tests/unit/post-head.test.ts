import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/server/queries/posts", () => ({
  getPublishedPostBySlug: vi.fn(),
}));

vi.mock("@/server/dal/profiles", () => ({
  getPublicAuthorProfileById: vi.fn(),
}));

import Head from "@/app/(blog)/posts/[slug]/head";
import { getPublicAuthorProfileById } from "@/server/dal/profiles";
import { getPublishedPostBySlug } from "@/server/queries/posts";

describe("post JSON-LD head", () => {
  it("renders BlogPosting JSON-LD for a published post", async () => {
    vi.mocked(getPublishedPostBySlug).mockResolvedValue({
      id: "post-1",
      slug: "desert-sunrise",
      title: "Desert Sunrise",
      description: "<p>Morning light over the dunes.</p>",
      excerpt: "<p>Morning light over the dunes.</p>",
      imageUrl: "https://images.example.com/featured.jpg",
      category: "Travel",
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-02T11:00:00.000Z",
      publishedAt: "2026-03-01T12:00:00.000Z",
      status: "published",
      layoutType: "standard",
      tags: [],
      images: [{ id: "img-1", imageUrl: "https://images.example.com/gallery.jpg", altText: "Dunes", sortOrder: 1 }],
      source: "turso",
      locationName: null,
      locationLat: null,
      locationLng: null,
      locationZoom: null,
      iovanderUrl: null,
      commentCount: 0,
      authorId: "author-1",
      readingTimeMinutes: 5,
    });
    vi.mocked(getPublicAuthorProfileById).mockResolvedValue({
      userId: "author-1",
      displayName: "Jevon",
      avatarUrl: null,
      bio: null,
      memberSince: new Date("2024-01-01T00:00:00.000Z"),
    });

    const element = await Head({ params: Promise.resolve({ slug: "desert-sunrise" }) });

    expect(element).not.toBeNull();

    const markup = renderToStaticMarkup(element);
    expect(markup).toContain('type="application/ld+json"');

    const json = markup.match(/<script[^>]*>(.*)<\/script>/)?.[1];
    expect(json).toBeTruthy();

    const payload = JSON.parse(json ?? "{}");
    expect(payload).toMatchObject({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: "Desert Sunrise",
      url: "https://jsquaredadventures.com/posts/desert-sunrise",
      author: { "@type": "Person", name: "Jevon" },
      publisher: { "@type": "Organization", name: "J²Adventures" },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": "https://jsquaredadventures.com/posts/desert-sunrise",
      },
    });
    expect(payload.datePublished).toBe("2026-03-01T12:00:00.000Z");
    expect(payload.dateModified).toBe("2026-03-02T11:00:00.000Z");
    expect(payload.image).toEqual([
      "https://images.example.com/featured.jpg",
      "https://images.example.com/gallery.jpg",
    ]);
  });

  it("returns null when the post is missing", async () => {
    vi.mocked(getPublishedPostBySlug).mockResolvedValue(null);

    const element = await Head({ params: Promise.resolve({ slug: "missing-post" }) });

    expect(element).toBeNull();
  });
});
