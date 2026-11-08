// @vitest-environment node
//
// Route + wrapper tests for POS sale and return. The atomic work lives in the
// pos_create_sale / pos_create_return Postgres functions; here we pin what the
// TypeScript layer must do around them: auth, validation, passing the right
// RPC payload, surfacing database errors (the old code ignored them), and never
// touching the original order on a return.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const requireStaffMock = vi.fn();
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: (...a: unknown[]) => requireStaffMock(...a) }));

const rpcMock = vi.fn();
// Lets one test put a different clerk (PIN cookie) behind the login; unset = the real requirePosStaff.
const posOverride = vi.fn<(r: Request) => Promise<unknown> | undefined>();
vi.mock("@/lib/pos/route-helpers", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/pos/route-helpers")>();
  return { ...actual, requirePosStaff: (r: Request) => posOverride(r) ?? actual.requirePosStaff(r) };
});
// The only direct read allowed is the 3 for 2 price lookup on sku_products
// (create-sale recomputes the lagersalg discount from the database). Nothing
// else may be read or written outside the RPC.
const dbRows: Record<string, Array<Record<string, unknown>>> = {};
const fromMock = vi.fn((table: string) => {
  if (table === "registers" || table === "locations" || table === "orders") {
    // pos-context: the register / location lookup that decides store access.
    const eqs: Array<[string, unknown]> = [];
    const b: Record<string, unknown> = {};
    b.select = () => b;
    b.eq = (k: string, v: unknown) => (eqs.push([k, v]), b);
    b.maybeSingle = async () => ({
      data: (dbRows[table] ?? []).find((r) => eqs.every(([k, v]) => r[k] === v)) ?? null,
      error: null,
    });
    b.then = (resolve: (v: unknown) => unknown) => resolve({ data: dbRows[table] ?? [], error: null });
    return b;
  }
  if (table !== "sku_products") throw new Error("from() must not be used by sale/return");
  return {
    select: () => ({
      in: async (_col: string, ids: string[]) => ({
        data: ids.map((id) => ({ id, selling_price: 10000, sale_price: null, subcategory: null, attributes: null })),
        error: null,
      }),
    }),
  };
});
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({ rpc: rpcMock, from: fromMock }),
}));
vi.mock("@/lib/warranty/generate", () => ({ generateWarrantiesForOrder: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/pos/receipt-data", () => ({
  renderReceiptPdf: vi.fn().mockResolvedValue(Buffer.from("PDF")),
}));

import { POST as salePOST } from "../sale/route";
import { POST as returnPOST } from "../return/route";
import { DISCOUNT_REASONS } from "@/lib/pos/constants";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
// The owner may use every store; the store-scope cases use employees with a store.
const staff = { id: U(1), role: "owner", name: "Test", email: "t@phonespot.dk", location_id: null, location_slug: null };
const vejleStaff = { ...staff, id: U(2), role: "employee", location_id: U(20), location_slug: "vejle" };
const slagelseStaff = { ...staff, id: U(3), role: "employee", location_id: U(30), location_slug: "slagelse" };

function req(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body) });
}

const saleBody = {
  items: [
    { type: "device", deviceId: U(10) },
    { type: "sku_product", skuProductId: U(11), quantity: 2 },
    { type: "free_text", description: "Diverse salg", unitPriceOere: 5000 },
    { type: "deposit", repairTicketId: U(12), unitPriceOere: 20000 },
  ],
  payments: [
    { type: "kontant", amountOere: 50000 },
    { type: "kort_terminal", amountOere: 40000 },
  ],
  locationId: U(20),
  registerId: U(21),
  discountAmount: 1000,
  discountReason: "Tilbud",
  // The old client sent this for in-store card payments; it must be ignored now.
  stripePaymentId: "pi_should_be_ignored",
};

