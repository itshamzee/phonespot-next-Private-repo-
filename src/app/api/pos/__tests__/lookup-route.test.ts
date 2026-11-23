// @vitest-environment node
//
// /api/pos/lookup authenticates through the real requireStaff / requirePosStaff
// (Bearer token), so interns stay blocked. Only supabase is faked.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const rows: Record<string, Array<Record<string, unknown>>> = {};

function builder(table: string) {
  const eqs: Array<[string, unknown]> = [];
  const b: Record<string, unknown> = {};
  for (const m of ["select", "in", "neq", "or", "limit", "order"]) b[m] = () => b;
  b.eq = (k: string, v: unknown) => (eqs.push([k, v]), b);
  b.maybeSingle = async () => ({ data: (rows[table] ?? []).find((r) => eqs.every(([k, v]) => r[k] === v)) ?? null, error: null });
  b.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows[table] ?? [], error: null });
  return b;
}
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: builder,
    auth: { getUser: async () => ({ data: { user: { id: "auth-1" } }, error: null }) },
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createRequestAuthClient: () => null }));

import { GET } from "../lookup/route";

const get = (qs: string, bearer = true) =>
  GET(new NextRequest(`http://localhost/api/pos/lookup?${qs}`, { headers: bearer ? { authorization: "Bearer tok" } : {} }));

function loginAs(role: string, location_id: string | null) {
  rows.staff = [{ id: U(1), auth_id: "auth-1", role, name: "T", email: null, location_id, permissions: [], is_active: true }];
}

beforeEach(() => {
  delete process.env.OPERATOR_COOKIE_SECRET;
  rows.locations = [
    { id: U(20), name: "Vejle", slug: "vejle", type: "store" },
    { id: U(30), name: "Slagelse", slug: "slagelse", type: "store" },
  ];
  rows.devices = [];
  rows.sku_products = [];
  loginAs("employee", U(20));
});

describe("GET /api/pos/lookup", () => {
  it("rejects a request without login", async () => {
    expect((await get("q=iphone", false)).status).toBe(401);
  });

  it("still rejects an intern login", async () => {
    loginAs("intern", U(20));
    expect((await get(`q=iphone&location_id=${U(20)}`)).status).toBe(401);
  });

  it("403 for another store's location_id", async () => {
    const res = await get(`q=iphone&location_id=${U(30)}`);
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("store_forbidden");
  });

  it("passes for the own store and without location_id", async () => {
    const own = await get(`q=iphone&location_id=${U(20)}`);
    expect(own.status).toBe(200);
    expect(await own.json()).toEqual({ devices: [], skuProducts: [] });
    expect((await get("q=iphone")).status).toBe(200);
  });
});
