import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

function isHomepageFeedPageTwo(url: string): boolean {
  const parsedUrl = new URL(url);

  return parsedUrl.pathname === "/api/posts"
    && parsedUrl.searchParams.get("limit") === "20"
    && parsedUrl.searchParams.get("offset") === "20"
    && (parsedUrl.searchParams.get("search") ?? "") === "";
}

async function scrollToFeedEnd(page: Page) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" });
    });
    await page.waitForTimeout(250);
  }
}

async function skipIfHomepageFeedCannotPaginate(page: Page) {
  test.skip(
    await page.getByText("You've reached the end of the adventures!", { exact: true }).isVisible(),
    "Quarantined until the managed public fixture guarantees a second homepage feed page (>20 published posts).",
  );
}

test.describe("homepage infinite feed", () => {
  test("scrolling the homepage loads the next feed page and renders the end-state shell", async ({ page }) => {
    const appendedPostTitle = `Playwright appended story ${Date.now()}`;

    await page.route("**/api/posts?**", async (route) => {
      if (!isHomepageFeedPageTwo(route.request().url())) {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          posts: [
            {
              id: `playwright-home-feed-${Date.now()}`,
              slug: `playwright-home-feed-${Date.now()}`,
              title: appendedPostTitle,
              description: "Mocked page-two story used to pin infinite-feed pagination.",
              excerpt: "Mocked page-two story used to pin infinite-feed pagination.",
              imageUrl: null,
              category: "Travel",
              createdAt: "2026-01-15T12:00:00.000Z",
              publishedAt: "2026-01-15T12:00:00.000Z",
              status: "published",
              layoutType: "standard",
              tags: [],
              images: [],
              source: "turso",
              locationName: null,
              locationLat: null,
              locationLng: null,
              locationZoom: null,
              iovanderUrl: null,
              song: null,
              commentCount: 0,
              readingTimeMinutes: 4,
            },
          ],
          hasMore: false,
        }),
      });
    });

    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Stories from the trail" })).toBeVisible();
    await expect(page.locator("article").first()).toBeVisible({ timeout: 15_000 });

    await skipIfHomepageFeedCannotPaginate(page);

    const pageTwoResponsePromise = page.waitForResponse((response) => {
      return response.request().method() === "GET" && isHomepageFeedPageTwo(response.url()) && response.ok();
    });

    await scrollToFeedEnd(page);
    await pageTwoResponsePromise;

    await expect(page.getByLabel(`Read post: ${appendedPostTitle}`)).toBeVisible();
    await expect(page.getByText("You've reached the end of the adventures!", { exact: true })).toBeVisible();
  });

  test("homepage shows a stable retry panel when loading the next feed page fails", async ({ page }) => {
    await page.route("**/api/posts?**", async (route) => {
      if (!isHomepageFeedPageTwo(route.request().url())) {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 500,
        contentType: "text/plain",
        body: "upstream feed failure",
      });
    });

    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Stories from the trail" })).toBeVisible();
    await expect(page.locator("article").first()).toBeVisible({ timeout: 15_000 });

    await skipIfHomepageFeedCannotPaginate(page);

    const pageTwoResponsePromise = page.waitForResponse((response) => {
      return response.request().method() === "GET" && isHomepageFeedPageTwo(response.url()) && response.status() === 500;
    });

    await scrollToFeedEnd(page);
    await pageTwoResponsePromise;

    await expect(page.getByText("More stories could not be loaded right now.", { exact: true })).toBeVisible();
    await expect(page.getByText("The trail stalled for a moment. Scroll again in a bit to retry loading more stories.", { exact: true })).toBeVisible();
  });
});
