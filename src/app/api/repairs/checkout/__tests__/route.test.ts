import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeSupabase, type CatalogService } from "@/lib/repair/__tests__/test-supabase";

const m = vi.hoisted(() => ({
  client: null as unknown,
  send: vi.fn(),
  sessionCreate: vi.fn(),
  couponCreate: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: m.send };
  },
}));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => m.client }));
vi.mock("@/lib/email/staff-routing", () => ({ getStaffRecipients: () => ({ to: "staff@x.dk" }) }));
vi.mock("@/lib/stripe/client", () => ({
  stripe: {
    coupons: { create: m.couponCreate },
    checkout: { sessions: { create: m.sessionCreate } },
  },
}));

import { POST } from "../route";

const catalog: CatalogService[] = [
  { id: "a", name: "Skærmskift", price_dkk: 1000, active: true, repair_models: { name: "iPhone 15" } },
  { id: "b", name: "Batteriskift", price_dkk: 500, active: true, repair_models: { name: "iPhone 15" } },
  { id: "c", name: "Skærmskift", price_dkk: 800, active: true, repair_models: { name: "Galaxy S24" } },
  { id: "d", name: "Kamera", price_dkk: 300, active: true, repair_models: { name: "Pixel 8" } },
];

const base = {
  customer_name: "Test Kunde",
  customer_email: "t@example.com",
  customer_phone: "12345678",
  issue_description: "Defekt",
  preferred_date: "2026-10-10",
  store_id: "vejle",
  device_type: "Apple",
  device_model: "iPhone 15",
  service_type: "Skærmskift",
};
const svc = (id: string, price: number) => ({ id, name: "klient", price_dkk: price });
const post = (body: unknown) =>
  POST(new NextRequest("http://x/api/repairs/checkout", { method: "POST", body: JSON.stringify(body) }));

let state: ReturnType<typeof makeSupabase>["state"];
beforeEach(() => {
  vi.clearAllMocks();
  const s = makeSupabase(catalog);
  m.client = s.client;
  state = s.state;
  m.send.mockResolvedValue({ error: null });
  m.couponCreate.mockResolvedValue({ id: "coupon_1" });
  m.sessionCreate.mockResolvedValue({ url: "https://stripe.test/pay" });
});

describe("POST /api/repairs/checkout", () => {
  it("charges the catalog price even when the client sends 1 kr.", async () => {
    const res = await post({ ...base, selected_services: [svc("a", 1)], total_price_dkk: 1, discount_percent: 99 });
    expect(res.status).toBe(200);
    const args = m.sessionCreate.mock.calls[0][0];
    expect(args.line_items).toHaveLength(1);
    expect(args.line_items[0].price_data.unit_amount).toBe(100000);
    expect(args.discounts).toBeUndefined();
    expect(m.couponCreate).not.toHaveBeenCalled();
    expect(args.metadata.repair_ticket_id).toBe("ticket-1");
    expect((state.tickets[0].booking_details as Record<string, unknown>).total_price_dkk).toBe(1000);
  });

  it("applies the server-side discount and glass price", async () => {
    await post({ ...base, selected_services: [svc("a", 1), svc("b", 1)], includes_tempered_glass: true });
    const args = m.sessionCreate.mock.calls[0][0];
    expect(args.line_items.map((l: { price_data: { unit_amount: number } }) => l.price_data.unit_amount)).toEqual([
      100000, 50000, 9900,
    ]);
    expect(m.couponCreate).toHaveBeenCalledWith(expect.objectContaining({ percent_off: 10 }));
  });

  it("rejects unknown services and services of another model", async () => {
    expect((await post({ ...base, selected_services: [svc("nope", 1)] })).status).toBe(400);
    expect((await post({ ...base, selected_services: [svc("c", 1)] })).status).toBe(400);
    expect(m.sessionCreate).not.toHaveBeenCalled();
    expect(state.tickets).toHaveLength(0);
  });

  it("3 devices: one Stripe session with all lines and all ticket ids in metadata", async () => {
    const res = await post({
      ...base,
      selected_services: [svc("a", 1)],
      total_price_dkk: 1,
      devices: [
        { device_type: "Apple", device_model: "iPhone 15", selected_services: [svc("a", 1), svc("b", 1)], includes_tempered_glass: true },
        { device_type: "Samsung", device_model: "Galaxy S24", selected_services: [svc("c", 1)] },
        { device_type: "Google", device_model: "Pixel 8", selected_services: [svc("d", 1)] },
      ],
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ticketIds).toEqual(["ticket-1", "ticket-2", "ticket-3"]);
    expect(state.tickets).toHaveLength(3);
    expect(state.logs.map((l) => l.ticket_id)).toEqual(["ticket-1", "ticket-2", "ticket-3"]);

    const args = m.sessionCreate.mock.calls[0][0];
    const names = args.line_items.map((l: { price_data: { product_data: { name: string } } }) => l.price_data.product_data.name);
    expect(names).toEqual([
      "iPhone 15 - Skærmskift",
      "iPhone 15 - Batteriskift",
      "iPhone 15 - Beskyttelsesglas",
      "Galaxy S24 - Skærmskift",
      "Pixel 8 - Kamera",
    ]);
    expect(args.metadata.repair_ticket_id).toBe("ticket-1");
    expect(args.metadata.repair_ticket_ids).toBe("ticket-1,ticket-2,ticket-3");
    expect(m.couponCreate).toHaveBeenCalledWith(expect.objectContaining({ percent_off: 15 }));

    const sum = state.tickets.reduce((s, t) => s + ((t.booking_details as { total_price_dkk: number }).total_price_dkk), 0);
    expect(sum).toBe(2699 - 405);
  });
});
