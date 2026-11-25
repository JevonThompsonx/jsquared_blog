import { expect, test } from "@playwright/test";

test.describe("public auth redirect links", () => {
  test("login keeps a safe return target on the hosted sign-in and create-account links", async ({
    page,
  }) => {
    await page.goto("/login?redirectTo=/bookmarks");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Continue to sign in" }),
    ).toHaveAttribute("href", "/api/auth/login?returnTo=%2Fbookmarks");
    await expect(
      page.getByRole("link", { name: "Create one" }),
    ).toHaveAttribute("href", "/signup?returnTo=%2Fbookmarks");
  });

  test("signup keeps a safe return target on the hosted sign-up and sign-in links", async ({
    page,
  }) => {
    await page.goto("/signup?redirectTo=/bookmarks");

    await expect(
      page.getByRole("heading", { name: "Create an account" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Continue to sign up" }),
    ).toHaveAttribute("href", "/api/auth/signup?returnTo=%2Fbookmarks");
    await expect(
      page.locator("#main-content").getByRole("link", { name: "Sign in" }),
    ).toHaveAttribute("href", "/login?returnTo=%2Fbookmarks");
  });

  test("login drops hostile redirect targets", async ({ page }) => {
    await page.goto("/login?redirectTo=//evil.example/path");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Continue to sign in" }),
    ).toHaveAttribute("href", "/api/auth/login");
    await expect(
      page.getByRole("link", { name: "Create one" }),
    ).toHaveAttribute("href", "/signup");
    await expect(page.locator("body")).not.toContainText("evil.example");
  });

  test("signup drops hostile redirect targets", async ({ page }) => {
    await page.goto("/signup?redirectTo=https://evil.example/path%0Aboom");

    await expect(
      page.getByRole("heading", { name: "Create an account" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Continue to sign up" }),
    ).toHaveAttribute("href", "/api/auth/signup");
    await expect(
      page.locator("#main-content").getByRole("link", { name: "Sign in" }),
    ).toHaveAttribute("href", "/login");
    await expect(page.locator("body")).not.toContainText("evil.example");
  });
});
