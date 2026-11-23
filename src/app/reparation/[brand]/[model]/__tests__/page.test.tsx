import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const svc = (slug: string, name: string, price: number, category: string | null = null) => ({
  id: slug, model_id: "m", slug, name, price_dkk: price, estimated_minutes: null, description: null,
  warranty_info: null, includes: null, estimated_time_label: null, quality_tier: null, info_note: null,
  service_category: category, sort_order: 1, active: true, created_at: "",
});

const SERVICES: Record<string, ReturnType<typeof svc>[]> = {
  ps: [
    svc("diagnostik", "Diagnostik", 299, "Diagnostik"),
    svc("termisk-pasta", "Termisk pasta", 499),
    svc("rens-koelepasta", "Rens + ny kølepasta", 899),
    svc("hdmi-port-rengoering", "HDMI-port + rengøring", 1300),
    svc("hdmi-port", "HDMI-port", 1599),
  ],
  iphone: [
    svc("diagnostik", "Diagnostik", 249, "Diagnostik"),
    svc("software-fejl", "Software-fejl", 499, "Software"),
    svc("batteriskift", "Batteriskift", 899, "Batteriskift"),
    svc("skaermskift-budget", "Skærmskift (Budget)", 1599, "Skærmskift"),
  ],
};

vi.mock("@/lib/supabase/repairs", () => ({
  getAllModelSlugs: vi.fn(async () => []),
  getBrandBySlug: vi.fn(async (slug: string) =>
    slug === "playstation"
      ? { id: "b1", slug: "playstation", name: "PlayStation", device_type: "console" }
      : { id: "b2", slug: "iphone", name: "iPhone", device_type: "smartphone" },
  ),
  getModelBySlug: vi.fn(async (_b: string, slug: string) => ({
    id: slug.startsWith("playstation") ? "ps" : "iphone",
    slug,
    name: slug === "playstation-5-digital" ? "PlayStation 5 Digital" : slug === "playstation-5-pro" ? "PlayStation 5 Pro" : "iPhone 15",
    image_url: null,
  })),
  getServicesByModel: vi.fn(async (id: string) => SERVICES[id]),
}));
vi.mock("@/lib/product/model-accessories", () => ({ getModelUpsell: vi.fn(async () => []) }));
vi.mock("@/components/repair/repair-cart", () => ({ RepairCart: () => null }));
vi.mock("@/components/repair/repair-store-finder", () => ({ RepairStoreFinder: () => null }));
vi.mock("@/components/repair/repair-upsell", () => ({ RepairUpsell: () => null }));
vi.mock("@/components/repair/repair-price-table", () => ({ RepairPriceTable: () => null }));
vi.mock("@/components/ui/storstrom-insurance-teaser", () => ({ StorstromInsuranceTeaser: () => null }));

import Page, { generateMetadata } from "../page";

afterEach(cleanup);

const params = (brand: string, model: string) => ({ params: Promise.resolve({ brand, model }) });

describe("/reparation/[brand]/[model] for konsoller", () => {
  it("giver PS5 Digital egen titel, H1 og svar først", async () => {
    const m = await generateMetadata(params("playstation", "playstation-5-digital"));
    expect(String(m.title)).toMatch(/^PS5 Digital reparation/);
    expect(String(m.title).length).toBeLessThanOrEqual(60);
    expect(m.alternates?.canonical).toBe("https://phonespot.dk/reparation/playstation/playstation-5-digital");

    const { container } = render(await Page(params("playstation", "playstation-5-digital")));
    expect(container.querySelector("h1")?.textContent).toBe("PS5 Digital-reparation: HDMI-port, rens og ny køling");
    const text = container.textContent ?? "";
    expect(text).toContain("Rens + ny køling fra 899 kr.");
    expect(text).toContain("2 års garanti");
  });

  it("udsender FAQPage, der matcher de synlige spørgsmål, og tilbud uden diagnostik", async () => {
    const { container } = render(await Page(params("playstation", "playstation-5-pro")));
    const blocks = Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((s) => JSON.parse(s.textContent!));
    const faq = blocks.find((b) => b["@type"] === "FAQPage");
    const visible = Array.from(container.querySelectorAll("details summary")).map((s) => s.textContent);
    expect(faq.mainEntity.map((q: { name: string }) => q.name)).toEqual(visible);
    expect(visible).toContain("Hvad koster det at rense en PS5 Pro?");
    const service = blocks.find((b) => b["@type"] === "Service");
    const offers = service.hasOfferCatalog.itemListElement.map((o: { price: number }) => o.price);
    expect(offers).toContain(899);
    expect(offers).not.toContain(299);
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/blog/gta-6-klar-ps5-rens-koelepasta");
    expect(hrefs).toContain("/reparation-slagelse/playstation");
  });

  it("bruger en rigtig reparation som fra-pris på telefoner, ikke software eller diagnostik", async () => {
    const m = await generateMetadata(params("iphone", "iphone-15"));
    expect(String(m.title)).toContain("fra 899 kr.");
    expect(String(m.description)).not.toContain("499");
  });
});
