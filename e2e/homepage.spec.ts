import { test, expect } from "@playwright/test";

// The site has a newsletter popup that appears after 30s or 50% scroll.
// We dismiss it in localStorage before each test to avoid interference.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("newsletter-dismissed", Date.now().toString());
  });
});

test.describe("Homepage", () => {
  test("loads and displays hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/PhoneSpot/);

    // Hero heading
    await expect(
      page.locator("h1").filter({ hasText: "Kvalitetstestet tech" })
    ).toBeVisible();

    // Hero CTAs
    await expect(page.locator('a[href="/iphones"]').first()).toBeVisible();
    await expect(page.locator('a[href="/baerbare"]').first()).toBeVisible();

    // Trust strip badges
    await expect(page.getByText("36 mdr. garanti").first()).toBeVisible();
    await expect(page.getByText("14 dages returret").first()).toBeVisible();
  });

  test("displays category cards", async ({ page }) => {
    await page.goto("/");

    // Hero categories
    await expect(page.locator('a[href="/iphones"]').first()).toBeVisible();
    await expect(page.locator('a[href="/smartphones"]').first()).toBeVisible();

    // Secondary categories
    await expect(page.locator('a[href="/ipads"]').first()).toBeVisible();
    await expect(page.locator('a[href="/smartwatches"]').first()).toBeVisible();
    await expect(page.locator('a[href="/tilbehoer"]').first()).toBeVisible();
    await expect(page.locator('a[href="/reparation"]').first()).toBeVisible();
  });

  test("displays USP features section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Spar op til 40%").first()).toBeVisible();
    await expect(page.getByText("30+ kvalitetstests").first()).toBeVisible();
    await expect(page.getByText("36 måneders garanti").first()).toBeVisible();
    await expect(page.getByText("80% mindre CO₂").first()).toBeVisible();
  });

  test("FAQ section expands and collapses", async ({ page }) => {
    await page.goto("/");

    const faqItem = page.locator("details").filter({
      hasText: "Hvad betyder refurbished?",
    });
    await faqItem.scrollIntoViewIfNeeded();

    // Initially collapsed — answer not visible
    const answer = faqItem.locator("p");
    await expect(answer).not.toBeVisible();

    // Click to expand
    await faqItem.locator("summary").click();
    await expect(answer).toBeVisible();

    // Click to collapse
    await faqItem.locator("summary").click();
    await expect(answer).not.toBeVisible();
  });

  test("newsletter form is present in page", async ({ page }) => {
    await page.goto("/");
    // The page has a newsletter section (not the popup)
    const mainContent = page.locator("main, section");
    const emailInputs = page.locator('input[name="email"][type="email"]');
    const count = await emailInputs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("stats section displays numbers", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("1.000+").first()).toBeVisible();
    await expect(page.getByText("4.5/5").first()).toBeVisible();
  });
});
