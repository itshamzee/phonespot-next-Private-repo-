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
const fromMock = vi.fn(() => {
  throw new Error("from() must not be used by sale/return");
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

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const staff = { id: U(1), role: "employee", name: "Test", email: "t@phonespot.dk" };

function req(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body) });
}

const saleBody = {
  items: [
    { type: "device", deviceId: U(10) },
    { type: "sku_product", skuProductId: U(11), quantity: 2 },
    { type: "free_text", description: "Diverse salg", unitPriceOere: 5000 },
    { type: "deposit", unitPriceOere: 20000 },
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
      { type: "deposit", description: "Depositum", unit_price_oere: 20000 },
    ]);
    expect(JSON.stringify(args)).not.toContain("pi_should_be_ignored");
    expect(fromMock).not.toHaveBeenCalled();
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
    expect(fromMock).not.toHaveBeenCalled();
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
