// @vitest-environment node
//
// Route-level test: POST /api/platform/devices/quick-add writes real,
// sellable inventory rows, so it must be staff-gated. This exercises the
// auth wiring (401 with no row written vs 201 for staff) through the real
// handler, with Supabase and requireStaff mocked out.

import { describe, it, expect, beforeEach, vi } from "vitest";

const insertedDevices: Record<string, unknown>[] = [];
const insertedActivity: Record<string, unknown>[] = [];

let mockStaff: { id: string; role: string; name: string; email: string } | null = null;

vi.mock("@/lib/auth/require-staff", () => ({
  requireStaff: vi.fn(async () => mockStaff),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "devices") {
        return {
          insert: (row: Record<string, unknown>) => {
            insertedDevices.push(row);
            return {
              select: () => ({
                single: async () => ({
                  data: {
                    id: "device-1",
                    ...row,
                    template: { id: row.template_id, display_name: "iPhone 13 128GB" },
                    location: { id: row.location_id, name: "Vejle" },
                  },
                  error: null,
                }),
              }),
            };
          },
        };
      }
      if (table === "activity_log") {
        return {
          insert: (row: Record<string, unknown>) => {
            insertedActivity.push(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

import { POST } from "../route";

const VALID_BODY = {
  template_id: "11111111-1111-4111-8111-111111111111",
  grade: "A",
  purchase_price: 100000,
  selling_price: 200000,
  location_id: "22222222-2222-4222-8222-222222222222",
};

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/platform/devices/quick-add", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  insertedDevices.length = 0;
  insertedActivity.length = 0;
  mockStaff = null;
});

describe("POST /api/platform/devices/quick-add", () => {
  it("rejects an unauthenticated request with 401 and writes no device row", async () => {
    mockStaff = null;
    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(401);
    expect(insertedDevices).toHaveLength(0);
    expect(insertedActivity).toHaveLength(0);
  });

  it("creates the device for a logged-in staff request and logs the real actor", async () => {
    const staffId = "33333333-3333-4333-8333-333333333333";
    mockStaff = { id: staffId, role: "employee", name: "Test Staff", email: "staff@phonespot.dk" };
    const res = await POST(makeRequest(VALID_BODY, { authorization: "Bearer valid-token" }));

    expect(res.status).toBe(201);
    expect(insertedDevices).toHaveLength(1);
    expect(insertedDevices[0].template_id).toBe(VALID_BODY.template_id);

    // The activity log must record who actually created the device, not
    // the literal string "system" (which logActivity discards as invalid).
    expect(insertedActivity).toHaveLength(1);
    expect(insertedActivity[0].actor_id).toBe(staffId);
  });
});
