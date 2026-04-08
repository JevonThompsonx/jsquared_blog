// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import { RoutePlannerForm } from "@/components/blog/route-planner-form";

describe("RoutePlannerForm", () => {
  it("submits planner input and renders returned suggestions", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      plan: {
        provider: "geoapify",
        mode: "drive",
        origin: { label: "Seattle, WA", lat: 47.6062, lng: -122.3321 },
        destination: { label: "Banff, AB", lat: 51.1784, lng: -115.5708 },
        totals: { distanceMeters: 12345, durationSeconds: 6789 },
        geometry: [],
        suggestions: [
          {
            id: "place-1",
            name: "Glacier National Park",
            locationName: "West Glacier, MT",
            locationLat: 48.7596,
            locationLng: -113.787,
            locationZoom: 8,
            visited: false,
            externalUrl: null,
            distanceFromRouteKm: 10.5,
            routeProgress: 0.45,
          },
        ],
      },
    }), { status: 200 }));
    globalThis.fetch = fetchMock;

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<RoutePlannerForm />);
    });

    const originInput = container.querySelector('input[name="origin"]');
    const destinationInput = container.querySelector('input[name="destination"]');
    const form = container.querySelector("form");

    if (!(originInput instanceof HTMLInputElement) || !(destinationInput instanceof HTMLInputElement) || !(form instanceof HTMLFormElement)) {
      throw new Error("Expected route planner form inputs to render");
    }

    await act(async () => {
      originInput.value = "Seattle, WA";
      originInput.dispatchEvent(new Event("input", { bubbles: true }));
      destinationInput.value = "Banff, AB";
      destinationInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/route-plans", expect.objectContaining({ method: "POST" }));
    expect(container.textContent).toContain("Glacier National Park");
    expect(container.textContent).toContain("10.5 km off route");

    await act(async () => {
      root.unmount();
    });
    container.remove();
    globalThis.fetch = originalFetch;
  });

  it("renders a stable retry message when the planner request fails", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: "Route planner unavailable" }), { status: 503 }));
    globalThis.fetch = fetchMock;

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<RoutePlannerForm />);
    });

    const originInput = container.querySelector('input[name="origin"]');
    const destinationInput = container.querySelector('input[name="destination"]');
    const form = container.querySelector("form");

    if (!(originInput instanceof HTMLInputElement) || !(destinationInput instanceof HTMLInputElement) || !(form instanceof HTMLFormElement)) {
      throw new Error("Expected route planner form inputs to render");
    }

    await act(async () => {
      originInput.value = "Seattle, WA";
      originInput.dispatchEvent(new Event("input", { bubbles: true }));
      destinationInput.value = "Banff, AB";
      destinationInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Unable to plan that route right now. Please try again.");

    await act(async () => {
      root.unmount();
    });
    container.remove();
    globalThis.fetch = originalFetch;
  });

  it("treats a no-suggestions response as an empty success state", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: "No route suggestions available" }), { status: 404 }));
    globalThis.fetch = fetchMock;

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<RoutePlannerForm />);
    });

    const originInput = container.querySelector('input[name="origin"]');
    const destinationInput = container.querySelector('input[name="destination"]');
    const form = container.querySelector("form");

    if (!(originInput instanceof HTMLInputElement) || !(destinationInput instanceof HTMLInputElement) || !(form instanceof HTMLFormElement)) {
      throw new Error("Expected route planner form inputs to render");
    }

    await act(async () => {
      originInput.value = "Seattle, WA";
      originInput.dispatchEvent(new Event("input", { bubbles: true }));
      destinationInput.value = "Banff, AB";
      destinationInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Suggested wishlist stops");
    expect(container.textContent).toContain("No wishlist stops matched this route yet.");
    expect(container.textContent).not.toContain("Unable to plan that route right now. Please try again.");

    await act(async () => {
      root.unmount();
    });
    container.remove();
    globalThis.fetch = originalFetch;
  });
});
