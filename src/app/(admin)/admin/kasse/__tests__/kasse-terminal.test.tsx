import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";

// Card terminal modes in the Kasse UI: manual keeps "Kortet er godkendt" and the
// old request body; an integrated terminal sends the amount straight away and
// can be cancelled.

const TICKET = "00000000-0000-4000-8000-000000000001";
const LOC = "00000000-0000-4000-8000-000000000030";
const REG = "00000000-0000-4000-8000-000000000031";

const nav = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
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
  calls: [] as Array<{ url: string; body: Record<string, unknown> | undefined }>,
  sale: null as null | (() => Promise<unknown>),
}));

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
            openSession: { id: "s1", openedAt: "2026-10-04T08:02:00Z", openedByName: "Mikkel", openingFloat: 0, netCashPayments: 0, expectedCash: 0 },
          },
        ],
      };
    }
    if (url.startsWith("/api/pos/quick-tiles")) return { tiles: [], categories: [] };
    if (url.startsWith("/api/pos/case")) {
      return {
        case: {
          id: TICKET,
          ticketNumber: "PS-2026-1189",
          paid: false,
          customer: { id: null, name: "Anders Hansen", phone: null, email: null },
          deviceLabel: "OnePlus Nord 3",
          totalOere: 100_000,
          description: "Sag PS-2026-1189 · Skærm",
          deposits: [],
          depositsOk: true,
        },
        candidates: [],
      };
    }
    if (url === "/api/pos/terminal/cancel") return { status: "cancelled" };
    if (url === "/api/pos/sale") {
      if (api.sale) return api.sale();
      return { orderId: "o1", orderNumber: "PSP-1", receiptNumber: "V1-000042", total: 100_000, receiptPdf: null, warnings: [] };
    }
    return {};
  }),
}));

import { KasseScreen } from "../_components/kasse-screen";

const saleCalls = () => api.calls.filter((c) => c.url === "/api/pos/sale");

async function chargeButton() {
  const btn = (await screen.findByRole("button", { name: "Opkræv 1.000,00 kr." })) as HTMLButtonElement;
  await waitFor(() => expect(btn.disabled).toBe(false));
  return btn;
}

beforeEach(() => {
  api.calls = [];
  api.sale = null;
  nav.query = `sag=${TICKET}`;
});
afterEach(cleanup);

describe("Kasse card terminal", () => {
  it("manual (default): asks 'Kortet er godkendt' and sends the same body as before", async () => {
    render(<KasseScreen />);
    fireEvent.click(await chargeButton());
    expect(screen.queryByText("Sender beløb til terminalen…")).toBeNull();
    expect(saleCalls()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Kortet er godkendt" }));

    await waitFor(() => expect(saleCalls()).toHaveLength(1));
    const body = saleCalls()[0].body!;
    expect(Object.keys(body).sort()).toEqual(["items", "locationId", "payments", "registerId"]);
    expect(body.payments).toEqual([{ type: "kort_terminal", amountOere: 100_000 }]);
    expect(await screen.findByText("Betaling gennemført")).toBeTruthy();
  });

  it("manual: an optional terminal receipt number is saved as the card line's reference", async () => {
    render(<KasseScreen />);
    fireEvent.click(await chargeButton());
    fireEvent.change(screen.getByLabelText("Kvitteringsnr. fra terminalen (valgfrit)"), { target: { value: " 004217 " } });
    fireEvent.click(screen.getByRole("button", { name: "Kortet er godkendt" }));

    await waitFor(() => expect(saleCalls()).toHaveLength(1));
    expect(saleCalls()[0].body!.payments).toEqual([{ type: "kort_terminal", amountOere: 100_000, reference: "004217" }]);
  });

  it("manual: an invalid receipt number blocks the confirmation button", async () => {
    render(<KasseScreen />);
    fireEvent.click(await chargeButton());
    fireEvent.change(screen.getByLabelText("Kvitteringsnr. fra terminalen (valgfrit)"), { target: { value: "12 34" } });
    expect((screen.getByRole("button", { name: "Kortet er godkendt" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("integrated: sends the amount to the terminal at once, can cancel, and a refused charge shows a calm error", async () => {
    let reject!: (e: Error) => void;
    api.sale = () => new Promise((_, r) => (reject = r));
    render(<KasseScreen terminalKind="worldline" />);
    expect(await screen.findByText("Beløbet sendes til terminalen, når du trykker opkræv")).toBeTruthy();
    fireEvent.click(await chargeButton());

    expect(await screen.findByText("Sender beløb til terminalen…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Kortet er godkendt" })).toBeNull();
    await waitFor(() => expect(saleCalls()).toHaveLength(1));
    const ref = saleCalls()[0].body!.terminalReference as string;
    expect(ref).toMatch(/^[0-9a-f-]{36}$/);

    fireEvent.click(screen.getByRole("button", { name: "Annuller betaling" }));
    await waitFor(() => expect(api.calls.some((c) => c.url === "/api/pos/terminal/cancel")).toBe(true));
    expect(api.calls.find((c) => c.url === "/api/pos/terminal/cancel")!.body).toEqual({ reference: ref, locationId: LOC });

    reject(new Error("Betalingen blev annulleret på terminalen. Salget er ikke gemt."));
    expect(await screen.findByText("Betalingen blev annulleret på terminalen. Salget er ikke gemt.")).toBeTruthy();
    expect(screen.queryByText("Betaling gennemført")).toBeNull();
    expect(screen.getByRole("button", { name: "Prøv igen" })).toBeTruthy();
  });
});
