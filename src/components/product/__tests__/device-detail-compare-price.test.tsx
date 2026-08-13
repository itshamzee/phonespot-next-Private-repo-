import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DeviceDetail } from "../device-detail";
import type { Device, ProductTemplate } from "@/lib/supabase/platform-types";

// DeviceDetail calls useCart() for add-to-cart/upsell wiring — stub it so the
// component tree doesn't need a real CartProvider for these render-only
// assertions (same pattern as accessory-detail.test.tsx).
vi.mock("@/components/cart/cart-context", () => ({
  useCart: () => ({
    addDevice: vi.fn(),
    openCart: vi.fn(),
    openUpsell: vi.fn(),
    cartState: { items: [] },
  }),
}));

// Regression coverage: PhoneSpot used to show its OWN Grade A selling price
// (base_price_a) struck through as "Nypris", which misrepresents our price
// as the manufacturer's new price and is misleading under markedsføringsloven.
// The comparison must now derive exclusively from `new_price`, a real
// recommended-retail-price field that's never auto-derived.
function makeTemplate(overrides: Partial<ProductTemplate> = {}): ProductTemplate {
  return {
    id: "t1",
    brand: "HP",
    model: "EliteBook 8 G1i",
    category: "laptop",
    storage_options: ["512GB"],
    colors: ["Sølv"],
    default_attributes: {},
    display_name: "HP EliteBook 8 G1i",
    slug: "hp-elitebook-8-g1i",
    description: null,
    images: [],
    short_description: null,
    meta_title: null,
    meta_description: null,
    specifications: {},
    status: "published",
    base_price_a: null,
    base_price_b: null,
    base_price_c: null,
    base_price_n: null,
    base_price_p: null,
    new_price: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeDevice(overrides: Partial<Device> = {}): Device {
  return {
    id: "d1",
    serial_number: null,
    imei: null,
    template_id: "t1",
    barcode: null,
    grade: "P",
    battery_health: 97,
    storage: "512GB",
    color: "Sølv",
    condition_notes: null,
    photos: [],
    purchase_price: 500000,
    selling_price: 999900,
    margin: null,
    vat_scheme: "regular",
    vat_amount: null,
    origin_country: "DK",
    supplier_id: null,
    location_id: "loc1",
    status: "listed",
    purchased_at: null,
    listed_at: null,
    sold_at: null,
    reservation_expires_at: null,
    source: "manual",
    source_sku: null,
    source_stock: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("DeviceDetail — compare-at price", () => {
  it("renders the savings comparison when new_price is set and higher than the selling price", () => {
    const template = makeTemplate({ new_price: 1584600 }); // 15.846 kr
    const device = makeDevice({ selling_price: 999900 }); // 9.999 kr

    render(<DeviceDetail template={template} devices={[device]} accessories={[]} />);

    expect(screen.getByText("Nypris")).toBeInTheDocument();
    expect(screen.getByText(/15\.846/)).toBeInTheDocument();
    expect(screen.getByText(/sammenlignet med nypris/i)).toBeInTheDocument();
  });

  it("renders NO comparison at all when new_price is null", () => {
    const template = makeTemplate({ new_price: null });
    const device = makeDevice({ selling_price: 999900 });

    render(<DeviceDetail template={template} devices={[device]} accessories={[]} />);

    expect(screen.queryByText("Nypris")).not.toBeInTheDocument();
    expect(screen.queryByText(/sammenlignet med nypris/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/du sparer/i)).not.toBeInTheDocument();
  });

  it("renders NO comparison when new_price is not greater than the current price", () => {
    const template = makeTemplate({ new_price: 999900 }); // equal to selling price
    const device = makeDevice({ selling_price: 999900 });

    render(<DeviceDetail template={template} devices={[device]} accessories={[]} />);

    expect(screen.queryByText("Nypris")).not.toBeInTheDocument();
    expect(screen.queryByText(/du sparer/i)).not.toBeInTheDocument();
  });

  it("never derives the comparison from base_price_a, even when new_price is null", () => {
    // base_price_a is PhoneSpot's own Grade A selling price — it must never
    // be used as a stand-in "new price" comparison.
    const template = makeTemplate({ new_price: null, base_price_a: 675000 });
    const device = makeDevice({ selling_price: 380000, grade: "A" });

    render(<DeviceDetail template={template} devices={[device]} accessories={[]} />);

    expect(screen.queryByText("Nypris")).not.toBeInTheDocument();
    expect(screen.queryByText(/6\.750/)).not.toBeInTheDocument();
    expect(screen.queryByText(/du sparer/i)).not.toBeInTheDocument();
  });
});
