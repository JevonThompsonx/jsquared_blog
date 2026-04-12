import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

function stripCountry(displayName: string): string {
  const parts = displayName.split(",");
  return parts.slice(0, -1).join(",").trim();
}

export async function GET(request: Request): Promise<NextResponse> {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rateLimitResult = await checkRateLimit(`location-autocomplete:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rateLimitResult.allowed) {
    return tooManyRequests(rateLimitResult);
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ error: "Invalid autocomplete request" }, { status: 422 });
  }

  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&limit=5`;
    const res = await fetch(url, {
      headers: {
        // Nominatim usage policy requires a descriptive User-Agent identifying the app
        // and contact info so Nominatim can reach the operator if needed.
        "User-Agent": "jsquared-blog/1.0 (https://jsquaredadventures.com)",
      },
    });
    const data: NominatimResult[] = await res.json();

    const suggestions = data.map((item) => ({
      provider: "nominatim",
      placeId: String(item.place_id),
      locationName: stripCountry(item.display_name),
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      zoom: 10,
      kind: item.type,
    }));

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ error: "Location suggestions unavailable" }, { status: 503 });
  }
}
