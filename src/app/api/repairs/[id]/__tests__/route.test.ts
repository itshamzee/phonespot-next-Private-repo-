// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

let mockStaff: Record<string, unknown> | null = null;
const updates: Record<string, unknown>[] = [];
const otherWrites: { table: string; op: string; row: Record<string, unknown> }[] = [];
let beforeRow: Record<string, unknown> | null = {
  customer_id: "c1", device_id: "d1", customer_name: "Anna", customer_phone: "12345678",
  customer_email: "", device_model: "iPhone 13", issue_description: "Skærm",
};
let updateResult: { data: unknown; error: unknown } = { data: { id: "t1" }, error: null };

vi.mock("@/lib/auth/require-staff", () => ({
  requireStaff: vi.fn(async () => mockStaff),
}));

vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: (table: string) => {
      if (table === "customers" || table === "customer_devices" || table === "activity_log") {
        return {
          update: (row: Record<string, unknown>) => {
            otherWrites.push({ table, op: "update", row });
            return { eq: async () => ({ error: null }) };
          },
          insert: async (row: Record<string, unknown>) => {
            otherWrites.push({ table, op: "insert", row });
            return { error: null };
          },
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { serial_number: "111" }, error: null }) }) }),
        };
      }
      if (table !== "repair_tickets") throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: beforeRow, error: null }) }) }),
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

// Ejeren: butiksafgrænsningen har sin egen testfil (src/app/api/admin/repairs/__tests__/scope.test.ts).
const STAFF = { id: "s1", role: "owner", name: "Test", email: "t@phonespot.dk", location_id: null, location_slug: null };

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
    otherWrites.length = 0;
    beforeRow = {
      customer_id: "c1", device_id: "d1", customer_name: "Anna", customer_phone: "12345678",
      customer_email: "", device_model: "iPhone 13", issue_description: "Skærm",
    };
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
      internal_notes: [],
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

  it("retter kundens telefon, kundekortet og skriver historik", async () => {
    mockStaff = STAFF;
    const res = await call({ customer_phone: "87654321", customer_name: "Anna", update_customer: true });
    expect(res.status).toBe(200);
    expect(updates[0].customer_phone).toBe("87654321");
    expect(otherWrites).toContainEqual({ table: "customers", op: "update", row: { name: "Anna", phone: "87654321" } });
    const log = otherWrites.find((w) => w.table === "activity_log");
    const details = log?.row.details as { changes: { field: string; from: string; to: string }[] };
    // Navnet var uændret, så kun telefonen står i historikken.
    expect(details.changes).toEqual([{ field: "customer_phone", label: "Telefon", from: "12345678", to: "87654321" }]);
    expect(log?.row.actor_id).toBe("s1");
  });

  it("lader kundekortet være, når personalet fravælger det", async () => {
    mockStaff = STAFF;
    await call({ customer_phone: "87654321", update_customer: false });
    expect(otherWrites.some((w) => w.table === "customers")).toBe(false);
  });

  it("gemmer IMEI på enheden", async () => {
    mockStaff = STAFF;
    const res = await call({ serial_number: "356789" });
    expect(res.status).toBe(200);
    expect(otherWrites).toContainEqual({ table: "customer_devices", op: "update", row: { serial_number: "356789" } });
  });

  it("giver 404 og retter intet, når sagen hører til en anden butik", async () => {
    mockStaff = STAFF;
    beforeRow = null;
    expect((await call({ customer_name: "Bo" })).status).toBe(404);
    expect(updates).toHaveLength(0);
  });
});
