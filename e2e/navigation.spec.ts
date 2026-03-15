import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("newsletter-dismissed", Date.now().toString());
  });
});

test.describe("Header & Navigation", () => {
  test("header renders with logo and nav items", async ({ page }) => {
    await page.goto("/");

    // Logo / brand link
    await expect(page.locator('a[href="/"]').first()).toBeVisible();

    // Main nav links (desktop)
    await expect(page.locator('a[href="/iphones"]').first()).toBeVisible();
    await expect(page.locator('a[href="/reparation"]').first()).toBeVisible();
  });

  test("footer renders with essential links", async ({ page }) => {
    await page.goto("/");

    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();

    // Legal links
    await expect(
      footer.locator('a[href="/privatlivspolitik"]')
    ).toBeVisible();
    await expect(
      footer.locator('a[href="/handelsbetingelser"]')
    ).toBeVisible();

    // Company info — CVR number is unique
    await expect(footer.getByText("38688766")).toBeVisible();
  });

  test("clicking category navigates to collection page", async ({ page }) => {
    await page.goto("/");
    await page.locator('a[href="/iphones"]').first().click();
    await page.waitForURL("**/iphones");
    await expect(page.locator("h1").first()).toBeVisible();
  });
});
