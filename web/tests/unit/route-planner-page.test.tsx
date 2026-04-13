import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  permanentRedirect: vi.fn(),
}));

import { permanentRedirect } from "next/navigation";
import RoutePlannerPage from "@/app/(blog)/route-planner/page";

describe("RoutePlannerPage", () => {
  it("issues a permanent redirect to /wishlist", () => {
    RoutePlannerPage();

    expect(vi.mocked(permanentRedirect)).toHaveBeenCalledOnce();
    expect(vi.mocked(permanentRedirect)).toHaveBeenCalledWith("/wishlist");
  });

  it("does not export dynamic or metadata (page is retired)", async () => {
    const mod = await import("@/app/(blog)/route-planner/page");

    expect((mod as Record<string, unknown>).dynamic).toBeUndefined();
    expect((mod as Record<string, unknown>).metadata).toBeUndefined();
  });
});
