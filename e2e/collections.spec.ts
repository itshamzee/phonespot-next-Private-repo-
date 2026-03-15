import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("newsletter-dismissed", Date.now().toString());
  });
});

const COLLECTIONS = [
  { slug: "iphones", titlePattern: /iPhone/i },
  { slug: "ipads", titlePattern: /iPad/i },
  { slug: "smartphones", titlePattern: /Smartphone/i },
  { slug: "baerbare", titlePattern: /Bærbare|Laptop|MacBook/i },
  { slug: "smartwatches", titlePattern: /Smartwatch|Watch/i },
  { slug: "tilbehoer", titlePattern: /Tilbehør|Accessori/i },
];

test.describe("Collection Pages", () => {
  for (const { slug, titlePattern } of COLLECTIONS) {
    test(`/${slug} loads without server error`, async ({ page }) => {
      const response = await page.goto(`/${slug}`);
      expect(response?.status()).toBeLessThan(500);

      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page).toHaveTitle(titlePattern);
    });
  }

  test("iphones collection has product grid or empty state", async ({
    page,
  }) => {
    await page.goto("/iphones");

    // Either products are shown or a message (depending on Supabase data)
    const productGrid = page.locator('[class*="grid"]').first();
    await expect(productGrid).toBeVisible();
  });

  test("collection shows trust bar", async ({ page }) => {
    await page.goto("/iphones");
    await expect(page.getByText("36 mdr. garanti").first()).toBeVisible();
  });

  test("unknown collection returns 404", async ({ page }) => {
    const response = await page.goto("/nonexistent-collection-xyz");
    expect(response?.status()).toBe(404);
  });
});
