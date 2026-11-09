// @vitest-environment node
//
// D2 Task 10: the till offsets a confirmed trade-in receipt ("opkoeb" payment line),
// sends the device identifier (IMEI or serial number) on each device line, and maps
// the new pos_create_sale errors to Danish messages. The checks themselves live in
// pos_create_sale (scripts/sql/d2-smoke-sale.sql); here we pin the TypeScript layer.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const requireStaffMock = vi.fn();
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: (...a: unknown[]) => requireStaffMock(...a) }));

const rpcMock = vi.fn();
const dbRows: Record<string, Array<Record<string, unknown>>> = {};
const fromMock = vi.fn((table: string) => {
  if (table === "registers" || table === "locations") {
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
  throw new Error(`from(${table}) must not be used by a device-only sale`);
});
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({ rpc: rpcMock, from: fromMock }),
}));
vi.mock("@/lib/warranty/generate", () => ({ generateWarrantiesForOrder: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/pos/receipt-data", () => ({ renderReceiptPdf: vi.fn().mockResolvedValue(Buffer.from("PDF")) }));

import { POST as salePOST } from "../sale/route";
import { saleBodySchema } from "@/lib/pos/schemas";
import { toRpcItems } from "@/lib/pos/create-sale";
import { toPosError } from "@/lib/pos/errors";
import { PAYMENT_LABELS, PAYMENT_TYPES, REFUND_TYPES } from "@/lib/pos/constants";
import { validatePayments } from "@/lib/pos/calc";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const staff = { id: U(1), role: "owner", name: "Test", email: "t@phonespot.dk", location_id: null, location_slug: null };

const req = (body: unknown) =>
  new NextRequest("http://localhost/api/pos/sale", { method: "POST", body: JSON.stringify(body) });

const body = {
  items: [{ type: "device", deviceId: U(10), imei: "3599 9900 0000 018" }],
  payments: [
    { type: "opkoeb", amountOere: 300000, reference: "SS-2026-0001" },
    { type: "kontant", amountOere: 200000 },
  ],
  registerId: U(21),
};

beforeEach(() => {
  requireStaffMock.mockReset();
  rpcMock.mockReset();
  dbRows.locations = [{ id: U(20), name: "Vejle", slug: "vejle", type: "store" }];
  dbRows.registers = [{ id: U(21), code: "V1", location_id: U(20), active: true }];
});

describe("opkoeb as a payment type", () => {
  it("is a payment type labelled 'Modregnet opkøb', but never a refund type", () => {
    expect(PAYMENT_TYPES).toContain("opkoeb");
    expect(PAYMENT_LABELS.opkoeb).toBe("Modregnet opkøb");
    expect(REFUND_TYPES as readonly string[]).not.toContain("opkoeb");
  });

  it("zod accepts opkoeb with a receipt number and rejects it without one", () => {
    expect(saleBodySchema.safeParse(body).success).toBe(true);
    const noRef = saleBodySchema.safeParse({ ...body, payments: [{ type: "opkoeb", amountOere: 500000 }] });
    expect(noRef.success).toBe(false);
    const blank = saleBodySchema.safeParse({ ...body, payments: [{ type: "opkoeb", amountOere: 500000, reference: "  " }] });
    expect(blank.success).toBe(false);
  });

  it("validatePayments asks for the receipt number", () => {
    const v = validatePayments([{ type: "opkoeb", amountOere: 100 }], 100);
    expect(v).toMatchObject({ ok: false, code: "payment_reference_required", message: "Angiv slutseddelnummeret" });
  });
});

describe("device identifier on the sale line", () => {
  it("normalises an IMEI or serial number and rejects an invalid one", () => {
    const parse = (imei: string) =>
      saleBodySchema.safeParse({ ...body, items: [{ type: "device", deviceId: U(10), imei }] });
    const ok = parse("3599 9900 0000 018");
    expect(ok.success && ok.data.items[0]).toMatchObject({ imei: "359999000000018" });
    const serial = parse("f2lxk0abcd12");
    expect(serial.success && serial.data.items[0]).toMatchObject({ imei: "F2LXK0ABCD12" });
    expect(parse("359999000000019").success).toBe(false); // wrong check digit
    expect(parse("ab").success).toBe(false);
    // No identifier at all is fine here (the database decides whether it is required).
    expect(saleBodySchema.safeParse({ ...body, items: [{ type: "device", deviceId: U(10) }] }).success).toBe(true);
  });

  it("passes the identifier to pos_create_sale only when there is one", () => {
    expect(
      toRpcItems([
        { type: "device", deviceId: U(10), imei: "359999000000018" },
        { type: "device", deviceId: U(11) },
      ]),
    ).toEqual([
      { type: "device", device_id: U(10), imei: "359999000000018" },
      { type: "device", device_id: U(11) },
    ]);
  });

  it("POST /api/pos/sale sends the opkoeb line with its reference and the device identifier", async () => {
    requireStaffMock.mockResolvedValue(staff);
    rpcMock.mockResolvedValue({
      data: { order_id: U(40), order_number: "V1-000009", receipt_number: "V1-000009", total: 500000, vat_total: 0, brugtmoms_total: 0 },
      error: null,
    });
    const res = await salePOST(req(body));
    expect(res.status).toBe(200);
    const [fn, args] = rpcMock.mock.calls[0];
    expect(fn).toBe("pos_create_sale");
    expect(args.p_items).toEqual([{ type: "device", device_id: U(10), imei: "359999000000018" }]);
    expect(args.p_payments).toEqual([
      { type: "opkoeb", amount_oere: 300000, reference: "SS-2026-0001" },
      { type: "kontant", amount_oere: 200000, reference: null },
    ]);
  });

  it("surfaces trade_in_not_settleable from the database as a 409 in Danish", async () => {
    requireStaffMock.mockResolvedValue(staff);
    rpcMock.mockResolvedValue({ data: null, error: { message: "pos:trade_in_not_settleable:SS-2026-0001" } });
    const res = await salePOST(req(body));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(
      "Slutseddel SS-2026-0001 kan ikke modregnes. Den skal være bekræftet i denne butik, have sit bilag og må ikke være modregnet, udbetalt eller spærret.",
    );
  });
});

describe("Danish messages for the new pos_create_sale errors", () => {
  const cases: Array<[string, number, string]> = [
    ["pos:device_blocked:PS-000123", 409, "Enheden PS-000123 er spærret og kan ikke sælges"],
    ["pos:imei_required:PS-000123", 400, "Skriv IMEI eller serienummer på enheden PS-000123"],
    ["pos:imei_mismatch:PS-000123", 409, "IMEI eller serienummer passer ikke med enheden PS-000123"],
    ["pos:imei_invalid:PS-000123", 400, "Ugyldigt IMEI eller serienummer på enheden PS-000123"],
    ["pos:trade_in_not_found:SS-2026-0099", 404, "Slutseddel SS-2026-0099 findes ikke"],
    [
      "pos:trade_in_not_settleable:SS-2026-0001",
      409,
      "Slutseddel SS-2026-0001 kan ikke modregnes. Den skal være bekræftet i denne butik, have sit bilag og må ikke være modregnet, udbetalt eller spærret.",
    ],
    ["pos:trade_in_amount_too_high:300000", 400, "Modregningen kan højst være slutsedlens total på 3.000,00 kr."],
    [
      "pos:trade_in_remainder_no_account:SS-2026-0001",
      409,
      "Opkøbet er større end købet, og slutsedlen mangler konto til restbeløbet. Lav en ny slutseddel med konto.",
    ],
  ];
  it.each(cases)("%s → %i %s", (raw, status, message) => {
    const e = toPosError({ message: raw });
    expect(e?.status).toBe(status);
    expect(e?.message).toBe(message);
  });
});
