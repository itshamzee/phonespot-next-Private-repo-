// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { LagersystemError } from "@/lib/lagersystem/client";

const s = vi.hoisted(() => ({
  client: null as null | { postMovement: ReturnType<typeof vi.fn> },
  staff: null as unknown,
}));
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: async () => s.staff }));
vi.mock("@/lib/lagersystem/client", async (orig) => ({ ...(await orig<typeof import("@/lib/lagersystem/client")>()), getLagersystemClient: () => s.client }));
import { POST } from "../movements/route";

const KEY = "33333333-3333-4333-8333-333333333333";
const post = (body: Record<string, unknown>) =>
  POST(new NextRequest("https://x/api/admin/lager/movements", { method: "POST", body: JSON.stringify({ idempotency_key: KEY, location: "vejle-hub", shared_sku: "S", ...body }) }));
const asStaff = (role: string, slug: string | null) => { s.staff = { id: "s", role, name: "Jens", email: null, location_id: null, location_slug: slug }; };

beforeEach(() => {
  s.staff = { id: "s", role: "owner", name: "Maria", email: null, location_id: null, location_slug: null };
  s.client = { postMovement: vi.fn(async () => ({ movement: { id: "m", balance_after: 7 }, replayed: false })) };
});

it("books a RECEIVE with supplier and cost, server-side actor and prefixed key", async () => {
  const res = await post({ type: "RECEIVE", qty: 5, supplier: "Foneday", cost_price_ore: 41500, reference: "F-123" });
  expect(res.status).toBe(201);
  expect(s.client!.postMovement).toHaveBeenCalledWith({
    idempotency_key: `admin:${KEY}`, location: "vejle-hub", shared_sku: "S", type: "RECEIVE", qty: 5,
    actor_label: "PhoneSpot-admin: Maria", reference: "F-123", supplier: "Foneday", cost_price_ore: 41500,
  });
});

it("a replayed movement answers 200", async () => {
  s.client!.postMovement.mockResolvedValue({ movement: { id: "m" }, replayed: true });
  expect((await post({ type: "COUNT", qty: 3 })).status).toBe(200);
});

it("COUNT accepts 0; other types need at least 1", async () => {
  expect((await post({ type: "COUNT", qty: 0 })).status).toBe(201);
  expect((await post({ type: "RECEIVE", qty: 0 })).status).toBe(400);
});

it("TAKE needs a purpose, which becomes part of the reference", async () => {
  expect((await post({ type: "TAKE", qty: 1 })).status).toBe(400);
  await post({ type: "TAKE", qty: 1, note: "Til demo-telefon", reference: "INT-7" });
  expect(s.client!.postMovement).toHaveBeenLastCalledWith(expect.objectContaining({ type: "TAKE", reference: "Til demo-telefon · INT-7" }));
});

it("drops supplier and cost on non-RECEIVE types", async () => {
  await post({ type: "WRITE_OFF", qty: 1, note: "Knækket", supplier: "X", cost_price_ore: 1 });
  const input = s.client!.postMovement.mock.calls.at(-1)![0];
  expect(input).not.toHaveProperty("supplier");
  expect(input).not.toHaveProperty("cost_price_ore");
});

it("rejects locations outside the PhoneSpot set", async () => {
  expect((await post({ type: "RECEIVE", qty: 1, location: "fixon-van-1" })).status).toBe(400);
});

it("passes 403 through with Danish text and stores nothing", async () => {
  s.client!.postMovement.mockRejectedValue(new LagersystemError(403, "forbidden_location", "no"));
  const res = await post({ type: "RECEIVE", qty: 1 });
  expect(res.status).toBe(403);
  expect((await res.json()).error).toBe("PhoneSpot må ikke bogføre på denne lokation.");
});

it("404s while the feature is off", async () => {
  s.client = null;
  expect((await post({ type: "RECEIVE", qty: 1 })).status).toBe(404);
});

it("401 without staff", async () => {
  s.staff = null;
  expect((await post({ type: "RECEIVE", qty: 1 })).status).toBe(401);
});

it("store scope: staff may only book on their own store location; owner anywhere", async () => {
  asStaff("manager", "vejle");
  expect((await post({ type: "RECEIVE", qty: 1, location: "vejle-hub" })).status).toBe(201);
  const denied = await post({ type: "RECEIVE", qty: 1, location: "phonespot-slagelse" });
  expect(denied.status).toBe(403);
  expect((await denied.json()).error).toBe("Du har ikke adgang til denne butik.");
  asStaff("manager", "slagelse");
  expect((await post({ type: "RECEIVE", qty: 1, location: "phonespot-slagelse" })).status).toBe(201);
  expect((await post({ type: "RECEIVE", qty: 1, location: "vejle-hub" })).status).toBe(403);
  asStaff("owner", null);
  expect((await post({ type: "RECEIVE", qty: 1, location: "phonespot-esbjerg" })).status).toBe(201);
});

it("store scope: webshop staff and staff without a store are refused, and nothing is sent", async () => {
  s.client!.postMovement.mockClear();
  asStaff("manager", "webshop");
  expect((await post({ type: "RECEIVE", qty: 1 })).status).toBe(403);
  asStaff("manager", null);
  expect((await post({ type: "RECEIVE", qty: 1 })).status).toBe(403);
  expect(s.client!.postMovement).not.toHaveBeenCalled();
});

it("role gate: staff/employee may only TAKE; RECEIVE, COUNT and WRITE_OFF give 403 and send nothing", async () => {
  for (const role of ["staff", "employee"]) {
    asStaff(role, "vejle");
    s.client!.postMovement.mockClear();
    for (const body of [{ type: "RECEIVE", qty: 1 }, { type: "COUNT", qty: 1 }, { type: "WRITE_OFF", qty: 1, note: "x" }]) {
      const res = await post(body);
      expect(res.status).toBe(403);
      expect((await res.json()).error).toBe("Kun ejer eller leder kan modtage, tælle og nedskrive varer.");
    }
    expect(s.client!.postMovement).not.toHaveBeenCalled();
    expect((await post({ type: "TAKE", qty: 1, note: "Demo" })).status).toBe(201);
  }
});

it("role gate: manager may book on own location only; owner anywhere", async () => {
  asStaff("manager", "vejle");
  for (const body of [{ type: "RECEIVE", qty: 1 }, { type: "COUNT", qty: 1 }, { type: "WRITE_OFF", qty: 1, note: "x" }]) {
    expect((await post(body)).status).toBe(201);
  }
  expect((await post({ type: "RECEIVE", qty: 1, location: "phonespot-slagelse" })).status).toBe(403);
  asStaff("owner", null);
  expect((await post({ type: "WRITE_OFF", qty: 1, note: "x", location: "phonespot-slagelse" })).status).toBe(201);
});

it("cost_price_ore: forwarded for manager/owner, capped at 10 000 000 øre", async () => {
  asStaff("manager", "vejle");
  await post({ type: "RECEIVE", qty: 1, cost_price_ore: 100 });
  expect(s.client!.postMovement).toHaveBeenLastCalledWith(expect.objectContaining({ cost_price_ore: 100 }));
  expect((await post({ type: "RECEIVE", qty: 1, cost_price_ore: 10_000_001 })).status).toBe(400);
  expect((await post({ type: "RECEIVE", qty: 1, cost_price_ore: 10_000_000 })).status).toBe(201);
});
