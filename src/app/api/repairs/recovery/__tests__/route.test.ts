import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeRecoverySupabase, type Row } from "@/lib/repair/__tests__/recovery-supabase";
import { newRecoveryToken, onlinePaymentFields } from "@/lib/repair/payment-recovery";

const m = vi.hoisted(() => ({
  client: null as unknown,
  send: vi.fn(),
  confirm: vi.fn(),
  retrieve: vi.fn(),
  expire: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => m.client }));
vi.mock("@/lib/email/resend", () => ({ resend: { emails: { send: m.send } } }));
vi.mock("@/lib/email/repair-confirmation", () => ({
  REPAIR_EMAIL_FROM: "PhoneSpot <noreply@x.dk>",
  sendRepairConfirmation: m.confirm,
}));
vi.mock("@/lib/email/staff-routing", () => ({ getStaffRecipients: () => ({ to: "staff@x.dk" }) }));
vi.mock("@/lib/stripe/client", () => ({
  stripe: { checkout: { sessions: { retrieve: m.retrieve, expire: m.expire } } },
}));

import { POST } from "../route";

const ID = "11111111-1111-4111-8111-111111111111";
const post = (body: unknown) =>
  POST(new Request("http://x/api/repairs/recovery", { method: "POST", body: JSON.stringify(body) }));

function setup(extra: Row = {}, details: Row = {}) {
  const { token, hash } = newRecoveryToken();
  const s = makeRecoverySupabase([
    {
      id: ID,
      ticket_number: "PS-1",
      customer_name: "Test",
      customer_email: "t@example.com",
      customer_phone: "12345678",
      device_type: "Apple",
      device_model: "iPhone 15",
      issue_description: "x",
      store_id: "vejle",
      status: "modtaget",
      paid: false,
      booking_details: {
        ...onlinePaymentFields(hash),
        selected_services: [{ name: "Skærmskift", price_dkk: 1000 }],
        total_price_dkk: 1000,
        checkout_session_id: "cs_test_1",
        ...details,
      },
      ...extra,
    },
  ]);
  m.client = s.client;
  return { token, state: s.state };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.send.mockResolvedValue({ error: null });
  m.confirm.mockResolvedValue(true);
  m.expire.mockResolvedValue({});
});

describe("POST /api/repairs/recovery", () => {
  it("pay_in_store converts the same ticket, logs it, expires the Stripe session and mails customer and staff", async () => {
    const { token, state } = setup();
    const res = await post({ ticket_id: ID, token, action: "pay_in_store" });
    expect(res.status).toBe(200);
    expect((state.tickets[0].booking_details as Row).payment_flow).toBe("butik");
    expect(state.tickets[0].paid).toBe(false);
    expect(state.logs).toHaveLength(1);
    expect(m.expire).toHaveBeenCalledWith("cs_test_1");
    expect(m.confirm).toHaveBeenCalledTimes(1);
    expect(m.confirm.mock.calls[0][0]).toMatchObject({ ticketId: ID, paid: false, totalDkk: 1000 });
    expect(m.send).toHaveBeenCalledTimes(1);
    expect(m.send.mock.calls[0][0].subject).toContain("betaler i butikken");
  });

  it("is idempotent: a second call neither mails nor logs again", async () => {
    const { token, state } = setup();
    await post({ ticket_id: ID, token, action: "pay_in_store" });
    const res = await post({ ticket_id: ID, token, action: "pay_in_store" });
    expect(res.status).toBe(200);
    expect(state.logs).toHaveLength(1);
    expect(m.confirm).toHaveBeenCalledTimes(1);
    expect(m.send).toHaveBeenCalledTimes(1);
  });

  it("rejects a guessed id without the token (404) and changes nothing", async () => {
    const { state } = setup();
    for (const token of [undefined, "", "gaettet-token-gaettet-token"]) {
      const res = await post({ ticket_id: ID, token, action: "pay_in_store" });
      expect(res.status).toBe(404);
    }
    expect((state.tickets[0].booking_details as Row).payment_flow).toBe("online");
    expect(m.send).not.toHaveBeenCalled();
  });

  it("refuses a ticket that is already paid (409) or archived (409)", async () => {
    const paid = setup({ paid: true });
    expect((await post({ ticket_id: ID, token: paid.token, action: "pay_in_store" })).status).toBe(409);
    const archived = setup({ status: "annulleret" });
    expect((await post({ ticket_id: ID, token: archived.token, action: "pay_in_store" })).status).toBe(409);
    expect(m.send).not.toHaveBeenCalled();
  });

  it("rejects unknown actions", async () => {
    const { token } = setup();
    expect((await post({ ticket_id: ID, token, action: "delete" })).status).toBe(400);
  });

  it("retry returns the open Stripe session url", async () => {
    const { token } = setup();
    m.retrieve.mockResolvedValue({ status: "open", url: "https://stripe.test/pay" });
    const res = await post({ ticket_id: ID, token, action: "retry" });
    expect(await res.json()).toEqual({ success: true, url: "https://stripe.test/pay" });
  });

  it("retry reports an expired session with 410", async () => {
    const { token } = setup();
    m.retrieve.mockResolvedValue({ status: "expired", url: null });
    expect((await post({ ticket_id: ID, token, action: "retry" })).status).toBe(410);
  });
});
