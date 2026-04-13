import { describe, expect, it, vi } from "vitest";

const { mockPermanentRedirect } = vi.hoisted(() => ({
  mockPermanentRedirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  permanentRedirect: mockPermanentRedirect,
}));

import RoutePlannerPage from "@/app/(blog)/route-planner/page";

describe("RoutePlannerPage", () => {
  it("issues a permanent redirect to /wishlist", () => {
    RoutePlannerPage();

    expect(mockPermanentRedirect).toHaveBeenCalledOnce();
    expect(mockPermanentRedirect).toHaveBeenCalledWith("/wishlist");
  });

  it("does not export dynamic or metadata (page is retired)", async () => {
    const mod = await import("@/app/(blog)/route-planner/page");

    expect((mod as Record<string, unknown>).dynamic).toBeUndefined();
    expect((mod as Record<string, unknown>).metadata).toBeUndefined();
  });
});
