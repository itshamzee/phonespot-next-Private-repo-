// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => state.client }));

import { createFakeDb } from "@/test/fake-supabase";
import { resetLocationCache } from "@/lib/auth/store-scope-server";
import { loadOverview, type AllOverview, type StoreOverview } from "@/lib/admin/overview/load";

/**
 * loadOrders efter de fælles salgsregler: click & collect hører til butikken,
 * forudbetalte sager uden kasselinje er salg, og brugte reservedele er kostpris.
 */

const NOW = new Date("2026-10-04T10:00:00Z");
const TODAY = "2026-10-04T08:00:00Z";

function order(id: string, location_id: string | null, total: number, type: string, shipping_method: string | null, items?: unknown[]) {
  return {
    id,
    type,
    status: "confirmed",
    confirmed_at: TODAY,
    location_id,
    shipping_method,
    total,
    vat_total: Math.round(total / 5),
    brugtmoms_total: 0,
    order_items: items ?? [{ item_type: "sku_product", quantity: 1, total_price: total, purchase_price: 0 }],
  };
}

function seed() {
  return createFakeDb({
    locations: [
      { id: "L-v", name: "Vejle", type: "store", slug: "vejle" },
      { id: "L-s", name: "Slagelse", type: "store", slug: "slagelse" },
      { id: "L-w", name: "Webshop", type: "online", slug: "webshop" },
    ],
    orders: [
      // Reparation ved kassen i Vejle for sag tk-till (som derfor ikke er forudbetalt).
      order("pos-v", "L-v", 100_000, "pos", null, [
        { item_type: "repair_service", quantity: 1, total_price: 100_000, purchase_price: null, repair_ticket_id: "tk-till" },
      ]),
      order("cc-v", null, 30_000, "online", "click_collect_vejle"),
      order("cc-s", "L-w", 50_000, "online", "pickup_slagelse"),
      order("ship", "L-w", 20_000, "online", "postnord"),
    ],
    order_items: [{ repair_ticket_id: "tk-till" }],
    repair_tickets: [
      { id: "tk-till", paid: true, paid_at: TODAY, status: "afhentet", location_id: "L-v", total_price_dkk: 1000 },
      { id: "tk-web", paid: true, paid_at: TODAY, status: "modtaget", location_id: "L-v", total_price_dkk: 899 },
      { id: "tk-cancel", paid: true, paid_at: TODAY, status: "annulleret", location_id: "L-v", total_price_dkk: 500 },
    ],
    repair_ticket_items: [
      { ticket_id: "tk-till", kind: "part", cost_oere: 30_000, qty: 1, stock_status: "consumed" },
      { ticket_id: "tk-till", kind: "part", cost_oere: 99_999, qty: 1, stock_status: "released" },
    ],
    registers: [],
    cash_sessions: [],
    staff: [],
    cash_session_adjustments: [],
    repair_status_log: [],
    stock_transfers: [],
    sku_stock: [],
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  resetLocationCache();
  state.client = seed().client;
});
afterEach(() => vi.useRealTimers());

const store = async (scope: "vejle" | "slagelse" | "webshop") =>
  (await loadOverview({ scope, isOwner: false }, "dag")) as StoreOverview;

describe("loadOrders med de fælles salgsregler", () => {
  it("Vejle får sin click & collect-ordre og den forudbetalte sag, men ikke sagen der er betalt ved kassen to gange", async () => {
    const { kpis } = await store("vejle");
    // 100 000 kasse + 30 000 click & collect + 89 900 forudbetalt; tk-till og den annullerede sag tæller ikke ekstra.
    expect(kpis.revenue).toBe(219_900);
    expect(kpis.salesCount).toBe(3);
  });

  it("brugte reservedele er kostpris, frigivne dele er ikke", async () => {
    const { kpis } = await store("vejle");
    expect(kpis.cost).toBe(30_000);
  });

  it("Slagelse får afhentningsordren, selv om den har webshoppens lokation", async () => {
    const { kpis } = await store("slagelse");
    expect(kpis.revenue).toBe(50_000);
    expect(kpis.salesCount).toBe(1);
  });

  it("Webshop mister afhentningsordrerne og beholder kun det sendte", async () => {
    const { kpis } = await store("webshop");
    expect(kpis.revenue).toBe(20_000);
    expect(kpis.salesCount).toBe(1);
  });

  it("Alle butikker fordeler efter afhentningsbutik og summerer til totalen", async () => {
    const all = (await loadOverview({ scope: "alle", isOwner: true }, "dag")) as AllOverview;
    expect(all.stores.map((s) => [s.slug, s.revenue])).toEqual([
      ["vejle", 219_900],
      ["slagelse", 50_000],
      ["webshop", 20_000],
    ]);
    expect(all.total.revenue).toBe(289_900);
  });
});
