// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

let mockStaff: { id: string; role: string; name: string; email: string } | null = null;
const inserted: Record<string, unknown>[] = [];
const logged: Record<string, unknown>[] = [];

const ORIGINAL = {
  id: "aaaaaaaa-1111-2222-3333-444444444444",
  ticket_number: "PS-2026-0042" as string | null,
  customer_name: "Mette",
  customer_email: "",
  customer_phone: "12345678",
  customer_id: "c1",
  device_type: "smartphone",
  device_model: "Apple iPhone 13",
  device_id: "d1",
  service_type: "repair",
  store_id: "vejle",
  issue_description: "Skærmskift",
  status: "afhentet",
};
let original: typeof ORIGINAL | null = ORIGINAL;

vi.mock("@/lib/auth/require-staff", () => ({
  requireStaff: vi.fn(async () => mockStaff),
}));

vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    from: (table: string) => {
      if (table === "repair_tickets") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: original, error: null }) }) }),
          insert: (row: Record<string, unknown>) => {
            inserted.push(row);
            return {
              select: () => ({
                single: async () => ({ data: { id: "new-1", ticket_number: "PS-2026-0043" }, error: null }),
              }),
            };
          },
        };
      }
      if (table === "repair_status_log") {
        return {
          insert: async (row: Record<string, unknown>) => {
            logged.push(row);
            return { error: null };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

import { POST } from "../route";
import type { NextRequest } from "next/server";

const STAFF = { id: "s1", role: "admin", name: "T", email: "t@phonespot.dk" };

function call() {
  const req = new Request("http://localhost/api/repairs/x/reklamation", { method: "POST" }) as unknown as NextRequest;
  return POST(req, { params: Promise.resolve({ id: ORIGINAL.id }) });
}

describe("POST /api/repairs/[id]/reklamation", () => {
  beforeEach(() => {
    mockStaff = null;
    original = ORIGINAL;
    inserted.length = 0;
    logged.length = 0;
  });

  it("denies a caller who is not staff", async () => {
    const res = await call();
    expect(res.status).toBe(401);
    expect(inserted).toHaveLength(0);
  });

  it("creates a new ticket copying customer and device, linked to the original", async () => {
    mockStaff = STAFF;
    const res = await call();
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ ticketId: "new-1", ticketNumber: "PS-2026-0043" });

    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      customer_name: "Mette",
      customer_phone: "12345678",
      customer_id: "c1",
      device_model: "Apple iPhone 13",
      device_id: "d1",
      store_id: "vejle",
      status: "modtaget",
      parent_ticket_id: ORIGINAL.id,
      paid: false,
    });
    expect(inserted[0].issue_description).toBe("Reklamation på sag PS-2026-0042: Skærmskift");
    expect(logged[0]).toMatchObject({ ticket_id: "new-1", new_status: "modtaget" });
  });

  it("falls back to the short id when the original has no ticket number", async () => {
    mockStaff = STAFF;
    original = { ...ORIGINAL, ticket_number: null };
    await call();
    expect(inserted[0].issue_description).toBe("Reklamation på sag aaaaaaaa: Skærmskift");
  });

  it("returns 404 for an unknown ticket", async () => {
    mockStaff = STAFF;
    original = null;
    expect((await call()).status).toBe(404);
    expect(inserted).toHaveLength(0);
  });
});
