import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ModelPage, {
  generateMetadata,
} from "@/app/reparation/[brand]/[model]/page";
const data = vi.hoisted(() => ({ services: [] as Record<string, unknown>[] }));
vi.mock("@/lib/supabase/repairs", () => ({
  getBrandBySlug: async () => ({
    id: "brand",
    slug: "iphone",
    name: "iPhone",
    device_type: "smartphone",
  }),
  getModelBySlug: async () => ({
    id: "model",
    slug: "iphone-test",
    name: "iPhone test",
    image_url: null,
  }),
  getServicesByModel: async () => data.services,
  getAllModelSlugs: async () => [],
}));
vi.mock("@/lib/product/model-accessories", () => ({
  getModelUpsell: async () => [],
}));
vi.mock("@/components/ui/storstrom-insurance-teaser", () => ({
  StorstromInsuranceTeaser: () => null,
}));
const params = Promise.resolve({ brand: "iphone", model: "iphone-test" });
beforeEach(() => {
  data.services = [];
});
describe("repair model availability", () => {
  it("offers contact and preserves canonical when no service prices are available", async () => {
    render(await ModelPage({ params }));
    expect(
      screen.getByRole("link", { name: /Kontakt os om iPhone test/ }),
    ).toHaveAttribute("href", "/kontakt");
    expect(
      screen.queryByRole("button", { name: /Gå til booking/ }),
    ).not.toBeInTheDocument();
    expect((await generateMetadata({ params })).alternates?.canonical).toBe(
      "https://phonespot.dk/reparation/iphone/iphone-test",
    );
  });
  it("does not publish a zero-price service as a free structured offer", async () => {
    data.services = [
      {
        id: "zero",
        name: "Skærmskift",
        price_dkk: 0,
        slug: "screen",
        estimated_minutes: null,
        description: null,
        warranty_info: null,
        includes: null,
        quality_tier: null,
        service_category: null,
        info_note: null,
      },
    ];
    const { container } = render(await ModelPage({ params }));
    const schemas = Array.from(
      container.querySelectorAll('script[type="application/ld+json"]'),
    ).map((el) => JSON.parse(el.textContent!));
    expect(schemas.every((schema) => !schema.hasOfferCatalog)).toBe(true);
    expect(
      screen.queryByRole("button", { name: /Vælg Skærmskift/ }),
    ).not.toBeInTheDocument();
  });
  it("lists every quality and price in a crawlable price table", async () => {
    data.services = [
      {
        id: "s2",
        name: "Skærmskift",
        price_dkk: 899,
        slug: "skaermskift-original",
        estimated_minutes: 30,
        description: null,
        warranty_info: "Livstidsgaranti på arbejde og dele",
        includes: null,
        quality_tier: "original",
        service_category: "Skærmskift",
        info_note: null,
      },
      {
        id: "s1",
        name: "Skærmskift",
        price_dkk: 499,
        slug: "skaermskift",
        estimated_minutes: 30,
        description: null,
        warranty_info: "Livstidsgaranti på arbejde og dele",
        includes: null,
        quality_tier: "standard",
        service_category: "Skærmskift",
        info_note: null,
      },
      {
        id: "w",
        name: "Vandskade",
        price_dkk: 699,
        slug: "vandskade",
        estimated_minutes: 45,
        description: null,
        warranty_info: "3 måneders garanti",
        includes: null,
        quality_tier: null,
        service_category: "Vandskade",
        info_note: null,
      },
    ];
    render(await ModelPage({ params }));
    const table = screen.getByRole("table");
    const rows = Array.from(table.querySelectorAll("tbody tr")).map((r) =>
      r.textContent,
    );
    expect(rows).toHaveLength(3);
    // Standard før original inden for samme reparation.
    expect(rows[0]).toContain("Standard");
    expect(rows[0]).toContain("499 kr.");
    expect(rows[1]).toContain("Original");
    expect(rows[1]).toContain("899 kr.");
    expect(rows[2]).toContain("iPhone test vandskade");
    // Vandskade har ikke livstidsgaranti, så linjen må ikke love det på alt.
    expect(screen.getByText("På de fleste reparationer")).toBeInTheDocument();
    expect(screen.getByText("30–45 min.")).toBeInTheDocument();
  });
  it("lists the stores, mail-in and upcoming stores", async () => {
    render(await ModelPage({ params }));
    expect(screen.getByRole("link", { name: "Slagelse" })).toHaveAttribute(
      "href",
      "/butik/slagelse",
    );
    expect(screen.getByRole("link", { name: "Vejle" })).toHaveAttribute(
      "href",
      "/reparation-vejle",
    );
    expect(screen.getByRole("link", { name: "Sådan gør du" })).toHaveAttribute(
      "href",
      "/reparation/indsend",
    );
    expect(screen.getByText(/Åbner november 2026/)).toBeInTheDocument();
  });
});
