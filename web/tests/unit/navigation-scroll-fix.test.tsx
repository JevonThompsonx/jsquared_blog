// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pathnameMock = vi.fn(() => "/");

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
}));

import { NavigationScrollFix } from "@/components/providers/navigation-scroll-fix";

describe("NavigationScrollFix", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    pathnameMock.mockReturnValue("/");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    // Run the animation frame synchronously so focus assertions are immediate.
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("scrolls to top and moves focus to the main landmark on pathname change", () => {
    const main = document.createElement("main");
    main.id = "main-content";
    main.tabIndex = -1;
    document.body.appendChild(main);
    const focusSpy = vi.spyOn(main, "focus");
    const scrollSpy = vi
      .spyOn(window, "scrollTo")
      .mockImplementation(() => undefined);

    act(() => {
      root.render(<NavigationScrollFix />);
    });

    // First render establishes the previous pathname; no scroll/focus yet.
    expect(scrollSpy).not.toHaveBeenCalled();
    expect(focusSpy).not.toHaveBeenCalled();

    pathnameMock.mockReturnValue("/about");
    act(() => {
      root.render(<NavigationScrollFix />);
    });

    expect(scrollSpy).toHaveBeenCalledWith(0, 0);
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("leaves focus alone for hash navigations so the anchor target keeps it", () => {
    const main = document.createElement("main");
    main.id = "main-content";
    main.tabIndex = -1;
    document.body.appendChild(main);
    const focusSpy = vi.spyOn(main, "focus");
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    window.location.hash = "#section";

    act(() => {
      root.render(<NavigationScrollFix />);
    });

    pathnameMock.mockReturnValue("/about");
    act(() => {
      root.render(<NavigationScrollFix />);
    });

    expect(focusSpy).not.toHaveBeenCalled();
    window.location.hash = "";
  });
});
