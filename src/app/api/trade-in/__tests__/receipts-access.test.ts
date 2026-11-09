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
let seq = 100;

function builder(table: string) {
  const filters: Array<(r: Record<string, unknown>) => boolean> = [];
  let mode: "select" | "update" | "delete" = "select";
  let patch: Record<string, unknown> = {};
  let max = Infinity;
  const matching = () => (rows[table] ?? []).filter((r) => filters.every((f) => f(r))).slice(0, max);
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.order = () => b;
  b.limit = (n: number) => ((max = n), b);
  b.eq = (k: string, v: unknown) => (filters.push((r) => r[k] === v), b);
  b.in = (k: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[k])), b);
  b.insert = (row: Record<string, unknown> | Array<Record<string, unknown>>) => {
    for (const r of Array.isArray(row) ? row : [row]) {
      const full = { id: U(seq++), status: "draft", created_at: "2026-11-09T10:00:00Z", ...r };
      inserted.push({ table, row: full });
      (rows[table] ??= []).push(full);
    }
    const last = rows[table][rows[table].length - 1];
    filters.push((r) => r === last);
    return b;
  };
  b.update = (p: Record<string, unknown>) => ((mode = "update"), (patch = p), b);
  b.delete = () => ((mode = "delete"), b);
  const result = () => {
    const m = matching();
    if (mode === "update") m.forEach((r) => Object.assign(r, patch));
    if (mode === "delete") rows[table] = (rows[table] ?? []).filter((r) => !m.includes(r));
    return { data: m, error: null };
  };
  b.maybeSingle = async () => ({ data: matching()[0] ?? null, error: null });
  b.single = async () => {
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
  rows.locations = [
    { id: U(20), name: "Vejle", slug: "vejle", type: "store" },
    { id: U(30), name: "Slagelse", slug: "slagelse", type: "store" },
  ];
  rows.trade_in_receipt_items = [];
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
      },
    ]);
  });

  it("?inquiry_ids= returns status rows and rejects more than 200 ids", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    rows.trade_in_receipts.push({ id: U(60), inquiry_id: U(70), status: "paid", total_amount: 1, created_at: "c", confirmed_at: "c", paid_at: "p", location_id: U(30) });
    const body = await (await GET(req(`/api/trade-in/receipts?inquiry_ids=${U(70)}`))).json();
    expect(body).toHaveLength(1);
    const many = Array.from({ length: 201 }, (_, i) => U(i + 1000)).join(",");
    expect((await GET(req(`/api/trade-in/receipts?inquiry_ids=${many}`))).status).toBe(400);
  });
});
