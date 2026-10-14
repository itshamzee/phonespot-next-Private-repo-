import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const model = (id: string, name: string, slug: string, cheapest: number | null) => ({
  id, brand_id: "b", slug, name, series: null, image_url: null, sort_order: 1, active: true, created_at: "", cheapest,
});

vi.mock("@/lib/supabase/repairs", () => ({
  getActiveBrands: vi.fn(async () => [
    { id: "1", slug: "iphone", name: "iPhone", device_type: "smartphone" },
    { id: "2", slug: "samsung", name: "Samsung", device_type: "smartphone" },
    { id: "3", slug: "oneplus", name: "OnePlus", device_type: "smartphone" },
    { id: "4", slug: "ipad", name: "iPad", device_type: "tablet" },
  ]),
  getBrandHubData: vi.fn(async (id: string) =>
    id === "2"
      ? { models: [model("m1", "Galaxy S23", "galaxy-s23", 799)], categories: [], fromPrice: 599 }
      : { models: [model("m2", "OnePlus 12", "oneplus-12", null)], categories: [], fromPrice: null },
  ),
}));

import Page, { generateMetadata } from "../page";

afterEach(cleanup);

const jsonLd = (c: HTMLElement) =>
  Array.from(c.querySelectorAll('script[type="application/ld+json"]')).map((s) => JSON.parse(s.textContent!));

describe("/reparation/android", () => {
  it("links every Android brand hub, excludes iPhone, uses DB prices", async () => {
    const { container } = render(await Page());
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/reparation/samsung");
    expect(hrefs).toContain("/reparation/oneplus");
    expect(hrefs).toContain("/reparation/samsung/galaxy-s23");
    expect(hrefs).not.toContain("/reparation/iphone");
    expect(container.textContent).toContain("fra 599 kr.");
    expect(container.textContent).toContain("livstidsgaranti på arbejde og dele");
  });

  it("emits FAQPage mirroring visible FAQ, Service and BreadcrumbList", async () => {
    const { container } = render(await Page());
    const blocks = jsonLd(container);
    const faq = blocks.find((b) => b["@type"] === "FAQPage");
    const visible = Array.from(container.querySelectorAll("details summary")).map((s) => s.textContent);
    expect(faq.mainEntity.map((q: { name: string }) => q.name)).toEqual(visible);
    expect(blocks.some((b) => b["@type"] === "Service")).toBe(true);
    expect(blocks.some((b) => b["@type"] === "BreadcrumbList")).toBe(true);
  });

  it("has canonical and length-safe metadata", async () => {
    const m = await generateMetadata();
    expect(m.alternates?.canonical).toBe("https://phonespot.dk/reparation/android");
    expect(String(m.title).length).toBeLessThanOrEqual(60);
    expect(String(m.description).length).toBeLessThanOrEqual(160);
  });
});
