import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("newsletter-dismissed", Date.now().toString());
  });
});

test.describe("Checkout Page", () => {
  test("checkout page loads with form and summary", async ({ page }) => {
    await page.goto("/kasse");

    // Page title
    await expect(page.getByText("Sikker betaling").first()).toBeVisible();

    // Trust badges in summary
    await expect(page.getByText("36 måneders garanti").first()).toBeVisible();
    await expect(page.getByText("14 dages returret").first()).toBeVisible();

    // Seller info
    await expect(page.getByText("PhoneSpot ApS").first()).toBeVisible();
    await expect(page.getByText("38688766").first()).toBeVisible();

    // Klarna messaging
    await expect(page.getByText("klarna.").first()).toBeVisible();
    await expect(
      page.getByText("Betal i 3 rater med Klarna").first()
    ).toBeVisible();
  });

  test("payment methods are displayed", async ({ page }) => {
    await page.goto("/kasse");
    await expect(page.getByText("Vi accepterer").first()).toBeVisible();
  });
});

test.describe("Cart API", () => {
  test("POST /api/cart/reserve requires body", async ({ request }) => {
    const response = await request.post("/api/cart/reserve", {
      data: {},
    });
    // Should return 400 or similar for missing data, not 500
    expect(response.status()).toBeLessThan(500);
  });

  test("POST /api/cart/release requires body", async ({ request }) => {
    const response = await request.post("/api/cart/release", {
      data: {},
    });
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("Checkout API", () => {
  test("POST /api/checkout/validate requires body", async ({ request }) => {
    const response = await request.post("/api/checkout/validate", {
      data: {},
    });
    expect(response.status()).toBeLessThan(500);
  });

  test("POST /api/checkout/session requires body", async ({ request }) => {
    const response = await request.post("/api/checkout/session", {
      data: {},
    });
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("Discount API", () => {
  test("POST /api/discount/validate rejects empty code", async ({
    request,
  }) => {
    const response = await request.post("/api/discount/validate", {
      data: { code: "" },
    });
    expect(response.status()).toBeLessThan(500);
  });

  test("POST /api/discount/validate rejects invalid code", async ({
    request,
  }) => {
    const response = await request.post("/api/discount/validate", {
      data: { code: "INVALID_CODE_XYZ" },
    });
    expect(response.status()).toBeLessThan(500);
    const body = await response.json();
    expect(body.valid).toBeFalsy();
  });
});
