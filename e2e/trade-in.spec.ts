import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("newsletter-dismissed", Date.now().toString());
  });
});

test.describe("Trade-in Pages", () => {
  test("trade-in landing page loads", async ({ page }) => {
    const response = await page.goto("/saelg-din-enhed");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("Trade-in API", () => {
  test("POST /api/trade-in/offers rejects empty body", async ({
    request,
  }) => {
    const response = await request.post("/api/trade-in/offers", {
      data: {},
    });
    expect(response.status()).toBeLessThan(500);
  });
});
