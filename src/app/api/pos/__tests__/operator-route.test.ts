// @vitest-environment node
//
// Ekspedientskift med pinkode: /api/pos/operator og requirePosStaff.
// Supabase er en lille in-memory-fake over staff og staff_pins, så låsningen
// (fire gange 401, så 423) prøves mod den rigtige opdateringslogik.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type Row = Record<string, unknown>;
const db = vi.hoisted(() => ({ staff: [] as Row[], staff_pins: [] as Row[], locations: [] as Row[] }));
const requireStaffMock = vi.hoisted(() => vi.fn());

function query(table: keyof typeof db) {
  const filters: Array<(r: Row) => boolean> = [];
  let patch: Row | null = null;
  const run = () => {
    const rows = db[table].filter((r) => filters.every((f) => f(r)));
    if (patch) for (const r of rows) Object.assign(r, patch);
    return rows.map((r) => ({ ...r }));
  };
  const chain = {
    select: () => chain,
    update: (p: Row) => {
      patch = p;
      return chain;
    },
    eq: (c: string, v: unknown) => {
      filters.push((r) => r[c] === v);
      return chain;
    },
    in: (c: string, vs: unknown[]) => {
      filters.push((r) => vs.includes(r[c]));
      return chain;
    },
    neq: (c: string, v: unknown) => {
      filters.push((r) => r[c] !== v);
      return chain;
    },
    maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) => resolve({ data: run(), error: null }),
  };
  return chain;
}

vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({ from: (t: keyof typeof db) => query(t) }),
}));
vi.mock("@/lib/auth/require-staff", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth/require-staff")>()),
  requireStaff: (...a: unknown[]) => requireStaffMock(...a),
}));

import { DELETE, GET, POST } from "../operator/route";
import { requirePosStaff } from "@/lib/pos/route-helpers";
import { hashPin } from "@/lib/auth/pin";
import { OPERATOR_COOKIE, signOperator } from "@/lib/auth/operator";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const LOC = U(100);
const OTHER_LOC = U(101);
const loggedIn = {
  id: U(1),
  role: "manager",
  name: "Leder",
  email: "l@phonespot.dk",
  location_id: LOC,
  location_slug: "vejle",
  permissions: [],
};

function postReq(body: unknown) {
  return new NextRequest("http://localhost/api/pos/operator", { method: "POST", body: JSON.stringify(body) });
}

beforeEach(() => {
  process.env.OPERATOR_COOKIE_SECRET = "test-secret";
  requireStaffMock.mockReset();
  requireStaffMock.mockResolvedValue(loggedIn);
  db.staff = [
    { id: U(1), name: "Leder", role: "manager", email: null, location_id: LOC, is_active: true, permissions: [] },
    { id: U(2), name: "Mette", role: "employee", email: null, location_id: LOC, is_active: true, permissions: ["eksportere"] },
    { id: U(3), name: "Ejer", role: "owner", email: null, location_id: null, is_active: true, permissions: [] },
    { id: U(4), name: "Anden butik", role: "employee", email: null, location_id: OTHER_LOC, is_active: true, permissions: [] },
    { id: U(5), name: "Stoppet", role: "employee", email: null, location_id: LOC, is_active: false, permissions: [] },
    { id: U(6), name: "Praktikant", role: "intern", email: null, location_id: LOC, is_active: true, permissions: [] },
  ];
  db.locations = [{ id: LOC, name: "Vejle", type: "store", slug: "vejle" }];
  db.staff_pins = [{ staff_id: U(2), pin_hash: hashPin("1234"), failed_attempts: 0, locked_until: null }];
});

