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
});
