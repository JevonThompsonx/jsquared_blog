import { expect, test } from "@playwright/test";

test.describe("legacy settings route", () => {
  test("/settings server-redirects into the account route", async ({ page, request }) => {
    const redirectResponse = await request.get("/settings", { maxRedirects: 0 });
    const location = redirectResponse.headers().location;

    expect(redirectResponse.status()).toBeGreaterThanOrEqual(300);
    expect(redirectResponse.status()).toBeLessThan(400);
    expect(location).toBeTruthy();
    expect(new URL(location!, "http://localhost").pathname).toBe("/account");

    await page.goto("/settings");

    await expect(page).toHaveURL(/\/account(?:\?|$)/);
    await expect(page.getByRole("main").first()).toBeVisible();
  });
});
