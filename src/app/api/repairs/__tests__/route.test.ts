import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSupabase, type CatalogService } from "@/lib/repair/__tests__/test-supabase";

const m = vi.hoisted(() => ({ client: null as unknown, send: vi.fn(), confirm: vi.fn() }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: m.send };
  },
}));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => m.client }));
vi.mock("@/lib/email/repair-confirmation", () => ({ sendRepairConfirmation: m.confirm }));
vi.mock("@/lib/email/staff-routing", () => ({ getStaffRecipients: () => ({ to: "staff@x.dk" }) }));

import { POST } from "../route";

const catalog: CatalogService[] = [
  { id: "a", name: "Skærmskift", price_dkk: 1000, active: true, repair_models: { name: "iPhone 15" } },
  { id: "b", name: "Batteriskift", price_dkk: 500, active: true, repair_models: { name: "iPhone 15" } },
  { id: "c", name: "Skærmskift", price_dkk: 800, active: true, repair_models: { name: "Galaxy S24" } },
  { id: "d", name: "Kamera", price_dkk: 300, active: true, repair_models: { name: "Pixel 8" } },
  { id: "x", name: "Udgået", price_dkk: 100, active: false, repair_models: { name: "iPhone 15" } },
];

const customer = {
  customer_name: "Test Kunde",
  customer_email: "t@example.com",
  customer_phone: "12345678",
  issue_description: "Defekt",
  preferred_date: "2026-10-10",
  store_id: "vejle",
};
const single = {
  ...customer,
  device_type: "Apple",
  device_model: "iPhone 15",
  service_type: "Skærmskift",
};
const svc = (id: string, price: number) => ({ id, name: "klient", price_dkk: price });
const post = (body: unknown) =>
  POST(new Request("http://x/api/repairs", { method: "POST", body: JSON.stringify(body) }));

let state: ReturnType<typeof makeSupabase>["state"];
beforeEach(() => {
  vi.clearAllMocks();
  const s = makeSupabase(catalog);
  m.client = s.client;
  state = s.state;
  m.send.mockResolvedValue({ error: null });
  m.confirm.mockResolvedValue(true);
});

describe("POST /api/repairs", () => {
  it("single device: stores catalog prices and ignores a tampered price/total", async () => {
    const res = await post({ ...single, selected_services: [svc("a", 1)], total_price_dkk: 1, discount_percent: 50 });
    expect(res.status).toBe(200);
    expect(state.tickets).toHaveLength(1);
    const d = state.tickets[0].booking_details as Record<string, unknown>;
    expect(d.selected_services).toEqual([{ id: "a", name: "Skærmskift", price_dkk: 1000 }]);
    expect(d.total_price_dkk).toBe(1000);
    expect(d.discount_percent).toBe(0);
    expect(d.booking_group_id).toBeUndefined();
  });

  it("single device: 2 services get 10% and tempered glass is 99 kr server-side", async () => {
    await post({ ...single, selected_services: [svc("a", 1), svc("b", 1)], includes_tempered_glass: true, total_price_dkk: 1 });
    const d = state.tickets[0].booking_details as Record<string, unknown>;
    // (1000 + 500 + 99) * 10% = 159.9 -> 160
    expect(d.discount_percent).toBe(10);
    expect(d.total_price_dkk).toBe(1599 - 160);
  });

  it("rejects unknown, inactive and wrong-model services", async () => {
    for (const id of ["nope", "x", "c"]) {
      const res = await post({ ...single, selected_services: [svc(id, 1)] });
      expect(res.status).toBe(400);
    }
    expect(state.tickets).toHaveLength(0);
  });

  it("3 devices: one ticket per device, own services, discount shared, totals add up", async () => {
    const res = await post({
      ...single,
      selected_services: [svc("a", 1000)],
      total_price_dkk: 1,
      devices: [
        { device_type: "Apple", device_model: "iPhone 15", service_type: "s", selected_services: [svc("a", 1), svc("b", 1)], includes_tempered_glass: true },
        { device_type: "Samsung", device_model: "Galaxy S24", service_type: "s", selected_services: [svc("c", 1)], includes_tempered_glass: false },
        { device_type: "Google", device_model: "Pixel 8", service_type: "s", selected_services: [svc("d", 1)], includes_tempered_glass: false },
      ],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ticketIds).toEqual(["ticket-1", "ticket-2", "ticket-3"]);
    expect(state.tickets).toHaveLength(3);

    const details = state.tickets.map((t) => t.booking_details as Record<string, number | string | unknown[]>);
    expect(details.map((d) => (d.selected_services as unknown[]).length)).toEqual([2, 1, 1]);
    expect(new Set(details.map((d) => d.booking_group_id)).size).toBe(1);
    expect(details.map((d) => d.booking_device_index)).toEqual([1, 2, 3]);
    // 4 services -> 15%. Subtotal 1000+500+99+800+300 = 2699, discount round(404.85)=405.
    expect(details.every((d) => d.discount_percent === 15)).toBe(true);
    const sum = details.reduce((s, d) => s + (d.total_price_dkk as number), 0);
    expect(sum).toBe(2699 - 405);
    expect(details[0].booking_group_total_dkk).toBe(sum);
    expect(m.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        totalDkk: sum,
        devices: expect.arrayContaining([expect.objectContaining({ deviceLabel: "Google Pixel 8" })]),
      }),
    );
    expect(m.send.mock.calls[0][0].text).toContain("Galaxy S24");
    expect(m.send.mock.calls[0][0].text).toContain("Pixel 8");
  });

  it("multi device: a service that belongs to another model is rejected", async () => {
    const res = await post({
      ...single,
      devices: [
        { device_type: "Apple", device_model: "iPhone 15", selected_services: [svc("a", 1)] },
        { device_type: "Samsung", device_model: "Galaxy S24", selected_services: [svc("a", 1)] },
      ],
    });
    expect(res.status).toBe(400);
    expect(state.tickets).toHaveLength(0);
  });

  it("legacy body without selected_services creates a ticket without booking_details", async () => {
    const res = await post({ ...single });
    expect(res.status).toBe(200);
    expect(state.tickets[0].booking_details).toBeUndefined();
  });
});
