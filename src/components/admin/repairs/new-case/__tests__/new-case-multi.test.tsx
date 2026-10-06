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

const groupResponse = () => ({
  group_id: "g-1",
  customer_id: "c1",
  tickets: [
    { ...createResponse, ticket_id: "t-1", ticket_number: "PS-2026-1201", total_oere: 159_900, lines: [{ id: "i1", description: "Skærmskift", total_oere: 159_900 }] },
    {
      ...createResponse,
      ticket_id: "t-2",
      ticket_number: "PS-2026-1202",
      total_oere: 159_900,
      needs_deposit: true,
      deposit_url: "/admin/kasse?sag=t-2&depositum=1",
      backorders: [{ item_id: "i2" }],
      lines: [{ id: "i2", description: "Skærmskift", total_oere: 159_900 }],
    },
  ],
  ticket_ids: ["t-1", "t-2"],
  total_oere: 319_800,
  needs_deposit: true,
  replayed: false,
  warnings: [],
});

async function repairOnCurrentDevice() {
  await screen.findByRole("group", { name: /Kvalitet: Skærmskift/ });
  fireEvent.click(screen.getByRole("button", { name: /^Skærmskift/ }));
}

async function oneDeviceWithRepair() {
  render(<NewCasePage />);
  await pickCustomer();
  await pickModel();
  fireEvent.click(screen.getByRole("button", { name: "Videre til reparation" }));
  await repairOnCurrentDevice();
}

async function twoDevices() {
  await oneDeviceWithRepair();
  fireEvent.click(screen.getByRole("button", { name: "+ Tilføj enhed" }));
  await pickModel("iPhone 15 Pro");
  fireEvent.click(screen.getByRole("button", { name: "Videre til reparation" }));
  await repairOnCurrentDevice();
}

