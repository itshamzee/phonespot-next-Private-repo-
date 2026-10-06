// @vitest-environment node
//
// Card terminal wiring around POST /api/pos/sale and /api/pos/return.
// - Manual terminal (default): the RPC payload is exactly today's, no table reads.
// - Worldline stub: a calm error, and pos_create_sale / pos_create_return never run.
// - Integrated terminal with a transaction id: it lands in the card line's reference.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import type { PaymentTerminal } from "@/lib/pos/payment-terminal";

const requireStaffMock = vi.fn();
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: (...a: unknown[]) => requireStaffMock(...a) }));

const rpcMock = vi.fn();
const tables = vi.hoisted(() => ({
  reads: [] as string[],
  rows: {} as Record<string, unknown>,
}));
function query(table: string) {
  tables.reads.push(table);
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "or", "limit"]) b[m] = () => b;
  const row = tables.rows[table];
  b.maybeSingle = async () => ({ data: Array.isArray(row) ? (row[0] ?? null) : (row ?? null), error: null });
  b.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: Array.isArray(row) ? row : [], error: null }).then(resolve);
  return b;
}
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({ rpc: rpcMock, from: (t: string) => query(t) }),
}));
vi.mock("@/lib/warranty/generate", () => ({ generateWarrantiesForOrder: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/pos/receipt-data", () => ({ renderReceiptPdf: vi.fn().mockResolvedValue(Buffer.from("PDF")) }));

// Lets a test swap in a fake integrated terminal; null = the real factory.
const fake = vi.hoisted(() => ({ terminal: null as PaymentTerminal | null }));
vi.mock("@/lib/pos/payment-terminal", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/pos/payment-terminal")>();
  return {
    ...actual,
    getPaymentTerminal: (slug: string, env?: Record<string, string | undefined>) => fake.terminal ?? actual.getPaymentTerminal(slug, env),
  };
});

import { POST as salePOST } from "../sale/route";
import { GET as returnGET, POST as returnPOST } from "../return/route";
import { POST as cancelPOST } from "../terminal/cancel/route";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const staff = { id: U(1), role: "employee", name: "Test", email: "t@phonespot.dk" };

function req(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body) });
}

const saleBody = {
  items: [{ type: "free_text", description: "Cover", unitPriceOere: 90_000 }],
  payments: [
    { type: "kontant", amountOere: 50_000 },
    { type: "kort_terminal", amountOere: 40_000 },
  ],
  locationId: U(20),
  registerId: U(21),
};

const returnBody = {
  originalOrderId: U(40),
  locationId: U(20),
  registerId: U(21),
  lines: [{ orderItemId: U(41), quantity: 1, restock: true }],
  refunds: [{ type: "kort_terminal", amountOere: 9_000 }],
  reason: "Defekt",
};

const saleOk = { data: { order_id: U(30), order_number: "PSP-1", receipt_number: "V1-000001", total: 90_000, vat_total: 0, brugtmoms_total: 0 }, error: null };
const returnOk = { data: { order_id: U(50), order_number: "PSP-2", receipt_number: "V1-000002", total: -9_000, refund_amount: 9_000 }, error: null };

