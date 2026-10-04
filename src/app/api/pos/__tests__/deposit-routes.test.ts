// @vitest-environment node
//
// Deposit model, TypeScript side: the case-payment sale payload, the database's
// business errors, the deposit balance read, the case lookup route, and a contract
// test over the migration text (the SQL itself is verified on a Supabase branch,
// see the migration headers).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const requireStaffMock = vi.fn();
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: (...a: unknown[]) => requireStaffMock(...a) }));

const rpcMock = vi.fn();
// Each from() call consumes the next queued result; every chained method returns the builder.
const queue: Array<{ data: unknown; error: unknown }> = [];
function builder() {
  const result = queue.shift() ?? { data: [], error: null };
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gt", "in", "or", "ilike", "order", "limit", "maybeSingle"]) b[m] = () => b;
  b.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return b;
}
const fromMock = vi.fn(() => builder());
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({ rpc: rpcMock, from: fromMock }),
}));
vi.mock("@/lib/warranty/generate", () => ({ generateWarrantiesForOrder: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/pos/receipt-data", () => ({ renderReceiptPdf: vi.fn().mockResolvedValue(Buffer.from("PDF")) }));

const canAccessMock = vi.fn(() => true);
vi.mock("@/lib/auth/store-scope", () => ({ canAccessStore: (...a: unknown[]) => canAccessMock(...(a as [])) }));

const findCaseRowsMock = vi.fn();
const loadPosCaseMock = vi.fn();
vi.mock("@/lib/pos/case-data", () => ({
  findCaseRows: (...a: unknown[]) => findCaseRowsMock(...a),
  loadPosCase: (...a: unknown[]) => loadPosCaseMock(...a),
}));

import { POST as salePOST } from "../sale/route";
import { GET as caseGET } from "../case/route";
import { getCaseDeposits, getOpenDepositTotal } from "@/lib/pos/deposits";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const staff = { id: U(1), role: "employee", name: "Test", email: "t@phonespot.dk", location_slug: "vejle" };

function post(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body) });
}
function get(path: string) {
  return new NextRequest(`http://localhost${path}`);
}

