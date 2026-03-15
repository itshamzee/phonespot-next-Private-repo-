import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("newsletter-dismissed", Date.now().toString());
  });
});

test.describe("Account Pages (unauthenticated)", () => {
  test("konto page loads or redirects", async ({ page }) => {
    const response = await page.goto("/konto");
    // Should load without 500 — might show login or redirect
    expect(response?.status()).toBeLessThan(500);
  });
});
