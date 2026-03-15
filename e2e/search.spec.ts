import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("newsletter-dismissed", Date.now().toString());
  });
});

test.describe("Search", () => {
  test("search page loads with empty state", async ({ page }) => {
    await page.goto("/soeg");
    await expect(page).toHaveTitle(/Søg.*PhoneSpot/);
    await expect(page.locator("#search-input")).toBeVisible();
    await expect(
      page.getByText("Indtast et søgeord ovenfor")
    ).toBeVisible();
  });

  test("search with query shows results heading", async ({ page }) => {
    await page.goto("/soeg?q=iphone");
    await expect(
      page.locator("h1").filter({ hasText: "iphone" })
    ).toBeVisible();
  });

  test("search input submits via form", async ({ page }) => {
    await page.goto("/soeg");
    await page.fill("#search-input", "samsung");
    await page.press("#search-input", "Enter");
    await page.waitForURL("**/soeg?q=samsung");
    await expect(
      page.locator("h1").filter({ hasText: "samsung" })
    ).toBeVisible();
  });

  test("search with no results shows message", async ({ page }) => {
    await page.goto("/soeg?q=xyznotaproduct12345");
    await expect(
      page.getByText("Ingen produkter fundet")
    ).toBeVisible();
  });
});

test.describe("Search API", () => {
  test("GET /api/search returns JSON", async ({ request }) => {
    const response = await request.get("/api/search?q=iphone");
    expect(response.status()).toBeLessThan(500);
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toContain("application/json");
  });

  test("GET /api/search without query returns empty or error", async ({
    request,
  }) => {
    const response = await request.get("/api/search");
    expect(response.status()).toBeLessThan(500);
  });
});
