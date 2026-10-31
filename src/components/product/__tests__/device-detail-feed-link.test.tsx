/* eslint-disable @next/next/no-img-element -- Use a plain image at the Next image boundary in tests. */
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeviceDetail, type PublicDevice } from "../device-detail";
import type { ProductTemplate } from "@/lib/supabase/platform-types";

vi.mock("@/components/cart/cart-context", () => ({
  useCart: () => ({
    addDevice: vi.fn(),
    openCart: vi.fn(),
    openUpsell: vi.fn(),
    cartState: { items: [] },
  }),
}));
vi.mock("@/components/insurance/insurance-lead", () => ({ InsuranceLead: () => null }));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const template = {
  id: "t1",
  brand: "Apple",
  display_name: "iPhone test",
  category: "iphone",
  images: ["/1.jpg"],
  storage_options: ["128GB", "256GB"],
  colors: ["Sort", "Blå"],
  specifications: {},
  default_attributes: {},
  base_price_a: 300000,
  base_price_b: 200000,
  base_price_c: null,
  new_price: null,
} as unknown as ProductTemplate;

function unit(id: string, overrides: Partial<PublicDevice>): PublicDevice {
  return {
    id,
    template_id: "t1",
    status: "listed",
    grade: "B",
    condition_notes: null,
    selling_price: 200000,
    storage: "128GB",
    color: "Sort",
    battery_health: 95,
    battery_replaced: false,
    screen_replaced: null,
    replaced_parts_original: null,
    source: "manual",
    ...overrides,
  } as PublicDevice;
}
const units = [
  unit("billig", {}),
  unit("dyr", { storage: "256GB", color: "Blå", selling_price: 260000 }),
];

const open = (search: string) => {
  window.history.replaceState(null, "", `/refurbished/x${search}`);
  render(<DeviceDetail template={template} devices={units} accessories={[]} />);
};
const pressed = (name: string) => screen.getByRole("button", { name });

afterEach(() => window.history.replaceState(null, "", "/"));

describe("DeviceDetail link fra feedet", () => {
  it("forvælger lagerplads og farve fra linket", async () => {
    open("?grade=B&storage=256GB&color=Bl%C3%A5");
    await waitFor(() => expect(pressed("256GB")).toHaveAttribute("aria-pressed", "true"));
    expect(pressed("Blå")).toHaveAttribute("aria-pressed", "true");
  });

  it("ignorerer en variant, der ikke findes i standen", async () => {
    open("?grade=B&storage=256GB&color=Sort");
    await waitFor(() => expect(pressed("128GB")).toHaveAttribute("aria-pressed", "true"));
    expect(pressed("Sort")).toHaveAttribute("aria-pressed", "true");
  });

  it("?grade= alene vælger stadig den billigste variant", async () => {
    open("?grade=B");
    await waitFor(() => expect(pressed("128GB")).toHaveAttribute("aria-pressed", "true"));
  });
});
