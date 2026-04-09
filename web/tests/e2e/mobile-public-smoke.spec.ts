import { expect, test } from "@playwright/test";
import type { Browser } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

async function openSmallScreenPage(browser: Browser, path: string) {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 375, height: 667 },
    screen: { width: 375, height: 667 },
  });

  try {
    const page = await context.newPage();
    await page.goto(path);

    return { context, page };
  } catch (error) {
    await context.close();
    throw error;
  }
}

function getFirstMatchedPath(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  return match?.[1] ?? null;
}

test.describe("mobile public shells", () => {
  test("homepage stays usable without horizontal overflow on a phone-sized viewport", async ({ browser }) => {
    const { context, page } = await openSmallScreenPage(browser, "/");

    try {
      await expect(page.getByRole("heading", { name: "J²Adventures" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Stories from the trail" })).toBeVisible();
      await expect(page.locator("article").first()).toBeVisible({ timeout: 15_000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    } finally {
      await context.close();
    }
  });

  test("a published story page stays readable on a phone-sized viewport when public content exists", async ({ browser, request }) => {
    const homepageResponse = await request.get("/");
    expect(homepageResponse.status()).toBe(200);

    const homepageHtml = await homepageResponse.text();
    const postPath = getFirstMatchedPath(homepageHtml, /href="(\/posts\/[^"?#]+)"/);

    test.skip(!postPath, "No public story links were available to verify a mobile post shell.");

    const { context, page } = await openSmallScreenPage(browser, postPath!);

    try {
      await expect(page.locator("article")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByText(/min read/)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    } finally {
      await context.close();
    }
  });
});
