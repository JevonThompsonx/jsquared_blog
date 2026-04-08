import { describe, expect, it } from "vitest";

import { routePlannerRequestSchema } from "@/server/forms/route-planner";

describe("route planner request schema", () => {
  it("trims origin and destination and applies defaults", () => {
    const result = routePlannerRequestSchema.safeParse({
      source: "public-wishlist",
      origin: "  Vancouver, BC  ",
      destination: "  Banff, AB  ",
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      return;
    }

    expect(result.data).toEqual({
      source: "public-wishlist",
      origin: "Vancouver, BC",
      destination: "Banff, AB",
      mode: "drive",
      includeVisited: false,
    });
  });

  it("rejects whitespace-only locations and invalid travel modes", () => {
    const result = routePlannerRequestSchema.safeParse({
      source: "public-wishlist",
      origin: "   ",
      destination: "Seattle, WA",
      mode: "fly",
    });

    expect(result.success).toBe(false);
  });
});
