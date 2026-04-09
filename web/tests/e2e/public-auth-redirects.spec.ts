import { expect, test } from "@playwright/test";

test.describe("public auth redirect links", () => {
  test("login keeps a safe redirect target on the create-account link", async ({ page }) => {
    await page.goto("/login?redirectTo=/bookmarks");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create one" })).toHaveAttribute(
      "href",
      "/signup?redirectTo=%2Fbookmarks",
    );
  });

  test("signup keeps a safe redirect target on the sign-in link", async ({ page }) => {
    await page.goto("/signup?redirectTo=/bookmarks");

    await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
    await expect(page.locator("#main-content").getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?redirectTo=%2Fbookmarks",
    );
  });

  test("login drops hostile redirect targets from the create-account link", async ({ page }) => {
    await page.goto("/login?redirectTo=//evil.example/path");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create one" })).toHaveAttribute("href", "/signup");
  });

  test("signup drops hostile redirect targets from the sign-in link", async ({ page }) => {
    await page.goto("/signup?redirectTo=https://evil.example/path%0Aboom");

    await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
    await expect(page.locator("#main-content").getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });
});
