import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("newsletter-dismissed", Date.now().toString());
  });
});

test.describe("SEO", () => {
  test("robots.txt is accessible", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const text = await response.text();
    // Next.js robots.ts generates standard robots.txt format
    expect(text.toLowerCase()).toContain("user-agent");
  });

  test("sitemap.xml is accessible", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const text = await response.text();
    // Next.js generates either XML sitemap or sitemap index
    expect(text).toContain("xml");
    expect(text).toContain("phonespot.dk");
  });

  test("homepage has proper meta tags", async ({ page }) => {
    await page.goto("/");

    // Title
    await expect(page).toHaveTitle(/PhoneSpot/);

    // Description
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute("content", /.+/);

    // OG tags
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", /PhoneSpot/);

    const ogType = page.locator('meta[property="og:type"]');
    await expect(ogType).toHaveAttribute("content", "website");
  });

  test("homepage has JSON-LD structured data", async ({ page }) => {
    await page.goto("/");
    const jsonLd = page.locator('script[type="application/ld+json"]');
    const count = await jsonLd.count();
    expect(count).toBeGreaterThan(0);

    const content = await jsonLd.first().textContent();
    expect(content).toBeTruthy();
    const data = JSON.parse(content!);
    expect(data["@context"]).toBe("https://schema.org");
  });

  test("collection page has proper title", async ({ page }) => {
    await page.goto("/iphones");
    await expect(page).toHaveTitle(/iPhone/i);
  });

  test("repair page has JSON-LD structured data", async ({ page }) => {
    await page.goto("/reparation");
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    expect(count).toBeGreaterThan(0);

    let foundBusiness = false;
    for (let i = 0; i < count; i++) {
      const text = await scripts.nth(i).textContent();
      if (text && text.includes("LocalBusiness")) {
        foundBusiness = true;
        const data = JSON.parse(text);
        const types = Array.isArray(data["@type"]) ? data["@type"] : [data["@type"]];
        expect(types).toContain("LocalBusiness");
        expect(data.address).toBeDefined();
        break;
      }
    }
    expect(foundBusiness).toBe(true);
  });
});