beforeEach(() => {
  requireStaffMock.mockReset();
  rpcMock.mockReset();
  fromMock.mockClear();
  posOverride.mockReset();
  dbRows.locations = [
    { id: U(20), name: "Vejle", slug: "vejle", type: "store" },
    { id: U(30), name: "Slagelse", slug: "slagelse", type: "store" },
  ];
  dbRows.registers = [
    { id: U(21), code: "V1", location_id: U(20), active: true },
    { id: U(31), code: "S1", location_id: U(30), active: true },
  ];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("POST /api/pos/sale", () => {
  it("requires staff", async () => {
    requireStaffMock.mockResolvedValue(null);
    const res = await salePOST(req("/api/pos/sale", saleBody));
    expect(res.status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("validates the body: items, payments, discount reason", async () => {
    requireStaffMock.mockResolvedValue(staff);
    expect((await salePOST(req("/api/pos/sale", { ...saleBody, items: [] }))).status).toBe(400);
    expect((await salePOST(req("/api/pos/sale", { ...saleBody, payments: [{ type: "bitcoin", amountOere: 1 }] }))).status).toBe(400);
    const noReason = await salePOST(req("/api/pos/sale", { ...saleBody, discountReason: undefined }));
    expect(noReason.status).toBe(400);
    expect((await noReason.json()).error).toMatch(/årsag/);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("accepts the discount reasons the DB allows, including 'Partner', and rejects unknown ones", async () => {
    expect(DISCOUNT_REASONS).toEqual(["Fejl", "Kundeservice", "Tilbud", "Partner", "Andet"]);
    requireStaffMock.mockResolvedValue(staff);
    const unknown = await salePOST(req("/api/pos/sale", { ...saleBody, discountReason: "Studie" }));
    expect(unknown.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();

    rpcMock.mockResolvedValue({
      data: { order_id: U(31), order_number: "V1-000002", receipt_number: "V1-000002", total: 90000, vat_total: 0, brugtmoms_total: 0 },
      error: null,
    });
    const partner = await salePOST(req("/api/pos/sale", { ...saleBody, discountReason: "Partner" }));
    expect(partner.status).toBe(200);
    expect(rpcMock.mock.calls[0][1]).toMatchObject({ p_discount_amount: 1000, p_discount_reason: "Partner" });
  });

  it("calls one atomic RPC with split payments, the staff id and the register, and ignores stripePaymentId", async () => {
    requireStaffMock.mockResolvedValue(staff);
    rpcMock.mockResolvedValue({
      data: { order_id: U(30), order_number: "PSP-2026-00001", receipt_number: "V1-000001", total: 90000, vat_total: 0, brugtmoms_total: 0 },
      error: null,
    });

    const res = await salePOST(req("/api/pos/sale", saleBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ orderId: U(30), receiptNumber: "V1-000001", total: 90000 });
    expect(json.receiptPdf).toBe(Buffer.from("PDF").toString("base64"));

    expect(rpcMock).toHaveBeenCalledTimes(1);
    const [fn, args] = rpcMock.mock.calls[0];
    expect(fn).toBe("pos_create_sale");
    expect(args).toMatchObject({
      p_location_id: U(20),
      p_register_id: U(21),
      p_staff_id: staff.id,
      p_discount_amount: 1000,
      p_discount_reason: "Tilbud",
    });
    expect(args.p_payments).toEqual([
      { type: "kontant", amount_oere: 50000, reference: null },
      { type: "kort_terminal", amount_oere: 40000, reference: null },
    ]);
    expect(args.p_items).toEqual([
      { type: "device", device_id: U(10) },
      { type: "sku_product", sku_product_id: U(11), quantity: 2 },
      { type: "free_text", description: "Diverse salg", unit_price_oere: 5000, quantity: 1 },
      { type: "deposit", repair_ticket_id: U(12), description: "Depositum", unit_price_oere: 20000 },
    ]);
    expect(JSON.stringify(args)).not.toContain("pi_should_be_ignored");
    // Only the read-only 3 for 2 price lookup touches a table directly.
    // Besides the register/location/original-order access lookups (return-entity.ts has its own tests), only the 3 for 2 price read is allowed.
    expect(fromMock.mock.calls.map((c) => c[0]).filter((t) => t !== "registers" && t !== "locations" && t !== "orders")).toEqual(["sku_products"]);
  });

  it("surfaces a database business error instead of swallowing it (stock / reservation lock)", async () => {
    requireStaffMock.mockResolvedValue(staff);
    rpcMock.mockResolvedValue({ data: null, error: { message: "pos:device_unavailable:PSP-2026-00042" } });
    const res = await salePOST(req("/api/pos/sale", saleBody));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe("device_unavailable");
    expect(json.error).toContain("PSP-2026-00042");

    rpcMock.mockResolvedValue({ data: null, error: { message: "pos:insufficient_stock:Cover" } });
    const stock = await salePOST(req("/api/pos/sale", saleBody));
    expect(stock.status).toBe(409);
    expect((await stock.json()).code).toBe("insufficient_stock");
  });

  it("reports unexpected database errors as 500 without leaking details", async () => {
    requireStaffMock.mockResolvedValue(staff);
    rpcMock.mockResolvedValue({ data: null, error: { message: "deadlock detected" } });
    const res = await salePOST(req("/api/pos/sale", saleBody));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("deadlock");
  });

  it("a failed receipt render does not fail the committed sale", async () => {
    requireStaffMock.mockResolvedValue(staff);
    const { renderReceiptPdf } = await import("@/lib/pos/receipt-data");
    vi.mocked(renderReceiptPdf).mockRejectedValueOnce(new Error("pdf boom"));
    rpcMock.mockResolvedValue({
      data: { order_id: U(30), order_number: "PSP-1", receipt_number: "V1-000002", total: 100, vat_total: 0, brugtmoms_total: 0 },
      error: null,
    });
    const res = await salePOST(req("/api/pos/sale", saleBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.receiptPdf).toBeNull();
    expect(json.warnings.join(" ")).toMatch(/Kvitteringen/);
  });
});

const returnBody = {
  originalOrderId: U(40),
  locationId: U(20),
  registerId: U(21),
  lines: [
    { orderItemId: U(41), quantity: 1, restock: true },
    { orderItemId: U(42), quantity: 0, restock: false },
  ],
  refunds: [{ type: "kontant", amountOere: 9000 }],
  reason: "Defekt",
};

describe("POST /api/pos/return", () => {
  it("requires staff and a valid body", async () => {
    requireStaffMock.mockResolvedValue(null);
    expect((await returnPOST(req("/api/pos/return", returnBody))).status).toBe(401);
    requireStaffMock.mockResolvedValue(staff);
    expect((await returnPOST(req("/api/pos/return", { ...returnBody, refunds: [] }))).status).toBe(400);
    expect((await returnPOST(req("/api/pos/return", { ...returnBody, reason: "" }))).status).toBe(400);
    expect((await returnPOST(req("/api/pos/return", { ...returnBody, refunds: [{ type: "gavekort", amountOere: 1 }] }))).status).toBe(400);
  });

  it("forbids staff without the lave_retur permission (intern)", async () => {
    requireStaffMock.mockResolvedValue({ ...staff, role: "intern" });
    const res = await returnPOST(req("/api/pos/return", returnBody));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Du har ikke tilladelse til at lave retur");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("creates a credit note through the RPC and never reads or updates the original order itself", async () => {
    requireStaffMock.mockResolvedValue(staff);
    rpcMock.mockResolvedValue({
      data: { order_id: U(50), order_number: "PSP-2026-00009", receipt_number: "V1-000003", total: -9000, refund_amount: 9000 },
      error: null,
    });
    const res = await returnPOST(req("/api/pos/return", returnBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ orderId: U(50), total: -9000, refundAmount: 9000, receiptNumber: "V1-000003" });

    const [fn, args] = rpcMock.mock.calls[0];
    expect(fn).toBe("pos_create_return");
    expect(args.p_original_order_id).toBe(U(40));
    // zero-quantity lines are dropped before the RPC
    expect(args.p_lines).toEqual([{ order_item_id: U(41), quantity: 1, restock: true }]);
    expect(args.p_refunds).toEqual([{ type: "kontant", amount_oere: 9000, reference: null }]);
    expect(args.p_reason).toBe("Defekt");
    // No direct table access: the original order is never updated from TypeScript.
    expect(fromMock.mock.calls.map((c) => c[0]).filter((t) => t !== "registers" && t !== "locations" && t !== "orders")).toEqual([]);
  });

  it("maps return business errors", async () => {
    requireStaffMock.mockResolvedValue(staff);
    rpcMock.mockResolvedValue({ data: null, error: { message: "pos:return_quantity_invalid:0" } });
    const res = await returnPOST(req("/api/pos/return", returnBody));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("return_quantity_invalid");

    rpcMock.mockResolvedValue({ data: null, error: { message: "pos:no_open_session" } });
    expect((await returnPOST(req("/api/pos/return", returnBody))).status).toBe(409);
  });
});

describe("store access: the server decides location and register", () => {
  const rpcOk = () =>
    rpcMock.mockResolvedValue({
      data: { order_id: U(50), order_number: "PSP-1", receipt_number: "V1-000001", total: 90000, vat_total: 0, brugtmoms_total: 0 },
      error: null,
    });

  it("a Vejle clerk cannot book a sale on the Slagelse register: 403 and no RPC", async () => {
    requireStaffMock.mockResolvedValue(vejleStaff);
    const res = await salePOST(req("/api/pos/sale", { ...saleBody, registerId: U(31) }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("store_forbidden");
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("ignores a client locationId and uses the register's own location", async () => {
    requireStaffMock.mockResolvedValue(vejleStaff);
    rpcOk();
    const res = await salePOST(req("/api/pos/sale", { ...saleBody, registerId: U(21), locationId: U(30) }));
    expect(res.status).toBe(200);
    expect(rpcMock.mock.calls[0][1]).toMatchObject({ p_location_id: U(20), p_register_id: U(21) });
  });

  it("works without a locationId in the body (the old field is optional)", async () => {
    requireStaffMock.mockResolvedValue(vejleStaff);
    rpcOk();
    const { locationId: _omit, ...noLocation } = saleBody;
    expect((await salePOST(req("/api/pos/sale", noLocation))).status).toBe(200);
    expect(rpcMock.mock.calls[0][1]).toMatchObject({ p_location_id: U(20) });
  });

  it("the acting clerk decides: logged in as Vejle, clerk from the cookie is Slagelse, a V1 sale is 403", async () => {
    posOverride.mockResolvedValue({ loggedIn: vejleStaff, actor: slagelseStaff });
    const res = await salePOST(req("/api/pos/sale", saleBody));
    expect(res.status).toBe(403);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("the acting clerk decides the other way: a Vejle clerk behind a Slagelse login may sell on V1", async () => {
    posOverride.mockResolvedValue({ loggedIn: slagelseStaff, actor: vejleStaff });
    rpcOk();
    expect((await salePOST(req("/api/pos/sale", saleBody))).status).toBe(200);
    expect(rpcMock.mock.calls[0][1]).toMatchObject({ p_staff_id: vejleStaff.id, p_location_id: U(20) });
  });

  it("the owner without a store can book on every register", async () => {
    requireStaffMock.mockResolvedValue(staff);
    rpcOk();
    expect((await salePOST(req("/api/pos/sale", { ...saleBody, registerId: U(21) }))).status).toBe(200);
    expect((await salePOST(req("/api/pos/sale", { ...saleBody, registerId: U(31) }))).status).toBe(200);
    expect(rpcMock.mock.calls[0][1]).toMatchObject({ p_location_id: U(20) });
    expect(rpcMock.mock.calls[1][1]).toMatchObject({ p_location_id: U(30) });
  });

  it("an unknown or inactive register is 404", async () => {
    requireStaffMock.mockResolvedValue(staff);
    expect((await salePOST(req("/api/pos/sale", { ...saleBody, registerId: U(99) }))).status).toBe(404);
    dbRows.registers[0].active = false;
    expect((await salePOST(req("/api/pos/sale", saleBody))).status).toBe(404);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns follow the same rule", async () => {
    requireStaffMock.mockResolvedValue({ ...vejleStaff, permissions: ["lave_retur"] });
    const res = await returnPOST(req("/api/pos/return", { ...returnBody, registerId: U(31) }));
    expect(res.status).toBe(403);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
