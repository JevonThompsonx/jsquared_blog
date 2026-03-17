import { expect, test } from "@playwright/test";

// These tests run against a live server (local dev or production).
// Set E2E_BASE_URL to target a specific environment, otherwise defaults to
// http://localhost:3000 (local dev server must be running).

test.describe("public pages smoke tests", () => {

  test("homepage loads with post feed", async ({ page }) => {
    await page.goto("/");
    // Header is present
    await expect(page.locator("header")).toBeVisible();
    // At least one post card renders
    await expect(page.locator("article").first()).toBeVisible({ timeout: 15_000 });
  });

  test("sitemap.xml returns valid XML", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toMatch(/xml/);
    const body = await response.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("jsquaredadventures.com");
  });

  test("RSS feed returns valid XML", async ({ request }) => {
    const response = await request.get("/feed.xml");
    expect(response.status()).toBe(200);
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toMatch(/xml/);
    const body = await response.text();
    expect(body).toContain("<rss");
  });

  test("404 page returns 404 status", async ({ request }) => {
    const response = await request.get("/this-page-does-not-exist-xyz");
    expect(response.status()).toBe(404);
  });

  test("auth session endpoint returns JSON", async ({ request }) => {
    const response = await request.get("/api/auth/session");
    expect(response.status()).toBe(200);
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toMatch(/json/);
  });

  test("unauthenticated comment POST returns 401", async ({ request }) => {
    // Pick a plausible post ID — 401 fires before the DB lookup
    const response = await request.post("/api/posts/nonexistent/comments", {
      data: { content: "test" },
    });
    expect(response.status()).toBe(401);
  });

  test("category page loads", async ({ page }) => {
    await page.goto("/category/Travel");
    // Either shows posts or a no-results message — either way the page renders
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("header")).toBeVisible();
  });

  test("search page is accessible", async ({ page }) => {
    await page.goto("/?q=adventure");
    await expect(page.locator("main")).toBeVisible();
  });

  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("main")).toBeVisible();
    // Should have an email input
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("admin redirects to GitHub sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/admin");
    // Should redirect to GitHub OAuth or a sign-in page
    await expect(page).toHaveURL(/github\.com\/login|\/api\/auth\/signin/, { timeout: 10_000 });
  });

});
