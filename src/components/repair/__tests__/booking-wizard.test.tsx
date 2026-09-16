import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BookingWizard } from "../booking-wizard";
import type {
  RepairBrand,
  RepairModel,
  RepairService,
} from "@/lib/supabase/types";
const fixture = vi.hoisted(() => ({
  params: new URLSearchParams(),
  brands: [] as RepairBrand[],
  models: [] as RepairModel[],
  services: [] as RepairService[],
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => fixture.params }));
vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => {
          filters[key] = value;
          return query;
        },
        order: async () => {
          const records =
            table === "repair_brands"
              ? fixture.brands
              : table === "repair_models"
                ? fixture.models
                : fixture.services;
          return {
            data: records.filter((record) =>
              Object.entries(filters).every(
                ([key, value]) => record[key as keyof typeof record] === value,
              ),
            ),
          };
        },
      };
      return query;
    },
  }),
}));
beforeEach(() => {
  fixture.params = new URLSearchParams();
  fixture.brands = [
    {
      id: "apple",
      name: "iPhone",
      slug: "iphone",
      device_type: "smartphone",
      active: true,
      sort_order: 0,
      logo_url: null,
      created_at: "",
    },
  ];
  fixture.models = [
    {
      id: "15",
      brand_id: "apple",
      name: "iPhone 15",
      slug: "iphone-15",
      series: null,
      image_url: null,
      active: true,
      sort_order: 0,
      created_at: "",
    },
  ];
  fixture.services = [
    {
      id: "battery",
      model_id: "15",
      name: "Batteriskift",
      slug: "batteriskift",
      price_dkk: 499,
      estimated_minutes: 45,
      estimated_time_label: null,
      description: "Udskiftning af batteri",
      warranty_info: "24 måneders garanti på reservedelen",
      includes: "Batteri og montering",
      quality_tier: null,
      info_note: null,
      service_category: null,
      active: true,
      sort_order: 0,
      created_at: "",
    },
  ];
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new Error("Unexpected network call")),
  );
});
afterEach(() => vi.unstubAllGlobals());
async function chooseModel() {
  fireEvent.change(await screen.findByRole("combobox", { name: "Mærke" }), {
    target: { value: "apple" },
  });
  await screen.findByRole("option", { name: "iPhone 15" });
  fireEvent.change(screen.getByRole("combobox", { name: "Model" }), {
    target: { value: "15" },
  });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Næste" })).toBeEnabled(),
  );
}
function next() {
  fireEvent.click(screen.getByRole("button", { name: "Næste" }));
}
function fillDetails() {
  for (const [name, value] of [
    ["Fuldt navn", "Testkunde"],
    ["Telefon", "12345678"],
    ["E-mail", "test@example.com"],
    ["Beskriv problemet", "Batteriet holder ikke strøm"],
  ])
    fireEvent.change(screen.getByRole("textbox", { name }), {
      target: { value },
    });
}
describe("booking presentation preserves existing flow", () => {
  it("keeps query-prefilled device/service/store through back navigation and the mocked request", async () => {
    fixture.params = new URLSearchParams(
      "brand=iphone&model=iphone-15&service=batteriskift&store=Vejle",
    );
    const send = vi
      .fn()
      .mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Test: intet sendt" }),
      });
    vi.stubGlobal("fetch", send);
    render(<BookingWizard />);
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Model" })).toHaveValue("15"),
    );
    next();
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent(
      "Reparation",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Batteriskift/, pressed: true }),
      ).toBeInTheDocument(),
    );
    next();
    fillDetails();
    next();
    expect(
      screen.getByRole("button", { name: /^Vejle/, pressed: true }),
    ).toBeInTheDocument();
    const dates = screen.getByRole("group", { name: "Vælg dato" });
    fireEvent.click(within(dates).getAllByRole("button")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Tilbage" }));
    expect(screen.getByRole("textbox", { name: "Fuldt navn" })).toHaveValue(
      "Testkunde",
    );
    next();
    next();
    expect(
      screen.getByRole("button", { name: /Betal nu.*499 DKK/ }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Book og betal i butikken" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Test: intet sendt",
    );
    const [url, request] = send.mock.calls[0];
    expect(url).toBe("/api/repairs");
    expect(JSON.parse(request.body)).toMatchObject({
      store_id: "vejle",
      total_price_dkk: 499,
      discount_percent: 0,
      device_type: "iPhone",
      device_model: "iPhone 15",
      selected_services: [
        { id: "battery", name: "Batteriskift", price_dkk: 499 },
      ],
      devices: [
        {
          device_type: "iPhone",
          device_model: "iPhone 15",
          selected_services: [
            { id: "battery", name: "Batteriskift", price_dkk: 499 },
          ],
        },
      ],
    });
  });
  it("keeps independent multi-device selection and the existing discounted DKK total", async () => {
    render(<BookingWizard />);
    await chooseModel();
    fireEvent.click(screen.getByRole("button", { name: "Tilføj enhed" }));
    await chooseModel();
    next();
    fireEvent.click(
      await screen.findByRole("button", { name: /Batteriskift/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /^Enhed 1/ }));
    expect(
      screen.getByRole("button", { name: /Batteriskift/, pressed: false }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Batteriskift/ }));
    expect(screen.getAllByText("898 DKK").length).toBeGreaterThan(0);
    next();
    fireEvent.click(screen.getByRole("button", { name: "Tilbage" }));
    expect(
      screen.getByRole("button", { name: /Batteriskift/, pressed: true }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Enhed 2/ }));
    expect(
      screen.getByRole("button", { name: /Batteriskift/, pressed: true }),
    ).toBeInTheDocument();
  });
  it("offers help when the chosen brand has no models", async () => {
    fixture.models = [];
    render(<BookingWizard />);
    fireEvent.change(await screen.findByRole("combobox", { name: "Mærke" }), {
      target: { value: "apple" },
    });
    expect(
      await screen.findByRole("link", { name: /Få hjælp til din model/ }),
    ).toHaveAttribute("href", "/kontakt");
    expect(screen.getByRole("button", { name: "Næste" })).toBeDisabled();
  });
  it("offers contact for an unpriced service without selecting it as free", async () => {
    fixture.services[0].price_dkk = 0;
    render(<BookingWizard />);
    await chooseModel();
    next();
    expect(
      await screen.findByRole("link", { name: /Kontakt os om Batteriskift/ }),
    ).toHaveAttribute("href", "/kontakt");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(
      screen.queryByRole("button", { name: /Batteriskift/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Næste" })).toBeDisabled();
  });
  it("retains the query model but does not preselect an unavailable zero-price service", async () => {
    fixture.params = new URLSearchParams(
      "brand=iphone&model=iphone-15&service=batteriskift",
    );
    fixture.services[0].price_dkk = 0;
    render(<BookingWizard />);
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Model" })).toHaveValue("15"),
    );
    next();
    expect(
      await screen.findByRole("link", { name: /Kontakt os om Batteriskift/ }),
    ).toHaveAttribute("href", "/kontakt");
    expect(screen.getByRole("button", { name: "Næste" })).toBeDisabled();
  });

  it("replaces sibling quality for one device while keeping unrelated repairs and supporting deselection", async () => {
    fixture.services.push(
      {
        ...fixture.services[0],
        id: "standard",
        name: "Skærmskift",
        slug: "screen-standard",
        service_category: "Skaerm",
        quality_tier: "standard",
        price_dkk: 1299,
      },
      {
        ...fixture.services[0],
        id: "premium",
        name: "Skærmskift",
        slug: "screen-premium",
        service_category: "Skaerm",
        quality_tier: "premium",
        price_dkk: 1599,
      },
    );
    render(<BookingWizard />);
    await chooseModel();
    next();
    fireEvent.click(
      await screen.findByRole("button", { name: /Skærmskift.*1299/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Batteriskift/ }));
    expect(screen.getAllByText("1618 DKK").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Skærmskift.*1599/ }));
    expect(
      screen.getByRole("button", { name: /Skærmskift.*1299/ }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByText("1888 DKK").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Skærmskift.*1599/ }));
    expect(
      screen.getByRole("button", { name: /Skærmskift.*1599/ }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("button", { name: /Batteriskift/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("499 DKK").length).toBeGreaterThan(0);
  });
  it("opens model selection when adding on the repair step, preserving qualities independently per device", async () => {
    fixture.services = [
      {
        ...fixture.services[0],
        id: "standard",
        name: "Skærmskift",
        slug: "screen-standard",
        service_category: "Skaerm",
        quality_tier: "standard",
        price_dkk: 1299,
      },
      {
        ...fixture.services[0],
        id: "premium",
        name: "Skærmskift",
        slug: "screen-premium",
        service_category: "Skaerm",
        quality_tier: "premium",
        price_dkk: 1599,
      },
    ];
    render(<BookingWizard />);
    await chooseModel();
    next();
    fireEvent.click(
      await screen.findByRole("button", { name: /Skærmskift.*1299/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Tilføj enhed" }));
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent(
      "Enhed",
    );
    await chooseModel();
    next();
    fireEvent.click(
      await screen.findByRole("button", { name: /Skærmskift.*1599/ }),
    );
    expect(screen.getAllByText("2608 DKK").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /^Enhed 1/ }));
    expect(
      screen.getByRole("button", { name: /Skærmskift.*1299/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /Skærmskift.*1599/ }),
    ).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Tilføj enhed" }));
    expect(
      screen.getByRole("button", { name: /^Enhed 3/, pressed: true }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Model" })).toHaveValue("");
  });

  it("retains sequential customer typing across fields and back navigation", async () => {
    render(<BookingWizard />);
    await chooseModel();
    next();
    fireEvent.click(
      await screen.findByRole("button", { name: /Batteriskift/ }),
    );
    next();
    const values = [
      ["Fuldt navn", "Testkunde"],
      ["Telefon", "12345678"],
      ["E-mail", "test@example.com"],
      ["Beskriv problemet", "Batteriet holder ikke strøm"],
    ];
    for (const [name, value] of values) {
      const field = screen.getByRole("textbox", { name });
      fireEvent.focus(field);
      for (let i = 1; i <= value.length; i++)
        fireEvent.input(field, { target: { value: value.slice(0, i) } });
      fireEvent.blur(field);
    }
    for (const [name, value] of values)
      expect(screen.getByRole("textbox", { name })).toHaveValue(value);
    expect(screen.getByRole("button", { name: "Næste" })).toBeEnabled();
    next();
    fireEvent.click(screen.getByRole("button", { name: "Tilbage" }));
    for (const [name, value] of values)
      expect(screen.getByRole("textbox", { name })).toHaveValue(value);
  });
});
