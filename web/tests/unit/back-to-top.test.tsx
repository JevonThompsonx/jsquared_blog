// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BackToTop } from "@/components/ui/back-to-top";

describe("BackToTop", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    if (!window.matchMedia) {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    }
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function setScrollY(y: number) {
    Object.defineProperty(window, "scrollY", { configurable: true, value: y });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
  }

  function getButton(): HTMLButtonElement | null {
    return container.querySelector("button");
  }

  it("renders a button with an accessible label", () => {
    act(() => {
      root.render(<BackToTop />);
    });
    const button = getButton();
    expect(button).toBeTruthy();
    expect(button?.getAttribute("aria-label")).toBe("Back to top");
  });

  it("is hidden initially (before scroll)", () => {
    act(() => {
      root.render(<BackToTop />);
    });
    setScrollY(0);
    const button = getButton();
    expect(button?.className).toContain("opacity-0");
    expect(button?.className).toContain("pointer-events-none");
  });

  it("becomes visible after scrolling past the threshold", () => {
    act(() => {
      root.render(<BackToTop />);
    });
    setScrollY(800);
    const button = getButton();
    expect(button?.className).toContain("opacity-100");
    expect(button?.className).not.toContain("pointer-events-none");
  });

  it("hides again when scrolled back above the threshold", () => {
    act(() => {
      root.render(<BackToTop />);
    });
    setScrollY(800);
    setScrollY(100);
    const button = getButton();
    expect(button?.className).toContain("opacity-0");
  });

  it("calls window.scrollTo with smooth behavior when clicked", () => {
    act(() => {
      root.render(<BackToTop />);
    });
    setScrollY(1000);
    const scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    act(() => {
      getButton()?.click();
    });
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("uses auto behavior when prefers-reduced-motion is set", () => {
    const matchMediaMock = vi.fn((query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: matchMediaMock,
    });

    act(() => {
      root.render(<BackToTop />);
    });
    setScrollY(1000);
    const scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    act(() => {
      getButton()?.click();
    });
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });

  describe("accessibility (a11y)", () => {
    it("is hidden from assistive technology and not focusable when invisible (scrollY < 500)", () => {
      act(() => {
        root.render(<BackToTop />);
      });
      setScrollY(0);
      const button = getButton();
      expect(button).toBeTruthy();
      expect(button?.getAttribute("aria-hidden")).toBe("true");
      expect(button?.getAttribute("tabindex")).toBe("-1");
      expect(button?.tabIndex).toBe(-1);
    });

    it("is exposed to assistive technology and focusable when visible (scrollY > 500)", () => {
      act(() => {
        root.render(<BackToTop />);
      });
      setScrollY(800);
      const button = getButton();
      expect(button).toBeTruthy();
      expect(button?.getAttribute("aria-hidden")).toBe("false");
      expect(button?.getAttribute("tabindex")).toBe("0");
      expect(button?.tabIndex).toBe(0);
    });

    it("returns to hidden / not focusable when scrolled back above the threshold", () => {
      act(() => {
        root.render(<BackToTop />);
      });
      setScrollY(800);
      expect(getButton()?.getAttribute("aria-hidden")).toBe("false");
      expect(getButton()?.getAttribute("tabindex")).toBe("0");

      setScrollY(100);
      const button = getButton();
      expect(button?.getAttribute("aria-hidden")).toBe("true");
      expect(button?.getAttribute("tabindex")).toBe("-1");
      expect(button?.tabIndex).toBe(-1);
    });
  });
});
