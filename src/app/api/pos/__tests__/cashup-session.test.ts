// @vitest-environment node
//
// Cash-up and cash-session routes. The regression pinned here: the day used to
// be cut at UTC midnight (src/app/api/pos/cashup/route.ts), so Danish sales
// between 00:00 and 02:00 local time landed on the previous day.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const requireStaffMock = vi.fn();
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: (...a: unknown[]) => requireStaffMock(...a) }));

type Call = { table: string; method: string; args: unknown[] };
const calls: Call[] = [];
const tableData: Record<string, unknown[]> = {};
const rpcMock = vi.fn();

function builder(table: string) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "gte", "lt", "is", "order", "limit"]) {
    b[m] = (...args: unknown[]) => {
      calls.push({ table, method: m, args });
      return b;
    };
  }
  b.then = (resolve: (v: unknown) => unknown) => resolve({ data: tableData[table] ?? [], error: null });
  return b;
}
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({ from: (t: string) => builder(t), rpc: rpcMock }),
}));

import { GET as cashupGET } from "../cashup/route";
import { POST as sessionPOST } from "../session/route";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const staff = { id: U(1), role: "employee", name: "Test", email: "t@phonespot.dk" };

beforeEach(() => {
  calls.length = 0;
  for (const k of Object.keys(tableData)) delete tableData[k];
  requireStaffMock.mockReset();
  rpcMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

function get(qs: string) {
  return new NextRequest(`http://localhost/api/pos/cashup?${qs}`);
}

describe("GET /api/pos/cashup", () => {
  it("requires staff and a location or register", async () => {
    requireStaffMock.mockResolvedValue(null);
    expect((await cashupGET(get(`location_id=${U(2)}`))).status).toBe(401);
    requireStaffMock.mockResolvedValue(staff);
    expect((await cashupGET(get("date=2026-10-01"))).status).toBe(400);
    expect((await cashupGET(get(`location_id=${U(2)}&date=2026-02-30`))).status).toBe(400);
  });

  it("queries Copenhagen day boundaries (summer time), not UTC midnight", async () => {
    requireStaffMock.mockResolvedValue(staff);
    const res = await cashupGET(get(`location_id=${U(2)}&date=2026-10-01`));
    expect(res.status).toBe(200);

    const orders = calls.filter((c) => c.table === "orders");
    expect(orders.find((c) => c.method === "gte")?.args).toEqual(["confirmed_at", "2026-09-30T22:00:00.000Z"]);
    expect(orders.find((c) => c.method === "lt")?.args).toEqual(["confirmed_at", "2026-10-01T22:00:00.000Z"]);
    expect(orders.find((c) => c.method === "eq")?.args).toEqual(["location_id", U(2)]);
  });

  it("uses winter-time boundaries in January and the 25-hour day in October", async () => {
    requireStaffMock.mockResolvedValue(staff);
    await cashupGET(get(`location_id=${U(2)}&date=2026-01-15`));
    expect(calls.find((c) => c.table === "orders" && c.method === "gte")?.args).toEqual(["confirmed_at", "2026-01-14T23:00:00.000Z"]);
    expect(calls.find((c) => c.table === "orders" && c.method === "lt")?.args).toEqual(["confirmed_at", "2026-01-15T23:00:00.000Z"]);

    calls.length = 0;
    await cashupGET(get(`location_id=${U(2)}&date=2026-10-25`));
    expect(calls.find((c) => c.table === "orders" && c.method === "lt")?.args).toEqual(["confirmed_at", "2026-10-25T23:00:00.000Z"]);
  });

  it("filters on the register when one is given and aggregates what it finds", async () => {
    requireStaffMock.mockResolvedValue(staff);
    tableData.orders = [
      {
        id: "o1", order_number: "PSP-1", receipt_number: "V1-000001", receipt_no: 1, type: "pos", total: 10000,
        discount_amount: 0, discount_reason: null, vat_total: 2000, brugtmoms_total: 0,
        confirmed_at: "2026-10-01T10:00:00.000Z", payment_method: "kontant", register_id: U(3),
        order_items: [{ item_type: "sku_product", quantity: 1, total_price: 10000, discount_amount: 0, vat_scheme: "regular" }],
        order_payments: [{ type: "kontant", amount_oere: 10000 }],
      },
    ];
    tableData.registers = [{ id: U(3), name: "Kasse 1", location_id: U(2) }];

    const res = await cashupGET(get(`location_id=${U(2)}&register_id=${U(3)}&date=2026-10-01`));
    const json = await res.json();
    expect(calls.filter((c) => c.table === "orders" && c.method === "eq").map((c) => c.args)).toContainEqual(["register_id", U(3)]);
    expect(json.summary).toMatchObject({ salesCount: 1, grossSales: 10000, vatStandard: 2000, registerName: "Kasse 1" });
    expect(json.summary.payments).toEqual([{ type: "kontant", received: 10000, refunded: 0, net: 10000 }]);
  });
});

describe("POST /api/pos/session", () => {
  const post = (body: unknown) =>
    sessionPOST(new NextRequest("http://localhost/api/pos/session", { method: "POST", body: JSON.stringify(body) }));

  it("opens a session with a starting float", async () => {
    requireStaffMock.mockResolvedValue(staff);
    rpcMock.mockResolvedValue({ data: { session_id: U(9) }, error: null });
    const res = await post({ action: "open", registerId: U(3), openingFloat: 50000 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sessionId: U(9) });
    expect(rpcMock).toHaveBeenCalledWith("pos_open_cash_session", { p_register_id: U(3), p_staff_id: staff.id, p_opening_float: 50000 });
  });

  it("closing sends counted cash, bank deposit and expenses; the database computes expected cash and locks", async () => {
    requireStaffMock.mockResolvedValue(staff);
    rpcMock.mockResolvedValue({
      data: { session_id: U(9), expected_cash: 165000, counted_cash: 164000, difference: -1000, net_cash_payments: 120000, expenses_total: 5000, expected_card: 90000, counted_card: 89100, card_difference: -900 },
      error: null,
    });
    const res = await post({
      action: "close",
      sessionId: U(9),
      countedCash: 164000,
      cashToBank: 100000,
      expenses: [{ description: "Kaffe", amountOere: 5000 }],
      countedCard: 89100,
      cardNote: "  Slåfejl på bon 12  ",
    });
    expect(await res.json()).toEqual({
      sessionId: U(9), expectedCash: 165000, countedCash: 164000, difference: -1000,
      expectedCard: 90000, countedCard: 89100, cardDifference: -900, locked: true,
    });
    expect(rpcMock).toHaveBeenCalledWith("pos_close_cash_session", {
      p_session_id: U(9),
      p_staff_id: staff.id,
      p_counted_cash: 164000,
      p_cash_to_bank: 100000,
      p_expenses: [{ description: "Kaffe", amount_oere: 5000 }],
      p_notes: null,
      p_counted_card: 89100,
      p_card_note: "Slåfejl på bon 12",
    });
  });

  it("requires the terminal total to close (0 is allowed)", async () => {
    requireStaffMock.mockResolvedValue(staff);
    const missing = await post({ action: "close", sessionId: U(9), countedCash: 1000, cashToBank: 0, expenses: [] });
    expect(missing.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();

    rpcMock.mockResolvedValue({ data: { session_id: U(9), expected_cash: 1000, counted_cash: 1000, difference: 0, expected_card: 0, counted_card: 0, card_difference: 0 }, error: null });
    const zero = await post({ action: "close", sessionId: U(9), countedCash: 1000, cashToBank: 0, expenses: [], countedCard: 0 });
    expect(zero.status).toBe(200);
    expect(rpcMock.mock.calls[0][1]).toMatchObject({ p_counted_card: 0, p_card_note: null });
  });

  it("surfaces the database rule that a card difference needs a note", async () => {
    requireStaffMock.mockResolvedValue(staff);
    rpcMock.mockResolvedValue({ data: null, error: { message: "pos:card_note_required" } });
    const res = await post({ action: "close", sessionId: U(9), countedCash: 1000, cashToBank: 0, expenses: [], countedCard: 500 });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("card_note_required");
  });

  it("rejects banking more than counted before touching the database", async () => {
    requireStaffMock.mockResolvedValue(staff);
    const res = await post({ action: "close", sessionId: U(9), countedCash: 1000, cashToBank: 2000, expenses: [], countedCard: 0 });
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("a locked session cannot be closed again", async () => {
    requireStaffMock.mockResolvedValue(staff);
    rpcMock.mockResolvedValue({ data: null, error: { message: "pos:session_closed" } });
    const res = await post({ action: "close", sessionId: U(9), countedCash: 1000, cashToBank: 0, expenses: [], countedCard: 0 });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("session_closed");
  });

  it("only managers and owners add adjustment rows to a locked session", async () => {
    requireStaffMock.mockResolvedValue(staff);
    const denied = await post({ action: "adjust", sessionId: U(9), amountOere: -500, reason: "Optalt forkert" });
    expect(denied.status).toBe(403);
    expect(rpcMock).not.toHaveBeenCalled();

    requireStaffMock.mockResolvedValue({ ...staff, role: "manager" });
    rpcMock.mockResolvedValue({ data: { adjustment_id: U(77) }, error: null });
    const ok = await post({ action: "adjust", sessionId: U(9), amountOere: -500, reason: "Optalt forkert" });
    expect(ok.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("pos_add_session_adjustment", {
      p_session_id: U(9), p_staff_id: staff.id, p_amount_oere: -500, p_reason: "Optalt forkert",
    });
  });
});
