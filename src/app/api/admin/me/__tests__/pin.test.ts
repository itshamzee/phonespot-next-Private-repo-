// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  staff: null as { id: string } | null,
  upserts: [] as Array<{ table: string; row: Record<string, unknown>; opts: unknown }>,
  error: null as { message: string } | null,
}));

vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: async () => m.staff }));
vi.mock("@/lib/auth/store-scope-server", () => ({
  requireStaffScope: async () => null,
  unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
}));
vi.mock("@/lib/legal-entity-server", () => ({ legalEntityForLocation: async () => null }));
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: (table: string) => ({
      upsert: async (row: Record<string, unknown>, opts: unknown) => {
        m.upserts.push({ table, row, opts });
        return { error: m.error };
      },
    }),
  }),
}));

import { PATCH } from "../route";
import { verifyPin } from "@/lib/auth/pin";

const patch = (body: unknown) =>
  PATCH(new Request("http://localhost/api/admin/me", { method: "PATCH", body: JSON.stringify(body) }));

beforeEach(() => {
  m.staff = { id: "s1" };
  m.upserts = [];
  m.error = null;
});

describe("PATCH /api/admin/me (egen pinkode)", () => {
  it("hashes the pin into staff_pins and clears any lock", async () => {
    const res = await patch({ pin: "4821" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(m.upserts).toHaveLength(1);
    const { table, row, opts } = m.upserts[0];
    expect(table).toBe("staff_pins");
    expect(opts).toEqual({ onConflict: "staff_id" });
    expect(row).toMatchObject({ staff_id: "s1", failed_attempts: 0, locked_until: null });
    expect(verifyPin("4821", row.pin_hash as string)).toBe(true);
  });

  it("rejects an invalid pin without writing", async () => {
    for (const pin of ["123", "12a4", ""]) {
      const res = await patch({ pin });
      expect(res.status).toBe(400);
      expect(JSON.stringify(await res.json())).not.toContain(pin === "" ? "scrypt" : pin);
    }
    expect((await patch({})).status).toBe(400);
    expect(m.upserts).toHaveLength(0);
  });

  it("requires a logged-in staff member", async () => {
    m.staff = null;
    expect((await patch({ pin: "4821" })).status).toBe(401);
    expect(m.upserts).toHaveLength(0);
  });

  it("answers 500 when the database write fails", async () => {
    m.error = { message: "boom" };
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await patch({ pin: "4821" })).status).toBe(500);
  });
});
