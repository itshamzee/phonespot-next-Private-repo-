import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

// Debounce + stor DOM gør første render langsom, når hele suiten kører parallelt.
configure({ asyncUtilTimeout: 5000 });

vi.mock("@/components/admin/shell/store-scope-context", () => ({
  useStoreScope: () => ({
    scope: "vejle",
    ownSlug: "vejle",
    isOwner: false,
    loading: false,
    me: { id: "s1", name: "Mikkel", email: null, role: "staff", isOwner: false, ownSlug: "vejle", scope: "vejle" },
  }),
}));

vi.mock("@/components/admin/pdf-preview-modal", () => ({
  PDFPreviewModal: ({ data, onClose }: { data: { ticketNumber?: string }; onClose: () => void }) => (
    <div role="dialog" aria-label="Indleveringsbevis">
      Kvittering {data.ticketNumber}
      <button type="button" onClick={onClose}>
        Luk kvittering
      </button>
    </div>
  ),
}));

import NewCasePage from "../new-case-page";

const stock = (available: number | null, others: { slug: "vejle" | "slagelse"; available: number }[] = []) => ({
  tracked: available !== null,
  available,
  other_locations: others,
  in_transit: 0,
});

const TREE = {
  parents: [
    {
      key: "apple",
      name: "Apple",
      logo: null,
      brands: [
        {
          id: "b1",
          slug: "iphone",
          name: "iPhone",
          device_type: "smartphone",
          logo_url: null,
          series: [
            {
              name: "iPhone 15",
              models: [
                { id: "m15", slug: "iphone-15", name: "iPhone 15", image_url: null },
                { id: "m15p", slug: "iphone-15-pro", name: "iPhone 15 Pro", image_url: null },
              ],
            },
            { name: "iPhone 14", models: [{ id: "m14", slug: "iphone-14", name: "iPhone 14", image_url: null }] },
          ],
        },
      ],
    },
  ],
};

const svc = (id: string, price: number, tier: "standard" | "premium" | "original", part: unknown) => ({
  id,
  slug: id,
  name: "Skærmskift",
  price_dkk: price,
  price_oere: price * 100,
  quality_tier: tier,
  quality_label: null,
  estimated_minutes: 30,
  warranty_info: null,
  part_mode: "part",
  part,
});

const SERVICES = {
  model: { id: "m15", name: "iPhone 15", brand_name: "iPhone", brand_slug: "iphone", series: "iPhone 15", image_url: null, device_type: "smartphone" },
  location: "vejle",
  categories: [
    {
      name: "Skærmskift",
      recommended_service_id: "budget",
      services: [
        svc("budget", 1599, "standard", { sku_product_id: "s1", title: null, ...stock(4) }),
        svc("oem", 1999, "premium", { sku_product_id: "s2", title: null, ...stock(0, [{ slug: "slagelse", available: 2 }]) }),
        svc("orig", 3800, "original", { sku_product_id: "s3", title: null, ...stock(0) }),
      ],
    },
    {
      name: "Batteriskift",
      recommended_service_id: "bat",
      services: [{ ...svc("bat", 899, "standard", { sku_product_id: "s4", title: null, ...stock(null) }), name: "Batteriskift" }],
    },
  ],
};

const CUSTOMER = {
  id: "c1",
  type: "privat",
  name: "Kunde A",
  email: null,
  phone: "20451234",
  company_name: null,
  cvr: null,
  ean: null,
  invoice_email: null,
  contact_person: null,
  customer_devices: [{ id: "d1", brand: "Apple", model: "iPhone 13", serial_number: null, color: null }],
  ticket_count: 2,
};

const calls: { url: string; init?: RequestInit }[] = [];
let createResponse: Record<string, unknown>;

function json(body: unknown, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: async () => body } as Response);
}

