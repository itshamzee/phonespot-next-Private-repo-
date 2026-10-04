// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  staff: null as null | Record<string, unknown>,
  client: null as unknown,
}));

vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: vi.fn(async () => state.staff) }));
vi.mock("@/lib/supabase/client", () => ({ createServerClient: () => state.client }));

import { createFakeDb } from "@/test/fake-supabase";
import { resetLocationCache } from "@/lib/auth/store-scope-server";
import { GET, POST } from "../route";
import { POST as SEND } from "../[id]/send/route";
import { POST as RECEIVE } from "../[id]/receive/route";
import { POST as GOODS } from "../../stock/receive/route";

const L = { vejle: "L-v", slagelse: "L-s" };
const SKU = "11111111-1111-4111-8111-111111111111";
const TID = "22222222-2222-4222-8222-222222222222";
const LINE = "33333333-3333-4333-8333-333333333333";

const VEJLE = { id: "v", role: "employee", name: "V", email: null, location_id: L.vejle, location_slug: "vejle" };
const SLAGELSE_MGR = { id: "s", role: "manager", name: "S", email: null, location_id: L.slagelse, location_slug: "slagelse" };
const OWNER = { id: "o", role: "owner", name: "O", email: null, location_id: null, location_slug: null };

let rpc: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetLocationCache();
  const fake = createFakeDb({
    locations: [
      { id: L.vejle, name: "Vejle", type: "store", slug: "vejle" },
      { id: L.slagelse, name: "Slagelse", type: "store", slug: "slagelse" },
    ],
    stock_transfers: [{ id: TID, number: 1, status: "requested", from_location_id: L.slagelse, to_location_id: L.vejle, requested_at: "2026-10-04T09:00:00Z" }],
    stock_transfer_lines: [{ id: LINE, transfer_id: TID, sku_product_id: SKU, qty: 1, sent_qty: 0, received_qty: 0, returned_qty: 0, description: "Kabel" }],
    sku_products: [],
    devices: [],
    staff: [],
  });
  rpc = vi.fn(async () => ({ data: { id: TID, number: 1 }, error: null }));
  state.client = { ...fake.client, rpc };
  state.staff = null;
});

const json = (body: unknown) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const post = (body: unknown) => POST(new Request("http://x/api/admin/transfers", json(body)));
const params = { params: Promise.resolve({ id: TID }) };

describe("POST /api/admin/transfers", () => {
  it("401 without staff", async () => {
    expect((await post({})).status).toBe(401);
  });

  it("an employee requests into their own store; toSlug in the body is ignored", async () => {
    state.staff = VEJLE;
    const res = await post({ fromSlug: "slagelse", toSlug: "slagelse", lines: [{ skuProductId: SKU, qty: 2 }] });
    expect(res.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith("transfer_request", expect.objectContaining({ p_from: L.slagelse, p_to: L.vejle, p_staff_id: "v" }));
  });

  it("cannot request from your own store", async () => {
    state.staff = VEJLE;
    const res = await post({ fromSlug: "vejle", lines: [{ skuProductId: SKU, qty: 1 }] });
    expect(res.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("the owner must say which store the goods go to", async () => {
    state.staff = OWNER;
    expect((await post({ fromSlug: "vejle", lines: [{ skuProductId: SKU, qty: 1 }] })).status).toBe(400);
    expect((await post({ fromSlug: "vejle", toSlug: "slagelse", lines: [{ skuProductId: SKU, qty: 1 }] })).status).toBe(201);
  });

  it("validates the payload", async () => {
    state.staff = VEJLE;
    expect((await post({ fromSlug: "slagelse", lines: [] })).status).toBe(400);
    expect((await post({ fromSlug: "mars", lines: [{ skuProductId: SKU, qty: 1 }] })).status).toBe(400);
    expect((await post({ fromSlug: "slagelse", lines: [{ skuProductId: SKU, qty: 0 }] })).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/transfers", () => {
  it("returns only the caller's transfers", async () => {
    state.staff = OWNER;
    const all = await (await GET(new Request("http://x/api/admin/transfers"))).json();
    expect(all.transfers).toHaveLength(1);
    state.staff = { ...VEJLE, location_id: "L-other", location_slug: "webshop" };
    const none = await (await GET(new Request("http://x/api/admin/transfers"))).json();
    expect(none.transfers).toHaveLength(0);
  });
});

describe("send / receive routes", () => {
  it("the receiving store cannot send, the sending store can", async () => {
    state.staff = VEJLE; // Vejle is the RECEIVER of TID
    expect((await SEND(new Request("http://x", json({})), params)).status).toBe(403);
    state.staff = { ...SLAGELSE_MGR }; // Slagelse is the sender
    expect((await SEND(new Request("http://x", json({})), params)).status).toBe(200);
  });

  it("receive before send is a 409", async () => {
    state.staff = VEJLE;
    const res = await RECEIVE(new Request("http://x", json({ lines: [{ lineId: LINE, qty: 1 }] })), params);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("not_sent");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects malformed ids", async () => {
    state.staff = OWNER;
    const res = await SEND(new Request("http://x", json({})), { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/stock/receive (goods receipt)", () => {
  const body = { locationSlug: "slagelse", invoiceNo: "F-100", invoiceDate: "2026-10-01", lines: [{ skuProductId: SKU, qty: 5, costPriceOere: 1800 }] };
  const call = (b: unknown) => GOODS(new Request("http://x/api/admin/stock/receive", json(b)));

  it("employees cannot receive goods", async () => {
    state.staff = VEJLE;
    expect((await call({ ...body, locationSlug: "vejle" })).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("a manager receives into their own store only", async () => {
    state.staff = SLAGELSE_MGR;
    expect((await call({ ...body, locationSlug: "vejle" })).status).toBe(403);
    expect((await call(body)).status).toBe(201);
    expect(rpc).toHaveBeenCalledWith(
      "stock_receive_goods",
      expect.objectContaining({
        p_location_id: L.slagelse,
        p_invoice_no: "F-100",
        p_lines: [{ sku_product_id: SKU, qty: 5, cost_price_oere: 1800 }],
      }),
    );
  });

  it("the owner can receive into any store", async () => {
    state.staff = OWNER;
    expect((await call({ ...body, locationSlug: "vejle" })).status).toBe(201);
  });
});
