import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { danishCopy, isEmcUrl, listingPageUrl, parseEmcListing, parseEmcProduct, suggestedPriceOere } from "../emc";

const html = readFileSync(join(__dirname, "fixtures/emc-product.html"), "utf8");
const url = "https://euromobilecompany.com/en/accessories/cases-and-covers/rixus-snapgrip-360-case-for-apple-iphone-17-pro-18-pro-deep-purple-39171";

describe("parseEmcProduct", () => {
  const p = parseEmcProduct(html, url);

  it("læser titel, varenummer, mærke og vejledende pris", () => {
    expect(p.title).toBe("Rixus SnapGrip 360 Case For Apple iPhone 17 Pro, 18 Pro Deep Purple");
    expect(p.articleNumber).toBe("RIX03689");
    expect(p.brand).toBe("Rixus");
    expect(p.advisedPriceEur).toBe(24.95);
    expect(p.sourceUrl).toBe(url);
  });

  it("matcher modellerne til vores slugs", () => {
    expect(p.modelLabels).toEqual(["iPhone 18 Pro", "iPhone 17 Pro"]);
    expect(p.modelSlugs.sort()).toEqual(["iphone-17-pro", "iphone-18-pro"]);
    expect(p.unknownModels).toEqual([]);
  });

  it("læser specifikationer, fordele og beskrivelse", () => {
    expect(p.specs).toMatchObject({ product_type: "Phone Case", case_type: "Protective case", magsafe: "Yes", material: "Plastic", color: "Purple", anti_burst: "Yes" });
    expect(p.benefits).toHaveLength(5);
    expect(p.benefits[0]).toMatch(/360-degree grip/);
    expect(p.description.length).toBeGreaterThan(80);
    expect(p.guess.subcategory).toBe("cover");
  });

  it("tager hvert produktbillede én gang, i største størrelse og i rækkefølge", () => {
    expect(p.imageUrls).toHaveLength(6);
    // fixturen er beskåret og har kun 500- og 1000-udgaverne; den fulde side har også 1024
    expect(p.imageUrls.every((u) => /-1000x1000\.jpg$/.test(u))).toBe(true);
    expect(p.imageUrls[0]).toContain("8fd30d1cca");
    expect(new Set(p.imageUrls).size).toBe(6);
  });
});

describe("parseEmcProduct, billeder", () => {
  it("tager kun dette produkts billeder, også når medie-id'et har bogstaver", () => {
    const base = "https://euromobilecompany.com/image/cache/catalog";
    const page = `<script type="application/ld+json">{"@type":"Product","name":"Rixus Anti-Burst Case For Apple iPhone 16 Plus Transparent","image":"${base}/akeneo/d019f13955-a00002633-rixus-case-500x500.jpg"}</script>
      <h1>Rixus Anti-Burst Case For Apple iPhone 16 Plus Transparent</h1>
      <img src="${base}/emc/logos/splash/emc_icon-144x144.png">
      <img src="${base}/akeneo/d019f13955-a00002633-rixus-case-500x500.jpg" data-zoom="${base}/akeneo/d019f13955-a00002633-rixus-case-1024x1024.jpg">
      <img src="${base}/akeneo/7e0fb9eb55-a00002633-1_rixus-case-1024x1024.jpg">
      <img src="${base}/akeneo/aaaa111122-a00009999-andet-produkt-1024x1024.jpg">
      <img src="${base}/emc/logos/logo_emc_white-997x228.png">`;
    expect(parseEmcProduct(page, "x").imageUrls).toEqual([
      `${base}/akeneo/d019f13955-a00002633-rixus-case-1024x1024.jpg`,
      `${base}/akeneo/7e0fb9eb55-a00002633-1_rixus-case-1024x1024.jpg`,
    ]);
  });
});

describe("parseEmcListing", () => {
  const listing = `<div class="products-filter-results"> Showing 16 to 30 of 62 (5 Pages)</div>
    <div class="product-thumb"><a href="https://euromobilecompany.com/en/accessories/cases-and-covers/rixus-alpine-case-for-apple-iphone-16-red-38695" class="product-img">x</a>
    <a href="https://euromobilecompany.com/en/accessories/cases-and-covers/rixus-alpine-case-for-apple-iphone-16-red-38695">Rixus</a></div>
    <div class="product-thumb"><a href="https://euromobilecompany.com/en/accessories/cases-and-covers/novanl-clear-case-for-apple-iphone-16-38001?x=1">y</a></div>
    <a href="https://euromobilecompany.com/en/accessories/cases-and-covers?fmodel=iPhone%2016">filter</a>`;

  it("finder produktlinks uden dubletter og antal sider", () => {
    const out = parseEmcListing(listing);
    expect(out.total).toBe(62);
    expect(out.pages).toBe(5);
    expect(out.productUrls).toEqual([
      "https://euromobilecompany.com/en/accessories/cases-and-covers/rixus-alpine-case-for-apple-iphone-16-red-38695",
      "https://euromobilecompany.com/en/accessories/cases-and-covers/novanl-clear-case-for-apple-iphone-16-38001",
    ]);
  });

  it("bygger side-URL'er og bevarer filtre", () => {
    expect(listingPageUrl("https://euromobilecompany.com/en/accessories/cases-and-covers?fbrand=For%20Apple&page=3", 2)).toBe(
      "https://euromobilecompany.com/en/accessories/cases-and-covers?fbrand=For+Apple&page=2",
    );
    expect(listingPageUrl("https://euromobilecompany.com/en/accessories/cases-and-covers", 1)).toBe("https://euromobilecompany.com/en/accessories/cases-and-covers");
  });
});

describe("isEmcUrl", () => {
  it("accepterer kun leverandørens eget domæne over https", () => {
    expect(isEmcUrl("https://euromobilecompany.com/en/accessories")).toBe(true);
    expect(isEmcUrl("https://www.euromobilecompany.com/en")).toBe(true);
    expect(isEmcUrl("http://euromobilecompany.com/en")).toBe(false);
    expect(isEmcUrl("https://euromobilecompany.com.evil.dk/en")).toBe(false);
    expect(isEmcUrl("ikke en url")).toBe(false);
  });
});

describe("suggestedPriceOere", () => {
  it("omregner vejledende europris til en dansk pris, der ender på 9", () => {
    expect(suggestedPriceOere(24.95)).toBe(19900);
    expect(suggestedPriceOere(39.95)).toBe(29900);
    expect(suggestedPriceOere(9.95)).toBe(7900);
    expect(suggestedPriceOere(null)).toBeNull();
  });
});

describe("danishCopy", () => {
  const copy = danishCopy(parseEmcProduct(html, url));

  it("skriver en dansk titel med modeller og farve", () => {
    expect(copy.title).toBe("Rixus SnapGrip 360 cover med MagSafe til iPhone 17 Pro og 18 Pro, lilla");
  });

  it("bygger kort tekst, salgsargumenter og attributter af fakta fra siden", () => {
    expect(copy.shortDescription).toMatch(/MagSafe/);
    expect(copy.highlights).toContain("Virker med MagSafe: Magnetiske opladere og holdere sidder fast gennem coveret.");
    expect(copy.highlights.some((h) => /Passer præcist/.test(h))).toBe(true);
    expect(copy.attributes).toMatchObject({ material: "Plast", color: "Lilla", magsafe: "Ja" });
    expect(copy.description).toMatch(/iPhone 17 Pro og 18 Pro/);
    expect(copy.description).not.toMatch(/\b(the|with|your)\b/i);
  });
});
