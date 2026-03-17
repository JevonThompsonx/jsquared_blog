import { expect, test } from "@playwright/test";

// These tests run against a live server (local dev or production).
// Set E2E_BASE_URL to target a specific environment, otherwise defaults to
// http://localhost:3000 (local dev server must be running).

const adminStorageState = process.env.E2E_ADMIN_STORAGE_STATE;

const adminPostId = process.env.E2E_ADMIN_POST_ID;

if (adminStorageState) {
  test.use({ storageState: adminStorageState });
}

async function selectThemeOption(page: import("@playwright/test").Page, ariaLabel: string, optionText: string) {
  await page.getByLabel(ariaLabel).click();
  await page.getByRole("option", { name: optionText, exact: true }).click();
}

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
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Travel", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Filtered stories feed" })).toBeVisible();
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
    await expect(page).toHaveURL(/\/admin(?:\?.*)?$/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Editorial control center" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in with GitHub" })).toBeVisible();
  });

});

test.describe("authenticated admin smoke tests", () => {
  test.skip(!adminStorageState, "Set E2E_ADMIN_STORAGE_STATE to run admin smoke tests.");

  test("admin can filter, clone, and preview a post", async ({ page }) => {
    await page.goto("/admin");

    const postRows = page.getByTestId("admin-post-row");
    await expect(postRows.first()).toBeVisible({ timeout: 15_000 });

    const firstPostRow = postRows.first();
    const firstPostTitle = (await firstPostRow.getByTestId("admin-post-title").textContent())?.trim() ?? "";
    expect(firstPostTitle.length).toBeGreaterThan(0);

    const searchQuery = firstPostTitle.slice(0, Math.min(12, firstPostTitle.length));
    await page.getByLabel("Search posts").fill(searchQuery);
    await page.waitForURL((url) => url.searchParams.get("search") === searchQuery, { timeout: 10_000 });
    await expect(page.getByTestId("admin-post-row").first().getByTestId("admin-post-title")).toContainText(searchQuery);

    const filteredFirstRow = page.getByTestId("admin-post-row").first();
    const filteredStatus = await filteredFirstRow.getAttribute("data-post-status");
    if (filteredStatus) {
      await page.getByLabel("Filter posts by status").selectOption(filteredStatus);
      await page.waitForURL((url) => url.searchParams.get("status") === filteredStatus, { timeout: 10_000 });
      await expect(page.getByTestId("admin-post-row").first()).toHaveAttribute("data-post-status", filteredStatus);
    }

    await filteredFirstRow.getByTestId("admin-post-clone").click();
    await page.waitForURL(/\/admin\/posts\/.*\/edit\?cloned=1/, { timeout: 15_000 });
    await expect(page.getByText("Draft clone created successfully.")).toBeVisible();

    const previewButton = page.getByRole("button", { name: "Preview" });
    await expect(previewButton).toBeVisible();
    const popupPromise = page.waitForEvent("popup");
    await previewButton.click();
    const previewPage = await popupPromise;

    await previewPage.waitForLoadState("domcontentloaded");
    await expect(previewPage).toHaveURL(/\/preview\//, { timeout: 15_000 });
    await expect(previewPage.getByText("Preview Mode")).toBeVisible();
  });

  test("admin dashboard filters and navigation stay usable", async ({ page }) => {
    await page.goto("/admin");

    await expect(page.getByText("Editorial workspace")).toBeVisible();
    await expect(page.getByRole("link", { name: "Manage tags" })).toBeVisible();
    await expect(page.getByLabel("Search posts")).toBeVisible();

    await selectThemeOption(page, "Filter posts by status", "Published");
    await page.waitForURL((url) => url.searchParams.get("status") === "published", { timeout: 10_000 });

    await selectThemeOption(page, "Sort posts", "Recently updated");
    await page.waitForURL((url) => url.searchParams.get("sort") === "updated-desc", { timeout: 10_000 });

    const rows = page.getByTestId("admin-post-row");
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
    await expect(rows.first().getByRole("link", { name: "Moderate comments" })).toBeVisible();
  });

  test("admin tags page renders editing controls", async ({ page }) => {
    await page.goto("/admin/tags");

    await expect(page.getByRole("heading", { name: "Manage Tags" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Dashboard/ })).toBeVisible();

    const textareas = page.locator('textarea[name="description"]');
    await expect(textareas.first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Save" }).first()).toBeVisible();
  });

  test("admin moderation page shows summary cards and inline delete confirmation", async ({ page }) => {
    test.skip(!adminPostId, "Set E2E_ADMIN_POST_ID to run moderation smoke tests.");

    await page.goto(`/admin/posts/${adminPostId}/comments`);

    await expect(page.getByText("Moderation tools")).toBeVisible();
    await expect(page.getByText("Thread review")).toBeVisible();
    await expect(page.getByRole("button", { name: "Newest" })).toBeVisible();
    await expect(page.getByText("Threads")).toBeVisible();
    await expect(page.getByText("Flagged")).toBeVisible();
    await expect(page.getByText("Hidden")).toBeVisible();
    await expect(page.getByText("Deleted")).toBeVisible();

    const deleteButton = page.getByRole("button", { name: /^Delete$/ }).first();
    await expect(deleteButton).toBeVisible({ timeout: 15_000 });
    await deleteButton.click();

    await expect(page.getByText("Permanently delete?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" }).last()).toBeVisible();
  });
});
