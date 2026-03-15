import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("newsletter-dismissed", Date.now().toString());
  });
});

test.describe("Warranty Pages", () => {
  test("garanti page loads with content", async ({ page }) => {
    const response = await page.goto("/garanti");
    expect(response?.status()).toBeLessThan(500);
    await expect(page).toHaveTitle(/Garanti.*PhoneSpot/i);
  });

  test("garanti lookup with invalid code shows error or not found", async ({
    page,
  }) => {
    const response = await page.goto("/garanti/INVALID_CODE_XYZ");
    // Should return a page (not 500), even if the code is invalid
    expect(response?.status()).toBeLessThan(500);
  });
});
