import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent, within, act } from "@testing-library/react";

// D2 Task 10 in the till: IMEI prompt for brugtmoms units without one, blocked units refused,
// "Mangler indkøbsbilag" warning, and "Modregn opkøb" with the slutseddel lookup.

const LOC = "00000000-0000-4000-8000-000000000030";
const REG = "00000000-0000-4000-8000-000000000031";
const DEV = "00000000-0000-4000-8000-000000000050";

const nav = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.query),
}));
vi.mock("@/components/admin/shell/store-scope-context", () => ({
  useStoreScope: () => ({ scope: "vejle", ownSlug: "vejle", isOwner: false, loading: false }),
}));
vi.mock("@/lib/supabase/client", () => ({ createBrowserClient: () => ({}) }));

type Dev = {
  id: string;
  barcode: string;
  imei: string | null;
  serial_number: string | null;
  blocked: boolean;
  has_purchase_document: boolean;
  vat_scheme: string;
};

const api = vi.hoisted(() => ({
  device: null as null | Record<string, unknown>,
  receipt: null as null | Record<string, unknown>,
  /** Overrides the slutseddel lookup (e.g. a deferred answer). */
  receiptLookup: null as null | ((url: string) => Promise<unknown>),
  caseJson: null as null | Record<string, unknown>,
  calls: [] as Array<{ url: string; body: unknown }>,
}));

vi.mock("@/lib/pos/client", () => ({
  printBase64Pdf: vi.fn(),
  posFetch: vi.fn(async (url: string) => ({
    ok: true,
    json: async () => (url.startsWith("/api/pos/lookup") && api.device ? { devices: [api.device], skuProducts: [] } : { devices: [], skuProducts: [] }),
  })),
  posJson: vi.fn(async (url: string, init?: { body?: string }) => {
    const body = init?.body ? JSON.parse(init.body) : undefined;
    api.calls.push({ url, body });
    if (url === "/api/pos/locations") return { locations: [{ id: LOC, slug: "vejle", name: "PhoneSpot Vejle", registers: [] }] };
    if (url.startsWith("/api/pos/session")) {
      return {
        registers: [
          {
            id: REG,
            name: "Kasse 1",
            code: "V1",
            locationId: LOC,
            openSession: { id: "s1", openedAt: "2026-11-09T08:00:00Z", openedByName: "Mikkel", openingFloat: 0, netCashPayments: 0, expectedCash: 0 },
          },
        ],
      };
    }
    if (url.startsWith("/api/pos/quick-tiles")) return { tiles: [], categories: [], devices: [] };
    if (url.startsWith("/api/trade-in/receipts?number=")) {
      if (api.receiptLookup) return api.receiptLookup(url);
      return api.receipt ? [api.receipt] : [];
    }
    if (url.startsWith("/api/pos/case") && api.caseJson) return api.caseJson;
    if (url === "/api/pos/sale") return { orderId: "o1", orderNumber: "V1-1", receiptNumber: "V1-000001", total: 500_000, receiptPdf: null, warnings: [] };
    return {};
  }),
}));

import { KasseScreen } from "../_components/kasse-screen";

function device(over: Partial<Dev> = {}) {
  return {
    id: DEV,
    barcode: "PS-000123",
    imei: null,
    serial_number: null,
    blocked: false,
    has_purchase_document: true,
    grade: "A",
    storage: "128GB",
    color: null,
    selling_price: 500_000,
    vat_scheme: "brugtmoms",
    product_templates: { display_name: "iPhone 13" },
    ...over,
  };
}

/** Scan + Enter, then let the search debounce (250 ms) and its lookup settle inside act(). */
async function scan(value: string) {
  const field = await screen.findByLabelText("Scan eller søg");
  await act(async () => {
    fireEvent.change(field, { target: { value } });
    fireEvent.keyDown(field, { key: "Enter" });
    await new Promise((r) => setTimeout(r, 300));
  });
}

const saleBody = () => api.calls.find((c) => c.url === "/api/pos/sale")?.body as { items: unknown[]; payments: unknown[] } | undefined;

