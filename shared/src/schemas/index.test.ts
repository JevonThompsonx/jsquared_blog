import { describe, it, expect } from "bun:test";
import {
  createPostBodySchema,
  updatePostBodySchema,
  createCommentBodySchema,
  createTagBodySchema,
  paginationQuerySchema,
} from "./index";

// ─── createPostBodySchema ──────────────────────────────────────────────────────

describe("createPostBodySchema", () => {
  it("accepts a minimal valid published post", () => {
    const result = createPostBodySchema.safeParse({
      title: "My Adventure",
      status: "published",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a published post with an empty title", () => {
    const result = createPostBodySchema.safeParse({
      title: "",
      status: "published",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.title).toBeDefined();
    }
  });

  it("allows a draft with no title (defaults to '')", () => {
    const result = createPostBodySchema.safeParse({ status: "draft" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("");
    }
  });

  it("rejects an invalid status value", () => {
    const result = createPostBodySchema.safeParse({
      title: "Test",
      status: "live", // not a valid enum value
    });
    expect(result.success).toBe(false);
  });

  it("rejects a scheduled post with no scheduled_for", () => {
    const result = createPostBodySchema.safeParse({
      title: "Test",
      status: "scheduled",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.scheduled_for).toBeDefined();
    }
  });

  it("rejects a scheduled post with a past date", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const result = createPostBodySchema.safeParse({
      title: "Test",
      status: "scheduled",
      scheduled_for: past,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a scheduled post with a future date", () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    const result = createPostBodySchema.safeParse({
      title: "Test",
      status: "scheduled",
      scheduled_for: future,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid image_url", () => {
    const result = createPostBodySchema.safeParse({
      title: "Test",
      status: "draft",
      image_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("clamps description at 100,000 characters", () => {
    const result = createPostBodySchema.safeParse({
      title: "Test",
      status: "draft",
      description: "x".repeat(100_001),
    });
    expect(result.success).toBe(false);
  });
});

// ─── updatePostBodySchema ──────────────────────────────────────────────────────

describe("updatePostBodySchema", () => {
  it("accepts an empty object (all fields optional on update)", () => {
    const result = updatePostBodySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a valid partial update", () => {
    const result = updatePostBodySchema.safeParse({
      title: "Updated title",
      status: "draft",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid type value", () => {
    const result = updatePostBodySchema.safeParse({
      type: "banner", // not a valid PostType
    });
    expect(result.success).toBe(false);
  });
});

// ─── createCommentBodySchema ───────────────────────────────────────────────────

describe("createCommentBodySchema", () => {
  it("accepts a valid comment", () => {
    const result = createCommentBodySchema.safeParse({
      content: "Great post!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty comment", () => {
    const result = createCommentBodySchema.safeParse({ content: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a comment that is just whitespace", () => {
    const result = createCommentBodySchema.safeParse({ content: "   " });
    // Zod trims first, then checks min(1)
    expect(result.success).toBe(false);
  });

  it("rejects a comment exceeding 5,000 characters", () => {
    const result = createCommentBodySchema.safeParse({
      content: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

// ─── createTagBodySchema ───────────────────────────────────────────────────────

describe("createTagBodySchema", () => {
  it("accepts a valid tag", () => {
    const result = createTagBodySchema.safeParse({
      name: "Adventure",
      slug: "adventure",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a tag with an empty name", () => {
    const result = createTagBodySchema.safeParse({ name: "", slug: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects a tag with an empty slug", () => {
    const result = createTagBodySchema.safeParse({
      name: "Adventure",
      slug: "",
    });
    expect(result.success).toBe(false);
  });
});

// ─── paginationQuerySchema ─────────────────────────────────────────────────────

describe("paginationQuerySchema", () => {
  it("applies default values when params are missing", () => {
    const result = paginationQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
      expect(result.data.offset).toBe(0);
      expect(result.data.search).toBe("");
    }
  });

  it("coerces string query params to numbers", () => {
    const result = paginationQuerySchema.safeParse({
      limit: "50",
      offset: "20",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(result.data.offset).toBe(20);
    }
  });

  it("rejects limit above 100", () => {
    const result = paginationQuerySchema.safeParse({ limit: "200" });
    expect(result.success).toBe(false);
  });

  it("rejects negative offset", () => {
    const result = paginationQuerySchema.safeParse({ offset: "-1" });
    expect(result.success).toBe(false);
  });
});
