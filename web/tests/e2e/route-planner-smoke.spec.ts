import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const allowedOrigin = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").origin;

function trackUnexpectedExternalRequests(page: Page) {
  const unexpectedRequests: string[] = [];

  page.on("request", (request) => {
    const url = request.url();

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return;
    }

    if (new URL(url).origin !== allowedOrigin) {
      unexpectedRequests.push(url);
    }
  });

  return unexpectedRequests;
}

test.describe("route planner retirement", () => {
  test("/route-planner redirects visitors to /wishlist", async ({ page }) => {
    const unexpectedRequests = trackUnexpectedExternalRequests(page);

    await page.goto("/route-planner");

    await expect(page).toHaveURL(/\/wishlist$/);
    await expect(page.getByRole("heading", { name: "Travel Wishlist" })).toBeVisible();
    expect(unexpectedRequests).toEqual([]);
  });

  test("/api/route-plans returns a retired response", async ({ request }) => {
    const response = await request.post("/api/route-plans", {
      data: {
        source: "public-wishlist",
        origin: "Seattle, WA",
        destination: "Banff, AB",
      },
    });

    expect(response.status()).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: "Route planner retired",
      redirectTo: "/wishlist",
    });
  });
});
