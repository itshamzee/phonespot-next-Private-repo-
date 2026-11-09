// @vitest-environment node
//
// Store access and locking on /api/trade-in/receipts: real assertLocationAccess
// and receipt-access, only the supabase rows are faked.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const requireStaffMock = vi.fn();
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: (...a: unknown[]) => requireStaffMock(...a) }));

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const rows: Record<string, Array<Record<string, unknown>>> = {};
const inserted: Array<{ table: string; row: Record<string, unknown> }> = [];
/** Next write to this table fails with this error (one shot). */
const failWrite: { table: string | null; error: { code: string; message: string } | null } = { table: null, error: null };
/** Every select(...) the routes issue, to assert which columns and how many queries. */
const selects: Array<{ table: string; cols: string }> = [];
let seq = 100;

function builder(table: string) {
  const filters: Array<(r: Record<string, unknown>) => boolean> = [];
  let mode: "select" | "update" | "delete" = "select";
  let patch: Record<string, unknown> = {};
  let max = Infinity;
  const matching = () => (rows[table] ?? []).filter((r) => filters.every((f) => f(r))).slice(0, max);
  const b: Record<string, unknown> = {};
  b.select = (cols?: string) => (selects.push({ table, cols: cols ?? "*" }), b);
  b.order = () => b;
  b.limit = (n: number) => ((max = n), b);
  b.eq = (k: string, v: unknown) => (filters.push((r) => r[k] === v), b);
  b.in = (k: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[k])), b);
  b.neq = (k: string, v: unknown) => (filters.push((r) => r[k] !== v), b);
  let failing: { code: string; message: string } | null = null;
  const takeFailure = () => {
    if (failWrite.table === table && failWrite.error) {
      failing = failWrite.error;
      failWrite.table = null;
      failWrite.error = null;
      return true;
    }
    return false;
  };
  b.insert = (row: Record<string, unknown> | Array<Record<string, unknown>>) => {
    if (takeFailure()) return b;
    for (const r of Array.isArray(row) ? row : [row]) {
      const full = { id: U(seq++), status: "draft", created_at: "2026-11-09T10:00:00Z", ...r };
      inserted.push({ table, row: full });
      (rows[table] ??= []).push(full);
    }
    const last = rows[table][rows[table].length - 1];
    filters.push((r) => r === last);
    return b;
  };
  b.update = (p: Record<string, unknown>) => (takeFailure(), (mode = "update"), (patch = p), b);
  b.delete = () => ((mode = "delete"), b);
  const result = () => {
    if (failing) return { data: null, error: failing };
    const m = matching();
    if (mode === "update") m.forEach((r) => Object.assign(r, patch));
    if (mode === "delete") rows[table] = (rows[table] ?? []).filter((r) => !m.includes(r));
    return { data: m, error: null };
  };
  b.maybeSingle = async () => ({ data: matching()[0] ?? null, error: null });
  b.single = async () => {
    if (failing) return { data: null, error: failing };
    const first = matching()[0];
    if (first && table === "trade_in_receipts") {
      return {
        data: { ...first, trade_in_receipt_items: (rows.trade_in_receipt_items ?? []).filter((i) => i.receipt_id === first.id) },
        error: null,
      };
    }
    return { data: first ?? null, error: null };
  };
  b.then = (resolve: (v: unknown) => unknown) => resolve(result());
  return b;
}
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => ({ from: builder }) }));

import { GET, POST } from "../receipts/route";
import { GET as GET_ONE, PATCH, DELETE } from "../receipts/[id]/route";

const base = { id: U(1), name: "T", email: null, permissions: [] };
const owner = { ...base, role: "owner", location_id: null, location_slug: null };
const vejle = { ...base, id: U(2), role: "employee", location_id: U(20), location_slug: "vejle" };

