// @vitest-environment node
//
// Ekspedientskift med pinkode: /api/pos/operator og requirePosStaff.
// Supabase er en lille in-memory-fake over staff, staff_pins og locations, så
// den trinvise låsning prøves mod den rigtige compare-and-set-logik.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type Row = Record<string, unknown>;
const db = vi.hoisted(() => ({
  staff: [] as Row[],
  staff_pins: [] as Row[],
  locations: [] as Row[],
  /** Så mange kommende staff_pins-opdateringer "taber" kapløbet (0 rækker). */
  lostUpdates: 0,
  /** staff-opslag fejler (databasefejl). */
  staffLookupFails: false,
}));
const requireStaffMock = vi.hoisted(() => vi.fn());
const rpcMock = vi.hoisted(() => vi.fn());

function query(table: "staff" | "staff_pins" | "locations") {
  const filters: Array<(r: Row) => boolean> = [];
  let patch: Row | null = null;
  const run = () => {
    if (patch && table === "staff_pins" && db.lostUpdates > 0) {
      db.lostUpdates--;
      return [];
    }
    const rows = db[table].filter((r) => filters.every((f) => f(r)));
    if (patch) for (const r of rows) Object.assign(r, patch);
    return rows.map((r) => ({ ...r }));
  };
  const result = () =>
    table === "staff" && db.staffLookupFails
      ? { data: null, error: { message: "connection reset" } }
      : { data: run(), error: null };
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
    maybeSingle: async () => {
      const r = result();
      return r.error ? r : { data: r.data?.[0] ?? null, error: null };
    },
    then: (resolve: (v: unknown) => unknown) => resolve(result()),
  };
  return chain;
}

vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({ from: (t: "staff" | "staff_pins" | "locations") => query(t), rpc: rpcMock }),
}));
vi.mock("@/lib/auth/require-staff", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth/require-staff")>()),
  requireStaff: (...a: unknown[]) => requireStaffMock(...a),
}));
vi.mock("@/lib/warranty/generate", () => ({ generateWarrantiesForOrder: vi.fn() }));
vi.mock("@/lib/pos/receipt-data", () => ({ renderReceiptPdf: vi.fn() }));

import { DELETE, GET, POST } from "../operator/route";
import { POST as salePOST } from "../sale/route";
import { requirePosStaff } from "@/lib/pos/route-helpers";
import { hashPin } from "@/lib/auth/pin";
import { OPERATOR_COOKIE, signOperator } from "@/lib/auth/operator";
import { resetLocationCache } from "@/lib/auth/store-scope-server";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const LOC = U(100);
const OTHER_LOC = U(101);
const SECRET = "test-secret";
const staffIdentity = (id: string, role: string, name: string, location_id: string | null, slug: string | null) => ({
  id,
  role,
  name,
  email: null,
  location_id,
  location_slug: slug,
  permissions: [],
});
const loggedIn = staffIdentity(U(1), "manager", "Leder", LOC, "vejle");
const otherLogin = staffIdentity(U(7), "manager", "Leder 2", LOC, "vejle");
const slagelseLogin = staffIdentity(U(8), "manager", "Slagelse-leder", OTHER_LOC, "slagelse");
const ownerLogin = staffIdentity(U(3), "owner", "Ejer", null, null);

const pinRow = () => db.staff_pins.find((r) => r.staff_id === U(2))!;

function postReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/pos/operator", {
    method: "POST",
    body: JSON.stringify({ locationId: LOC, ...body }),
  });
}
const wrong = () => POST(postReq({ staffId: U(2), pin: "0000" }));
const right = () => POST(postReq({ staffId: U(2), pin: "1234" }));
const expireLock = () => {
  pinRow().locked_until = new Date(Date.now() - 1000).toISOString();
};
const cookieFor = (staffId: string, loggedInId = U(1), secret = SECRET) =>
  `${OPERATOR_COOKIE}=${signOperator(staffId, loggedInId, Date.now(), secret)}`;

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.OPERATOR_COOKIE_SECRET = SECRET;
  resetLocationCache();
  rpcMock.mockReset();
  requireStaffMock.mockReset();
  requireStaffMock.mockResolvedValue(loggedIn);
  db.lostUpdates = 0;
  db.staffLookupFails = false;
  db.staff = [
    { id: U(1), name: "Leder", role: "manager", email: null, location_id: LOC, is_active: true, permissions: [] },
    { id: U(2), name: "Mette", role: "employee", email: null, location_id: LOC, is_active: true, permissions: ["eksportere"] },
    { id: U(3), name: "Ejer", role: "owner", email: null, location_id: null, is_active: true, permissions: [] },
    { id: U(4), name: "Anden butik", role: "employee", email: null, location_id: OTHER_LOC, is_active: true, permissions: [] },
    { id: U(5), name: "Stoppet", role: "employee", email: null, location_id: LOC, is_active: false, permissions: [] },
    { id: U(6), name: "Praktikant", role: "intern", email: null, location_id: LOC, is_active: true, permissions: [] },
  ];
  db.locations = [
    { id: LOC, name: "Vejle", type: "store", slug: "vejle" },
    { id: OTHER_LOC, name: "Slagelse", type: "store", slug: "slagelse" },
  ];
  db.staff_pins = [
    { staff_id: U(2), pin_hash: hashPin("1234"), failed_attempts: 0, locked_until: null },
    { staff_id: U(4), pin_hash: hashPin("1234"), failed_attempts: 0, locked_until: null },
  ];
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/pos/operator", () => {
  it("sets an httpOnly strict cookie bound to the login and answers with the new operator", async () => {
    const res = await right();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ current: { id: U(2), name: "Mette" } });
    const cookie = res.cookies.get(OPERATOR_COOKIE);
    expect(cookie?.value.split(".").slice(0, 2)).toEqual([U(2), U(1)]);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe("strict");
    expect(cookie?.path).toBe("/");
    expect(cookie?.maxAge).toBe(12 * 60 * 60);
  });

  it("locks after the 5th wrong pin: four times 401, then 423 for 15 minutes, and the right pin is still 423", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await wrong();
      statuses.push(res.status);
      const body = await res.json();
      expect(body.error).toBe(res.status === 401 ? "Forkert pinkode" : "Pinkoden er låst i 15 minutter");
    }
    expect(statuses).toEqual([401, 401, 401, 401, 423]);
    const sixth = await right();
    expect(sixth.status).toBe(423);
    expect(await sixth.json()).toEqual({ error: "Pinkoden er låst i 15 minutter" });
    expect(sixth.cookies.get(OPERATOR_COOKIE)).toBeUndefined();
    const lockedUntil = Date.parse(String(pinRow().locked_until));
    expect(lockedUntil - Date.now()).toBeGreaterThan(14 * 60_000);
    expect(lockedUntil - Date.now()).toBeLessThanOrEqual(15 * 60_000);
    expect(console.warn).toHaveBeenCalledWith(
      "[pin] pinkode låst",
      expect.objectContaining({ staffId: U(2), location: LOC, failedAttempts: 5 }),
    );
  });

  it("escalates: after expiry 5 more wrong lock 30 minutes, after that 5 more lock until a new pin is set", async () => {
    for (let i = 0; i < 5; i++) await wrong();
    expireLock();

    const second: number[] = [];
    for (let i = 0; i < 5; i++) second.push((await wrong()).status);
    expect(second).toEqual([401, 401, 401, 401, 423]);
    expect(pinRow().failed_attempts).toBe(10);
    const lockedUntil = Date.parse(String(pinRow().locked_until));
    expect(lockedUntil - Date.now()).toBeGreaterThan(29 * 60_000);
    expect(lockedUntil - Date.now()).toBeLessThanOrEqual(30 * 60_000);
    const during = await right();
    expect(during.status).toBe(423);
    expect(await during.json()).toEqual({ error: "Pinkoden er låst i 30 minutter" });
    expireLock();

    const third: number[] = [];
    for (let i = 0; i < 4; i++) third.push((await wrong()).status);
    const fifteenth = await wrong();
    expect(third).toEqual([401, 401, 401, 401]);
    expect(fifteenth.status).toBe(423);
    expect(await fifteenth.json()).toEqual({ error: "Pinkoden er låst. Bed ejeren om at sætte en ny pinkode" });
    expect(pinRow().locked_until).toBe("infinity");

    const after = await right();
    expect(after.status).toBe(423);
    expect(await after.json()).toEqual({ error: "Pinkoden er låst. Bed ejeren om at sætte en ny pinkode" });
  });

  it("does not reset the counter when a lock expires, only on the right pin", async () => {
    for (let i = 0; i < 5; i++) await wrong();
    expireLock();
    expect((await wrong()).status).toBe(401);
    expect(pinRow().failed_attempts).toBe(6);
    expect((await right()).status).toBe(200);
    expect(pinRow().failed_attempts).toBe(0);
    expect(pinRow().locked_until).toBeNull();
  });

  it("treats a malformed locked_until as locked", async () => {
    pinRow().locked_until = "garbage";
    expect((await right()).status).toBe(423);
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

  it("refuses a staff member from another store with the same 401, even with the right pin, without counting", async () => {
    const res = await POST(postReq({ staffId: U(4), pin: "1234" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Forkert pinkode" });
    expect(res.cookies.get(OPERATOR_COOKIE)).toBeUndefined();
    expect(db.staff_pins.find((r) => r.staff_id === U(4))!.failed_attempts).toBe(0);
  });

  it("refuses a location the logged-in user may not use with the same 401, without counting", async () => {
    requireStaffMock.mockResolvedValue(slagelseLogin);
    const res = await right();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Forkert pinkode" });
    expect(pinRow().failed_attempts).toBe(0);
  });

  it("cannot be used to grief: 20 out-of-scope attempts leave the target's counter alone and the pin still works", async () => {
    db.staff_pins.push({ staff_id: U(3), pin_hash: hashPin("9999"), failed_attempts: 0, locked_until: null });
    const before = JSON.stringify(db.staff_pins);
    for (let i = 0; i < 10; i++) {
      // Vejle-leder mod en Slagelse-medarbejder (target uden for butikken) ...
      expect((await POST(postReq({ staffId: U(4), pin: "0000" }))).status).toBe(401);
    }
    requireStaffMock.mockResolvedValue(slagelseLogin);
    for (let i = 0; i < 10; i++) {
      // ... og Slagelse-leder mod ejeren i Vejle (butik uden adgang).
      expect((await POST(postReq({ staffId: U(3), pin: "0000" }))).status).toBe(401);
    }
    expect(JSON.stringify(db.staff_pins)).toBe(before);
    expect(console.warn).not.toHaveBeenCalled();

    requireStaffMock.mockResolvedValue(ownerLogin);
    expect((await POST(postReq({ staffId: U(3), pin: "9999" }))).status).toBe(200);
    expect((await POST(postReq({ staffId: U(4), pin: "1234", locationId: OTHER_LOC }))).status).toBe(200);
  });

  it("lets the owner switch in at any store, and an owner can be switched in anywhere", async () => {
    requireStaffMock.mockResolvedValue(ownerLogin);
    expect((await POST(postReq({ staffId: U(4), pin: "1234", locationId: OTHER_LOC }))).status).toBe(200);
    db.staff_pins.push({ staff_id: U(3), pin_hash: hashPin("9999"), failed_attempts: 0, locked_until: null });
    requireStaffMock.mockResolvedValue(loggedIn);
    expect((await POST(postReq({ staffId: U(3), pin: "9999" }))).status).toBe(200);
  });

  it("requires a locationId", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/pos/operator", {
        method: "POST",
        body: JSON.stringify({ staffId: U(2), pin: "1234" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("retries a lost conditional update and still counts the attempt", async () => {
    db.lostUpdates = 1;
    expect((await wrong()).status).toBe(401);
    expect(pinRow().failed_attempts).toBe(1);
  });

  it("refuses (401, no cookie) after 5 lost races, even with the right pin", async () => {
    db.lostUpdates = 5;
    const res = await right();
    expect(res.status).toBe(401);
    expect(res.cookies.get(OPERATOR_COOKIE)).toBeUndefined();
  });

  it("requires a logged-in staff member", async () => {
    requireStaffMock.mockResolvedValue(null);
    expect((await right()).status).toBe(401);
  });

  it("answers 500 when the cookie secret is not configured", async () => {
    delete process.env.OPERATOR_COOKIE_SECRET;
    const res = await right();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Pinkode-skift er ikke sat op" });
  });
});

describe("GET /api/pos/operator", () => {
  const get = (loc: string | null, cookie?: string) =>
    GET(
      new NextRequest(`http://localhost/api/pos/operator${loc === null ? "" : `?location_id=${loc}`}`, {
        headers: cookie ? { cookie } : undefined,
      }),
    );

  it("lists active staff of the location plus owners, with hasPin and never the hash", async () => {
    const res = await get(LOC);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.current).toEqual({ id: U(1), name: "Leder" });
    const staff = body.staff as Array<{ id: string; name: string; hasPin: boolean }>;
    expect(staff.map((s) => s.id).sort()).toEqual([U(1), U(2), U(3)].sort());
    expect(staff.find((s) => s.id === U(2))).toEqual({ id: U(2), name: "Mette", hasPin: true });
    expect(staff.find((s) => s.id === U(3))?.hasPin).toBe(false);
    expect(JSON.stringify(body)).not.toContain("scrypt");
  });

  it("refuses another store with 403", async () => {
    const res = await get(OTHER_LOC);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Du har ikke adgang til denne butik." });
    expect((await get(U(555))).status).toBe(403);
  });

  it("lets the owner see any store", async () => {
    requireStaffMock.mockResolvedValue(ownerLogin);
    const res = await get(OTHER_LOC);
    expect(res.status).toBe(200);
    expect(((await res.json()).staff as Array<{ id: string }>).map((s) => s.id).sort()).toEqual([U(3), U(4)].sort());
  });

  it("rejects a missing or invalid location_id", async () => {
    expect((await get(null)).status).toBe(400);
    expect((await get("x")).status).toBe(400);
  });

  it("shows the switched operator as current", async () => {
    expect((await (await get(LOC, cookieFor(U(2)))).json()).current).toEqual({ id: U(2), name: "Mette" });
  });

  it("requires a logged-in staff member", async () => {
    requireStaffMock.mockResolvedValue(null);
    expect((await get(LOC)).status).toBe(401);
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
  const withCookie = (staffId: string, loggedInId = U(1), secret = SECRET) =>
    new NextRequest("http://localhost/api/pos/sale", { headers: { cookie: cookieFor(staffId, loggedInId, secret) } });

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

  it("ignores a cookie issued under another login", async () => {
    requireStaffMock.mockResolvedValue(otherLogin);
    const res = await requirePosStaff(withCookie(U(2), U(1)));
    expect(res?.actor).toBe(otherLogin);
  });

  it("falls back to the logged-in user when the operator is no longer active", async () => {
    const res = await requirePosStaff(withCookie(U(5)));
    expect(res?.actor).toBe(res?.loggedIn);
  });

  it("falls back to the logged-in user for a cookie signed with another secret", async () => {
    const res = await requirePosStaff(withCookie(U(2), U(1), "other"));
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

  it("fails closed when the operator lookup errors: the sale route answers 500 and never calls the RPC", async () => {
    db.staffLookupFails = true;
    const res = await salePOST(
      new NextRequest("http://localhost/api/pos/sale", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { cookie: cookieFor(U(2)) },
      }),
    );
    expect(res.status).toBe(500);
    expect(rpcMock).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("[pos] operator lookup failed", expect.anything());
  });
});
