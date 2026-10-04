// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const update = vi.fn();
let ticket: Record<string, unknown>;

vi.mock("resend", () => ({ Resend: class { emails = { send: async () => ({ error: null }) }; } }));
vi.mock("@/lib/gateway-api/client", () => ({ sendSms: async () => ({ success: true, messageId: "m" }) }));
vi.mock("@/lib/repairs/ticket-access", () => ({
  requireTicketAccess: async () => ({ ok: true, staff: { id: "staff-1", role: "staff" }, ticketStoreId: "vejle" }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => ({
    rpc: (...a: unknown[]) => rpc(...a),
    from: (table: string) =>
      table === "repair_tickets"
        ? {
            select: () => ({ eq: () => ({ single: async () => ({ data: ticket, error: null }) }) }),
            update: (v: unknown) => ({ eq: async () => (update(v), { error: null }) }),
          }
        : { insert: async () => ({ error: null }) },
  }),
}));

import { PATCH } from "../route";

const call = (status: string) =>
  PATCH(new Request("http://x/api/repairs/t1/status", { method: "PATCH", body: JSON.stringify({ status, skip_sms: true }) }), {
    params: Promise.resolve({ id: "t1" }),
  });

describe("status route: parts and passcode", () => {
  beforeEach(() => {
    rpc.mockReset();
    update.mockReset();
    ticket = { id: "t1", status: "i_gang", customer_name: "M", customer_email: "", customer_phone: "", device_type: "smartphone", device_model: "iPhone", store_id: "vejle" };
  });
  it("consumes parts when the case becomes faerdig", async () => {
    rpc.mockResolvedValue({ data: { consumed: 2, shortfall: 0 }, error: null });
    const res = await call("faerdig");
    expect(rpc).toHaveBeenCalledWith("repair_consume_parts", { p_ticket_id: "t1", p_staff_id: "staff-1" });
    expect((await res.json()).parts_consumed).toBe(2);
  });
  it("a failing consume keeps the status and warns", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const body = await (await call("faerdig")).json();
    expect(body.success).toBe(true);
    expect(body.warning).toMatch(/lager/);
  });
  it("does not touch stock for other statuses", async () => {
    await call("i_gang");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("clears the device passcode on afhentet", async () => {
    await call("afhentet");
    expect(update.mock.calls[0][0]).toMatchObject({ status: "afhentet", device_passcode: null });
  });
  it("refuses to change a cancelled case", async () => {
    ticket.status = "annulleret";
    expect((await call("i_gang")).status).toBe(409);
  });
});