describe("Ny sag: flere enheder", () => {
  it("collapses device 1 to a summary when device 2 is added", async () => {
    await oneDeviceWithRepair();
    expect(screen.queryByRole("region", { name: "Enhed 1" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "+ Tilføj enhed" }));
    const first = screen.getByRole("region", { name: "Enhed 1" });
    expect(within(first).getByRole("button", { name: /Enhed 1/ })).toHaveTextContent("iPhone 15");
    expect(within(first).getByRole("button", { name: /Enhed 1/ })).toHaveTextContent("1.599");
    const second = screen.getByRole("region", { name: "Enhed 2" });
    expect(within(second).getByLabelText("Søg model eller scan IMEI")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Opret 2 sager" })).toBeTruthy();
    expect(screen.getByRole("complementary", { name: "Sagen" })).toHaveTextContent("2 enheder");
  });

  it("shows totals per device and a grand total, with a deposit note per device", async () => {
    await twoDevices();
    const panel = screen.getByRole("complementary", { name: "Sagen" });
    expect(within(panel).getByTestId("device-total-1")).toHaveTextContent("1.599,00 kr.");
    expect(within(panel).getByTestId("device-total-2")).toHaveTextContent("1.599,00 kr.");
    expect(within(panel).getByTestId("panel-total")).toHaveTextContent("3.198,00 kr.");
    expect(within(panel).queryByRole("note")).toBeNull();

    // OEM på enhed 2 skal flyttes fra Slagelse: depositum-beskeden hører til enhed 2.
    fireEvent.click(screen.getByRole("button", { name: /OEM/ }));
    expect(within(panel).getByTestId("device-total-2")).toHaveTextContent("1.999,00 kr.");
    expect(within(panel).getByTestId("panel-total")).toHaveTextContent("3.598,00 kr.");
    expect(within(panel).getByRole("note")).toHaveTextContent("Enhed 2");

    fireEvent.click(within(panel).getByRole("button", { name: "Fjern Skærmskift (OEM), enhed 2" }));
    expect(within(panel).getByTestId("panel-total")).toHaveTextContent("1.599,00 kr.");
    expect(within(panel).queryByRole("note")).toBeNull();
    expect(within(panel).getByRole("button", { name: "Fjern Skærmskift (Budget), enhed 1" })).toBeInTheDocument();
  });

  it("re-opens a collapsed device and collapses the other, keeping what was entered", async () => {
    await twoDevices();
    fireEvent.click(within(screen.getByRole("region", { name: "Enhed 1" })).getByRole("button", { name: /Enhed 1/ }));
    const second = screen.getByRole("region", { name: "Enhed 2" });
    expect(within(second).getByRole("button", { name: /Enhed 2/ })).toHaveAttribute("aria-expanded", "false");
    expect(second).toHaveTextContent("iPhone 15 Pro");
    expect(second).toHaveTextContent("1.599");
    expect(within(screen.getByRole("region", { name: "Enhed 1" })).getByRole("button", { name: /^Skærmskift/ })).toBeInTheDocument();
  });

  it("removes a device and falls back to the single-device layout", async () => {
    await twoDevices();
    fireEvent.click(screen.getByRole("button", { name: "Fjern enhed" }));
    expect(screen.queryByRole("region", { name: /Enhed \d/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Opret sag" })).toBeEnabled();
    expect(screen.getByTestId("panel-total")).toHaveTextContent("1.599,00 kr.");
    expect(screen.queryByTestId("device-total-1")).toBeNull();
  });

  it("Ctrl+D adds a device and Mangler lists the empty device", async () => {
    await oneDeviceWithRepair();
    fireEvent.keyDown(window, { key: "d", ctrlKey: true });
    expect(screen.getByRole("region", { name: "Enhed 2" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Mangler: enhed 2, reparation på enhed 2");
    expect(screen.getByRole("button", { name: "Opret 2 sager" })).toBeDisabled();
  });

  it("creates one request for all devices with a single Idempotency-Key", async () => {
    await twoDevices();
    createResponse = groupResponse();
    expect(screen.getByRole("button", { name: "Opret 2 sager" })).toBeEnabled();
    fireEvent.keyDown(window, { key: "Enter", ctrlKey: true });
    expect(await screen.findByTestId("ticket-numbers")).toHaveTextContent("PS-2026-1201 · PS-2026-1202");

    const posts = calls.filter((c) => c.url === "/api/admin/repairs" && c.init?.method === "POST");
    expect(posts).toHaveLength(1);
    const headers = posts[0].init!.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toMatch(/\S{8,}/);
    const body = JSON.parse(String(posts[0].init!.body));
    expect(body.items).toBeUndefined();
    expect(body.customer).toMatchObject({ id: "c1", type: "privat" });
    expect(body.devices).toHaveLength(2);
    expect(body.devices[0].device).toMatchObject({ repair_model_id: "m15", model: "iPhone 15" });
    expect(body.devices[1].device).toMatchObject({ repair_model_id: "m15p", model: "iPhone 15 Pro" });
    expect(body.devices[0].items).toEqual([{ kind: "repair", repair_service_id: "budget" }]);
    expect(body.devices[1].details.assigned_to).toBe("Mikkel");
    expect(body.notify_sms).toBe(true);

    // Samlet indleveringsbevis, depositum pr. sag, og "Ny sag" nulstiller alt.
    expect(await screen.findByRole("dialog", { name: "Indleveringsbevis" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Luk kvittering" }));
    expect(screen.getByRole("link", { name: "Tag depositum PS-2026-1202" })).toHaveAttribute("href", "/admin/kasse?sag=t-2&depositum=1");
    expect(screen.queryByRole("link", { name: "Tag depositum PS-2026-1201" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ny sag" }));
    expect(await screen.findByLabelText("Søg kunde")).toHaveValue("");
    expect(screen.queryByRole("region", { name: /Enhed \d/ })).toBeNull();
  });

  it("single device path is unchanged: the old body without devices", async () => {
    await oneDeviceWithRepair();
    fireEvent.click(screen.getByRole("button", { name: "Opret sag" }));
    expect(await screen.findByTestId("ticket-number")).toHaveTextContent("PS-2026-1201");
    const post = calls.find((c) => c.init?.method === "POST")!;
    const body = JSON.parse(String(post.init!.body));
    expect(body.devices).toBeUndefined();
    expect(Object.keys(body).sort()).toEqual(["customer", "details", "device", "items", "notify_sms", "store_id"]);
    expect(body.items).toEqual([{ kind: "repair", repair_service_id: "budget" }]);
  });
});
