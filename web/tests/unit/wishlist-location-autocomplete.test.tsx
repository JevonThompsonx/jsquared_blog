// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WishlistLocationAutocomplete } from "@/components/admin/wishlist-location-autocomplete";

function makeSuggestionResponse(items: { locationName: string }[] = []) {
  return {
    suggestions: items.map((item, i) => ({
      provider: "nominatim",
      placeId: `id-${i}`,
      locationName: item.locationName,
      latitude: 48.0,
      longitude: -113.0,
      zoom: 10,
      kind: "city",
    })),
  };
}

describe("WishlistLocationAutocomplete", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
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
  });

  function render(jsx: React.ReactElement) {
    act(() => {
      root.render(jsx);
    });
  }

  function getInput(): HTMLInputElement {
    return container.querySelector("input[name='locationName']") as HTMLInputElement;
  }

  /** Simulate a user typing into a React-controlled input (bypasses _valueTracker). */
  function setInputValue(input: HTMLInputElement, value: string) {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    nativeSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  it("renders input with empty string when no defaultLocationName prop", () => {
    render(<WishlistLocationAutocomplete />);

    const input = getInput();
    expect(input).toBeTruthy();
    expect(input.value).toBe("");
  });

  it("renders input pre-filled with defaultLocationName", () => {
    render(<WishlistLocationAutocomplete defaultLocationName="Glacier National Park" />);

    const input = getInput();
    expect(input.value).toBe("Glacier National Park");
  });

  it("does not call fetch when input has fewer than 2 characters", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeSuggestionResponse()), { status: 200 }),
    );

    render(<WishlistLocationAutocomplete />);

    await act(async () => {
      const input = getInput();
      input.value = "G";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      // Wait past debounce
      await new Promise((r) => setTimeout(r, 400));
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls /api/admin/location-autocomplete after debounce for 2+ char input", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeSuggestionResponse([{ locationName: "Glacier" }])), {
        status: 200,
      }),
    );

    render(<WishlistLocationAutocomplete />);

    await act(async () => {
      setInputValue(getInput(), "Glacier");
      await new Promise((r) => setTimeout(r, 400));
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url] = fetchSpy.mock.calls[0] as [string, ...unknown[]];
    expect(url).toContain("/api/admin/location-autocomplete");
    expect(url).toContain("Glacier");
  });

  it("renders suggestion dropdown with locationName values", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify(
          makeSuggestionResponse([
            { locationName: "Glacier National Park, Montana" },
            { locationName: "Glacier, Washington" },
          ]),
        ),
        { status: 200 },
      ),
    );

    render(<WishlistLocationAutocomplete />);

    await act(async () => {
      setInputValue(getInput(), "Glacier");
      await new Promise((r) => setTimeout(r, 400));
    });

    const suggestions = container.querySelectorAll("li");
    const texts = Array.from(suggestions).map((li) => li.textContent);
    expect(texts).toContain("Glacier National Park, Montana");
    expect(texts).toContain("Glacier, Washington");
  });

  it("sets input value to suggestion.locationName on click", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify(makeSuggestionResponse([{ locationName: "Glacier National Park, Montana" }])),
        { status: 200 },
      ),
    );

    render(<WishlistLocationAutocomplete />);

    await act(async () => {
      setInputValue(getInput(), "Glacier");
      await new Promise((r) => setTimeout(r, 400));
    });

    await act(async () => {
      const item = container.querySelector("li") as HTMLElement;
      item.click();
    });

    expect(getInput().value).toBe("Glacier National Park, Montana");
  });

  it("renders an error message when the API returns a non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Unauthorized", { status: 401 }),
    );

    render(<WishlistLocationAutocomplete />);

    await act(async () => {
      setInputValue(getInput(), "Glacier");
      await new Promise((r) => setTimeout(r, 400));
    });

    const errorEl = container.querySelector("[data-testid='autocomplete-error']");
    expect(errorEl).toBeTruthy();
    expect(errorEl?.textContent).toBeTruthy();
  });
});
