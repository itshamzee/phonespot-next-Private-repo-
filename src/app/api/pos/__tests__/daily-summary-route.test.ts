// @vitest-environment node
//
// Store access on GET /api/pos/daily-summary: real resolveRegister / assertLocationAccess,
// only the supabase rows are faked.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const requireStaffMock = vi.fn();
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: (...a: unknown[]) => requireStaffMock(...a) }));

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const rows: Record<string, Array<Record<string, unknown>>> = {};

function builder(table: string) {
  const eqs: Array<[string, unknown]> = [];
  const b: Record<string, unknown> = {};
  for (const m of ["select", "in", "gte", "lt", "is", "order", "limit"]) b[m] = () => b;
  b.eq = (k: string, v: unknown) => (eqs.push([k, v]), b);
  b.maybeSingle = async () => ({ data: (rows[table] ?? []).find((r) => eqs.every(([k, v]) => r[k] === v)) ?? null, error: null });
  b.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows[table] ?? [], error: null });
  return b;
}
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => ({ from: builder, rpc: vi.fn() }) }));

import { GET } from "../daily-summary/route";

const get = (qs: string) => GET(new NextRequest(`http://localhost/api/pos/daily-summary?${qs}`));
const base = { id: U(1), name: "T", email: null, permissions: [] };
const owner = { ...base, role: "owner", location_id: null, location_slug: null };
const vejle = { ...base, role: "employee", location_id: U(20), location_slug: "vejle" };

beforeEach(() => {
  requireStaffMock.mockReset();
  rows.locations = [
    { id: U(20), name: "Vejle", slug: "vejle", type: "store" },
    { id: U(30), name: "Slagelse", slug: "slagelse", type: "store" },
  ];
  rows.registers = [
    { id: U(21), name: "V1", location_id: U(20), active: true },
    { id: U(31), name: "S1", location_id: U(30), active: true },
  ];
  rows.orders = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("GET /api/pos/daily-summary store access", () => {
  it("a non-owner without location_id and register_id gets 403", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    const res = await get("date=2026-10-01");
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("store_forbidden");
  });

  it("a Vejle employee gets 403 for a Slagelse register and for the Slagelse location", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    expect((await get(`register_id=${U(31)}&date=2026-10-01`)).status).toBe(403);
    expect((await get(`location_id=${U(30)}&date=2026-10-01`)).status).toBe(403);
  });

  it("the owner without scope passes the guard (existing 400, not 403)", async () => {
    requireStaffMock.mockResolvedValue(owner);
    expect((await get("date=2026-10-01")).status).toBe(400);
  });

  it("Vejle staff with the Vejle location or register is not refused", async () => {
    requireStaffMock.mockResolvedValue(vejle);
    expect((await get(`location_id=${U(20)}&date=2026-10-01`)).status).toBe(200);
    expect((await get(`register_id=${U(21)}&date=2026-10-01`)).status).toBe(200);
  });
});
