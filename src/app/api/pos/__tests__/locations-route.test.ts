// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const requireStaffMock = vi.fn();
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: (...a: unknown[]) => requireStaffMock(...a) }));

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const rows: Record<string, Array<Record<string, unknown>>> = {};
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: (table: string) => {
      const filters: Array<(r: Record<string, unknown>) => boolean> = [];
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.order = () => b;
      b.eq = (k: string, v: unknown) => (filters.push((r) => r[k] === v), b);
      b.in = (k: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[k])), b);
      b.then = (resolve: (v: unknown) => unknown) =>
        resolve({ data: (rows[table] ?? []).filter((r) => filters.every((f) => f(r))), error: null });
      return b;
    },
  }),
}));

import { GET } from "../locations/route";

const get = () => GET(new NextRequest("http://localhost/api/pos/locations"));
const base = { id: U(1), name: "T", email: null, permissions: [] };

beforeEach(() => {
  requireStaffMock.mockReset();
  rows.locations = [
    { id: U(20), name: "Vejle", slug: "vejle", type: "store" },
    { id: U(30), name: "Slagelse", slug: "slagelse", type: "store" },
    { id: U(40), name: "Webshop", slug: "webshop", type: "online" },
  ];
  rows.registers = [
    { id: U(21), code: "V1", name: "Kasse 1", location_id: U(20), active: true },
    { id: U(31), code: "S1", name: "Kasse 1", location_id: U(30), active: true },
    { id: U(32), code: "S2", name: "Gammel", location_id: U(30), active: false },
  ];
});

describe("GET /api/pos/locations", () => {
  it("requires staff", async () => {
    requireStaffMock.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
  });

  it("gives an employee only their own store with its active registers", async () => {
    requireStaffMock.mockResolvedValue({ ...base, role: "employee", location_id: U(30), location_slug: "slagelse" });
    const json = await (await get()).json();
    expect(json).toEqual({
      locations: [{ id: U(30), slug: "slagelse", name: "Slagelse", registers: [{ id: U(31), code: "S1", name: "Kasse 1" }] }],
    });
  });

  it("gives the owner every store (type store only)", async () => {
    requireStaffMock.mockResolvedValue({ ...base, role: "owner", location_id: null, location_slug: null });
    const json = await (await get()).json();
    expect(json.locations.map((l: { slug: string }) => l.slug)).toEqual(["vejle", "slagelse"]);
  });

  it("gives staff without a store an empty list", async () => {
    requireStaffMock.mockResolvedValue({ ...base, role: "employee", location_id: null, location_slug: null });
    expect(await (await get()).json()).toEqual({ locations: [] });
  });
});
