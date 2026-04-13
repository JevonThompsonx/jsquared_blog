import { describe, it, expect } from "vitest";

import { adminNavLinks } from "@/lib/admin/navigation";

describe("adminNavLinks", () => {
  it("includes a Travel wishlist link", () => {
    const hrefs = adminNavLinks.map((l) => l.href);
    expect(hrefs).toContain("/admin/wishlist");
  });

  it("does not expose a top-level route-planner link in admin nav", () => {
    const hrefs = adminNavLinks.map((l) => l.href);
    expect(hrefs).not.toContain("/route-planner");
  });

  it("every link has a non-empty label and description", () => {
    for (const link of adminNavLinks) {
      expect(link.label.trim().length).toBeGreaterThan(0);
      expect(link.description.trim().length).toBeGreaterThan(0);
    }
  });
});
