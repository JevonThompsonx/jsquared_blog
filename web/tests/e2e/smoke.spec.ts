import { test } from "@playwright/test";

test.describe("marketing smoke", () => {
  test.skip(!process.env.E2E_BASE_URL, "Set E2E_BASE_URL to run browser smoke tests.");

  test("homepage renders", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("heading", { name: /J\u00b2Adventures/i }).waitFor();
  });
});