const req = (path: string, method = "GET", body?: unknown) =>
  new NextRequest(`http://localhost${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  requireStaffMock.mockReset();
  inserted.length = 0;
  selects.length = 0;
  failWrite.table = null;
  failWrite.error = null;
  // Henvendelser uden butik må alle linke; U(65)/U(66) hører til en butik.
  rows.contact_inquiries = [
    { id: U(60), store_id: null },
    { id: U(64), store_id: null },
    { id: U(65), store_id: "slagelse" },
    { id: U(66), store_id: "vejle" },
  ];
  rows.locations = [
    { id: U(20), name: "Vejle", slug: "vejle", type: "store" },
    { id: U(30), name: "Slagelse", slug: "slagelse", type: "store" },
  ];
  rows.trade_in_receipt_items = [];
  rows.staff = [
    { id: U(1), name: "Ejer Ejersen" },
    { id: U(2), name: "Vibeke Vejle" },
    { id: U(3), name: "Pia Pinkode" },
  ];
  rows.trade_in_receipts = [
    { id: U(50), receipt_number: "SS-2026-0001", status: "confirmed", location_id: U(30), seller_name: "A", id_number: "AB123456", seller_bank_account: "12345678", signed_scan_path: "x/y.pdf", invoice_file_path: null, total_amount: 5000, offset_amount: null, attestation: "paper_scan", seller_type: "private" },
    { id: U(51), receipt_number: "SS-2026-0002", status: "confirmed", location_id: U(20), seller_name: "B", id_number: "CD987654", seller_bank_account: "87654321", signed_scan_path: null, invoice_file_path: "i.pdf", total_amount: 7000, offset_amount: null, attestation: "paper_scan", seller_type: "private" },
    { id: U(52), receipt_number: null, status: "draft", location_id: U(20), seller_name: "C", id_number: "EF111222", seller_bank_account: "11112222", total_amount: 0 },
    { id: U(53), receipt_number: null, status: "draft", location_id: null, seller_name: "Legacy", total_amount: 0 },
  ];
});

describe("POST /api/trade-in/receipts", () => {
  it("403 when a Vejle employee posts a Slagelse location", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    const res = await POST(req("/api/trade-in/receipts", "POST", { location_id: U(30), seller_name: "X" }));
    expect(res.status).toBe(403);
    expect(inserted).toHaveLength(0);
  });

  it("400 for a CPR number as id_number", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    const res = await POST(req("/api/trade-in/receipts", "POST", { location_id: U(20), id_number: "010190-1234" }));
    expect(res.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  it("creates a draft: created_by is the actor, total is the item sum, no receipt_number, staff_initials ignored", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    const res = await POST(
      req("/api/trade-in/receipts", "POST", {
        location_id: U(20),
        seller_name: "Kunde",
        staff_initials: "XX",
        lock_checks_confirmed: true,
        items: [
          { brand: "Apple", model: "iPhone 13", price: 300000 },
          { brand: "Apple", model: "iPhone 12", price: 150000 },
        ],
      }),
    );
    expect(res.status).toBe(201);
    const receipt = inserted.find((i) => i.table === "trade_in_receipts")!.row;
    expect(receipt.created_by).toBe(U(2));
    expect(receipt.total_amount).toBe(450000);
    expect(receipt.lock_checks_by).toBe(U(2));
    expect(receipt.id_checked_by).toBeUndefined();
    expect("receipt_number" in receipt).toBe(false);
    expect("staff_initials" in receipt).toBe(false);
    expect(inserted.filter((i) => i.table === "trade_in_receipt_items")).toHaveLength(2);
  });
});

describe("attestation follows the accepted offer, never the client", () => {
  const INQ = U(60);
  beforeEach(() => {
    rows.trade_in_offers = [
      { id: U(61), inquiry_id: INQ, status: "accepted", offer_amount: 500000 },
      { id: U(62), inquiry_id: INQ, status: "sent", offer_amount: 500000 },
      { id: U(63), inquiry_id: U(64), status: "accepted", offer_amount: 500000 },
    ];
  });
  const created = () => inserted.find((i) => i.table === "trade_in_receipts")!.row;

  it("POST with the inquiry's accepted offer gives online_accept", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    const res = await POST(req("/api/trade-in/receipts", "POST", { location_id: U(20), inquiry_id: INQ, offer_id: U(61) }));
    expect(res.status).toBe(201);
    expect(created().attestation).toBe("online_accept");
  });

  it("POST with an offer that is not accepted, or belongs to another inquiry, gives paper_scan", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    await POST(req("/api/trade-in/receipts", "POST", { location_id: U(20), inquiry_id: INQ, offer_id: U(62) }));
    expect(created().attestation).toBe("paper_scan");
    inserted.length = 0;
    await POST(req("/api/trade-in/receipts", "POST", { location_id: U(20), inquiry_id: INQ, offer_id: U(63) }));
    expect(created().attestation).toBe("paper_scan");
  });

  it("a client-sent attestation is ignored", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    await POST(req("/api/trade-in/receipts", "POST", { location_id: U(20), attestation: "online_accept" }));
    expect(created().attestation).toBeUndefined();
  });

  it("PATCH that links the accepted offer sets online_accept, and unlinking sets paper_scan", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    await PATCH(req("/x", "PATCH", { inquiry_id: INQ, offer_id: U(61) }), ctx(U(52)));
    const row = () => rows.trade_in_receipts.find((r) => r.id === U(52))!;
    expect(row().attestation).toBe("online_accept");
    await PATCH(req("/x", "PATCH", { offer_id: null }), ctx(U(52)));
    expect(row().attestation).toBe("paper_scan");
  });
});

describe("linking an inquiry respects store access (ruling 30)", () => {
  const post = (inquiry: string) => POST(req("/api/trade-in/receipts", "POST", { location_id: U(20), inquiry_id: inquiry }));

  it("a Vejle employee cannot link a Slagelse inquiry: 404, nothing saved", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    const res = await post(U(65));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Henvendelsen findes ikke");
    expect(inserted).toHaveLength(0);
    const patch = await PATCH(req("/x", "PATCH", { inquiry_id: U(65) }), ctx(U(52)));
    expect(patch.status).toBe(404);
    expect(rows.trade_in_receipts.find((r) => r.id === U(52))!.inquiry_id).toBeUndefined();
  });

  it("an unknown inquiry is 404", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    expect((await post(U(99))).status).toBe(404);
  });

  it("own store and inquiries without a store are allowed", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    expect((await post(U(66))).status).toBe(201);
    expect((await post(U(60))).status).toBe(201);
    expect((await PATCH(req("/x", "PATCH", { inquiry_id: U(66) }), ctx(U(52)))).status).toBe(200);
  });

  it("the owner may link any store's inquiry", async () => {
    requireStaffMock.mockResolvedValue(owner);
    expect((await post(U(65))).status).toBe(201);
  });
});

describe("attestation rules (ruling 29)", () => {
  const INQ = U(60);
  const OFFER = U(61);
  beforeEach(() => {
    rows.trade_in_offers = [{ id: OFFER, inquiry_id: INQ, status: "accepted", offer_amount: 300000 }];
  });
  const created = () => inserted.find((i) => i.table === "trade_in_receipts")!.row;
  const post = (body: Record<string, unknown>) =>
    POST(req("/api/trade-in/receipts", "POST", { location_id: U(20), inquiry_id: INQ, offer_id: OFFER, ...body }));

  it("online_accept when the total is at most the accepted amount; paper_scan above it", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    await post({ items: [{ brand: "Apple", model: "iPhone", price: 300000 }] });
    expect(created().attestation).toBe("online_accept");
    inserted.length = 0;
    rows.trade_in_receipts = rows.trade_in_receipts.filter((r) => r.offer_id !== OFFER);
    await post({ items: [{ brand: "Apple", model: "iPhone", price: 300001 }] });
    expect(created().attestation).toBe("paper_scan");
  });

  it("paper_scan when another non-voided receipt already uses the offer; a voided one does not count", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    rows.trade_in_receipts.push({ id: U(80), status: "voided", location_id: U(20), offer_id: OFFER, inquiry_id: INQ });
    rows.trade_in_receipts.find((r) => r.id === U(52))!.inquiry_id = INQ;
    const row = () => rows.trade_in_receipts.find((r) => r.id === U(52))!;
    await PATCH(req("/x", "PATCH", { offer_id: OFFER }), ctx(U(52)));
    expect(row().attestation).toBe("online_accept");
    await PATCH(req("/x", "PATCH", { offer_id: null }), ctx(U(52)));
    expect(row().attestation).toBe("paper_scan");
    rows.trade_in_receipts.push({ id: U(81), status: "confirmed", location_id: U(20), offer_id: OFFER, inquiry_id: INQ });
    await PATCH(req("/x", "PATCH", { offer_id: OFFER }), ctx(U(52)));
    expect(row().attestation).toBe("paper_scan");
  });

  it("PATCH recomputes when the total changes, but an unrelated autosave leaves attestation alone", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    const row = () => rows.trade_in_receipts.find((r) => r.id === U(52))!;
    Object.assign(row(), { inquiry_id: INQ, offer_id: OFFER, attestation: "online_accept", total_amount: 300000 });
    rows.trade_in_offers = [];
    // Same offer, same total: not recomputed (the offer lookup would now fail).
    await PATCH(
      req("/x", "PATCH", { seller_name: "X", inquiry_id: INQ, offer_id: OFFER, items: [{ brand: "A", model: "B", price: 300000 }] }),
      ctx(U(52)),
    );
    expect(row().attestation).toBe("online_accept");
    rows.trade_in_offers = [{ id: OFFER, inquiry_id: INQ, status: "accepted", offer_amount: 300000 }];
    await PATCH(req("/x", "PATCH", { items: [{ brand: "A", model: "B", price: 350000 }] }), ctx(U(52)));
    expect(row().attestation).toBe("paper_scan");
  });

  it("maps the offer-once unique violation to 409 on POST and PATCH", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    const violation = { code: "23505", message: 'duplicate key value violates unique constraint "trade_in_receipts_offer_once"' };
    failWrite.table = "trade_in_receipts";
    failWrite.error = violation;
    const res = await post({});
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Tilbuddet er allerede brugt på en anden slutseddel");
    failWrite.table = "trade_in_receipts";
    failWrite.error = violation;
    const res2 = await PATCH(req("/x", "PATCH", { inquiry_id: INQ, offer_id: OFFER }), ctx(U(52)));
    expect(res2.status).toBe(409);
    expect((await res2.json()).error).toBe("Tilbuddet er allerede brugt på en anden slutseddel");
  });
});

describe("audit stamps", () => {
  const row = () => rows.trade_in_receipts.find((r) => r.id === U(52))!;

  it("MitID with a number stamps id_checked_by without an expiry", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    await PATCH(req("/x", "PATCH", { id_type: "mitid", id_number: "MIT123", id_expiry: null }), ctx(U(52)));
    expect(row().id_checked_by).toBe(U(2));
  });

  it("an autosave by another clerk that resends unchanged checks keeps the original stamps", async () => {
    const staffB = { ...vejle, id: U(4) };
    requireStaffMock.mockResolvedValue(vejle);
    const checks = { lock_checks_confirmed: true, id_type: "pas", id_number: "AB123", id_expiry: "2030-01-01" };
    await PATCH(req("/x", "PATCH", checks), ctx(U(52)));
    expect(row().lock_checks_by).toBe(U(2));
    expect(row().id_checked_by).toBe(U(2));
    requireStaffMock.mockResolvedValue(staffB);
    await PATCH(req("/x", "PATCH", { ...checks, seller_name: "Ny" }), ctx(U(52)));
    expect(row().lock_checks_by).toBe(U(2));
    expect(row().id_checked_by).toBe(U(2));
    // A real change is stamped by whoever made it.
    await PATCH(req("/x", "PATCH", { ...checks, id_number: "AB124" }), ctx(U(52)));
    expect(row().id_checked_by).toBe(U(4));
    expect(row().lock_checks_by).toBe(U(2));
  });
});

describe("GET /api/trade-in/receipts/[id]", () => {
  it("404 when a Vejle employee reads a Slagelse receipt", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    expect((await GET_ONE(req("/x"), ctx(U(50)))).status).toBe(404);
  });

  it("404 for legacy drafts without location unless owner", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    expect((await GET_ONE(req("/x"), ctx(U(53)))).status).toBe(404);
    requireStaffMock.mockResolvedValue(owner);
    expect((await GET_ONE(req("/x"), ctx(U(53)))).status).toBe(200);
  });

  it("owner gets 200 and a locked receipt has masked id_number, masked account and no file paths", async () => {
    requireStaffMock.mockResolvedValue(owner);
    const res = await GET_ONE(req("/x"), ctx(U(50)));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id_number).toBe("••••3456");
    expect(body.seller_bank_account).toBe("••••5678");
    expect(body.has_signed_scan).toBe(true);
    expect(JSON.stringify(body)).not.toContain("x/y.pdf");
  });

  it("a draft shows id_number and account in full", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    const body = await (await GET_ONE(req("/x"), ctx(U(52)))).json();
    expect(body.id_number).toBe("EF111222");
    expect(body.seller_bank_account).toBe("11112222");
  });
});

describe("PATCH / DELETE", () => {
  it("PATCH on a confirmed receipt gives 409", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    const res = await PATCH(req("/x", "PATCH", { seller_name: "Z" }), ctx(U(51)));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Slutsedlen er bekræftet og kan ikke rettes");
  });

  it("DELETE on a confirmed receipt gives 409 and leaves it", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    expect((await DELETE(req("/x", "DELETE"), ctx(U(51)))).status).toBe(409);
    expect(rows.trade_in_receipts.some((r) => r.id === U(51))).toBe(true);
  });

  it("PATCH on another store's draft gives 404", async () => {
    rows.trade_in_receipts.push({ id: U(54), status: "draft", location_id: U(30), seller_name: "S" });
    requireStaffMock.mockResolvedValue(vejle);
    expect((await PATCH(req("/x", "PATCH", { seller_name: "Z" }), ctx(U(54)))).status).toBe(404);
  });

  it("PATCH on a draft updates fields, replaces items and recomputes the total", async () => {
    rows.trade_in_receipt_items = [{ id: U(90), receipt_id: U(52), brand: "Old", model: "Old", price: 1 }];
    requireStaffMock.mockResolvedValue(vejle);
    const res = await PATCH(
      req("/x", "PATCH", { seller_name: "Ny", items: [{ brand: "Apple", model: "iPhone", price: 4200 }] }),
      ctx(U(52)),
    );
    expect(res.status).toBe(200);
    const row = rows.trade_in_receipts.find((r) => r.id === U(52))!;
    expect(row.seller_name).toBe("Ny");
    expect(row.total_amount).toBe(4200);
    expect(rows.trade_in_receipt_items.map((i) => i.brand)).toEqual(["Apple"]);
  });

  it("DELETE removes a draft", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    expect((await DELETE(req("/x", "DELETE"), ctx(U(52)))).status).toBe(200);
    expect(rows.trade_in_receipts.some((r) => r.id === U(52))).toBe(false);
  });
});

describe("GET /api/trade-in/receipts (names, suspicion, bank flag)", () => {
  it("the list returns suspected_at and staff names resolved in one staff query", async () => {
    requireStaffMock.mockResolvedValue(owner);
    Object.assign(rows.trade_in_receipts.find((r) => r.id === U(51))!, { suspected_at: "2026-11-09T11:00:00Z", created_by: U(2) });
    Object.assign(rows.trade_in_receipts.find((r) => r.id === U(50))!, { created_by: U(3) });
    const body = await (await GET(req("/api/trade-in/receipts"))).json();
    expect(selects.find((q) => q.table === "trade_in_receipts")!.cols).toContain("suspected_at");
    expect(selects.filter((q) => q.table === "staff")).toHaveLength(1);
    const byId = (id: string) => body.find((r: { id: string }) => r.id === id);
    expect(byId(U(51)).suspected_at).toBe("2026-11-09T11:00:00Z");
    expect(byId(U(50)).suspected_at ?? null).toBeNull();
    expect(byId(U(51)).created_by_name).toBe("Vibeke Vejle");
    expect(byId(U(50)).created_by_name).toBe("Pia Pinkode");
    expect(byId(U(52)).created_by_name).toBeNull();
  });

  it("the single GET returns created_by_name, confirmed_by_name and paid_by_name, and has_bank_account", async () => {
    requireStaffMock.mockResolvedValue(owner);
    Object.assign(rows.trade_in_receipts.find((r) => r.id === U(51))!, {
      status: "paid",
      created_by: U(2),
      confirmed_by: U(3),
      paid_by: U(1),
      seller_bank_reg: "1234",
      seller_bank_account: "87654321",
    });
    const body = await (await GET_ONE(req("/x"), ctx(U(51)))).json();
    expect(body.created_by_name).toBe("Vibeke Vejle");
    expect(body.confirmed_by_name).toBe("Pia Pinkode");
    expect(body.paid_by_name).toBe("Ejer Ejersen");
    expect(body.has_bank_account).toBe(true);
    expect(JSON.stringify(body)).not.toContain("87654321");
  });

  it("has_bank_account is false when the registration number is missing", async () => {
    requireStaffMock.mockResolvedValue(owner);
    const body = await (await GET_ONE(req("/x"), ctx(U(50)))).json();
    expect(body.has_bank_account).toBe(false);
  });
});

describe("GET /api/trade-in/receipts (lists)", () => {
  it("a Vejle employee's list has no Slagelse or legacy rows, no paths, no bank account", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    const body = await (await GET(req("/api/trade-in/receipts"))).json();
    expect(body.map((r: { id: string }) => r.id).sort()).toEqual([U(51), U(52)]);
    const text = JSON.stringify(body);
    expect(text).not.toContain("i.pdf");
    expect(text).not.toContain("seller_bank_account");
    expect(body.find((r: { id: string }) => r.id === U(51)).has_invoice).toBe(true);
  });

  it("asking for another store's list is 403; the owner sees everything", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    expect((await GET(req(`/api/trade-in/receipts?location_id=${U(30)}`))).status).toBe(403);
    requireStaffMock.mockResolvedValue(owner);
    expect((await (await GET(req("/api/trade-in/receipts"))).json()).length).toBe(4);
  });

  it("?number= returns at most one row, only within the actor's stores", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    expect(await (await GET(req("/api/trade-in/receipts?number=SS-2026-0001"))).json()).toEqual([]);
    const own = await (await GET(req("/api/trade-in/receipts?number=SS-2026-0002"))).json();
    expect(own).toEqual([
      {
        id: U(51),
        receipt_number: "SS-2026-0002",
        status: "confirmed",
        total_amount: 7000,
        offset_amount: null,
        location_id: U(20),
        attestation: "paper_scan",
        seller_type: "private",
        has_signed_scan: false,
        has_invoice: true,
        suspected: false,
      },
    ]);
  });

  it("?inquiry_ids= is store filtered: Vejle gets no Slagelse or legacy rows, the owner gets them", async () => {
    rows.trade_in_receipts.push(
      { id: U(60), inquiry_id: U(70), status: "paid", total_amount: 1, created_at: "c", confirmed_at: "c", paid_at: "p", location_id: U(30) },
      { id: U(61), inquiry_id: U(71), status: "paid", total_amount: 1, created_at: "c", confirmed_at: "c", paid_at: "p", location_id: U(20) },
      { id: U(62), inquiry_id: U(72), status: "draft", total_amount: 1, created_at: "c", confirmed_at: null, paid_at: null, location_id: null },
    );
    const q = `/api/trade-in/receipts?inquiry_ids=${U(70)},${U(71)},${U(72)}`;
    requireStaffMock.mockResolvedValue(vejle);
    expect((await (await GET(req(q))).json()).map((r: { inquiry_id: string }) => r.inquiry_id)).toEqual([U(71)]);
    requireStaffMock.mockResolvedValue(owner);
    expect((await (await GET(req(q))).json()).length).toBe(3);
  });

  it("?inquiry_ids= rejects more than 200 ids and malformed ids", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    const many = Array.from({ length: 201 }, (_, i) => U(i + 1000)).join(",");
    expect((await GET(req(`/api/trade-in/receipts?inquiry_ids=${many}`))).status).toBe(400);
    expect((await GET(req("/api/trade-in/receipts?inquiry_ids=abc"))).status).toBe(400);
    expect((await GET(req("/api/trade-in/receipts?inquiry_id=abc"))).status).toBe(400);
  });

  it("?inquiry_id= is store filtered and masks locked receipts", async () => {
    rows.trade_in_receipts.push(
      { id: U(60), inquiry_id: U(70), status: "paid", location_id: U(30), id_number: "AB123456" },
      { id: U(61), inquiry_id: U(70), status: "paid", location_id: U(20), id_number: "CD987654" },
    );
    requireStaffMock.mockResolvedValue(vejle);
    const mine = await (await GET(req(`/api/trade-in/receipts?inquiry_id=${U(70)}`))).json();
    expect(mine.map((r: { id: string }) => r.id)).toEqual([U(61)]);
    expect(mine[0].id_number).toBe("••••7654");
    requireStaffMock.mockResolvedValue(owner);
    expect((await (await GET(req(`/api/trade-in/receipts?inquiry_id=${U(70)}`))).json()).length).toBe(2);
  });

  it("the list's status filter narrows to that status; an unknown status is 400", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    const drafts = await (await GET(req("/api/trade-in/receipts?status=draft"))).json();
    expect(drafts.map((r: { id: string }) => r.id)).toEqual([U(52)]);
    expect((await GET(req("/api/trade-in/receipts?status=bogus"))).status).toBe(400);
  });
});
