// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

let mockStaff: { id: string; role: string; name: string; email: string } | null = null;
const updates: Record<string, unknown>[] = [];
let updateResult: { data: unknown; error: unknown } = { data: { id: "t1" }, error: null };

vi.mock("@/lib/auth/require-staff", () => ({
  requireStaff: vi.fn(async () => mockStaff),
}));

vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: (table: string) => {
      if (table !== "repair_tickets") throw new Error(`Unexpected table: ${table}`);
      return {
        update: (row: Record<string, unknown>) => {
          updates.push(row);
          return {
            eq: () => ({
              select: () => ({ maybeSingle: async () => updateResult }),
            }),
          };
        },
      };
    },
  }),
}));

import { PATCH } from "../route";
import type { NextRequest } from "next/server";

const STAFF = { id: "s1", role: "admin", name: "Test", email: "t@phonespot.dk" };

function call(body: unknown) {
  const req = new Request("http://localhost/api/repairs/t1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
  return PATCH(req, { params: Promise.resolve({ id: "t1" }) });
}

describe("PATCH /api/repairs/[id]", () => {
  beforeEach(() => {
    mockStaff = null;
    updates.length = 0;
    updateResult = { data: { id: "t1" }, error: null };
  });

  it("denies a caller who is not staff and writes nothing", async () => {
    const res = await call({ is_urgent: true });
    expect(res.status).toBe(401);
    expect(updates).toHaveLength(0);
  });

  it("only writes whitelisted fields", async () => {
    mockStaff = STAFF;
    const res = await call({
      is_urgent: true,
      status: "afhentet",
      paid: true,
      customer_email: "x@y.dk",
      store_id: "Vejle",
    });
    expect(res.status).toBe(200);
    expect(Object.keys(updates[0]).sort()).toEqual(["is_urgent", "store_id", "updated_at"]);
    expect(updates[0].is_urgent).toBe(true);
    expect(updates[0].store_id).toBe("vejle");
  });

  it("sets and clears on_hold_reason", async () => {
    mockStaff = STAFF;
    await call({ on_hold_reason: "Venter på del" });
    await call({ on_hold_reason: null });
    expect(updates[0].on_hold_reason).toBe("Venter på del");
    expect(updates[1].on_hold_reason).toBeNull();
  });

  it("rejects wrong types and bodies without any whitelisted field", async () => {
    mockStaff = STAFF;
    expect((await call({ is_urgent: "ja" })).status).toBe(400);
    expect((await call({ status: "bero" })).status).toBe(400);
    expect(updates).toHaveLength(0);
  });

  it("returns 404 when the ticket does not exist", async () => {
    mockStaff = STAFF;
    updateResult = { data: null, error: null };
    expect((await call({ is_urgent: false })).status).toBe(404);
  });
});