describe("POST /api/pos/operator", () => {
  it("sets an httpOnly strict cookie and answers with the new operator", async () => {
    const res = await POST(postReq({ staffId: U(2), pin: "1234" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ current: { id: U(2), name: "Mette" } });
    const cookie = res.cookies.get(OPERATOR_COOKIE);
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe("strict");
    expect(cookie?.path).toBe("/");
    expect(cookie?.maxAge).toBe(12 * 60 * 60);
  });

  it("locks after the 5th wrong pin: four times 401, then 423, and the right pin is still 423", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await POST(postReq({ staffId: U(2), pin: "0000" }));
      statuses.push(res.status);
      const body = await res.json();
      expect(body.error).toBe(res.status === 401 ? "Forkert pinkode" : "Pinkoden er låst i 15 minutter");
    }
    expect(statuses).toEqual([401, 401, 401, 401, 423]);
    const sixth = await POST(postReq({ staffId: U(2), pin: "1234" }));
    expect(sixth.status).toBe(423);
    expect(sixth.cookies.get(OPERATOR_COOKIE)).toBeUndefined();
    const lockedUntil = Date.parse(String(db.staff_pins[0].locked_until));
    expect(lockedUntil - Date.now()).toBeGreaterThan(14 * 60_000);
    expect(lockedUntil - Date.now()).toBeLessThanOrEqual(15 * 60_000);
  });

  it("resets the counter on the right pin", async () => {
    await POST(postReq({ staffId: U(2), pin: "0000" }));
    await POST(postReq({ staffId: U(2), pin: "0000" }));
    expect(db.staff_pins[0].failed_attempts).toBe(2);
    expect((await POST(postReq({ staffId: U(2), pin: "1234" }))).status).toBe(200);
    expect(db.staff_pins[0].failed_attempts).toBe(0);
  });

  it("gives a fresh 5 attempts once the lock has expired", async () => {
    db.staff_pins[0].failed_attempts = 5;
    db.staff_pins[0].locked_until = new Date(Date.now() - 1000).toISOString();
    const res = await POST(postReq({ staffId: U(2), pin: "0000" }));
    expect(res.status).toBe(401);
    expect(db.staff_pins[0].failed_attempts).toBe(1);
    expect(db.staff_pins[0].locked_until).toBeNull();
  });

  it("answers an unknown staffId, a staff member without pin, an inactive one and an intern exactly like a wrong pin", async () => {
    db.staff_pins.push({ staff_id: U(5), pin_hash: hashPin("1234"), failed_attempts: 0, locked_until: null });
    db.staff_pins.push({ staff_id: U(6), pin_hash: hashPin("1234"), failed_attempts: 0, locked_until: null });
    for (const staffId of [U(99), U(3), U(5), U(6), "not-a-uuid"]) {
      const res = await POST(postReq({ staffId, pin: "1234" }));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Forkert pinkode" });
    }
  });

  it("requires a logged-in staff member", async () => {
    requireStaffMock.mockResolvedValue(null);
    expect((await POST(postReq({ staffId: U(2), pin: "1234" }))).status).toBe(401);
  });

  it("answers 500 when the cookie secret is not configured", async () => {
    delete process.env.OPERATOR_COOKIE_SECRET;
    const res = await POST(postReq({ staffId: U(2), pin: "1234" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Pinkode-skift er ikke sat op" });
  });
});

describe("GET /api/pos/operator", () => {
  it("lists active staff of the location plus owners, with hasPin and never the hash", async () => {
    const res = await GET(new NextRequest(`http://localhost/api/pos/operator?location_id=${LOC}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.current).toEqual({ id: U(1), name: "Leder" });
    const staff = body.staff as Array<{ id: string; name: string; hasPin: boolean }>;
    expect(staff.map((s) => s.id).sort()).toEqual([U(1), U(2), U(3)].sort());
    expect(staff.find((s) => s.id === U(2))).toEqual({ id: U(2), name: "Mette", hasPin: true });
    expect(staff.find((s) => s.id === U(3))?.hasPin).toBe(false);
    expect(JSON.stringify(body)).not.toContain("scrypt");
  });

  it("rejects a missing or invalid location_id", async () => {
    expect((await GET(new NextRequest("http://localhost/api/pos/operator"))).status).toBe(400);
    expect((await GET(new NextRequest("http://localhost/api/pos/operator?location_id=x"))).status).toBe(400);
  });

  it("shows the switched operator as current", async () => {
    const cookie = `${OPERATOR_COOKIE}=${signOperator(U(2), Date.now(), "test-secret")}`;
    const res = await GET(
      new NextRequest(`http://localhost/api/pos/operator?location_id=${LOC}`, { headers: { cookie } }),
    );
    expect((await res.json()).current).toEqual({ id: U(2), name: "Mette" });
  });

  it("requires a logged-in staff member", async () => {
    requireStaffMock.mockResolvedValue(null);
    expect((await GET(new NextRequest(`http://localhost/api/pos/operator?location_id=${LOC}`))).status).toBe(401);
  });
});

describe("DELETE /api/pos/operator", () => {
  it("clears the cookie", async () => {
    const res = await DELETE();
    const cookie = res.cookies.get(OPERATOR_COOKIE);
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
  });
});

describe("requirePosStaff", () => {
  const withCookie = (staffId: string, secret = "test-secret") =>
    new NextRequest("http://localhost/api/pos/sale", {
      headers: { cookie: `${OPERATOR_COOKIE}=${signOperator(staffId, Date.now(), secret)}` },
    });

  it("returns null when nobody is logged in", async () => {
    requireStaffMock.mockResolvedValue(null);
    expect(await requirePosStaff(withCookie(U(2)))).toBeNull();
  });

  it("uses the operator from a valid cookie as actor", async () => {
    const res = await requirePosStaff(withCookie(U(2)));
    expect(res?.loggedIn).toBe(loggedIn);
    expect(res?.actor).toMatchObject({ id: U(2), name: "Mette", role: "employee", permissions: ["eksportere"] });
  });

  it("uses the logged-in user as actor without a cookie", async () => {
    const res = await requirePosStaff(new NextRequest("http://localhost/api/pos/sale"));
    expect(res?.actor).toBe(loggedIn);
  });

  it("falls back to the logged-in user when the operator is no longer active", async () => {
    const res = await requirePosStaff(withCookie(U(5)));
    expect(res?.actor).toBe(res?.loggedIn);
  });

  it("falls back to the logged-in user for a cookie signed with another secret", async () => {
    const res = await requirePosStaff(withCookie(U(2), "other"));
    expect(res?.actor).toBe(res?.loggedIn);
  });

  it("ignores the cookie when the secret is not configured", async () => {
    delete process.env.OPERATOR_COOKIE_SECRET;
    const res = await requirePosStaff(withCookie(U(2)));
    expect(res?.actor).toBe(res?.loggedIn);
  });

  it("never lets an intern act as operator", async () => {
    const res = await requirePosStaff(withCookie(U(6)));
    expect(res?.actor).toBe(res?.loggedIn);
  });
});
