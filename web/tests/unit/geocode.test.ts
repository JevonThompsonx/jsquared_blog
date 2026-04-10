import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { geocodeLocation } from "@/lib/geocode";

function makeNominatimResult(overrides: { lat?: string; lon?: string; type?: string } = {}) {
  return [{ lat: "48.7596", lon: "-113.7870", type: "city", ...overrides }];
}

describe("geocodeLocation", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeNominatimResult()), { status: 200 }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns lat/lng/zoom for a valid town query", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeNominatimResult({ type: "town" })), { status: 200 }),
    );

    const result = await geocodeLocation("West Glacier, Montana");

    expect(result).toEqual({ lat: 48.7596, lng: -113.787, zoom: 10 });
  });

  it("returns null when Nominatim responds with a non-ok status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Server Error", { status: 500 }),
    );

    const result = await geocodeLocation("Anywhere");

    expect(result).toBeNull();
  });

  it("returns null when Nominatim returns an empty array", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    const result = await geocodeLocation("Nonexistent Place XYZ");

    expect(result).toBeNull();
  });

  it("returns zoom 5 for country type", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeNominatimResult({ type: "country" })), { status: 200 }),
    );

    const result = await geocodeLocation("Canada");

    expect(result?.zoom).toBe(5);
  });

  it("returns zoom 5 for continent type", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeNominatimResult({ type: "continent" })), { status: 200 }),
    );

    const result = await geocodeLocation("North America");

    expect(result?.zoom).toBe(5);
  });

  it("returns zoom 7 for state type", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeNominatimResult({ type: "state" })), { status: 200 }),
    );

    const result = await geocodeLocation("Montana");

    expect(result?.zoom).toBe(7);
  });

  it("returns zoom 7 for region type", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeNominatimResult({ type: "region" })), { status: 200 }),
    );

    const result = await geocodeLocation("Pacific Northwest");

    expect(result?.zoom).toBe(7);
  });

  it("returns zoom 7 for province type", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeNominatimResult({ type: "province" })), { status: 200 }),
    );

    const result = await geocodeLocation("British Columbia");

    expect(result?.zoom).toBe(7);
  });

  it("returns zoom 7 for county type", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeNominatimResult({ type: "county" })), { status: 200 }),
    );

    const result = await geocodeLocation("Flathead County");

    expect(result?.zoom).toBe(7);
  });

  it("returns zoom 10 for city type", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeNominatimResult({ type: "city" })), { status: 200 }),
    );

    const result = await geocodeLocation("Kalispell");

    expect(result?.zoom).toBe(10);
  });

  it("returns zoom 10 for village type", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeNominatimResult({ type: "village" })), { status: 200 }),
    );

    const result = await geocodeLocation("West Glacier");

    expect(result?.zoom).toBe(10);
  });

  it("returns zoom 10 for municipality type", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeNominatimResult({ type: "municipality" })), { status: 200 }),
    );

    const result = await geocodeLocation("Some Municipality");

    expect(result?.zoom).toBe(10);
  });

  it("returns zoom 13 for other types (e.g. peak)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeNominatimResult({ type: "peak" })), { status: 200 }),
    );

    const result = await geocodeLocation("Mount Reynolds");

    expect(result?.zoom).toBe(13);
  });

  it("returns null when fetch throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network failure"));

    const result = await geocodeLocation("Anywhere");

    expect(result).toBeNull();
  });

  it("sends the correct Nominatim URL for the query", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(makeNominatimResult()), { status: 200 }),
    );

    await geocodeLocation("West Glacier, Montana");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url] = fetchSpy.mock.calls[0] as [string, ...unknown[]];
    expect(url).toContain("nominatim.openstreetmap.org/search");
    expect(url).toContain("West%20Glacier%2C%20Montana");
    expect(url).toContain("format=json");
    expect(url).toContain("limit=1");
  });
});
