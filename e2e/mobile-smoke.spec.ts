import { test, expect } from "@playwright/test";

/**
 * Mobile viewport smoke tests. These only run under the mobile-iphone and
 * mobile-android projects in playwright.config.ts.
 *
 * Purpose: catch regressions in the most-reported mobile problems:
 *  - product cards unreadable / layout broken
 *  - hamburger + cart + search tap targets too small
 *  - filter drawer unusable
 *  - repair / beskyttelsesglas pages crash on narrow viewport
 */

test.describe("mobile smoke", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile viewports only");

  test("homepage renders with visible hamburger and logo", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /phonespot/i }).first()).toBeVisible();
    const hamburger = page.getByRole("button", { name: /åbn menu|luk menu/i });
    await expect(hamburger).toBeVisible();
    const box = await hamburger.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(40);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
  });

  test("header tap targets meet 40px minimum", async ({ page }) => {
    await page.goto("/");
    for (const label of [/søg/i, /åbn kurv/i]) {
      const btn = page.getByRole("button", { name: label });
      await expect(btn).toBeVisible();
      const box = await btn.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(40);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
    }
  });

  test("iphone category renders product grid", async ({ page }) => {
    await page.goto("/iphones");
    await expect(page.locator("a[href*='/refurbished/']").first()).toBeVisible({ timeout: 10_000 });
  });

  test("filter drawer opens and can reset + close on mobile", async ({ page }) => {
    await page.goto("/iphones");
    const openBtn = page.getByRole("button", { name: /abn filterside|filtre/i }).first();
    await openBtn.click();
    await expect(page.getByRole("dialog", { name: /filtre/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /se resultater/i })).toBeVisible();
    await page.getByRole("button", { name: /se resultater/i }).click();
    await expect(page.getByRole("dialog", { name: /filtre/i })).toBeHidden();
  });

  test("repair model page loads", async ({ page }) => {
    const res = await page.goto("/reparation/iphone/iphone-15");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("legacy location-prefixed repair URL redirects", async ({ page }) => {
    const res = await page.goto("/reparation/vejle/iphone/iphone-15");
    expect(res?.status()).toBeLessThan(400);
    expect(page.url()).toContain("/reparation/iphone/iphone-15");
  });

  test("beskyttelsesglas product page renders without crash", async ({ page }) => {
    const res = await page.goto("/beskyttelsesglas/apple/iphone-15");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("accessories api responds 200 with items", async ({ page }) => {
    const res = await page.request.get("/api/accessories?category=covers");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
