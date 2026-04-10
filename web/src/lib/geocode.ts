import { z } from "zod";

const GEOCODE_TIMEOUT_MS = 4_000;

export type GeoResult = {
  lat: number;
  lng: number;
  zoom: number;
};

export async function geocodeLocation(locationName: string): Promise<GeoResult | null> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), GEOCODE_TIMEOUT_MS);

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "jsquaredadventures.com (travel blog)" },
      signal: abortController.signal,
    });

    if (!res.ok) {
      return null;
    }

    const data = z
      .array(z.object({ lat: z.string(), lon: z.string(), type: z.string() }))
      .parse(await res.json());
    const first = data[0];
    if (!first) {
      return null;
    }

    const lat = Number.parseFloat(first.lat);
    const lng = Number.parseFloat(first.lon);

    const countryTypes = new Set(["country", "continent"]);
    const regionTypes = new Set(["state", "region", "province", "county"]);
    const cityTypes = new Set(["city", "town", "village", "municipality"]);
    let zoom: number;
    if (countryTypes.has(first.type)) zoom = 5;
    else if (regionTypes.has(first.type)) zoom = 7;
    else if (cityTypes.has(first.type)) zoom = 10;
    else zoom = 13;

    return { lat, lng, zoom };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
