import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const model = (id: string, name: string, slug: string, series: string | null, cheapest: number | null) => ({
  id, brand_id: "b", slug, name, series, image_url: null, sort_order: 1, active: true, created_at: "", cheapest,
});

vi.mock("@/lib/supabase/repairs", () => ({
  getActiveBrands: vi.fn(async () => [
    { id: "2", slug: "samsung", name: "Samsung", device_type: "smartphone" },
    { id: "4", slug: "ipad", name: "iPad", device_type: "tablet" },
  ]),
  getBrandHubData: vi.fn(async (id: string) =>
    id === "4"
      ? { models: [model("a", "iPad 9", "ipad-9", null, 699)], categories: [], fromPrice: 699 }
      : {
          models: [
            model("b", "Galaxy S23", "galaxy-s23", "Galaxy S", 799),
            model("c", "Galaxy Tab S9+", "galaxy-tab-s9-plus", "Galaxy Tab", null),
          ],
          categories: [],
          fromPrice: 799,
        },
  ),
}));

import Page, { generateMetadata } from "../page";

afterEach(cleanup);

describe("/reparation/tablet", () => {
  it("lists iPad and Galaxy Tab only, with no-price fallback text", async () => {
    const { container } = render(await Page());
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/reparation/ipad/ipad-9");
    expect(hrefs).toContain("/reparation/samsung/galaxy-tab-s9-plus");
    expect(hrefs).not.toContain("/reparation/samsung/galaxy-s23");
    expect(container.textContent).toContain("Fast pris efter tjek");
    expect(container.textContent).toContain("fra 699 kr.");
    expect(container.textContent).toContain("livstidsgaranti på arbejde og dele");
  });

  it("emits FAQPage matching visible FAQ and Service JSON-LD", async () => {
    const { container } = render(await Page());
    const blocks = Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((s) => JSON.parse(s.textContent!));
    const faq = blocks.find((b) => b["@type"] === "FAQPage");
    const visible = Array.from(container.querySelectorAll("details summary")).map((s) => s.textContent);
    expect(faq.mainEntity.map((q: { name: string }) => q.name)).toEqual(visible);
    const svc = blocks.find((b) => b["@type"] === "Service");
    expect(svc.hasOfferCatalog.itemListElement.length).toBe(1);
  });

  it("has canonical and length-safe metadata", async () => {
    const m = await generateMetadata();
    expect(m.alternates?.canonical).toBe("https://phonespot.dk/reparation/tablet");
    expect(String(m.title).length).toBeLessThanOrEqual(60);
  });
});
