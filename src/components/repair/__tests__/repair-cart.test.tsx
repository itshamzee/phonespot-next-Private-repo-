import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { RepairCart } from "../repair-cart";
const common = {
  estimated_minutes: 45,
  description: "Udskiftning og test af din enhed.",
  warranty_info: "24 måneders garanti på denne reservedel.",
  includes: "Reservedel og montering",
  info_note: null,
};
const services = [
  {
    ...common,
    id: "screen",
    name: "Skærmskift standard",
    slug: "screen-standard",
    price_dkk: 1299,
    quality_tier: "standard" as const,
    service_category: "Skærmskift",
  },
  {
    ...common,
    id: "premium",
    name: "Skærmskift premium",
    slug: "screen-premium",
    price_dkk: 1599,
    quality_tier: "premium" as const,
    service_category: "Skærmskift",
  },
  {
    ...common,
    id: "original",
    name: "Skærmskift original",
    slug: "screen-original",
    price_dkk: 1999,
    quality_tier: "original" as const,
    service_category: "Skærmskift",
  },
  {
    ...common,
    id: "battery",
    name: "Batteriskift",
    slug: "batteriskift",
    price_dkk: 499,
    quality_tier: null,
    service_category: null,
  },
  {
    ...common,
    id: "unknown",
    name: "Kamera",
    slug: "kamera",
    price_dkk: 0,
    estimated_minutes: null,
    quality_tier: null,
    service_category: null,
  },
];
function setup() {
  return render(
    <RepairCart
      services={services}
      brandName="iPhone"
      modelName="iPhone 17 Pro"
      brandSlug="iphone"
      modelSlug="iphone-17-pro"
    />,
  );
}
afterEach(() => vi.unstubAllGlobals());
describe("repair service selection", () => {
  it("exposes selected quality and exact service terms, replacing a sibling without losing the total", () => {
    setup();
    // Kvaliteterne er synlige uden klik: pris og forskel står på hvert kort.
    const standard = screen.getByRole("button", {
      name: /^Vælg Skærmskift standard/,
    });
    expect(screen.getByText("Mest valgt")).toBeInTheDocument();
    expect(standard).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(standard);
    expect(standard).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText(common.warranty_info).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /^Vælg Batteriskift/ }));
    expect(screen.getAllByText("1.618 kr.").length).toBeGreaterThan(0);
    fireEvent.click(
      screen.getByRole("button", { name: /^Vælg Skærmskift premium/ }),
    );
    expect(standard).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByText("1.888 kr.").length).toBeGreaterThan(0);
  });
  it("keeps the selected quality visible when all service names are identical", () => {
    render(
      <RepairCart
        services={services.map((service) =>
          service.service_category === "Skærmskift"
            ? { ...service, name: "Skærmskift" }
            : service,
        )}
        brandName="iPhone"
        modelName="iPhone 17 Pro"
        brandSlug="iphone"
        modelSlug="iphone-17-pro"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Vælg Skærmskift til 1.599 kr." }),
    );
    expect(
      within(
        screen.getByRole("complementary", { name: "Din reparationsoversigt" }),
      ).getByText("Skærmskift (OEM)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Valgt: Skærmskift (OEM)")).toBeInTheDocument();
  });
  it("offers tempered glass in the summary and adds it to the total once a repair is chosen", () => {
    setup();
    const aside = screen.getByRole("complementary", { name: "Din reparationsoversigt" });
    const glass = within(aside).getByRole("button", { name: "Tilføj for 99 kr." });
    expect(glass).toHaveAttribute("aria-disabled", "true");
    expect(within(aside).getByText("Vælg en reparation først.")).toBeInTheDocument();
    fireEvent.click(glass);
    expect(glass).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: /^Vælg Skærmskift premium/ }));
    expect(within(aside).getByText("Anbefales ved skærmskift")).toBeInTheDocument();
    fireEvent.click(within(aside).getByRole("button", { name: "Tilføj for 99 kr." }));
    expect(within(aside).getByRole("button", { name: "Tilføjet" })).toHaveAttribute("aria-pressed", "true");
    expect(within(aside).getAllByText("1.698 kr.").length).toBeGreaterThan(0);
  });
  it("shows unavailable prices as contact options and does not invent time estimates", () => {
    setup();
    expect(
      screen.queryByRole("button", { name: /^Vælg Kamera/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Kontakt os om Kamera/ }),
    ).toHaveAttribute("href", "/kontakt");
    expect(screen.queryByText(/^0 kr/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ca. 30 min/)).not.toBeInTheDocument();
  });
  it("retains repair and customer details when returning from the labelled booking form", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /^Vælg Batteriskift/ }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Gå til booking" })[0],
    );
    const name = screen.getByRole("textbox", { name: "Navn *" });
    fireEvent.change(name, { target: { value: "Testkunde" } });
    expect(
      screen.getByRole("heading", { name: "Book reparation" }),
    ).toHaveFocus();
    fireEvent.click(
      screen.getByRole("button", { name: /Tilbage til prisliste/ }),
    );
    expect(
      screen.getByRole("button", { name: /^Vælg Batteriskift/ }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(
      screen.getAllByRole("button", { name: "Gå til booking" })[0],
    );
    expect(screen.getByRole("textbox", { name: "Navn *" })).toHaveValue(
      "Testkunde",
    );
  });
  it("preserves the normalized mail-in store and kroner total at the mocked booking boundary", async () => {
    const send = vi
      .fn()
      .mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Test: booking blev ikke sendt" }),
      });
    vi.stubGlobal("fetch", send);
    setup();
    fireEvent.click(screen.getByRole("button", { name: /^Vælg Batteriskift/ }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Gå til booking" })[0],
    );
    for (const [name, value] of [
      ["Navn *", "Testkunde"],
      ["E-mail *", "test@example.com"],
      ["Telefon *", "12345678"],
    ])
      fireEvent.change(screen.getByRole("textbox", { name }), {
        target: { value },
      });
    fireEvent.click(screen.getByRole("button", { name: /^Send ind/ }));
    expect(
      screen.getByRole("button", { name: "Betal i butikken" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /^Vejle/ }));
    const dateGroup = screen.getByRole("group", {
      name: "Hvornår vil du aflevere? *",
    });
    fireEvent.click(within(dateGroup).getAllByRole("button")[0]);
    fireEvent.click(screen.getByRole("button", { name: "10-12" }));
    fireEvent.click(screen.getByRole("button", { name: "Betal i butikken" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Test: booking blev ikke sendt",
    );
    expect(send).toHaveBeenCalledTimes(1);
    const [url, request] = send.mock.calls[0];
    expect(url).toBe("/api/repairs");
    expect(JSON.parse(request.body)).toMatchObject({
      store_id: "vejle",
      delivery_method: "Send ind",
      total_price_dkk: 499,
      selected_services: [
        { id: "battery", name: "Batteriskift", price_dkk: 499 },
      ],
      preferred_time: "10:00-12:00",
    });
  });
});
