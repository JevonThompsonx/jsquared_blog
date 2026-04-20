import { describe, expect, it } from "vitest";

/**
 * Slice 7 — dark-mode map contrast
 *
 * WorldMap wraps only the map canvas element in `.world-map-canvas` so that
 * the globals.css dark-mode filter targets only the tile rendering, not the
 * category pills above or sibling content outside the component.
 * PostMap continues to use `.world-map-container` as its root.
 *
 * We test the rendered markup directly (SSR-style string checks) since
 * both components use react-map-gl which is client-only and not trivially
 * renderable in jsdom — static markup inspection is the right tool here.
 */

// ---------------------------------------------------------------------------
// WorldMap
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const worldMapSrc = readFileSync(
  resolve(__dirname, "../../src/components/blog/world-map.tsx"),
  "utf-8",
);

const postMapSrc = readFileSync(
  resolve(__dirname, "../../src/components/blog/post-map.tsx"),
  "utf-8",
);

describe("world-map-container class — WorldMap", () => {
  it("has a root element with class world-map-container", () => {
    expect(worldMapSrc).toMatch(/world-map-container/);
  });

  it("has an inner .world-map-canvas wrapper for the map tile element", () => {
    expect(worldMapSrc).toMatch(/world-map-canvas/);
  });
});

describe("world-map-container class — PostMap", () => {
  it("has a root element with class world-map-container", () => {
    expect(postMapSrc).toMatch(/world-map-container/);
  });
});

// ---------------------------------------------------------------------------
// globals.css dark-mode filter rule
// ---------------------------------------------------------------------------
const globalsCss = readFileSync(
  resolve(__dirname, "../../src/app/globals.css"),
  "utf-8",
);

describe("globals.css dark-mode filter for .world-map-canvas", () => {
  it("contains a dark-mode selector targeting .world-map-canvas (not .world-map-container)", () => {
    expect(globalsCss).toMatch(/\[data-theme-mode="dark"\][^}]*\.world-map-canvas/);
  });

  it("applies an invert or brightness/contrast filter in dark mode", () => {
    // The rule should contain some CSS filter value
    const darkRuleMatch = globalsCss.match(
      /\[data-theme-mode="dark"\][^{]*\.world-map-canvas[^{]*\{([^}]+)\}/,
    );
    expect(darkRuleMatch).not.toBeNull();
    const ruleBody = darkRuleMatch![1];
    expect(ruleBody).toMatch(/filter\s*:/);
  });

  it("restyles MapLibre popups and controls for dark mode legibility", () => {
    expect(globalsCss).toMatch(/maplibregl-popup-content/);
    expect(globalsCss).toMatch(/maplibregl-ctrl-group/);
    expect(globalsCss).toMatch(/maplibregl-ctrl button/);
  });
});
