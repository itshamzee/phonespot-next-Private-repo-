import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("newsletter-dismissed", Date.now().toString());
  });
});

test.describe("Repair Pages", () => {
  test("repair landing page loads", async ({ page }) => {
    const response = await page.goto("/reparation");
    expect(response?.status()).toBeLessThan(500);

    await expect(page).toHaveTitle(/Reparation.*PhoneSpot/i);

    // Hero section
    await expect(
      page.locator("h1").filter({ hasText: /fikser din/i })
    ).toBeVisible();

    // USP cards
    await expect(page.getByText("Livstidsgaranti").first()).toBeVisible();
    await expect(page.getByText("30 minutter").first()).toBeVisible();
    await expect(page.getByText("Faste priser").first()).toBeVisible();
    await expect(page.getByText("Walk-in").first()).toBeVisible();
  });

  test("repair page shows stats bar", async ({ page }) => {
    await page.goto("/reparation");
    await expect(page.getByText("5.000+").first()).toBeVisible();
    await expect(page.getByText("4.8").first()).toBeVisible();
  });

  test("repair services section shows services", async ({ page }) => {
    await page.goto("/reparation");
    await expect(page.getByText("Skærmskift").first()).toBeVisible();
    await expect(page.getByText("Batteriskift").first()).toBeVisible();
    await expect(page.getByText("Vandskade").first()).toBeVisible();
  });

  test("repair FAQ section works", async ({ page }) => {
    await page.goto("/reparation");

    const faqItem = page.locator("details").filter({
      hasText: "Hvad koster en skærmudskiftning?",
    });
    await faqItem.scrollIntoViewIfNeeded();

    await faqItem.locator("summary").click();
    await expect(faqItem.locator("p")).toBeVisible();
  });

  test("repair page has booking form section", async ({ page }) => {
    await page.goto("/reparation");
    const bookingSection = page.locator("#book-reparation");
    await bookingSection.scrollIntoViewIfNeeded();
    await expect(
      page.getByText("Send en reparationsanmodning")
    ).toBeVisible();
  });
});

test.describe("Repair API", () => {
  test("POST /api/repairs rejects empty body", async ({ request }) => {
    const response = await request.post("/api/repairs", {
      data: {},
    });
    expect(response.status()).toBeLessThan(500);
  });
});
