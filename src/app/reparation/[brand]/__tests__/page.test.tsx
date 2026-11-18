import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const brands: Record<string, { id: string; slug: string; name: string; device_type: string }> = {
  samsung: { id: "1", slug: "samsung", name: "Samsung", device_type: "smartphone" },
  macbook: { id: "2", slug: "macbook", name: "MacBook", device_type: "laptop" },
  "google-pixel": { id: "3", slug: "google-pixel", name: "Google Pixel", device_type: "smartphone" },
  playstation: { id: "4", slug: "playstation", name: "PlayStation", device_type: "console" },
};

vi.mock("@/lib/supabase/repairs", () => ({
  getAllBrandSlugs: vi.fn(async () => Object.keys(brands)),
  getBrandBySlug: vi.fn(async (slug: string) => brands[slug] ?? null),
  getBrandHubData: vi.fn(async () => ({
    models: [{ id: "m", brand_id: "x", slug: "galaxy-s23", name: "Galaxy S23", series: "Galaxy S", image_url: null, sort_order: 1, active: true, created_at: "", cheapest: 599 }],
    categories: [{ category: "Skærmskift", from: 599, modelCount: 3 }, { category: "Batteriskift", from: 349, modelCount: 3 }],
    fromPrice: 349,
  })),
}));

import Page, { generateMetadata } from "../page";

afterEach(cleanup);

const run = async (brand: string) => {
  const { container } = render(await Page({ params: Promise.resolve({ brand }) }));
  return container;
};

describe("/reparation/[brand] hub", () => {
  it("renders answer-first, common repairs, city links and FAQ for Samsung", async () => {
    const c = await run("samsung");
    const text = c.textContent ?? "";
    expect(c.querySelector("h1")?.textContent).toContain("Samsung-reparation");
    expect(text).toContain("fra 349 kr.");
    expect(text).toContain("Mest almindelige reparationer");
    expect(text).toContain("Find din model");
    expect(text).toContain("livstidsgaranti på arbejde og dele");
    const hrefs = Array.from(c.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/reparation-vejle");
    expect(hrefs).toContain("/reparation-slagelse");
    expect(c.querySelectorAll("details").length).toBeGreaterThanOrEqual(5);
  });

  it("never promises lifetime warranty or 36 months on MacBook", async () => {
    const c = await run("macbook");
    const text = c.textContent ?? "";
    expect(text).toContain("vilkår aftales ved den enkelte reparation");
    expect(text).not.toContain("livstidsgaranti på arbejde og dele.");
    expect(text).not.toMatch(/36 m(dr|åneder)/);
  });

  it("emits FAQPage matching visible FAQ, Service and BreadcrumbList", async () => {
    const c = await run("google-pixel");
    const blocks = Array.from(c.querySelectorAll('script[type="application/ld+json"]')).map((s) => JSON.parse(s.textContent!));
    const faq = blocks.find((b) => b["@type"] === "FAQPage");
    const visible = Array.from(c.querySelectorAll("details summary")).map((s) => s.textContent);
    expect(faq.mainEntity.map((q: { name: string }) => q.name)).toEqual(visible);
    expect(blocks.find((b) => b["@type"] === "Service").hasOfferCatalog.itemListElement).toHaveLength(2);
    expect(blocks.some((b) => b["@type"] === "BreadcrumbList")).toBe(true);
  });

  it("PlayStation-hubben lover 2 års garanti og linker til rens-guiden og lokale konsolsider", async () => {
    const c = await run("playstation");
    const text = c.textContent ?? "";
    expect(c.querySelector("h1")?.textContent).toContain("PlayStation-reparation");
    expect(text).toContain("2 års garanti på konsolreparation");
    expect(text).toContain("Hvad koster det at rense en PS5?");
    expect(text).not.toMatch(/livstidsgaranti|vilkår aftales/i);
    const hrefs = Array.from(c.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/blog/gta-6-klar-ps5-rens-koelepasta");
    expect(hrefs).toContain("/reparation-vejle/playstation");
    expect(hrefs).toContain("/reparation-slagelse/playstation");
    const m = await generateMetadata({ params: Promise.resolve({ brand: "playstation" }) });
    expect(String(m.description)).toContain("2 års garanti");
  });

  it("has canonical metadata within length limits", async () => {
    for (const slug of Object.keys(brands)) {
      const m = await generateMetadata({ params: Promise.resolve({ brand: slug }) });
      expect(m.alternates?.canonical).toBe(`https://phonespot.dk/reparation/${slug}`);
      expect(String(m.title).length).toBeLessThanOrEqual(60);
      expect(String(m.description).length).toBeLessThanOrEqual(160);
    }
  });
});
