import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("newsletter-dismissed", Date.now().toString());
  });
});

test.describe("Information Pages", () => {
  test("FAQ page loads with accordion", async ({ page }) => {
    const response = await page.goto("/faq");
    expect(response?.status()).toBeLessThan(500);
    await expect(page).toHaveTitle(/FAQ.*PhoneSpot/);

    // FAQ uses FaqAccordion component with buttons, not <details>
    await expect(
      page.locator("button").filter({ hasText: /refurbished/i }).first()
    ).toBeVisible();
  });

  test("garanti page loads", async ({ page }) => {
    const response = await page.goto("/garanti");
    expect(response?.status()).toBeLessThan(500);
    await expect(page).toHaveTitle(/Garanti.*PhoneSpot/i);
  });

  test("om-os page loads", async ({ page }) => {
    const response = await page.goto("/om-os");
    expect(response?.status()).toBeLessThan(500);
  });

  test("kvalitet page loads", async ({ page }) => {
    const response = await page.goto("/kvalitet");
    expect(response?.status()).toBeLessThan(500);
  });

  test("privatlivspolitik page loads", async ({ page }) => {
    const response = await page.goto("/privatlivspolitik");
    expect(response?.status()).toBeLessThan(500);
  });

  test("handelsbetingelser page loads", async ({ page }) => {
    const response = await page.goto("/handelsbetingelser");
    expect(response?.status()).toBeLessThan(500);
  });

  test("cookies page loads", async ({ page }) => {
    const response = await page.goto("/cookies");
    expect(response?.status()).toBeLessThan(500);
  });

  test("hvorfor-phonespot page loads", async ({ page }) => {
    const response = await page.goto("/hvorfor-phonespot");
    expect(response?.status()).toBeLessThan(500);
  });

  test("delbetaling page loads", async ({ page }) => {
    const response = await page.goto("/delbetaling");
    expect(response?.status()).toBeLessThan(500);
  });

  test("prismatch page loads", async ({ page }) => {
    const response = await page.goto("/prismatch");
    expect(response?.status()).toBeLessThan(500);
  });

  test("reklamation page loads", async ({ page }) => {
    const response = await page.goto("/reklamation");
    expect(response?.status()).toBeLessThan(500);
  });

  test("b2b page loads", async ({ page }) => {
    const response = await page.goto("/b2b");
    expect(response?.status()).toBeLessThan(500);
  });

  test("butik page loads", async ({ page }) => {
    const response = await page.goto("/butik");
    expect(response?.status()).toBeLessThan(500);
  });
});
