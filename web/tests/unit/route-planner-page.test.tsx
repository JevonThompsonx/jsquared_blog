import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/blog/route-planner-form", () => ({
  RoutePlannerForm: () => createElement("div", { "data-testid": "route-planner-form" }, "Route planner form shell"),
}));

import RoutePlannerPage, { dynamic, metadata } from "@/app/(blog)/route-planner/page";

describe("RoutePlannerPage", () => {
  it("keeps the route dynamic and exposes planner metadata", () => {
    expect(dynamic).toBe("force-dynamic");
    expect(metadata.title).toBe("Route Planner");
  });

  it("renders the planner form shell and guidance copy", () => {
    const markup = renderToStaticMarkup(awaitedPage());

    expect(markup).toContain('data-testid="route-planner-form"');
    expect(markup).toContain("Route planner form shell");
    expect(markup).toContain("Plan a route between two places");
    expect(markup).toContain("public wishlist stops");
  });
});

function awaitedPage() {
  return RoutePlannerPage();
}
