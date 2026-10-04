import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const s = vi.hoisted(() => ({
  update: vi.fn(),
  confirm: vi.fn(),
  staff: vi.fn(),
  push: vi.fn(),
  rows: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/email/resend", () => ({ resend: { emails: { send: s.staff } } }));
vi.mock("@/lib/email/repair-confirmation", () => ({
  REPAIR_EMAIL_FROM: "PhoneSpot Reparation <noreply@phonespot.dk>",
  sendRepairConfirmation: s.confirm,
}));
vi.mock("@/lib/notifications/pushover", () => ({ sendPushover: s.push }));
vi.mock("@/lib/supabase/client", () => ({
  createServerClient: () => {
    const chain = {
      update: (v: unknown) => (s.update(v), chain),
      eq: () => chain,
      select: () => chain,
      in: () => chain,
      then: (resolve: (v: unknown) => unknown) => resolve({ data: s.rows, error: null }),
    };
    return { from: () => chain };
  },
}));

import { handleRepairPayment } from "../repair-payment";

const session = (over: Partial<Stripe.Checkout.Session> = {}) =>
  ({
    id: "cs_test_1",
    payment_status: "paid",
    amount_total: 89900,
    metadata: { type: "repair", repair_ticket_id: "11111111-2222-3333-4444-555555555555" },
    ...over,
  }) as unknown as Stripe.Checkout.Session;

describe("handleRepairPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    s.confirm.mockResolvedValue(true);
    s.staff.mockResolvedValue({ error: null });
    s.push.mockResolvedValue(true);
    s.rows = [{
      id: "11111111-2222-3333-4444-555555555555",
      customer_name: "Test Kunde",
      customer_email: "test@example.com",
      customer_phone: "12345678",
      device_type: "iPhone",
      device_model: "iPhone 15",
      store_id: "vejle",
      booking_details: { selected_services: [{ name: "Batteriskift", price_dkk: 899 }], total_price_dkk: 899 },
    }];
  });

  it("marks the ticket paid and sends the customer a paid confirmation", async () => {
    await handleRepairPayment(session());
    expect(s.update).toHaveBeenCalledWith(expect.objectContaining({ paid: true }));
    expect(s.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ paid: true, totalDkk: 899, storeId: "vejle", customerEmail: "test@example.com" }),
    );
    expect(s.staff).toHaveBeenCalledTimes(1);
  });

  it("sends nothing again when Stripe redelivers an already-paid ticket", async () => {
    s.rows = [];
    await handleRepairPayment(session());
    expect(s.confirm).not.toHaveBeenCalled();
    expect(s.staff).not.toHaveBeenCalled();
  });

  it("ignores sessions that are not paid", async () => {
    await handleRepairPayment(session({ payment_status: "unpaid" }));
    expect(s.update).not.toHaveBeenCalled();
  });

  it("multi-device: marks every linked ticket paid and sends one confirmation listing all devices", async () => {
    const mk = (id: string, model: string, idx: number, price: number) => ({
      id,
      customer_name: "Test Kunde",
      customer_email: "test@example.com",
      customer_phone: "12345678",
      device_type: "Apple",
      device_model: model,
      store_id: "vejle",
      booking_details: {
        selected_services: [{ name: "Skift", price_dkk: price }],
        total_price_dkk: price,
        booking_device_index: idx,
      },
    });
    s.rows = [mk("t2", "iPhone 14", 2, 700), mk("t1", "iPhone 15", 1, 900)];
    await handleRepairPayment(
      session({ amount_total: 160000, metadata: { type: "repair", repair_ticket_id: "t1", repair_ticket_ids: "t1,t2" } }),
    );
    expect(s.update).toHaveBeenCalledTimes(1);
    expect(s.confirm).toHaveBeenCalledTimes(1);
    expect(s.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: "t1",
        totalDkk: 1600,
        devices: [
          expect.objectContaining({ deviceLabel: "Apple iPhone 15" }),
          expect.objectContaining({ deviceLabel: "Apple iPhone 14" }),
        ],
      }),
    );
    expect(s.staff).toHaveBeenCalledTimes(1);
    expect(s.staff.mock.calls[0][0].text).toContain("iPhone 14");

    // Redelivery: nothing left to mark paid, so nothing is sent again.
    s.rows = [];
    s.confirm.mockClear();
    s.staff.mockClear();
    await handleRepairPayment(
      session({ metadata: { type: "repair", repair_ticket_id: "t1", repair_ticket_ids: "t1,t2" } }),
    );
    expect(s.confirm).not.toHaveBeenCalled();
    expect(s.staff).not.toHaveBeenCalled();
  });
});
