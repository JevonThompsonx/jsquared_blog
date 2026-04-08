import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const allowedOrigin = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").origin;

function isRoutePlansRequest(url: string): boolean {
  return new URL(url).pathname === "/api/route-plans";
}

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

test.describe("route planner smoke tests", () => {
  test("happy path renders mocked wishlist suggestions", async ({ page }) => {
    const unexpectedRequests = trackUnexpectedExternalRequests(page);

    await page.route("**/api/route-plans", async (route) => {
      expect(route.request().postDataJSON()).toMatchObject({
        source: "public-wishlist",
        origin: "Seattle, WA",
        destination: "Banff, AB",
        mode: "drive",
        includeVisited: false,
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          plan: {
            suggestions: [
              {
                id: "place-1",
                name: "Glacier National Park",
                locationName: "West Glacier, MT",
                visited: false,
                distanceFromRouteKm: 10.5,
              },
            ],
          },
        }),
      });
    });

    await page.goto("/route-planner");

    await expect(page.getByRole("heading", { name: "Plan a route between two places" })).toBeVisible();

    await page.getByLabel("Origin").fill("Seattle, WA");
    await page.getByLabel("Destination").fill("Banff, AB");

    await Promise.all([
      page.waitForResponse((response) => {
        return response.request().method() === "POST" && isRoutePlansRequest(response.url()) && response.ok();
      }),
      page.getByRole("button", { name: "Plan route" }).click(),
    ]);

    await expect(page.getByRole("heading", { name: "Suggested wishlist stops" })).toBeVisible();
    await expect(page.getByText("Glacier National Park", { exact: true })).toBeVisible();
    await expect(page.getByText("West Glacier, MT", { exact: true })).toBeVisible();
    await expect(page.getByText("10.5 km off route", { exact: true })).toBeVisible();
    expect(unexpectedRequests).toEqual([]);
  });

  test("404 planner response renders the empty success state", async ({ page }) => {
    const unexpectedRequests = trackUnexpectedExternalRequests(page);

    await page.route("**/api/route-plans", async (route) => {
      expect(route.request().postDataJSON()).toMatchObject({
        source: "public-wishlist",
        origin: "Seattle, WA",
        destination: "Banff, AB",
        mode: "drive",
        includeVisited: false,
      });

      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "No route suggestions available" }),
      });
    });

    // The current public route contract uses 404 to mean "no suggestions matched".
    await page.goto("/route-planner");

    await page.getByLabel("Origin").fill("Seattle, WA");
    await page.getByLabel("Destination").fill("Banff, AB");

    await Promise.all([
      page.waitForResponse((response) => {
        return response.request().method() === "POST" && isRoutePlansRequest(response.url()) && response.status() === 404;
      }),
      page.getByRole("button", { name: "Plan route" }).click(),
    ]);

    await expect(page.getByRole("heading", { name: "Suggested wishlist stops" })).toBeVisible();
    await expect(page.getByText("No wishlist stops matched this route yet.", { exact: true })).toBeVisible();
    await expect(page.getByText("Unable to plan that route right now. Please try again.", { exact: true })).toHaveCount(0);
    expect(unexpectedRequests).toEqual([]);
  });

  test("small-screen planner flow stays usable", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      screen: { width: 375, height: 667 },
    });

    try {
      const page = await context.newPage();
      const unexpectedRequests = trackUnexpectedExternalRequests(page);

      await page.route("**/api/route-plans", async (route) => {
        expect(route.request().postDataJSON()).toMatchObject({
          source: "public-wishlist",
          origin: "Calgary, AB",
          destination: "Banff, AB",
          mode: "drive",
          includeVisited: true,
        });

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            plan: {
              suggestions: [
                {
                  id: "place-2",
                  name: "Banff Gondola",
                  locationName: "Banff, AB",
                  visited: true,
                  distanceFromRouteKm: 2.1,
                },
              ],
            },
          }),
        });
      });

      await page.goto("/route-planner");

      const submitButton = page.getByRole("button", { name: "Plan route" });
      await expect(page.getByRole("heading", { name: "Plan a route between two places" })).toBeVisible();
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toBeInViewport();

      await page.getByLabel("Origin").fill("Calgary, AB");
      await page.getByLabel("Destination").fill("Banff, AB");
      await page.getByLabel("Include visited wishlist stops").check();

      await Promise.all([
        page.waitForResponse((response) => {
          return response.request().method() === "POST" && isRoutePlansRequest(response.url()) && response.ok();
        }),
        submitButton.click(),
      ]);

      await expect(page.getByText("Banff Gondola", { exact: true })).toBeVisible();
      await expect(page.getByText("Visited", { exact: true })).toBeVisible();
      await expect(page.getByText("2.1 km off route", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(unexpectedRequests).toEqual([]);
    } finally {
      await context.close();
    }
  });
});
