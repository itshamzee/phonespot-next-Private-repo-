// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const logInsert = vi.fn();
const update = vi.fn();
let ticket: Record<string, unknown>;
let rest = 0;

vi.mock("resend", () => ({ Resend: class { emails = { send: async () => ({ error: null }) }; } }));
vi.mock("@/lib/gateway-api/client", () => ({ sendSms: async () => ({ success: true, messageId: "m" }) }));
vi.mock("@/lib/repairs/ticket-access", () => ({
  requireTicketAccess: async () => ({ ok: true, staff: { id: "s1", role: "staff" }, ticketStoreId: "vejle" }),
}));
vi.mock("@/lib/repairs/pickup-guard", async (orig) => ({
  ...(await orig<typeof import("@/lib/repairs/pickup-guard")>()),
  loadCaseRestOere: async () => rest,
}));
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    rpc: async () => ({ data: { consumed: 0, shortfall: 0 }, error: null }),
    from: (table: string) =>
      table === "repair_tickets"
        ? {
            select: () => ({ eq: () => ({ single: async () => ({ data: ticket, error: null }) }) }),
            update: (v: unknown) => ({ eq: async () => (update(v), { error: null }) }),
          }
        : { insert: async (row: unknown) => (logInsert(row), { error: null }) },
  }),
}));

import { PATCH } from "../route";

const call = (extra: Record<string, unknown> = {}) =>
  PATCH(new Request("http://localhost/api/repairs/t1/status", { method: "PATCH", body: JSON.stringify({ status: "afhentet", ...extra }) }), {
    params: Promise.resolve({ id: "t1" }),
  });

beforeEach(() => {
  logInsert.mockReset();
  update.mockReset();
  rest = 0;
  ticket = { id: "t1", status: "faerdig", paid: false, customer_name: "A", customer_email: "", customer_phone: "", device_type: "x", device_model: "y", store_id: "vejle" };
});

describe("afhentet med penge udestående", () => {
  it("rejects with 409 and the amount when unpaid and no reason is given", async () => {
    rest = 99_900;
    const res = await call();
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toMatchObject({ code: "unpaid_pickup", rest_oere: 99_900 });
    expect(body.error).toContain("999 kr.");
    expect(update).not.toHaveBeenCalled();
    expect(logInsert).not.toHaveBeenCalled();
  });
  it("rejects a blank reason", async () => {
    rest = 99_900;
    expect((await call({ unpaid_reason: "   " })).status).toBe(409);
  });
  it("accepts a reason and logs it on the status log", async () => {
    rest = 99_900;
    const res = await call({ unpaid_reason: "Faktura til erhverv" });
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalled();
    expect(logInsert.mock.calls[0][0].note).toBe("Afhentet uden betaling (999 kr. udestår): Faktura til erhverv");
  });
  it("does not block when rest is 0", async () => {
    rest = 0;
    expect((await call()).status).toBe(200);
  });
  it("does not block a paid case", async () => {
    ticket.paid = true;
    rest = 99_900;
    expect((await call()).status).toBe(200);
  });
});
