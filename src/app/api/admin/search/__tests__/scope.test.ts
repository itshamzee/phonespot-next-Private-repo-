// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  staff: null as null | Record<string, unknown>,
  client: null as unknown,
}));

vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: vi.fn(async () => state.staff) }));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => state.client }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => state.client }));

import { createFakeDb } from "@/test/fake-supabase";
import { resetLocationCache } from "@/lib/auth/store-scope-server";
import { GET } from "../route";

const OWNER = { id: "o", role: "owner", name: "Ejer", email: "o@phonespot.dk", location_id: null, location_slug: null };
const VEJLE = { id: "v", role: "employee", name: "Vejle", email: "v@phonespot.dk", location_id: "L-v", location_slug: "vejle" };

function seed() {
  return createFakeDb({
    locations: [
      { id: "L-v", name: "Vejle", type: "store", slug: "vejle" },
      { id: "L-s", name: "Slagelse", type: "store", slug: "slagelse" },
      { id: "L-w", name: "Webshop", type: "online", slug: "webshop" },
    ],
    orders: [
      { id: "o-vejle", order_number: "PS-1001", status: "confirmed", total: 100, location_id: "L-v", customer: null, created_at: "1" },
      { id: "o-slagelse", order_number: "PS-1002", status: "confirmed", total: 100, location_id: "L-s", customer: null, created_at: "2" },
      { id: "o-web", order_number: "PS-1003", status: "confirmed", total: 100, location_id: null, customer: null, created_at: "3" },
    ],
    repair_tickets: [
      { id: "t-vejle", store_id: "vejle", ticket_number: "PS-2026-0001", customer_name: "Anna", device_model: "iPhone", status: "modtaget", created_at: "1" },
      { id: "t-slagelse", store_id: "slagelse", ticket_number: "PS-2026-0002", customer_name: "Bo", device_model: "iPhone", status: "modtaget", created_at: "2" },
    ],
    customers: [],
    devices: [],
    sku_products: [],
    product_templates: [],
  });
}

const call = (cookie?: string) =>
  GET(new Request("http://x/api/admin/search?q=PS-", { headers: cookie ? { cookie } : {} }));

beforeEach(() => {
  state.client = seed().client;
  state.staff = null;
  resetLocationCache();
});

describe("GET /api/admin/search scope", () => {
  it("401 without staff", async () => {
    expect((await call()).status).toBe(401);
  });

  it("a Vejle employee finds Vejle orders and repairs only (no Slagelse, no webshop-only orders)", async () => {
    state.staff = VEJLE;
    const json = await (await call("ps_store=alle")).json();
    expect(json.orders.map((o: { id: string }) => o.id)).toEqual(["o-vejle"]);
    expect(json.repairs.map((r: { id: string }) => r.id)).toEqual(["t-vejle"]);
  });

  it("the owner sees everything on 'alle'", async () => {
    state.staff = OWNER;
    const json = await (await call()).json();
    expect(json.orders.map((o: { id: string }) => o.id).sort()).toEqual(["o-slagelse", "o-vejle", "o-web"]);
    expect(json.repairs).toHaveLength(2);
  });

  it("the owner is narrowed by the switcher", async () => {
    state.staff = OWNER;
    const json = await (await call("ps_store=slagelse")).json();
    expect(json.orders.map((o: { id: string }) => o.id)).toEqual(["o-slagelse"]);
    expect(json.repairs.map((r: { id: string }) => r.id)).toEqual(["t-slagelse"]);
  });
});
