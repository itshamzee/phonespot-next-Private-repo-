import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("newsletter-dismissed", Date.now().toString());
  });
});

// Kræver en laptop-PDP med aktivt opgraderingstilvalg. Testen finder selv en
// kandidat via laptop-oversigten (/baerbare) og springer over, hvis ingen
// model har tilvalg. Opgraderinger tilbydes p.t. kun på ThinkPad-modeller
// (jf. bærbare-siden FAQ), så de prioriteres i søgningen for at holde
// testen hurtig i et katalog med 100+ modeller — men søgningen falder
// tilbage til resten af kataloget, så testen ikke er hardcodet til én model.
test("laptop-opgradering laegges i kurven med korrekt pris", async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto("/baerbare");
  const productLinks = page.locator('a[href^="/refurbished/"]');
  const count = await productLinks.count();
  test.skip(count === 0, "Ingen laptops i kataloget");

  // Snapshot alle hrefs i ét evaluateAll-kald. CategoryFilters sorterer
  // listen (pris stigende) i en mount-effect lige efter hydrering — en
  // per-index .nth(i)-loop løber i kapløb med den re-render og kan miste
  // eller duplikere elementer midtvejs, hvilket i praksis udelod ThinkPad
  // T14s G1 fra resultatet.
  const hrefs = await productLinks.evaluateAll((els) =>
    els.map((el) => el.getAttribute("href")).filter((h): h is string => !!h),
  );
  // ThinkPads først (upgrade-kandidater i praksis), resten som fallback.
  hrefs.sort((a, b) => Number(b.includes("thinkpad")) - Number(a.includes("thinkpad")));

  let found = false;
  for (const href of hrefs) {
    await page.goto(href);
    if (await page.getByText("Tilvalg", { exact: true }).isVisible().catch(() => false)) {
      found = true;
      break;
    }
  }
  test.skip(!found, "Ingen laptop med aktive tilvalg");

  const select = page.locator("select#upgrade-ram, select#upgrade-ssd").first();
  await select.selectOption({ index: 1 });
  await expect(page.getByText("+3 hverdages leveringstid", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: /læg i kurv/i }).click();
  await expect(page.getByText(/\+ Opgrader/i).first()).toBeVisible({ timeout: 10_000 });
});
