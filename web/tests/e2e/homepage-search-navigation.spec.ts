import { expect, test } from "@playwright/test";

test.describe("homepage search navigation", () => {
  test("submitting the header search from the homepage navigates to the matching search route", async ({ page }) => {
    await page.goto("/");

    const headerSearchField = page.locator("header").getByLabel("Search stories").first();
    await headerSearchField.fill("Oregon");
    await headerSearchField.press("Enter");

    await page.waitForURL((url) => url.pathname === "/" && url.searchParams.get("search") === "Oregon");
    await expect(page.getByRole("heading", { name: /Results for|No results for/u })).toBeVisible();
    await expect(page.locator("main").getByLabel("Search stories").first()).toHaveValue("Oregon");
  });

  test("submitting a manual search from the results shell keeps the route-local input in sync", async ({ page }) => {
    await page.goto("/");

    const headerSearchField = page.locator("header").getByLabel("Search stories").first();
    await headerSearchField.fill("road trip");
    await headerSearchField.press("Enter");

    await page.waitForURL((url) => url.pathname === "/" && url.searchParams.get("search") === "road trip");

    const searchField = page.locator("main").getByLabel("Search stories").first();
    await searchField.fill("road trip");
    await searchField.press("Enter");

    await page.waitForURL((url) => url.pathname === "/" && url.searchParams.get("search") === "road trip");
    await expect(page.getByRole("heading", { name: /Results for|No results for/u })).toBeVisible();
    await expect(searchField).toHaveValue("road trip");
  });
});
