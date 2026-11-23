// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
const m = vi.hoisted(() => ({
  staff: null as { id: string; email: string | null; location_id: string | null } | null,
  verifyPassword: vi.fn(),
  pins: [] as Row[],
  upserts: [] as Array<{ row: Row; opts: unknown }>,
  upsertError: null as { message: string } | null,
}));

vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: async () => m.staff }));
vi.mock("@/lib/auth/store-scope-server", () => ({
  requireStaffScope: async () => null,
  unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
}));
vi.mock("@/lib/auth/verify-password", () => ({
  verifyStaffPassword: (...a: unknown[]) => m.verifyPassword(...a),
}));
vi.mock("@/lib/legal-entity-server", () => ({ legalEntityForLocation: async () => null }));
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: (table: string) => {
      if (table !== "staff_pins") throw new Error(`unexpected table ${table}`);
      const filters: Array<(r: Row) => boolean> = [];
      let patch: Row | null = null;
      const run = () => {
        const rows = m.pins.filter((r) => filters.every((f) => f(r)));
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
        maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
        then: (resolve: (v: unknown) => unknown) => resolve({ data: run(), error: null }),
        upsert: async (row: Row, opts: unknown) => {
          m.upserts.push({ row, opts });
          if (m.upsertError) return { error: m.upsertError };
          m.pins = m.pins.filter((r) => r.staff_id !== row.staff_id).concat([{ ...row }]);
          return { error: null };
        },
      };
      return chain;
    },
  }),
}));

import { PATCH } from "../route";
import { hashPin, verifyPin } from "@/lib/auth/pin";

const patch = (body: unknown) =>
  PATCH(new Request("http://localhost/api/admin/me", { method: "PATCH", body: JSON.stringify(body) }));
const existingPin = (pin = "1111", extra: Row = {}) => {
  m.pins = [{ staff_id: "s1", pin_hash: hashPin(pin), failed_attempts: 0, locked_until: null, ...extra }];
};

beforeEach(() => {
  vi.restoreAllMocks();
  m.staff = { id: "s1", email: "m@phonespot.dk", location_id: "L1" };
  m.verifyPassword.mockReset().mockResolvedValue(false);
  m.pins = [];
  m.upserts = [];
  m.upsertError = null;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PATCH /api/admin/me (egen pinkode)", () => {
  it("sets a first pin without currentPin", async () => {
    const res = await patch({ pin: "4821" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(m.upserts).toHaveLength(1);
    const { row, opts } = m.upserts[0];
    expect(opts).toEqual({ onConflict: "staff_id" });
    expect(row).toMatchObject({ staff_id: "s1", failed_attempts: 0, locked_until: null });
    expect(verifyPin("4821", row.pin_hash as string)).toBe(true);
  });

  it("changes an existing pin with the right currentPin and clears the counter", async () => {
    existingPin("1111", { failed_attempts: 3 });
    const res = await patch({ pin: "4821", currentPin: "1111" });
    expect(res.status).toBe(200);
    expect(verifyPin("4821", m.pins[0].pin_hash as string)).toBe(true);
    expect(m.pins[0].failed_attempts).toBe(0);
  });

  it("requires currentPin when a pin exists", async () => {
    existingPin();
    const res = await patch({ pin: "4821" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Skriv din nuværende pinkode" });
    expect(m.upserts).toHaveLength(0);
  });

  it("rejects a wrong currentPin with 401 and counts it as a failed attempt", async () => {
    existingPin();
    const res = await patch({ pin: "4821", currentPin: "2222" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Forkert nuværende pinkode" });
    expect(m.pins[0].failed_attempts).toBe(1);
    expect(m.upserts).toHaveLength(0);
    expect(verifyPin("1111", m.pins[0].pin_hash as string)).toBe(true);
  });

  it("locks on the 5th wrong currentPin with the same rules as the till, and stays locked for the right one", async () => {
    existingPin();
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await patch({ pin: "4821", currentPin: "2222" })).status);
    expect(statuses).toEqual([401, 401, 401, 401, 423]);
    const res = await patch({ pin: "4821", currentPin: "1111" });
    expect(res.status).toBe(423);
    expect(await res.json()).toEqual({ error: "Pinkoden er låst i 15 minutter" });
    expect(m.upserts).toHaveLength(0);
  });

  describe("locked pin: reset with the account password", () => {
    const lockedFor = (failed: number, lockedUntil: string) =>
      existingPin("1111", { failed_attempts: failed, locked_until: lockedUntil });
    const in15 = () => new Date(Date.now() + 15 * 60_000).toISOString();

    it("sets the new pin and unlocks with the right password, at every lock stage", async () => {
      m.verifyPassword.mockResolvedValue(true);
      for (const [failed, until] of [
        [5, in15()],
        [10, in15()],
        [15, "infinity"],
      ] as const) {
        lockedFor(failed, until);
        const res = await patch({ pin: "4821", password: "rigtig" });
        expect(res.status).toBe(200);
        expect(m.verifyPassword).toHaveBeenLastCalledWith("m@phonespot.dk", "rigtig");
        expect(m.pins[0]).toMatchObject({ failed_attempts: 0, locked_until: null });
        expect(verifyPin("4821", m.pins[0].pin_hash as string)).toBe(true);
      }
    });

    it("answers 401 on a wrong password without counting it on the pin", async () => {
      lockedFor(15, "infinity");
      const res = await patch({ pin: "4821", password: "forkert" });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Forkert adgangskode" });
      expect(m.pins[0]).toMatchObject({ failed_attempts: 15, locked_until: "infinity" });
      expect(m.upserts).toHaveLength(0);
    });

    it("answers 423 with currentPin only, even the right one", async () => {
      lockedFor(5, in15());
      const res = await patch({ pin: "4821", currentPin: "1111" });
      expect(res.status).toBe(423);
      expect(await res.json()).toEqual({ error: "Pinkoden er låst i 15 minutter" });
      expect(m.verifyPassword).not.toHaveBeenCalled();
      lockedFor(15, "infinity");
      expect(await (await patch({ pin: "4821", currentPin: "1111" })).json()).toEqual({
        error: "Pinkoden er låst. Bed ejeren om at sætte en ny pinkode",
      });
      expect(m.upserts).toHaveLength(0);
    });

    it("ignores password on an unlocked pin: currentPin is still required", async () => {
      existingPin();
      m.verifyPassword.mockResolvedValue(true);
      expect((await patch({ pin: "4821", password: "rigtig" })).status).toBe(400);
      expect(m.verifyPassword).not.toHaveBeenCalled();
      expect(m.upserts).toHaveLength(0);
    });
  });

  it("caps currentPin and password at 100 characters", async () => {
    existingPin();
    expect((await patch({ pin: "4821", currentPin: "1".repeat(101) })).status).toBe(400);
    expect((await patch({ pin: "4821", password: "x".repeat(101) })).status).toBe(400);
    expect(m.pins[0].failed_attempts).toBe(0);
  });

  it("rejects an invalid new pin without writing", async () => {
    for (const pin of ["123", "12a4", ""]) expect((await patch({ pin })).status).toBe(400);
    expect((await patch({})).status).toBe(400);
    expect(m.upserts).toHaveLength(0);
  });

  it("requires a logged-in staff member", async () => {
    m.staff = null;
    expect((await patch({ pin: "4821" })).status).toBe(401);
    expect(m.upserts).toHaveLength(0);
  });

  it("answers 500 when the database write fails", async () => {
    m.upsertError = { message: "boom" };
    expect((await patch({ pin: "4821" })).status).toBe(500);
  });
});
