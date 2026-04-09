import { expect, test } from "@playwright/test";

const whitespaceOnlyRoutes = [
  "/posts/%20%20",
  "/tag/%20%20",
  "/series/%20%20",
  "/author/%20%20",
  "/category/%20%20",
] as const;

test.describe("malformed dynamic routes fail closed", () => {
  for (const pathname of whitespaceOnlyRoutes) {
    test(`${pathname} renders the not-found shell`, async ({ page }) => {
      await page.goto(pathname);

      await expect(page.getByText("Trail marker missing")).toBeVisible();
      await expect(page.getByRole("heading", { name: "That page could not be found." })).toBeVisible();
      await expect(page.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/");
    });
  }

  test("malformed percent-encoding returns the framework bad-request shell", async ({ request }) => {
    const response = await request.get("/category/%E0%A4%A");

    expect(response.status()).toBe(400);
  });
});
