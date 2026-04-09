import { expect, test } from "@playwright/test";

import { loadEnvironmentFiles } from "@/lib/env-loader";

loadEnvironmentFiles();

const publicEmail = process.env.E2E_PUBLIC_EMAIL?.trim() || "";
const publicPassword = process.env.E2E_PUBLIC_PASSWORD?.trim() || "";

test.describe("public login return path", () => {
  test("fresh public login returns to the requested signed-in route", async ({ page }) => {
    test.skip(!publicEmail || !publicPassword, "Run bun run seed:e2e to provision public fixture credentials for live login coverage.");

    await page.goto("/login?redirectTo=/account");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await page.getByLabel("Email").fill(publicEmail);
    await page.getByLabel("Password").fill(publicPassword);

    await Promise.all([
      page.waitForURL(/\/account$/, { timeout: 20_000 }),
      page.getByRole("button", { name: "Sign in" }).click(),
    ]);

    await expect(page.getByRole("heading", { name: "Account Settings" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    await expect(page.getByText(publicEmail, { exact: true }).first()).toBeVisible();
  });
});
