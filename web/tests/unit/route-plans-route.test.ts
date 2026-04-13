import { describe, expect, it } from "vitest";

function seedRequiredServerEnv() {
  process.env.TURSO_DATABASE_URL ??= "https://example-db.turso.io";
  process.env.TURSO_AUTH_TOKEN ??= "test-token";
  process.env.AUTH_SECRET ??= "12345678901234567890123456789012";
  process.env.AUTH_GITHUB_ID ??= "test-github-id";
  process.env.AUTH_GITHUB_SECRET ??= "test-github-secret";
  process.env.CLOUDINARY_CLOUD_NAME ??= "test-cloud";
  process.env.CLOUDINARY_API_KEY ??= "test-key";
  process.env.CLOUDINARY_API_SECRET ??= "test-secret";
  process.env.SUPABASE_URL ??= "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY ??= "test-supabase-key";
}

let routeModulePromise: Promise<typeof import("@/app/api/route-plans/route")> | undefined;

async function loadRouteModule() {
  seedRequiredServerEnv();
  routeModulePromise ??= import("@/app/api/route-plans/route");
  return routeModulePromise;
}

describe("POST /api/route-plans", () => {
  it("returns 410 with a wishlist redirect target", async () => {
    const { POST } = await loadRouteModule();

    const response = await POST(
      new Request("http://localhost/api/route-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "public-wishlist",
          origin: "Seattle, WA",
          destination: "Banff, AB",
        }),
      }),
    );

    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      error: "Route planner retired",
      redirectTo: "/wishlist",
    });
  });

  it("returns the same retired response for invalid payloads", async () => {
    const { POST } = await loadRouteModule();

    const response = await POST(
      new Request("http://localhost/api/route-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "public-wishlist", origin: "", destination: "Banff, AB" }),
      }),
    );

    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      error: "Route planner retired",
      redirectTo: "/wishlist",
    });
  });

  it("keeps the route on the node runtime", async () => {
    const { runtime } = await loadRouteModule();

    expect(runtime).toBe("nodejs");
  });
});
