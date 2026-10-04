import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent, within } from "@testing-library/react";

const TICKET = "00000000-0000-4000-8000-000000000001";
const LOC = "00000000-0000-4000-8000-000000000030";
const REG = "00000000-0000-4000-8000-000000000031";
const DEP = "00000000-0000-4000-8000-000000000010";

const nav = vi.hoisted(() => ({ query: "", replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace }),
  useSearchParams: () => new URLSearchParams(nav.query),
}));

vi.mock("@/components/admin/shell/store-scope-context", () => ({
  useStoreScope: () => ({ scope: "vejle", ownSlug: "vejle", isOwner: false, loading: false }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({
    from: () => {
      const b: Record<string, unknown> = {};
      for (const m of ["select", "eq", "or", "limit"]) b[m] = () => b;
      b.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: [{ id: LOC, name: "PhoneSpot Vejle", slug: "vejle" }], error: null }).then(resolve);
      return b;
    },
  }),
}));

const api = vi.hoisted(() => ({
  session: null as null | { id: string },
  casePaid: false,
  calls: [] as Array<{ url: string; body: unknown }>,
}));

function caseJson(over: Record<string, unknown> = {}) {
  return {
    case: {
      id: TICKET,
      ticketNumber: "PS-2026-1189",
      paid: api.casePaid,
      customer: { id: null, name: "Anders Hansen", phone: "12345678", email: "a@example.dk" },
      deviceLabel: "OnePlus Nord 3",
      totalOere: 169_800,
      description: "Sag PS-2026-1189 · OnePlus Nord 3 · Skærm og bagglas",
      deposits: [{ id: DEP, amount_oere: 50_000, paid_at: "2026-09-18T10:00:00Z", remaining_oere: 50_000 }],
      depositsOk: true,
      ...over,
    },
    candidates: [],
  };
}

vi.mock("@/lib/pos/client", () => ({
  posFetch: vi.fn(async () => ({ ok: true, json: async () => ({ devices: [], skuProducts: [] }) })),
  printBase64Pdf: vi.fn(),
  posJson: vi.fn(async (url: string, init?: { body?: string }) => {
    const body = init?.body ? JSON.parse(init.body) : undefined;
    api.calls.push({ url, body });
    if (url.startsWith("/api/pos/session")) {
      return {
        registers: [
          {
            id: REG,
            name: "Kasse 1",
            code: "V1",
            locationId: LOC,
            openSession: api.session
              ? { id: api.session.id, openedAt: "2026-10-04T08:02:00Z", openedByName: "Mikkel", openingFloat: 150_000, netCashPayments: 0, expectedCash: 150_000 }
              : null,
          },
        ],
      };
    }
    if (url.startsWith("/api/pos/quick-tiles")) {
      return { tiles: [{ id: "sku1", title: "USB-C kabel 1 m", priceOere: 9_900, category: "Opladning" }], categories: [{ name: "Opladning", count: 3 }] };
    }
    if (url.startsWith("/api/pos/case")) return caseJson();
    if (url === "/api/pos/sale") {
      return { orderId: "o1", orderNumber: "PSP-1", receiptNumber: "V1-000042", total: 119_800, receiptPdf: null, warnings: [] };
    }
    return {};
  }),
}));

import { KasseScreen } from "../_components/kasse-screen";

beforeEach(() => {
  api.session = { id: "s1" };
  api.casePaid = false;
  api.calls = [];
  nav.query = "";
  nav.replace.mockReset();
});
afterEach(cleanup);

