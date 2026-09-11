/* eslint-disable @next/next/no-img-element -- Use a plain image at the Next image boundary in interaction tests. */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceDetail, type PublicDevice } from "../device-detail";
import type { ProductTemplate } from "@/lib/supabase/platform-types";
const cart = vi.hoisted(() => ({
  addDevice: vi.fn(),
  openCart: vi.fn(),
  openUpsell: vi.fn(),
  cartState: { items: [] },
}));
vi.mock("@/components/cart/cart-context", () => ({ useCart: () => cart }));
vi.mock("@/components/insurance/insurance-lead", () => ({
  InsuranceLead: () => null,
}));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));
const template = {
  id: "t1",
  brand: "Apple",
  display_name: "iPhone test",
  category: "iphone",
  images: ["/black-1.jpg", "/black-2.jpg"],
  storage_options: ["128GB", "256GB", "512GB"],
  colors: ["Sort", "Blå", "Rød"],
  specifications: {},
  default_attributes: { images_by_color: { Blå: ["/blue.jpg"] } },
  base_price_a: 300000,
  base_price_b: 200000,
  base_price_c: null,
  new_price: null,
} as unknown as ProductTemplate;
function unit(id: string, overrides: Partial<PublicDevice> = {}): PublicDevice {
  return {
    id,
    template_id: "t1",
    status: "listed",
    grade: "A",
    condition_notes: null,
    selling_price: 300000,
    storage: "128GB",
    color: "Sort",
    battery_health: 95,
    battery_replaced: false,
    source: "manual",
    ...overrides,
  };
}
const units = [
  unit("a128"),
  unit("a256", { storage: "256GB", selling_price: 350000, battery_health: 97 }),
  unit("bblue", {
    grade: "B",
    color: "Blå",
    storage: "256GB",
    selling_price: 240000,
    battery_health: 88,
    condition_notes: "Lille ridse på bagsiden",
  }),
];
beforeEach(() => {
  vi.clearAllMocks();
  cart.addDevice.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllGlobals());
describe("DeviceDetail interactions", () => {
  it("selects physical units through storage, color and grade with honest availability", async () => {
    render(
      <DeviceDetail template={template} devices={units} accessories={[]} />,
    );
    expect(screen.getByRole("button", { name: /512GB/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Rød/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "256GB" }));
    expect(screen.getByRole("button", { name: "256GB" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText(/Batteri: 97%/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Læg i kurv" }));
    await waitFor(() =>
      expect(cart.addDevice).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: "a256",
          price: 350000,
          storage: "256GB",
          color: "Sort",
          grade: "A",
        }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Blå" }));
    expect(screen.getByRole("button", { name: /God/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText(/Batteri: 88%/)).toBeInTheDocument();
    expect(screen.getByText("Lille ridse på bagsiden")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Læg i kurv" }));
    await waitFor(() =>
      expect(cart.addDevice).toHaveBeenLastCalledWith(
        expect.objectContaining({
          deviceId: "bblue",
          price: 240000,
          storage: "256GB",
          color: "Blå",
          grade: "B",
        }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: /Perfekt/ }));
    expect(screen.getByRole("button", { name: "Sort" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
  it("names gallery controls, selects the image and resets on color change", () => {
    render(
      <DeviceDetail template={template} devices={units} accessories={[]} />,
    );
    const second = screen.getByRole("button", {
      name: "Vis billede 2 af iPhone test",
    });
    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", { name: "iPhone test" })).toHaveAttribute(
      "src",
      "/black-2.jpg",
    );
    fireEvent.click(screen.getByRole("button", { name: "Blå" }));
    expect(screen.getByRole("img", { name: "iPhone test" })).toHaveAttribute(
      "src",
      "/blue.jpg",
    );
  });
  it("cannot buy sold-out stock and offers the category and notification form", () => {
    render(<DeviceDetail template={template} devices={[]} accessories={[]} />);
    expect(screen.getByRole("button", { name: "Udsolgt" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Læg i kurv" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Se flere modeller/ }),
    ).toHaveAttribute("href", "/iphones");
    expect(
      screen.getByRole("textbox", { name: "Din email" }),
    ).toBeInTheDocument();
    expect(cart.addDevice).not.toHaveBeenCalled();
  });
  it("announces a reservation rejection and makes retry available", async () => {
    let reject!: (reason: Error) => void;
    cart.addDevice.mockImplementationOnce(
      () =>
        new Promise((_, no) => {
          reject = no;
        }),
    );
    render(
      <DeviceDetail template={template} devices={units} accessories={[]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Læg i kurv" }));
    expect(screen.getByRole("button", { name: /Reserverer/ })).toBeDisabled();
    reject(new Error("Enheden blev netop solgt. Vælg en anden variant."));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enheden blev netop solgt",
    );
    expect(screen.getByRole("button", { name: "Læg i kurv" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Læg i kurv" }));
    await waitFor(() => expect(cart.openUpsell).toHaveBeenCalled());
  });
});

it("keeps laptop upgrades on the physical-unit payload and opens the cart", async () => {
  const options = [
    {
      id: "ram32",
      kind: "ram" as const,
      label: "32 GB RAM",
      targetSpec: "32GB",
      price: 50000,
    },
  ];
  render(
    <DeviceDetail
      template={{ ...template, category: "laptop" }}
      devices={units}
      accessories={[]}
      upgradeOptions={options}
    />,
  );
  fireEvent.change(screen.getByLabelText("Ekstra RAM (inkl. montering)"), {
    target: { value: "ram32" },
  });
  expect(screen.getByText(/Samlet:.*3\.500/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Læg i kurv" }));
  await waitFor(() =>
    expect(cart.addDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: "a128",
        price: 300000,
        upgrades: [
          { optionId: "ram32", kind: "ram", label: "32 GB RAM", price: 50000 },
        ],
      }),
    ),
  );
  expect(cart.openCart).toHaveBeenCalled();
  expect(screen.getByLabelText("Ekstra RAM (inkl. montering)")).toHaveValue("");
});
it("submits a stock notification and announces the returned confirmation", async () => {
  const request = vi
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Din tilmelding er gemt." }),
    });
  vi.stubGlobal("fetch", request);
  render(<DeviceDetail template={template} devices={[]} accessories={[]} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Din email" }), {
    target: { value: "test@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Giv besked" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Din tilmelding er gemt.",
  );
  expect(request).toHaveBeenCalledWith(
    "/api/notify",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        templateId: "t1",
        gradePreference: "P",
      }),
    }),
  );
});
