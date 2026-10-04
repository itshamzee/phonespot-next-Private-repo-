// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

const send = vi.fn();
const sendSms = vi.fn();
let ticket: Record<string, unknown>;

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: (...a: unknown[]) => send(...a) };
  },
}));
vi.mock("@/lib/gateway-api/client", () => ({ sendSms: (...a: unknown[]) => sendSms(...a) }));
// Butiksadgang er testet i src/app/api/admin/repairs/__tests__/scope.test.ts.
vi.mock("@/lib/repairs/ticket-access", () => ({
  requireTicketAccess: async () => ({ ok: true, staff: { id: "s1", role: "owner" }, ticketStoreId: "vejle" }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    rpc: async () => ({ data: { consumed: 0, shortfall: 0 }, error: null }),
    from: (table: string) => {
      if (table === "repair_tickets") {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: ticket, error: null }) }) }),
          update: () => ({ eq: async () => ({ error: null }) }),
        };
      }
      return { insert: async () => ({ error: null }) };
    },
  }),
}));

import { PATCH } from "../route";

function call(status: string, extra: Record<string, unknown> = {}) {
  return PATCH(
    new Request("http://localhost/api/repairs/t1/status", {
      method: "PATCH",
      body: JSON.stringify({ status, ...extra }),
    }),
    { params: Promise.resolve({ id: "t1" }) },
  );
}

describe("PATCH /api/repairs/[id]/status notifications", () => {
  beforeEach(() => {
    send.mockReset();
    sendSms.mockReset();
    ticket = {
      id: "t1",
      ticket_number: "PS-2026-0009",
      status: "i_gang",
      customer_name: "Mette",
      customer_email: "mette@example.com",
      customer_phone: "",
      device_type: "smartphone",
      device_model: "iPhone 13",
      store_id: "vejle",
    };
  });

  it("skips the email when the customer has none (walk-in)", async () => {
    ticket.customer_email = "";
    const res = await call("faerdig");
    expect(res.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
    expect((await res.json()).warning).toBeUndefined();
  });

  it("keeps the status change and returns a warning when Resend fails", async () => {
    send.mockRejectedValue(new Error("resend down"));
    const res = await call("faerdig");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.warning).toMatch(/e-mail/i);
  });

  it("signs with the ticket's store and includes the ticket number", async () => {
    send.mockResolvedValue({ error: null });
    await call("faerdig");
    const arg = send.mock.calls[0][0];
    expect(arg.text).toContain("PS-2026-0009");
    expect(arg.text).toContain("Vejle");
    expect(arg.text).not.toMatch(/faerdig|paa /);
  });

  it("sends the pickup SMS on faerdig by default", async () => {
    ticket.customer_phone = "20123456";
    sendSms.mockResolvedValue({ success: true, messageId: "m1" });
    await call("faerdig");
    expect(sendSms).toHaveBeenCalledTimes(1);
    expect(sendSms.mock.calls[0][1]).toContain("klar til afhentning");
  });

  it("skips the SMS when Meld klar is sent with skip_sms", async () => {
    ticket.customer_phone = "20123456";
    const res = await call("faerdig", { skip_sms: true });
    expect(res.status).toBe(200);
    expect(sendSms).not.toHaveBeenCalled();
  });

  it("afhentet (Faerdig og betalt) never sends an SMS", async () => {
    ticket.customer_phone = "20123456";
    await call("afhentet");
    expect(sendSms).not.toHaveBeenCalled();
  });
});