beforeEach(() => {
  api.device = null;
  api.receipt = null;
  api.receiptLookup = null;
  api.caseJson = null;
  api.calls = [];
  nav.query = "";
});
afterEach(cleanup);

describe("Kasse: IMEI, spærrede enheder og indkøbsbilag", () => {
  it("asks for IMEI or serial number on a brugtmoms unit without one and sends it with the sale", async () => {
    api.device = device();
    render(<KasseScreen />);
    await scan("PS-000123");

    const input = await screen.findByLabelText("IMEI eller serienummer");
    fireEvent.change(input, { target: { value: "359999000000019" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(await screen.findByText("Ugyldigt IMEI eller serienummer")).toBeTruthy();
    expect(within(screen.getByLabelText("Kurv")).queryByText("iPhone 13")).toBeNull();

    fireEvent.change(input, { target: { value: "3599 9900 0000 018" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(await screen.findByText("iPhone 13")).toBeTruthy();
    expect(screen.getByText(/359999000000018/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Kontant" }));
    fireEvent.click(screen.getByRole("button", { name: "Opkræv 5.000,00 kr." }));
    await waitFor(() => expect(saleBody()).toBeTruthy());
    expect(saleBody()!.items).toEqual([{ type: "device", deviceId: DEV, imei: "359999000000018" }]);
  });

  it("adds a unit that already has an IMEI straight away, without a prompt", async () => {
    api.device = device({ imei: "359999000000018" });
    render(<KasseScreen />);
    await scan("PS-000123");
    expect(await screen.findByText("iPhone 13")).toBeTruthy();
    expect(screen.queryByLabelText("IMEI eller serienummer")).toBeNull();
  });

  it("refuses a blocked unit", async () => {
    api.device = device({ imei: "359999000000018", blocked: true });
    render(<KasseScreen />);
    await scan("PS-000123");
    expect(await screen.findByText("Enheden er spærret og kan ikke sælges")).toBeTruthy();
    expect(within(screen.getByLabelText("Kurv")).queryByText("iPhone 13")).toBeNull();
  });

  it("warns about a missing purchase document but still sells", async () => {
    api.device = device({ imei: "359999000000018", has_purchase_document: false });
    render(<KasseScreen />);
    await scan("PS-000123");
    expect(await screen.findByText("Mangler indkøbsbilag")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kontant" }));
    fireEvent.click(screen.getByRole("button", { name: "Opkræv 5.000,00 kr." }));
    await waitFor(() => expect(saleBody()).toBeTruthy());
  });
});

describe("Kasse: modregn opkøb", () => {
  it("looks up the slutseddel, shows its total and offsets it against the sale", async () => {
    api.device = device({ imei: "359999000000018" });
    api.receipt = {
      id: "r1",
      receipt_number: "SS-2026-0001",
      status: "confirmed",
      total_amount: 300_000,
      offset_amount: null,
      location_id: LOC,
      attestation: "paper_scan",
      seller_type: "private",
      has_signed_scan: true,
      has_invoice: false,
      suspected: false,
    };
    render(<KasseScreen />);
    await scan("PS-000123");
    await screen.findByText("iPhone 13");

    fireEvent.click(screen.getByRole("button", { name: "Modregn opkøb" }));
    const number = await screen.findByLabelText("Slutseddelnummer");
    fireEvent.change(number, { target: { value: "SS-2026-0001" } });
    fireEvent.keyDown(number, { key: "Enter" });
    expect(await screen.findByText(/Kan modregnes/)).toBeTruthy();
    expect(screen.getByText(/Slutsedlens total 3\.000,00 kr\./)).toBeTruthy();
    // The offset line is capped at the receipt total; the rest is paid in cash.
    expect((screen.getByLabelText("Beløb Modregnet opkøb") as HTMLInputElement).value).toBe("3000,00");
    fireEvent.click(screen.getByRole("button", { name: "+ Kontant" }));
    fireEvent.click(screen.getByRole("button", { name: "Brug delt betaling" }));

    fireEvent.click(await screen.findByRole("button", { name: "Opkræv 5.000,00 kr." }));
    await waitFor(() => expect(saleBody()).toBeTruthy());
    expect(saleBody()!.payments).toEqual([
      { type: "opkoeb", amountOere: 300_000, reference: "SS-2026-0001" },
      { type: "kontant", amountOere: 200_000, reference: null },
    ]);
  });

  it("says why a slutseddel cannot be offset and blocks the payment", async () => {
    api.device = device({ imei: "359999000000018" });
    api.receipt = {
      id: "r1",
      receipt_number: "SS-2026-0002",
      status: "confirmed",
      total_amount: 300_000,
      offset_amount: null,
      location_id: LOC,
      attestation: "paper_scan",
      seller_type: "private",
      has_signed_scan: false,
      has_invoice: false,
      suspected: false,
    };
    render(<KasseScreen />);
    await scan("PS-000123");
    await screen.findByText("iPhone 13");

    fireEvent.click(screen.getByRole("button", { name: "Modregn opkøb" }));
    const number = await screen.findByLabelText("Slutseddelnummer");
    fireEvent.change(number, { target: { value: "SS-2026-0002" } });
    fireEvent.keyDown(number, { key: "Enter" });
    expect(await screen.findByText("Læg den underskrevne slutseddel op, før den kan modregnes")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "+ Kontant" }));
    expect((screen.getByRole("button", { name: "Brug delt betaling" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("an unknown number says it was not found", async () => {
    api.device = device({ imei: "359999000000018" });
    render(<KasseScreen />);
    await scan("PS-000123");
    await screen.findByText("iPhone 13");
    fireEvent.click(screen.getByRole("button", { name: "Modregn opkøb" }));
    const number = await screen.findByLabelText("Slutseddelnummer");
    fireEvent.change(number, { target: { value: "SS-2026-0404" } });
    fireEvent.keyDown(number, { key: "Enter" });
    expect(await screen.findByText("Slutsedlen findes ikke i dine butikker")).toBeTruthy();
  });
});

const RECEIPT = {
  id: "r1",
  receipt_number: "SS-2026-0001",
  status: "confirmed",
  total_amount: 300_000,
  offset_amount: null,
  location_id: LOC,
  attestation: "paper_scan",
  seller_type: "private",
  has_signed_scan: true,
  has_invoice: false,
  has_bank_account: true,
  suspected: false,
};

async function openOffset(number: string) {
  fireEvent.click(screen.getByRole("button", { name: "Modregn opkøb" }));
  const field = (await screen.findByLabelText("Slutseddelnummer")) as HTMLInputElement;
  fireEvent.change(field, { target: { value: number } });
  // Enter looks the number up; let the answer land inside act().
  await act(async () => {
    fireEvent.keyDown(field, { key: "Enter" });
    await new Promise((r) => setTimeout(r, 0));
  });
  return field;
}

const CASE_ID = "00000000-0000-4000-8000-000000000001";
const caseWithDevice = () => ({
  case: {
    id: CASE_ID,
    ticketNumber: "PS-2026-1189",
    paid: false,
    customer: { id: null, name: "Anders Hansen", phone: null, email: null },
    deviceLabel: "iPhone 13",
    totalOere: 400_000,
    description: "Sag PS-2026-1189 · iPhone 13",
    deposits: [],
    depositsOk: true,
    lines: [
      {
        id: "it1",
        item_id: "it1",
        name: "iPhone 13",
        qty: 1,
        unit_oere: 400_000,
        total_oere: 400_000,
        kind: "device",
        device_id: DEV,
        vat_scheme: "brugtmoms",
        has_identifier: false,
      },
    ],
  },
  candidates: [],
});

describe("Kasse: IMEI på enheder fra en reparationssag", () => {
  it("asks for IMEI on a brugtmoms case device without one and sends it on the case line", async () => {
    nav.query = `sag=${CASE_ID}`;
    api.caseJson = caseWithDevice();
    render(<KasseScreen />);
    const input = await screen.findByLabelText("IMEI eller serienummer");
    fireEvent.change(input, { target: { value: "359999000000018" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(await screen.findByText(/IMEI\/serienr\. 359999000000018/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Kontant" }));
    fireEvent.click(screen.getByRole("button", { name: "Opkræv 4.000,00 kr." }));
    await waitFor(() => expect(saleBody()).toBeTruthy());
    expect(saleBody()!.items).toEqual([{ type: "device", deviceId: DEV, repairTicketItemId: "it1", imei: "359999000000018" }]);
  });

  it("asks again at charge time when the prompt was closed", async () => {
    nav.query = `sag=${CASE_ID}`;
    api.caseJson = caseWithDevice();
    render(<KasseScreen />);
    await screen.findByLabelText("IMEI eller serienummer");
    fireEvent.click(screen.getByRole("button", { name: "Annuller" }));
    await waitFor(() => expect(screen.queryByLabelText("IMEI eller serienummer")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Kontant" }));
    fireEvent.click(screen.getByRole("button", { name: "Opkræv 4.000,00 kr." }));
    expect(await screen.findByLabelText("IMEI eller serienummer")).toBeTruthy();
    expect(saleBody()).toBeUndefined();
  });
});

describe("Kasse: modregning med restbeløb, store/små bogstaver og genopslag", () => {
  it("refuses an offset smaller than the slutseddel when it has no account for the remainder", async () => {
    api.device = { ...device({ imei: "359999000000018" }), selling_price: 100_000 };
    api.receipt = { ...RECEIPT, has_bank_account: false };
    render(<KasseScreen />);
    await scan("PS-000123");
    await screen.findByText("iPhone 13");
    await openOffset("SS-2026-0001");
    expect(
      await screen.findByText("Opkøbet er større end købet, og slutsedlen mangler konto til restbeløbet. Lav en ny slutseddel med konto."),
    ).toBeTruthy();
    expect((screen.getByRole("button", { name: "Brug delt betaling" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("allows the same offset when the slutseddel has an account", async () => {
    api.device = { ...device({ imei: "359999000000018" }), selling_price: 100_000 };
    api.receipt = RECEIPT;
    render(<KasseScreen />);
    await scan("PS-000123");
    await screen.findByText("iPhone 13");
    await openOffset("SS-2026-0001");
    expect(await screen.findByText(/Kan modregnes/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Brug delt betaling" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("upper-cases the typed number and looks it up in upper case", async () => {
    api.device = device({ imei: "359999000000018" });
    api.receipt = RECEIPT;
    render(<KasseScreen />);
    await scan("PS-000123");
    await screen.findByText("iPhone 13");
    const field = await openOffset("ss-2026-0001");
    expect(field.value).toBe("SS-2026-0001");
    await screen.findByText(/Kan modregnes/);
    expect(api.calls.some((c) => c.url === "/api/trade-in/receipts?number=SS-2026-0001")).toBe(true);
  });

  it("ignores a lookup answer that arrives after the number was changed", async () => {
    api.device = device({ imei: "359999000000018" });
    let answer: (v: unknown) => void = () => undefined;
    api.receiptLookup = () => new Promise((resolve) => (answer = resolve));
    render(<KasseScreen />);
    await scan("PS-000123");
    await screen.findByText("iPhone 13");
    const field = await openOffset("SS-2026-0001");
    fireEvent.change(field, { target: { value: "SS-2026-000" } });
    await act(async () => {
      answer([RECEIPT]);
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.queryByText(/Kan modregnes/)).toBeNull();
    expect(screen.queryByText(/Slutsedlens total/)).toBeNull();
  });

  it("re-runs the lookup when the split dialog is opened again", async () => {
    api.device = device({ imei: "359999000000018" });
    api.receipt = RECEIPT;
    render(<KasseScreen />);
    await scan("PS-000123");
    await screen.findByText("iPhone 13");
    await openOffset("SS-2026-0001");
    await screen.findByText(/Kan modregnes/);
    fireEvent.click(screen.getByRole("button", { name: "+ Kontant" }));
    fireEvent.click(screen.getByRole("button", { name: "Brug delt betaling" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const lookups = () => api.calls.filter((c) => c.url.startsWith("/api/trade-in/receipts?number=")).length;
    const before = lookups();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Ændr" }));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(await screen.findByText(/Kan modregnes/)).toBeTruthy();
    expect(lookups()).toBe(before + 1);
    expect((screen.getByRole("button", { name: "Brug delt betaling" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
