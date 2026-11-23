// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const rows: Record<string, Array<Record<string, unknown>>> = {};
let failTable: string | null = null;
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: (table: string) => {
      const eqs: Array<[string, unknown]> = [];
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = (k: string, v: unknown) => (eqs.push([k, v]), b);
      b.maybeSingle = async () =>
        failTable === table
          ? { data: null, error: { message: "boom" } }
          : { data: (rows[table] ?? []).find((r) => eqs.every(([k, v]) => r[k] === v)) ?? null, error: null };
      b.then = (resolve: (v: unknown) => unknown) =>
        resolve(failTable === table ? { data: null, error: { message: "boom" } } : { data: rows[table] ?? [], error: null });
      return b;
    },
  }),
}));

import { assertLocationAccess, assertOwnerForAllStores, assertSessionAccess, resolveRegister } from "../pos-context";
import { PosError } from "../errors";
import type { StaffIdentity } from "@/lib/auth/require-staff";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const person = (over: Partial<StaffIdentity>): StaffIdentity => ({
  id: U(1), role: "employee", name: "T", email: null, location_id: null, location_slug: null, permissions: [], ...over,
});
const vejle = person({ location_id: U(20), location_slug: "vejle" });
const owner = person({ role: "owner" });

beforeEach(() => {
  failTable = null;
  rows.locations = [
    { id: U(20), name: "Vejle", slug: "vejle", type: "store" },
    { id: U(30), name: "Slagelse", slug: "slagelse", type: "store" },
    { id: U(40), name: "Webshop", slug: "webshop", type: "online" },
  ];
  rows.registers = [
    { id: U(21), location_id: U(20), active: true },
    { id: U(31), location_id: U(30), active: true },
    { id: U(22), location_id: U(20), active: false },
  ];
  rows.cash_sessions = [{ id: U(61), register_id: U(31) }];
});

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return null;
  } catch (e) {
    return e instanceof PosError ? [e.code, e.status] : String(e);
  }
};

describe("resolveRegister", () => {
  it("returns the register's own location and slug", async () => {
    expect(await resolveRegister(vejle, U(21))).toEqual({ registerId: U(21), locationId: U(20), locationSlug: "vejle" });
  });

  it("403 store_forbidden for another store, with the Danish message", async () => {
    await expect(resolveRegister(vejle, U(31))).rejects.toMatchObject({
      code: "store_forbidden",
      status: 403,
      message: "Du har ikke adgang til denne butik.",
    });
  });

  it("404 register_not_found for unknown and inactive registers", async () => {
    expect(await code(resolveRegister(owner, U(99)))).toEqual(["register_not_found", 404]);
    expect(await code(resolveRegister(owner, U(22)))).toEqual(["register_not_found", 404]);
  });

  it("the owner may use every register, also without a store", async () => {
    expect((await resolveRegister(owner, U(31))).locationId).toBe(U(30));
  });

  it("a staff member without a store is refused (fail closed)", async () => {
    expect(await code(resolveRegister(person({}), U(21)))).toEqual(["store_forbidden", 403]);
  });

  it("a database error is not swallowed", async () => {
    failTable = "registers";
    await expect(resolveRegister(owner, U(21))).rejects.toThrow(/Failed to load register/);
  });
});

describe("assertLocationAccess", () => {
  it("returns the slug for an allowed location", async () => {
    expect(await assertLocationAccess(vejle, U(20))).toBe("vejle");
  });
  it("403 for another store and for an unknown location", async () => {
    expect(await code(assertLocationAccess(vejle, U(30)))).toEqual(["store_forbidden", 403]);
    expect(await code(assertLocationAccess(vejle, U(99)))).toEqual(["store_forbidden", 403]);
  });
  it("the owner may use any location", async () => {
    expect(await assertLocationAccess(owner, U(30))).toBe("slagelse");
  });
});

describe("assertSessionAccess and assertOwnerForAllStores", () => {
  it("follows the session's register", async () => {
    expect(await code(assertSessionAccess(vejle, U(61)))).toEqual(["store_forbidden", 403]);
    expect(await code(assertSessionAccess(owner, U(61)))).toBeNull();
    expect(await code(assertSessionAccess(owner, U(62)))).toEqual(["session_not_found", 404]);
  });
  it("only the owner passes the all-stores check", () => {
    expect(() => assertOwnerForAllStores(owner)).not.toThrow();
    expect(() => assertOwnerForAllStores(vejle)).toThrow(PosError);
  });
});
