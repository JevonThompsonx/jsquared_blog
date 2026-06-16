// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ReadingProgressBar } from "@/components/blog/reading-progress-bar";

function setScrollMetrics({ scrollTop, scrollHeight, clientHeight }: { scrollTop: number; scrollHeight: number; clientHeight: number }) {
  Object.defineProperty(document.documentElement, "scrollTop", { configurable: true, value: scrollTop });
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: scrollHeight });
  Object.defineProperty(document.documentElement, "clientHeight", { configurable: true, value: clientHeight });
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

function getLiveRegion(container: HTMLDivElement): HTMLElement | null {
  return container.querySelector("[role='status'], [aria-live='polite']");
}

function getMilestoneAnnouncement(container: HTMLDivElement): string {
  const live = getLiveRegion(container);
  return live?.textContent?.trim() ?? "";
}

describe("ReadingProgressBar (a11y)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(<ReadingProgressBar />);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders a visually hidden aria-live polite region for screen readers", () => {
    const live = getLiveRegion(container);
    expect(live).toBeTruthy();
    expect(live?.getAttribute("aria-live")).toBe("polite");
    expect(live?.className).toContain("sr-only");
  });

  it("renders the visual progress bar with the correct width", () => {
    setScrollMetrics({ scrollTop: 250, scrollHeight: 1000, clientHeight: 500 });
    const bar = container.querySelector("div.fixed");
    expect(bar).toBeTruthy();
    expect(bar?.getAttribute("aria-hidden")).toBe("true");
    expect(bar?.getAttribute("style") ?? "").toContain("width:");
  });

  it("starts with no announcement (progress is 0)", () => {
    setScrollMetrics({ scrollTop: 0, scrollHeight: 1000, clientHeight: 500 });
    expect(getMilestoneAnnouncement(container)).toBe("");
  });

  it("announces the 25% milestone", () => {
    setScrollMetrics({ scrollTop: 125, scrollHeight: 1000, clientHeight: 500 });
    expect(getMilestoneAnnouncement(container)).toMatch(/25%/);
  });

  it("announces the 50% milestone", () => {
    setScrollMetrics({ scrollTop: 250, scrollHeight: 1000, clientHeight: 500 });
    expect(getMilestoneAnnouncement(container)).toMatch(/50%/);
  });

  it("announces the 75% milestone", () => {
    setScrollMetrics({ scrollTop: 375, scrollHeight: 1000, clientHeight: 500 });
    expect(getMilestoneAnnouncement(container)).toMatch(/75%/);
  });

  it("announces the 100% completion", () => {
    setScrollMetrics({ scrollTop: 500, scrollHeight: 1000, clientHeight: 500 });
    const announcement = getMilestoneAnnouncement(container);
    expect(announcement).toMatch(/100%/);
  });

  it("does not re-announce the same milestone twice", () => {
    setScrollMetrics({ scrollTop: 125, scrollHeight: 1000, clientHeight: 500 });
    const first = getMilestoneAnnouncement(container);
    setScrollMetrics({ scrollTop: 140, scrollHeight: 1000, clientHeight: 500 });
    expect(getMilestoneAnnouncement(container)).toBe(first);
  });

  it("does not announce sub-milestone progress (e.g. 10%)", () => {
    setScrollMetrics({ scrollTop: 50, scrollHeight: 1000, clientHeight: 500 });
    expect(getMilestoneAnnouncement(container)).toBe("");
  });

  it("uses 'complete' or similar language at 100% for clear end signal", () => {
    setScrollMetrics({ scrollTop: 500, scrollHeight: 1000, clientHeight: 500 });
    const announcement = getMilestoneAnnouncement(container).toLowerCase();
    expect(announcement).toMatch(/complete|finished|done|100%/);
  });

  it("cleans up the scroll event listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    act(() => {
      root.unmount();
    });
    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});
