// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  staff: null as null | Record<string, unknown>,
  client: null as unknown,
}));

vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: vi.fn(async () => state.staff) }));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => state.client }));

import { createFakeDb } from "@/test/fake-supabase";
import { resetLocationCache } from "@/lib/auth/store-scope-server";
import { GET as getNotify } from "../notify-requests/route";
import { GET as getCustomerOrders } from "../customers/[id]/orders/route";
import { GET as getPrintData } from "../orders/[id]/print-data/route";

const OWNER = { id: "o", role: "owner", name: "Ejer", email: "o@x.dk", location_id: null, location_slug: null };
const VEJLE = { id: "v", role: "manager", name: "V", email: "v@x.dk", location_id: "L-v", location_slug: "vejle" };

const req = (url: string) => new Request(`http://x${url}`) as unknown as NextRequest;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  const s = createFakeDb({
    locations: [
      { id: "L-v", name: "Vejle", type: "store", slug: "vejle" },
      { id: "L-s", name: "Slagelse", type: "store", slug: "slagelse" },
    ],
    notify_requests: [{ id: "n1", customer_email: "a@b.dk", status: "waiting", created_at: "2026-01-01" }],
    orders: [
      { id: "ord-v", customer_id: "c1", location_id: "L-v", order_number: "1", created_at: "2026-01-01" },
      { id: "ord-s", customer_id: "c1", location_id: "L-s", order_number: "2", created_at: "2026-01-02" },
    ],
    devices: [{ id: "d1", barcode: "B1" }],
    sku_products: [{ id: "s1", title: "Cover", sku: "C1" }],
  });
  state.client = s.client;
  state.staff = null;
  resetLocationCache();
});

describe("browser-read replacement routes", () => {
  it("returns 401 without staff", async () => {
    expect((await getNotify(req("/api/admin/notify-requests"))).status).toBe(401);
    expect((await getCustomerOrders(req("/x"), ctx("c1"))).status).toBe(401);
    expect((await getPrintData(req("/x"), ctx("ord-v"))).status).toBe(401);
  });

  it("lists notify requests for staff", async () => {
    state.staff = VEJLE;
    const res = await getNotify(req("/api/admin/notify-requests"));
    expect(res.status).toBe(200);
    expect((await res.json()).requests).toHaveLength(1);
  });

  it("scopes customer orders to the staff store, owner sees all", async () => {
    state.staff = VEJLE;
    const own = await (await getCustomerOrders(req("/x"), ctx("c1"))).json();
    expect(own.orders.map((o: { id: string }) => o.id)).toEqual(["ord-v"]);
    state.staff = OWNER;
    const all = await (await getCustomerOrders(req("/x"), ctx("c1"))).json();
    expect(all.orders).toHaveLength(2);
  });

  it("print-data hides orders from other stores with 404 and strips location_id", async () => {
    state.staff = VEJLE;
    expect((await getPrintData(req("/x"), ctx("ord-s"))).status).toBe(404);
    expect((await getPrintData(req("/x"), ctx("missing"))).status).toBe(404);
    const ok = await getPrintData(req("/x"), ctx("ord-v"));
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body.order.id).toBe("ord-v");
    expect(body.order).not.toHaveProperty("location_id");
  });
});
