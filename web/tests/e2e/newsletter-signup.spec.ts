import { expect, test } from "@playwright/test";

test.describe("newsletter signup form", () => {
  test("homepage newsletter form submits the expected payload and shows success feedback", async ({ page }) => {
    let requestBody: unknown = null;

    await page.route("**/api/newsletter", async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "subscribed", source: "created" }),
      });
    });

    await page.goto("/");

    const emailField = page.getByLabel("Email address");
    await expect(emailField).toBeVisible();
    await emailField.fill("traveler@example.com");

    await page.getByRole("button", { name: "Subscribe" }).click();

    await expect(page.getByText("You're subscribed!", { exact: true })).toBeVisible();
    expect(requestBody).toEqual({
      email: "traveler@example.com",
      source: "homepage-bottom",
    });
  });

  test("homepage newsletter form shows bounded rate-limit feedback", async ({ page }) => {
    await page.route("**/api/newsletter", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ error: "Too many requests" }),
      });
    });

    await page.goto("/");

    const newsletterForm = page.locator('form:has(#newsletter-email)').first();
    await newsletterForm.getByLabel("Email address").fill("traveler@example.com");
    await newsletterForm.getByRole("button", { name: "Subscribe" }).click();

    await expect(newsletterForm.getByRole("alert")).toContainText("Too many attempts, please wait a moment.");
    await expect(page.getByText("You're subscribed!", { exact: true })).toHaveCount(0);
  });
});
