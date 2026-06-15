import { describe, expect, it } from "vitest";

import {
  adminCategoryCreateFormSchema,
  adminCategoryIdFormSchema,
  adminCategoryUpdateFormSchema,
  adminTagCreateFormSchema,
  adminTagIdFormSchema,
} from "@/server/forms/admin-taxonomy";

describe("adminCategoryCreateFormSchema", () => {
  it("accepts a valid create payload with trimmed name", () => {
    const parsed = adminCategoryCreateFormSchema.parse({
      name: "  Roads  ",
      slug: "  roads  ",
      description: "  On the road  ",
    });

    expect(parsed).toEqual({
      name: "Roads",
      slug: "roads",
      description: "On the road",
    });
  });

  it("normalises missing slug and description to null", () => {
    const parsed = adminCategoryCreateFormSchema.parse({ name: "Roads" });

    expect(parsed.slug).toBeNull();
    expect(parsed.description).toBeNull();
  });

  it("rejects a blank name", () => {
    const result = adminCategoryCreateFormSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects a slug that cannot be slugified to a valid kebab-case string", () => {
    const result = adminCategoryCreateFormSchema.safeParse({ name: "Roads", slug: "!!!" });
    expect(result.success).toBe(false);
  });

  it("rejects descriptions over 500 characters", () => {
    const result = adminCategoryCreateFormSchema.safeParse({
      name: "Roads",
      description: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("adminCategoryUpdateFormSchema", () => {
  it("accepts a valid update payload", () => {
    const parsed = adminCategoryUpdateFormSchema.parse({
      id: "category-1",
      name: "Roads Renamed",
      slug: "roads-renamed",
      description: "Renamed",
    });

    expect(parsed).toEqual({
      id: "category-1",
      name: "Roads Renamed",
      slug: "roads-renamed",
      description: "Renamed",
    });
  });

  it("rejects an empty id", () => {
    const result = adminCategoryUpdateFormSchema.safeParse({ id: "  ", name: "Roads" });
    expect(result.success).toBe(false);
  });
});

describe("adminCategoryIdFormSchema", () => {
  it("accepts a non-blank id", () => {
    const parsed = adminCategoryIdFormSchema.parse({ id: "category-1" });
    expect(parsed.id).toBe("category-1");
  });

  it("rejects a blank id", () => {
    const result = adminCategoryIdFormSchema.safeParse({ id: "   " });
    expect(result.success).toBe(false);
  });
});

describe("adminTagCreateFormSchema", () => {
  it("accepts a valid tag create payload", () => {
    const parsed = adminTagCreateFormSchema.parse({
      name: "  Overland  ",
      slug: "  overland  ",
      description: "  Trail stories  ",
    });

    expect(parsed).toEqual({
      name: "Overland",
      slug: "overland",
      description: "Trail stories",
    });
  });

  it("normalises missing fields to null", () => {
    const parsed = adminTagCreateFormSchema.parse({ name: "Overland" });

    expect(parsed.slug).toBeNull();
    expect(parsed.description).toBeNull();
  });

  it("rejects a blank name", () => {
    const result = adminTagCreateFormSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });
});

describe("adminTagIdFormSchema", () => {
  it("accepts a non-blank id", () => {
    const parsed = adminTagIdFormSchema.parse({ id: "tag-1" });
    expect(parsed.id).toBe("tag-1");
  });

  it("rejects a blank id", () => {
    const result = adminTagIdFormSchema.safeParse({ id: "   " });
    expect(result.success).toBe(false);
  });
});
