import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

describe("PWA manifest", () => {
  const m = manifest();

  it("exposes a short_name and full name", () => {
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.name?.length ?? 0).toBeGreaterThanOrEqual((m.short_name?.length ?? 0) - 2);
  });

  it("includes the W3C standard lang field set to English", () => {
    expect(m.lang).toBe("en");
  });

  it("exposes the standard travel/lifestyle PWA categories", () => {
    expect(m.categories).toEqual(expect.arrayContaining(["travel", "blog", "lifestyle"]));
    expect(m.categories?.length).toBeGreaterThanOrEqual(3);
  });

  it("declares at least one icon for install", () => {
    expect(Array.isArray(m.icons)).toBe(true);
    expect(m.icons?.length).toBeGreaterThan(0);
    const icon = m.icons?.[0];
    expect(icon?.src).toBeTruthy();
    expect(icon?.sizes).toBeTruthy();
  });

  it("declares the PWA display mode and start URL", () => {
    expect(m.start_url).toBe("/");
    expect(["standalone", "fullscreen", "minimal-ui"]).toContain(m.display);
  });

  it("declares a screenshots array structure (placeholders ok while assets are generated)", () => {
    expect(Array.isArray(m.screenshots)).toBe(true);
    expect(m.screenshots?.length).toBeGreaterThanOrEqual(1);
    const first = m.screenshots?.[0];
    expect(first?.src).toBeTruthy();
    expect(first?.sizes).toBeTruthy();
  });

  it("keeps the existing theme + background colors", () => {
    expect(m.theme_color).toBeTruthy();
    expect(m.background_color).toBeTruthy();
  });
});