beforeEach(() => {
  requireStaffMock.mockReset();
  rpcMock.mockReset();
  fromMock.mockClear();
  queue.length = 0;
  canAccessMock.mockReset();
  canAccessMock.mockReturnValue(true);
  findCaseRowsMock.mockReset();
  loadPosCaseMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

const caseSale = {
  items: [
    { type: "repair_service", repairTicketId: U(5), description: "Sag PS-2026-1189", unitPriceOere: 169_800 },
    { type: "deposit_applied", depositItemId: U(6), amountOere: 50_000 },
  ],
  payments: [{ type: "kort_terminal", amountOere: 119_800 }],
  locationId: U(20),
  registerId: U(21),
};

describe("POST /api/pos/sale: case payment and deposit", () => {
  it("passes repair_service and deposit_applied lines to the RPC", async () => {
    requireStaffMock.mockResolvedValue(staff);
    rpcMock.mockResolvedValue({
      data: { order_id: U(30), order_number: "PSP-1", receipt_number: "V1-000042", total: 119_800, vat_total: 23_960, brugtmoms_total: 0 },
      error: null,
    });
    const res = await salePOST(post("/api/pos/sale", caseSale));
    expect(res.status).toBe(200);
    const [fn, args] = rpcMock.mock.calls[0];
    expect(fn).toBe("pos_create_sale");
    expect(args.p_items).toEqual([
      { type: "repair_service", repair_ticket_id: U(5), description: "Sag PS-2026-1189", unit_price_oere: 169_800 },
      { type: "deposit_applied", deposit_item_id: U(6), amount_oere: 50_000 },
    ]);
    expect(args.p_payments).toEqual([{ type: "kort_terminal", amount_oere: 119_800, reference: null }]);
  });

  it("takes a deposit-only sale", async () => {
    requireStaffMock.mockResolvedValue(staff);
    rpcMock.mockResolvedValue({
      data: { order_id: U(31), order_number: "PSP-2", receipt_number: "V1-000043", total: 50_000, vat_total: 10_000, brugtmoms_total: 0 },
      error: null,
    });
    const res = await salePOST(
      post("/api/pos/sale", {
        items: [{ type: "deposit", repairTicketId: U(5), description: "Depositum · sag PS-2026-1189", unitPriceOere: 50_000 }],
        payments: [{ type: "kontant", amountOere: 50_000 }],
        locationId: U(20),
        registerId: U(21),
      }),
    );
    expect(res.status).toBe(200);
    expect(rpcMock.mock.calls[0][1].p_items).toEqual([
      { type: "deposit", repair_ticket_id: U(5), description: "Depositum · sag PS-2026-1189", unit_price_oere: 50_000 },
    ]);
  });

  it("rejects a deposit without a case before it reaches the database", async () => {
    requireStaffMock.mockResolvedValue(staff);
    const res = await salePOST(
      post("/api/pos/sale", {
        items: [{ type: "deposit", unitPriceOere: 50_000 }],
        payments: [{ type: "kontant", amountOere: 50_000 }],
        locationId: U(20),
        registerId: U(21),
      }),
    );
    expect(res.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("maps the database guards: deposit already used, case already paid, wrong case, negative total", async () => {
    requireStaffMock.mockResolvedValue(staff);
    const cases: Array<[string, number, RegExp]> = [
      ["pos:deposit_exceeded:0", 409, /allerede brugt/],
      ["pos:ticket_already_paid:PS-2026-1189", 409, /allerede betalt/],
      ["pos:deposit_requires_repair_line", 400, /den sag, det hører til/],
      ["pos:negative_total", 400, /negativ/],
      ["pos:ticket_not_found", 404, /Sagen findes ikke/],
    ];
    for (const [message, status, text] of cases) {
      rpcMock.mockResolvedValueOnce({ data: null, error: { message } });
      const res = await salePOST(post("/api/pos/sale", caseSale));
      expect(res.status).toBe(status);
      expect((await res.json()).error).toMatch(text);
    }
  });
});

describe("getCaseDeposits / getOpenDepositTotal", () => {
  const depositRow = (id: string, total: number, at: string) => ({
    id,
    order_id: `o-${id}`,
    total_price: total,
    orders: {
      confirmed_at: at,
      created_at: at,
      receipt_number: `V1-${id}`,
      order_number: `PSP-${id}`,
      status: "confirmed",
      order_payments: [{ type: "kort_terminal", amount_oere: total }],
    },
  });

  it("returns the deposit with the fields the case page expects, and the open balance", async () => {
    queue.push({ data: [depositRow("d1", 50_000, "2026-09-18T10:00:00Z")], error: null }); // deposits
    queue.push({ data: [], error: null }); // applied lines
    queue.push({ data: [], error: null }); // returned lines
    const deposits = await getCaseDeposits(U(5));
    expect(deposits).toEqual([
      {
        id: "d1",
        amount_oere: 50_000,
        paid_at: "2026-09-18T10:00:00Z",
        method: "kort_terminal",
        receipt_no: "V1-d1",
        order_id: "o-d1",
        remaining_oere: 50_000,
        applied_oere: 0,
      },
    ]);
  });

  it("an applied deposit has nothing open; a reversed application is open again", async () => {
    queue.push({ data: [depositRow("d1", 50_000, "2026-09-18T10:00:00Z")], error: null });
    queue.push({ data: [{ deposit_item_id: "d1", total_price: -50_000 }], error: null });
    queue.push({ data: [], error: null });
    expect(await getOpenDepositTotal(U(5))).toBe(0);

    queue.push({ data: [depositRow("d1", 50_000, "2026-09-18T10:00:00Z")], error: null });
    queue.push({
      data: [
        { deposit_item_id: "d1", total_price: -50_000 },
        { deposit_item_id: "d1", total_price: 50_000 },
      ],
      error: null,
    });
    queue.push({ data: [], error: null });
    expect(await getOpenDepositTotal(U(5))).toBe(50_000);
  });

  it("leaves out a deposit that was refunded in full", async () => {
    queue.push({ data: [depositRow("d1", 50_000, "2026-09-18T10:00:00Z")], error: null });
    queue.push({ data: [], error: null });
    queue.push({ data: [{ original_order_item_id: "d1", total_price: -50_000 }], error: null });
    expect(await getCaseDeposits(U(5))).toEqual([]);
  });

  it("splits payments of mixed methods into 'split' and lists oldest first", async () => {
    const mixed = depositRow("d2", 30_000, "2026-09-20T10:00:00Z");
    mixed.orders.order_payments = [
      { type: "kontant", amount_oere: 10_000 },
      { type: "mobilepay", amount_oere: 20_000 },
    ];
    queue.push({ data: [mixed, depositRow("d1", 50_000, "2026-09-18T10:00:00Z")], error: null });
    queue.push({ data: [], error: null });
    queue.push({ data: [], error: null });
    const list = await getCaseDeposits(U(5));
    expect(list.map((d) => d.id)).toEqual(["d1", "d2"]);
    expect(list[1].method).toBe("split");
  });

  it("throws when the schema is not migrated yet (callers show 'kunne ikke hentes')", async () => {
    queue.push({ data: null, error: { message: 'column order_items.repair_ticket_id does not exist' } });
    await expect(getCaseDeposits(U(5))).rejects.toThrow(/Kunne ikke hente depositum/);
  });
});

describe("GET /api/pos/case", () => {
  it("requires staff and a case reference", async () => {
    requireStaffMock.mockResolvedValue(null);
    expect((await caseGET(get("/api/pos/case?q=PS-2026-0001"))).status).toBe(401);
    requireStaffMock.mockResolvedValue(staff);
    expect((await caseGET(get("/api/pos/case?q=5901234123457"))).status).toBe(400);
    expect(findCaseRowsMock).not.toHaveBeenCalled();
  });

  it("returns the case for exactly one match in the staff member's store", async () => {
    requireStaffMock.mockResolvedValue(staff);
    findCaseRowsMock.mockResolvedValue([{ id: U(5), ticket_number: "PS-2026-1189", store_id: "vejle" }]);
    loadPosCaseMock.mockResolvedValue({ id: U(5), ticketNumber: "PS-2026-1189" });
    const res = await caseGET(get("/api/pos/case?q=PS-2026-1189"));
    expect(res.status).toBe(200);
    expect((await res.json()).case.id).toBe(U(5));
  });

  it("answers 404 for a case in another store (same answer as a missing case)", async () => {
    requireStaffMock.mockResolvedValue(staff);
    findCaseRowsMock.mockResolvedValue([{ id: U(5), ticket_number: "PS-2026-1189", store_id: "slagelse" }]);
    canAccessMock.mockReturnValue(false);
    const res = await caseGET(get("/api/pos/case?q=PS-2026-1189"));
    expect(res.status).toBe(404);
    expect(loadPosCaseMock).not.toHaveBeenCalled();
  });

  it("offers candidates when a bare number matches several years", async () => {
    requireStaffMock.mockResolvedValue(staff);
    findCaseRowsMock.mockResolvedValue([
      { id: U(5), ticket_number: "PS-2026-0042", store_id: null },
      { id: U(6), ticket_number: "PS-2027-0042", store_id: null },
    ]);
    const res = await caseGET(get("/api/pos/case?q=%2342"));
    const json = await res.json();
    expect(json.case).toBeNull();
    expect(json.candidates.map((c: { ticketNumber: string }) => c.ticketNumber)).toEqual(["PS-2026-0042", "PS-2027-0042"]);
  });
});

/**
 * Contract test over the migration text. The SQL is not executed in unit tests;
 * these assertions pin the rules the TypeScript side relies on, so a refactor of
 * the migration cannot silently drop one.
 */
describe("deposit migrations (contract)", () => {
  const dir = join(process.cwd(), "supabase", "migrations");
  const schema = readFileSync(join(dir, "20261004300000_pos_deposit_schema.sql"), "utf8");
  const rpcs = readFileSync(join(dir, "20261004300100_pos_deposit_rpcs.sql"), "utf8");

  it("links deposits to the repair case and allows the new item types", () => {
    expect(schema).toMatch(/ADD COLUMN IF NOT EXISTS repair_ticket_id uuid REFERENCES public\.repair_tickets/);
    expect(schema).toMatch(/item_type IN \('device', 'sku_product', 'free_text', 'deposit', 'repair_service', 'deposit_applied'\)/);
    expect(schema).toMatch(/order_items_ticket_required_check/);
  });

  it("guards double use with a lock and a trigger that checks the remaining balance", () => {
    expect(schema).toMatch(/CREATE TRIGGER trg_deposit_applied_guard/);
    expect(schema).toMatch(/FOR UPDATE/);
    expect(schema).toMatch(/pos_fail\('deposit_exceeded'/);
    expect(rpcs).toMatch(/duplicate_deposit_application/);
    expect(rpcs).toMatch(/FOR UPDATE OF oi/);
  });

  it("marks the case paid in the same transaction as the sale, and resets it on return", () => {
    expect(rpcs).toMatch(/UPDATE public\.repair_tickets SET paid = true, paid_at = clock_timestamp\(\) WHERE id = v_order_ticket/);
    expect(rpcs).toMatch(/UPDATE public\.repair_tickets SET paid = false, paid_at = NULL/);
    // the case must be unpaid and exist before a deposit or a repair line is accepted
    expect(rpcs).toMatch(/pos_fail\('ticket_already_paid'/);
    expect(rpcs).toMatch(/pos_fail\('ticket_required'\)/);
  });

  it("keeps deposits out of the discount base and the total non-negative", () => {
    expect(rpcs).toMatch(/l_kind\[n\] IN \('deposit', 'deposit_applied'\) THEN 0/);
    expect(rpcs).toMatch(/pos_fail\('negative_total'\)/);
  });

  it("refuses to refund an applied deposit and returns repair line and applied deposit together", () => {
    expect(rpcs).toMatch(/pos_fail\('return_deposit_applied'\)/);
    expect(rpcs).toMatch(/pos_fail\('return_deposit_pair'\)/);
  });

  it("keeps the function grants service_role only", () => {
    expect(rpcs).toMatch(/REVOKE ALL ON FUNCTION public\.pos_create_sale\(.*\) FROM PUBLIC, anon, authenticated/);
    expect(schema).toMatch(/REVOKE ALL ON FUNCTION public\.pos_deposit_remaining\(uuid\) FROM PUBLIC, anon, authenticated/);
  });
});
