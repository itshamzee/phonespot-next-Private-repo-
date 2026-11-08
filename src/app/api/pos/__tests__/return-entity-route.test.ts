// @vitest-environment node
//
// A return must stay within the legal entity of the sale. Real pos-context and
// return-entity helpers; only supabase rows (and the return lookup) are faked.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const requireStaffMock = vi.fn();
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: (...a: unknown[]) => requireStaffMock(...a) }));

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const rows: Record<string, Array<Record<string, unknown>>> = {};
const rpcMock = vi.fn();

function builder(table: string) {
  const eqs: Array<[string, unknown]> = [];
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = (k: string, v: unknown) => (eqs.push([k, v]), b);
  b.maybeSingle = async () => ({ data: (rows[table] ?? []).find((r) => eqs.every(([k, v]) => r[k] === v)) ?? null, error: null });
  b.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows[table] ?? [], error: null });
  return b;
}
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => ({ from: builder, rpc: rpcMock }) }));
vi.mock("@/lib/warranty/generate", () => ({ generateWarrantiesForOrder: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/pos/receipt-data", () => ({ renderReceiptPdf: vi.fn().mockResolvedValue(Buffer.from("PDF")) }));
vi.mock("@/lib/pos/create-return", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/pos/create-return")>();
  return { ...actual, findReturnableOrder: vi.fn(async (q: string) => ({ id: q, lines: [] })) };
});

import { GET, POST } from "../return/route";

const FIXON = "46079019";
const PHONEGO = "38688766";
const L = { vejle: U(20), slagelse: U(30), webshop: U(40) };
const V1 = U(21);
const S1 = U(31);
const ORDER = { vejle: U(50), webshop: U(51), slagelse: U(52), snapshot: U(53) };

const base = { id: U(1), name: "T", email: null, permissions: ["lave_retur"] };
const vejleStaff = { ...base, role: "employee", location_id: L.vejle, location_slug: "vejle" };
const slagelseStaff = { ...base, role: "employee", location_id: L.slagelse, location_slug: "slagelse" };
const owner = { ...base, role: "owner", location_id: null, location_slug: null };

const post = (registerId: string, originalOrderId: string) =>
  POST(
    new NextRequest("http://localhost/api/pos/return", {
      method: "POST",
      body: JSON.stringify({
        originalOrderId,
        registerId,
        lines: [{ orderItemId: U(60), quantity: 1, restock: true }],
        refunds: [{ type: "kontant", amountOere: 9000 }],
        reason: "Defekt",
      }),
    }),
  );
const get = (q: string) => GET(new NextRequest(`http://localhost/api/pos/return?q=${q}`));

beforeEach(() => {
  requireStaffMock.mockReset();
  rpcMock.mockReset();
  rpcMock.mockResolvedValue({
    data: { order_id: U(70), order_number: "PSP-9", receipt_number: "V1-000009", total: -9000, vat_total: 0, brugtmoms_total: 0, refund_amount: 9000 },
    error: null,
  });
  rows.locations = [
    { id: L.vejle, name: "Vejle", slug: "vejle", type: "store", legal_entities: { cvr: FIXON } },
    { id: L.slagelse, name: "Slagelse", slug: "slagelse", type: "store", legal_entities: { cvr: PHONEGO } },
    { id: L.webshop, name: "Webshop", slug: "webshop", type: "online", legal_entities: { cvr: FIXON } },
  ];
  rows.registers = [
    { id: V1, code: "V1", location_id: L.vejle, active: true },
    { id: S1, code: "S1", location_id: L.slagelse, active: true },
  ];
  rows.orders = [
    { id: ORDER.vejle, location_id: L.vejle, legal_cvr: FIXON },
    { id: ORDER.webshop, location_id: L.webshop, legal_cvr: null },
    { id: ORDER.slagelse, location_id: L.slagelse, legal_cvr: PHONEGO },
    // Sold by PhoneGo, location since moved to Fixon: the snapshot wins.
    { id: ORDER.snapshot, location_id: L.vejle, legal_cvr: PHONEGO },
  ];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/pos/return legal entity", () => {
  it("Vejle register refunds a Vejle order", async () => {
    requireStaffMock.mockResolvedValue(vejleStaff);
    expect((await post(V1, ORDER.vejle)).status).toBe(200);
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it("Vejle register refunds a webshop order (same entity, no snapshot: location's entity)", async () => {
    requireStaffMock.mockResolvedValue(vejleStaff);
    expect((await post(V1, ORDER.webshop)).status).toBe(200);
  });

  it("Slagelse register refunds a Vejle order: 403 return_other_entity, RPC not called", async () => {
    requireStaffMock.mockResolvedValue(slagelseStaff);
    const res = await post(S1, ORDER.vejle);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "Returen skal laves i en butik under samme firma som købet",
      code: "return_other_entity",
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("Vejle register refunds a Slagelse order: 403", async () => {
    requireStaffMock.mockResolvedValue(vejleStaff);
    expect((await post(V1, ORDER.slagelse)).status).toBe(403);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("a legal_cvr snapshot of PhoneGo at a now-Fixon location is treated as PhoneGo", async () => {
    requireStaffMock.mockResolvedValue(vejleStaff);
    expect((await post(V1, ORDER.snapshot)).status).toBe(403);
    requireStaffMock.mockResolvedValue(slagelseStaff);
    expect((await post(S1, ORDER.snapshot)).status).toBe(200);
  });

  it("a missing order keeps the existing not-found behaviour (RPC decides)", async () => {
    requireStaffMock.mockResolvedValue(vejleStaff);
    rpcMock.mockResolvedValue({ data: null, error: { message: "pos:order_not_found" } });
    expect((await post(V1, U(99))).status).toBe(404);
  });

  it("fails closed when the register's entity is unknown", async () => {
    requireStaffMock.mockResolvedValue(owner);
    rows.locations[0].legal_entities = null;
    expect((await post(V1, ORDER.vejle)).status).toBe(403);
  });
});

describe("GET /api/pos/return legal entity", () => {
  it("answers the same 403 for another entity's order and does not reveal it", async () => {
    requireStaffMock.mockResolvedValue(slagelseStaff);
    const res = await get(ORDER.vejle);
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("return_other_entity");
  });

  it("returns the order within the same entity (webshop order for Vejle)", async () => {
    requireStaffMock.mockResolvedValue(vejleStaff);
    const res = await get(ORDER.webshop);
    expect(res.status).toBe(200);
    expect((await res.json()).order.id).toBe(ORDER.webshop);
  });

  it("the owner may look up any order", async () => {
    requireStaffMock.mockResolvedValue(owner);
    expect((await get(ORDER.slagelse)).status).toBe(200);
  });
});