beforeEach(() => {
  calls.length = 0;
  createResponse = {
    ticket_id: "t-1",
    ticket_number: "PS-2026-1201",
    customer_id: "c1",
    lines: [{ id: "i1", description: "Skærmskift", total_oere: 159_900 }],
    backorders: [],
    total_oere: 159_900,
    needs_deposit: false,
    kasse_url: "/admin/kasse?sag=t-1",
    deposit_url: "/admin/kasse?sag=t-1&depositum=1",
    replayed: false,
    warnings: [],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.startsWith("/api/admin/repair-catalog/tree")) return json(TREE);
      if (url.includes("/services")) return json(SERVICES);
      if (url.includes("/upsell")) {
        return json({
          location: "vejle",
          items: [{ sku_product_id: "g1", title: "Beskyttelsesglas", brand: null, category: null, price_oere: 9900, image_url: null, ...stock(12) }],
        });
      }
      if (url.startsWith("/api/customers/search")) return json([CUSTOMER]);
      if (url === "/api/admin/repairs" && init?.method === "POST") return json(createResponse, true, 201);
      return json({ error: "ukendt" }, false, 404);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function pickCustomer() {
  fireEvent.change(screen.getByLabelText("Søg kunde"), { target: { value: "20 45" } });
  fireEvent.click(await screen.findByRole("button", { name: /Kunde A/ }));
}

async function pickModel(name = "iPhone 15") {
  fireEvent.change(await screen.findByLabelText("Søg model eller scan IMEI"), { target: { value: "iph 15" } });
  fireEvent.click(await screen.findByRole("button", { name }));
}

describe("Ny sag: sektionsflow", () => {
  it("shows customer search with previous cases and an inline create row", async () => {
    render(<NewCasePage />);
    fireEvent.change(screen.getByLabelText("Søg kunde"), { target: { value: "20 45" } });
    const hit = await screen.findByRole("button", { name: /Kunde A/ });
    expect(hit).toHaveTextContent("2 tidligere sager");
    expect(hit).toHaveTextContent("Apple iPhone 13");
    expect(screen.getByRole("button", { name: /Opret ny kunde med/ })).toHaveTextContent("Kun navn og telefon er påkrævet");
    expect(calls.some((c) => c.url.includes("type=privat"))).toBe(true);
  });

  it("collapses the customer to a summary, advances to the device, and Esc reopens the previous section", async () => {
    render(<NewCasePage />);
    await pickCustomer();
    const customerButton = await screen.findByRole("button", { name: /Kunde.*Kunde A/ });
    expect(customerButton).toHaveTextContent("Privat");
    const deviceSearch = screen.getByLabelText("Søg model eller scan IMEI");
    await waitFor(() => expect(deviceSearch).toHaveFocus());

    fireEvent.keyDown(deviceSearch, { key: "Escape" });
    expect(await screen.findByRole("button", { name: "Skift kunde" })).toBeInTheDocument();
  });

  it("creates a new private customer inline with only name and phone", async () => {
    render(<NewCasePage />);
    fireEvent.change(screen.getByLabelText("Søg kunde"), { target: { value: "20 99" } });
    fireEvent.click(await screen.findByRole("button", { name: /Opret ny kunde med/ }));
    const form = screen.getByRole("form", { name: "Ny kunde" });
    expect(within(form).getByLabelText(/Telefon/)).toHaveValue("20 99");
    expect(within(form).queryByLabelText("CVR")).toBeNull();
    fireEvent.change(within(form).getByLabelText(/Navn/), { target: { value: "Ny Kunde" } });
    fireEvent.change(within(form).getByLabelText(/Telefon/), { target: { value: "20 99 12 34" } });
    fireEvent.click(within(form).getByRole("button", { name: "Brug denne kunde" }));
    expect(await screen.findByRole("button", { name: /Kunde.*Ny Kunde/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Søg model eller scan IMEI")).toBeInTheDocument();
  });

  it("Erhverv shows company fields and the CVR button", async () => {
    render(<NewCasePage />);
    fireEvent.click(screen.getByRole("button", { name: "Erhverv" }));
    fireEvent.change(screen.getByLabelText("Søg kunde"), { target: { value: "Firma" } });
    fireEvent.click(await screen.findByRole("button", { name: /Opret ny kunde med/ }));
    const form = screen.getByRole("form", { name: "Ny kunde" });
    for (const label of ["CVR", "Firma", "EAN", "Faktura-e-mail", "Kontaktperson"]) {
      expect(within(form).getByLabelText(label)).toBeInTheDocument();
    }
    expect(within(form).getByRole("button", { name: "Hent fra CVR" })).toBeInTheDocument();
  });

  it("finds models across levels with an abbreviated search", async () => {
    render(<NewCasePage />);
    await pickCustomer();
    fireEvent.change(await screen.findByLabelText("Søg model eller scan IMEI"), { target: { value: "iph 15 pro" } });
    expect(await screen.findByRole("button", { name: "iPhone 15 Pro" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "iPhone 14" })).toBeNull();
  });

  it("takes a scanned IMEI into the IMEI field on Enter", async () => {
    render(<NewCasePage />);
    await pickCustomer();
    const search = await screen.findByLabelText("Søg model eller scan IMEI");
    fireEvent.change(search, { target: { value: "356938035643809" } });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(screen.getByLabelText("IMEI / serienr.")).toHaveValue("356938035643809");
    expect(search).toHaveValue("");
  });
});

describe("Ny sag: reparation og panel", () => {
  async function toRepair() {
    render(<NewCasePage />);
    await pickCustomer();
    await pickModel();
    fireEvent.click(screen.getByRole("button", { name: "Videre til reparation" }));
    await screen.findByRole("group", { name: /Kvalitet: Skærmskift/ });
  }

  it("shows tier cards with the right stock text", async () => {
    await toRepair();
    const budget = screen.getByRole("button", { name: /Budget/ });
    const oem = screen.getByRole("button", { name: /OEM/ });
    const original = screen.getByRole("button", { name: /Original/ });
    expect(budget).toHaveTextContent("4 på lager i Vejle");
    expect(oem).toHaveTextContent("0 i Vejle · 2 i Slagelse — kan flyttes");
    expect(original).toHaveTextContent("0 på lager · bestil");
  });

  it("shows Ikke optalt for untracked parts and preselects the cheapest deliverable tier", async () => {
    await toRepair();
    fireEvent.click(screen.getByRole("button", { name: /^Skærmskift/ }));
    expect(screen.getByRole("button", { name: /^Budget/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /^Batteriskift/ }));
    expect(await screen.findByText("Ikke optalt")).toBeInTheDocument();
  });

  it("totals across categories, free text and add-ons, and shows the deposit hint for movable parts", async () => {
    await toRepair();
    fireEvent.click(screen.getByRole("button", { name: /^Skærmskift/ }));
    expect(screen.getByTestId("panel-total")).toHaveTextContent("1.599,00 kr.");
    expect(screen.queryByRole("note")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /OEM/ }));
    expect(screen.getByTestId("panel-total")).toHaveTextContent("1.999,00 kr.");
    expect(screen.getByRole("note")).toHaveTextContent("depositum");
    expect(screen.getByText("Del flyttes fra anden butik")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Batteriskift/ }));
    expect(screen.getByTestId("panel-total")).toHaveTextContent("2.898,00 kr.");

    fireEvent.click(screen.getByRole("button", { name: "+ Anden opgave" }));
    const form = screen.getByRole("form", { name: "Anden opgave" });
    fireEvent.change(within(form).getByLabelText("Beskrivelse"), { target: { value: "Rensning" } });
    fireEvent.change(within(form).getByLabelText("Pris (kr.)"), { target: { value: "100" } });
    fireEvent.click(within(form).getByRole("button", { name: "Tilføj" }));
    expect(screen.getByTestId("panel-total")).toHaveTextContent("2.998,00 kr.");

    fireEvent.click(within(screen.getByRole("complementary", { name: "Sagen" })).getByRole("button", { name: "Fjern Rensning" }));
    expect(screen.getByTestId("panel-total")).toHaveTextContent("2.898,00 kr.");
  });

  it("adds suggested add-ons from the upsell endpoint", async () => {
    await toRepair();
    fireEvent.click(screen.getByRole("button", { name: /^Skærmskift/ }));
    fireEvent.click(screen.getByRole("button", { name: "Videre til tilkøb" }));
    fireEvent.click(await screen.findByRole("button", { name: /Beskyttelsesglas/ }));
    expect(screen.getByTestId("panel-total")).toHaveTextContent("1.698,00 kr.");
  });

  it("disables Opret sag and lists what is missing", async () => {
    render(<NewCasePage />);
    expect(screen.getByRole("button", { name: "Opret sag" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Mangler: kunde, enhed, mindst én reparation");
  });
});

describe("Ny sag: oprettelse", () => {
  async function fillAndSelect() {
    render(<NewCasePage />);
    await pickCustomer();
    await pickModel();
    fireEvent.click(screen.getByRole("button", { name: "Videre til reparation" }));
    await screen.findByRole("group", { name: /Kvalitet: Skærmskift/ });
    fireEvent.click(screen.getByRole("button", { name: /^Skærmskift/ }));
  }

  it("Ctrl+Enter creates the case with an Idempotency-Key and the catalog items only", async () => {
    await fillAndSelect();
    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });
    expect(await screen.findByTestId("ticket-number")).toHaveTextContent("PS-2026-1201");

    const post = calls.find((c) => c.url === "/api/admin/repairs" && c.init?.method === "POST");
    expect(post).toBeTruthy();
    const headers = post!.init!.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toMatch(/\S{8,}/);
    const body = JSON.parse(String(post!.init!.body));
    expect(body.items).toEqual([{ kind: "repair", repair_service_id: "budget" }]);
    expect(body.customer).toMatchObject({ id: "c1", type: "privat" });
    expect(body.device).toMatchObject({ repair_model_id: "m15", model: "iPhone 15" });
    expect(body.details.assigned_to).toBe("Mikkel");
    expect(body.notify_sms).toBe(true);
    expect(body.store_id).toBeNull();
  });

  it("does not submit with Ctrl+Enter while something is missing", async () => {
    render(<NewCasePage />);
    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });
    await new Promise((r) => setTimeout(r, 20));
    expect(calls.some((c) => c.init?.method === "POST")).toBe(false);
  });

  it("shows the server error and keeps the form so the same key can be retried", async () => {
    await fillAndSelect();
    const original = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    original.mockImplementationOnce(async () => json({ error: "Delen er udgået" }, false, 409));
    fireEvent.click(screen.getByRole("button", { name: "Opret sag" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Delen er udgået");
    expect(screen.getByRole("button", { name: "Opret sag" })).toBeEnabled();
  });

  it("post-create: print, no deposit button without backorder, open case and reset", async () => {
    await fillAndSelect();
    fireEvent.click(screen.getByRole("button", { name: "Opret sag" }));
    expect(await screen.findByTestId("ticket-number")).toHaveTextContent("PS-2026-1201");
    // Udskriftsfeltet var afkrydset: bevis åbnes af sig selv.
    expect(await screen.findByRole("dialog", { name: "Indleveringsbevis" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Luk kvittering" }));
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(screen.getByRole("dialog", { name: "Indleveringsbevis" })).toHaveTextContent("PS-2026-1201");
    fireEvent.click(screen.getByRole("button", { name: "Luk kvittering" }));

    expect(screen.queryByRole("link", { name: "Tag depositum" })).toBeNull();
    expect(screen.getByRole("link", { name: "Åbn sag" })).toHaveAttribute("href", "/admin/reparationer/t-1");

    fireEvent.click(screen.getByRole("button", { name: "Ny sag" }));
    expect(await screen.findByLabelText("Søg kunde")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Opret sag" })).toBeDisabled();
  });

  it("post-create: Tag depositum links to the till when a part must be ordered", async () => {
    createResponse = { ...createResponse, needs_deposit: true, backorders: [{ item_id: "i1", sku_product_id: "s3", description: "Skærm", qty: 1, other_locations: [] }] };
    await fillAndSelect();
    fireEvent.click(screen.getByRole("button", { name: "Opret sag" }));
    const link = await screen.findByRole("link", { name: "Tag depositum" });
    expect(link).toHaveAttribute("href", "/admin/kasse?sag=t-1&depositum=1");
  });
});