describe("Kasse screen", () => {
  it("shows the header with store, register, opener and float, and the fixed action tiles", async () => {
    render(<KasseScreen />);
    expect(await screen.findByText(/Åbnet 10\.02 af Mikkel/)).toBeTruthy();
    expect(screen.getByText(/startbeholdning 1\.500,00 kr\./)).toBeTruthy();
    for (const t of ["Hent sag til betaling", "Depositum på sag", "Diverse salg", "Gavekort"]) {
      expect(screen.getByText(t)).toBeTruthy();
    }
    // top sellers from the API, as quick tiles
    expect(await screen.findByText("USB-C kabel 1 m")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText("Scan eller søg"));
  });

  it("asks for the opening float when the till is closed", async () => {
    api.session = null;
    render(<KasseScreen />);
    expect(await screen.findByText("Åbn kassen", { selector: "h1" })).toBeTruthy();
    expect(screen.queryByLabelText("Scan eller søg")).toBeNull();
  });

  it("?sag=<id> preloads the case with the deposit deducted, and charges it with a repair line", async () => {
    nav.query = `sag=${TICKET}`;
    render(<KasseScreen />);
    expect(await screen.findByText("Sag PS-2026-1189")).toBeTruthy();
    expect(screen.getByText(/Depositum betalt 18\. sep\./)).toBeTruthy();
    const charge = await screen.findByRole("button", { name: "Opkræv 1.198,00 kr." });

    fireEvent.click(charge); // default method: Kort -> terminal confirmation first
    expect(screen.getByText(/Slå .* ind på Worldline-terminalen/)).toBeTruthy();
    expect(api.calls.some((c) => c.url === "/api/pos/sale")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Kortet er godkendt" }));

    await waitFor(() => expect(api.calls.some((c) => c.url === "/api/pos/sale")).toBe(true));
    const sale = api.calls.find((c) => c.url === "/api/pos/sale")!.body as {
      items: unknown[];
      payments: unknown[];
      registerId: string;
    };
    expect(sale.items).toEqual([
      { type: "repair_service", repairTicketId: TICKET, description: "Sag PS-2026-1189 · OnePlus Nord 3 · Skærm og bagglas", unitPriceOere: 169_800 },
      { type: "deposit_applied", depositItemId: DEP, amountOere: 50_000 },
    ]);
    expect(sale.payments).toEqual([{ type: "kort_terminal", amountOere: 119_800 }]);
    expect(sale.registerId).toBe(REG);

    // receipt actions, then "Ny kunde" resets and clears ?sag
    expect(await screen.findByText("Betaling gennemført")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Print kvittering (80 mm)" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ny kunde" }));
    await waitFor(() => expect(screen.queryByText("Sag PS-2026-1189")).toBeNull());
    expect(nav.replace).toHaveBeenCalledWith("/admin/kasse");
  });

  it("?sag=<id>&depositum=1 opens the deposit dialog with 500 kr. suggested and takes a deposit-only sale", async () => {
    nav.query = `sag=${TICKET}&depositum=1`;
    render(<KasseScreen />);
    const amount = (await screen.findByLabelText("Depositum (kr.)")) as HTMLInputElement;
    expect(amount.value).toBe("500,00");
    // nothing was put in the cart
    expect(screen.queryByText("Sag PS-2026-1189", { selector: "b" })).toBeNull();

    const dialog = within(screen.getByRole("dialog"));
    fireEvent.click(dialog.getByRole("button", { name: "Kontant" }));
    fireEvent.click(dialog.getByRole("button", { name: "Opkræv 500,00 kr." }));

    await waitFor(() => expect(api.calls.some((c) => c.url === "/api/pos/sale")).toBe(true));
    const sale = api.calls.find((c) => c.url === "/api/pos/sale")!.body as { items: unknown[]; payments: unknown[] };
    expect(sale.items).toEqual([
      { type: "deposit", repairTicketId: TICKET, description: "Depositum · sag PS-2026-1189", unitPriceOere: 50_000 },
    ]);
    expect(sale.payments).toEqual([{ type: "kontant", amountOere: 50_000 }]);
    expect(await screen.findByText("Depositum modtaget")).toBeTruthy();
  });

  it("a paid case is refused with a clear message and cannot be charged", async () => {
    nav.query = `sag=${TICKET}`;
    api.casePaid = true;
    render(<KasseScreen />);
    expect(await screen.findByText(/Sag PS-2026-1189 er allerede betalt/)).toBeTruthy();
    expect(screen.queryByText("Sag PS-2026-1189", { selector: "b" })).toBeNull();
    expect((screen.getByRole("button", { name: /Opkræv|Afslut/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