beforeEach(() => {
  requireStaffMock.mockReset().mockResolvedValue(staff);
  rpcMock.mockReset();
  tables.reads = [];
  tables.rows = { locations: { slug: "vejle" } };
  fake.terminal = null;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("manual terminal (POS_TERMINAL_PROVIDER unset)", () => {
  it("sends today's exact payment payload and reads no tables", async () => {
    rpcMock.mockResolvedValue(saleOk);
    const res = await salePOST(req("/api/pos/sale", saleBody));
    expect(res.status).toBe(200);
    expect(rpcMock.mock.calls[0][1].p_payments).toMatchInlineSnapshot(`
      [
        {
          "amount_oere": 50000,
          "reference": null,
          "type": "kontant",
        },
        {
          "amount_oere": 40000,
          "reference": null,
          "type": "kort_terminal",
        },
      ]
    `);
    expect(tables.reads).toEqual([]);
  });

  it("returns a card refund without calling a terminal or reading tables", async () => {
    rpcMock.mockResolvedValue(returnOk);
    const res = await returnPOST(req("/api/pos/return", returnBody));
    expect(res.status).toBe(200);
    expect(rpcMock.mock.calls[0][1].p_refunds).toEqual([{ type: "kort_terminal", amount_oere: 9_000, reference: null }]);
    expect(tables.reads).toEqual([]);
  });

  it("an explicit 'manual' and unknown values behave the same", async () => {
    vi.stubEnv("POS_TERMINAL_PROVIDER", "manual");
    rpcMock.mockResolvedValue(saleOk);
    expect((await salePOST(req("/api/pos/sale", saleBody))).status).toBe(200);
    vi.stubEnv("POS_TERMINAL_PROVIDER", "nets");
    expect((await salePOST(req("/api/pos/sale", saleBody))).status).toBe(200);
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });

  it("GET /api/pos/return reports the terminal kind", async () => {
    tables.rows.orders = { id: U(40), order_number: "PSP-1", receipt_number: "V1-000001", confirmed_at: null, total: 100, location_id: U(20), customer_id: null };
    const res = await returnGET(new NextRequest("http://localhost/api/pos/return?q=V1-000001"));
    expect((await res.json()).terminalKind).toBe("manual");
  });
});

describe("worldline stub (POS_TERMINAL_PROVIDER=worldline)", () => {
  beforeEach(() => vi.stubEnv("POS_TERMINAL_PROVIDER", "worldline"));

  it("refuses a card sale calmly and creates no sale", async () => {
    const res = await salePOST(req("/api/pos/sale", saleBody));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Worldline-terminal er ikke sat op endnu. Salget er ikke gemt.", code: "terminal_error" });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("still saves a sale without a card line", async () => {
    rpcMock.mockResolvedValue(saleOk);
    const res = await salePOST(req("/api/pos/sale", { ...saleBody, payments: [{ type: "kontant", amountOere: 90_000 }] }));
    expect(res.status).toBe(200);
  });

  it("refuses a card refund calmly and creates no credit note", async () => {
    const res = await returnPOST(req("/api/pos/return", returnBody));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("Worldline-terminal er ikke sat op endnu. Returneringen er ikke gemt.");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("cancel answers calmly", async () => {
    const res = await cancelPOST(req("/api/pos/terminal/cancel", { reference: "abcdef12-3456", locationId: U(20) }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "error", message: "Worldline-terminal er ikke sat op endnu" });
  });
});

describe("integrated terminal with a transaction id", () => {
  beforeEach(() => vi.stubEnv("POS_TERMINAL_PROVIDER", "worldline"));

  it("saves the transaction id in the card line's reference and uses the store slug", async () => {
    const charge = vi.fn<PaymentTerminal["charge"]>(async () => ({ status: "approved", transactionId: "WL-TX-777" }));
    fake.terminal = { kind: "worldline", charge, refund: vi.fn() };
    rpcMock.mockResolvedValue(saleOk);

    const res = await salePOST(req("/api/pos/sale", { ...saleBody, terminalReference: "abcdef12-3456" }));
    expect(res.status).toBe(200);
    expect(charge).toHaveBeenCalledWith({ amountOere: 40_000, reference: "abcdef12-3456:1", locationSlug: "vejle" });
    expect(rpcMock.mock.calls[0][1].p_payments).toEqual([
      { type: "kontant", amount_oere: 50_000, reference: null },
      { type: "kort_terminal", amount_oere: 40_000, reference: "WL-TX-777" },
    ]);
  });

  it("voids the card payment when the database refuses the sale", async () => {
    const refund = vi.fn<PaymentTerminal["refund"]>(async () => ({ status: "approved" }));
    fake.terminal = { kind: "worldline", charge: async () => ({ status: "approved", transactionId: "WL-TX-1" }), refund };
    rpcMock.mockResolvedValue({ data: null, error: { message: "pos:insufficient_stock:Cover" } });

    const res = await salePOST(req("/api/pos/sale", saleBody));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("terminal_voided");
    expect(json.error).toBe("Ikke nok på lager: Cover. Kortbetalingen er ført tilbage på terminalen.");
    expect(refund).toHaveBeenCalledWith(expect.objectContaining({ amountOere: 40_000, originalTransactionId: "WL-TX-1" }));
  });

  it("refunds against the original transaction and saves the refund's transaction id", async () => {
    const refund = vi.fn<PaymentTerminal["refund"]>(async () => ({ status: "approved", transactionId: "WL-RF-5" }));
    fake.terminal = { kind: "worldline", charge: vi.fn(), refund };
    tables.rows.order_payments = [{ reference: "WL-TX-777" }];
    rpcMock.mockResolvedValue(returnOk);

    const res = await returnPOST(req("/api/pos/return", returnBody));
    expect(res.status).toBe(200);
    expect(refund).toHaveBeenCalledWith(expect.objectContaining({ amountOere: 9_000, originalTransactionId: "WL-TX-777", locationSlug: "vejle" }));
    expect(rpcMock.mock.calls[0][1].p_refunds).toEqual([{ type: "kort_terminal", amount_oere: 9_000, reference: "WL-RF-5" }]);
  });
});
