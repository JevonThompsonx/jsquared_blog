// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NextThemeProvider } from "@/components/theme/theme-provider";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, String(value));
    },
  };
}

const MODE_STORAGE_KEY = "j2adventures_theme_mode";
const LIGHT_LOOK_STORAGE_KEY = "j2adventures_theme_look_light";

function channelLuminance(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

function gradientStops(cssValue: string): string[] {
  return cssValue.match(/#[0-9a-f]{6}/gi) ?? [];
}

/** Lowest contrast of `foreground` against any stop of the background gradient. */
function worstContrastAgainstBackground(
  foreground: string,
  backgroundCss: string,
): number {
  const stops = gradientStops(backgroundCss);
  expect(stops.length).toBeGreaterThan(0);
  return Math.min(...stops.map((stop) => contrast(foreground, stop)));
}

describe("light theme accent contrast (WCAG AA)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const storage = createMemoryStorage();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });
    vi.stubGlobal("localStorage", storage);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  function renderTheme(lightLook: "sage" | "lichen") {
    window.localStorage.setItem(MODE_STORAGE_KEY, "light");
    window.localStorage.setItem(LIGHT_LOOK_STORAGE_KEY, lightLook);
    act(() => {
      root.render(
        <NextThemeProvider>
          <div>content</div>
        </NextThemeProvider>,
      );
    });

    const themeRoot = container.querySelector<HTMLElement>(".theme-root");
    expect(themeRoot).not.toBeNull();

    return (token: string) => themeRoot!.style.getPropertyValue(token).trim();
  }

  it.each(["sage", "lichen"] as const)(
    "%s: text accents reach 4.5:1 on the page background",
    (look) => {
      const token = renderTheme(look);
      const background = token("--background");

      // Guard against silently testing the same palette twice.
      expect(background).toContain(look === "sage" ? "#f6f2e8" : "#fbf7eb");

      expect(
        worstContrastAgainstBackground(token("--accent"), background),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        worstContrastAgainstBackground(token("--primary"), background),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        worstContrastAgainstBackground(token("--accent-strong"), background),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(["sage", "lichen"] as const)(
    "%s: button label text reaches 4.5:1 on primary/strong fills",
    (look) => {
      const token = renderTheme(look);
      const onPrimary = token("--on-primary");

      expect(contrast(onPrimary, token("--primary"))).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        contrast(onPrimary, token("--accent-strong")),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(["sage", "lichen"] as const)(
    "%s: card kicker/link text reaches 4.5:1 on card fills",
    (look) => {
      const token = renderTheme(look);
      const cardBg = token("--card-bg");

      expect(contrast(token("--card-kicker"), cardBg)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrast(token("--card-link"), cardBg)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        contrast(token("--card-link-hover"), cardBg),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );
});
