import { expect, test } from "@playwright/test";

import {
  adminTest,
  canRunAdminMutationFlows,
  configuredAdminPostId,
  getAdminMutationHint,
  getAdminStorageStateHint,
  hasAdminStorageState,
  openAdminCommentsPage,
  selectThemeOption,
} from "./helpers/admin";

// These tests run against a live server (local dev or production).
// Set E2E_BASE_URL to target a specific environment, otherwise defaults to
// http://localhost:3000 (local dev server must be running).

const statusOptionLabels: Record<"published" | "draft" | "scheduled", string> = {
  published: "Published",
  draft: "Draft",
  scheduled: "Scheduled",
};

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

  test("category RSS feed returns valid XML", async ({ request }) => {
    const response = await request.get("/category/Travel/feed.xml");
    expect(response.status()).toBe(200);
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toMatch(/xml/);
    const body = await response.text();
    expect(body).toContain("<rss");
    expect(body).toContain("Travel");
  });

  test("tag RSS feed returns valid XML when a public tag exists", async ({ request }) => {
    const homepageResponse = await request.get("/");
    expect(homepageResponse.status()).toBe(200);

    const homepageHtml = await homepageResponse.text();
    const tagMatch = homepageHtml.match(/href="\/tag\/([^"?#/]+)"/);

    test.skip(!tagMatch, "No public tag links were available to verify a tag feed.");

    const tagSlug = tagMatch?.[1];
    const response = await request.get(`/tag/${tagSlug}/feed.xml`);
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
    await page.goto("/?search=adventure");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Results for/i })).toBeVisible();
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

adminTest.describe("authenticated admin smoke tests", () => {
  adminTest.skip(!hasAdminStorageState, getAdminStorageStateHint());

  adminTest("admin can filter, clone, and preview a post", async ({ page }) => {
    adminTest.skip(!canRunAdminMutationFlows, getAdminMutationHint());

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
    if (filteredStatus === "published" || filteredStatus === "draft" || filteredStatus === "scheduled") {
      await selectThemeOption(page, "Filter posts by status", statusOptionLabels[filteredStatus]);
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

  adminTest("admin dashboard filters and navigation stay usable", async ({ page }) => {
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

  adminTest("admin tags page renders editing controls", async ({ page }) => {
    await page.goto("/admin/tags");

    await expect(page.getByRole("heading", { name: "Manage Tags" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Dashboard/ })).toBeVisible();

    const textareas = page.locator('textarea[name="description"]');
    await expect(textareas.first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Save" }).first()).toBeVisible();
  });

  adminTest("admin can edit a tag description inline", async ({ page }) => {
    adminTest.skip(!canRunAdminMutationFlows, getAdminMutationHint());

    await page.goto("/admin/tags");

    const firstTagRow = page.locator("li").filter({ has: page.locator('textarea[name="description"]') }).first();
    const descriptionField = firstTagRow.locator('textarea[name="description"]');
    const saveButton = firstTagRow.getByRole("button", { name: "Save" });
    const nextDescription = `E2E tag description ${Date.now()}`;

    await expect(descriptionField).toBeVisible({ timeout: 15_000 });
    await descriptionField.fill(nextDescription);
    await saveButton.click();

    await page.waitForLoadState("networkidle");
    await expect(descriptionField).toHaveValue(nextDescription);
  });

  adminTest("admin moderation page shows summary cards and moderation states", async ({ page }) => {
    const resolvedPostId = await openAdminCommentsPage(page);

    await expect(page.getByText("Moderation tools")).toBeVisible();
    await expect(page.getByText("Thread review")).toBeVisible();
    await expect(page.getByRole("button", { name: "Newest" })).toBeVisible();
    await expect(page.getByText("Threads")).toBeVisible();
    await expect(page.getByText("Flagged")).toBeVisible();
    await expect(page.getByText("Hidden")).toBeVisible();
    await expect(page.getByText("Deleted")).toBeVisible();

    if (configuredAdminPostId) {
      expect(resolvedPostId).toBe(configuredAdminPostId);
    }

    await expect(
      page.getByText("No comments have been posted on this story.").or(page.getByRole("button", { name: /^Delete$/ }).first()),
    ).toBeVisible({ timeout: 15_000 });
  });

  adminTest("admin moderation page shows inline delete confirmation when comments exist", async ({ page }) => {
    adminTest.skip(!configuredAdminPostId, "Run bun run seed:e2e to provision E2E_ADMIN_POST_ID automatically.");

    await page.goto(`/admin/posts/${configuredAdminPostId}/comments`);

    await expect(page.getByText("Moderation tools")).toBeVisible();

    const deleteButton = page.getByRole("button", { name: /^Delete$/ }).first();
    await expect(deleteButton).toBeVisible({ timeout: 15_000 });
    await deleteButton.click();

    await expect(page.getByText("Permanently delete?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" }).last()).toBeVisible();
  });

  adminTest("admin can moderate the seeded comment fixture", async ({ page }) => {
    adminTest.skip(!configuredAdminPostId, "Run bun run seed:e2e to provision E2E_ADMIN_POST_ID automatically.");
    adminTest.skip(!canRunAdminMutationFlows, getAdminMutationHint());

    await page.goto(`/admin/posts/${configuredAdminPostId}/comments`);

    await expect(page.getByText("Moderation tools")).toBeVisible();

    const firstComment = page.locator("article").filter({ has: page.getByRole("button", { name: /^Delete$/ }) }).first();
    await expect(firstComment).toBeVisible({ timeout: 15_000 });

    const hideButton = firstComment.getByRole("button", { name: "Hide" });
    if (await hideButton.isVisible()) {
      await hideButton.click();
      await expect(firstComment.getByText("Hidden")).toBeVisible();
      await firstComment.getByRole("button", { name: "Unhide" }).click();
      await expect(firstComment.getByText("Visible")).toBeVisible();
    }

    const deleteButton = firstComment.getByRole("button", { name: /^Delete$/ }).first();
    await deleteButton.click();
    await expect(firstComment.getByText("Permanently delete?")).toBeVisible();
    await firstComment.getByRole("button", { name: "Cancel" }).click();
    await expect(firstComment.getByText("Permanently delete?")).not.toBeVisible();
  });
});
