// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { LagersystemError } from "@/lib/lagersystem/client";
import { memoryRepo } from "@/lib/lagersystem/__tests__/memory-repo";
import { memoryPartsCheckRepo } from "@/lib/lagersystem/__tests__/memory-parts-check-repo";

const TV = "11111111-1111-4111-8111-111111111111";
const TG = "22222222-2222-4222-8222-222222222222";
const s = vi.hoisted(() => ({
  afterFns: [] as Array<() => Promise<void>>,
  client: null as null | { postMovement: ReturnType<typeof vi.fn>; getPart: ReturnType<typeof vi.fn> },
  repo: null as unknown,
  partsRepo: null as unknown,
  staff: { id: "staff-1", role: "owner", name: "Maria", email: null, location_id: null, location_slug: null } as Record<string, unknown>,
}));

vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (fn: () => Promise<void>) => { s.afterFns.push(fn); } }));
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: async () => s.staff }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/lagersystem/parts-check-repo", () => ({ createSupabasePartsCheckRepo: () => s.partsRepo }));
vi.mock("@/lib/lagersystem/supabase-repo", () => ({ createSupabaseRepairPartsRepo: () => s.repo }));
vi.mock("@/lib/lagersystem/ticket-transfers-repo", () => ({ createSupabaseTicketTransfersRepo: () => ({ listForTicket: async () => [] }) }));
vi.mock("@/lib/lagersystem/client", async (orig) => ({
  ...(await orig<typeof import("@/lib/lagersystem/client")>()),
  getLagersystemClient: () => s.client,
}));

import { GET, POST } from "../repair-parts/[ticketId]/route";
import { DELETE, PATCH } from "../repair-parts/[ticketId]/[partId]/route";

const ctx = (ticketId: string) => ({ params: Promise.resolve({ ticketId }) });
const ctx2 = (ticketId: string, partId: string) => ({ params: Promise.resolve({ ticketId, partId }) });
const post = (ticketId: string, body: unknown) =>
  POST(new NextRequest(`https://x/api/admin/lager/repair-parts/${ticketId}`, { method: "POST", body: JSON.stringify(body) }), ctx(ticketId));
const runAfter = async () => { while (s.afterFns.length) await s.afterFns.shift()!(); };

beforeEach(() => {
  s.afterFns = [];
  s.staff = { id: "staff-1", role: "owner", name: "Maria", email: null, location_id: null, location_slug: null };
  s.repo = memoryRepo([
    { id: TV, store_id: "vejle", ticket_number: "PS-2026-0001" },
    { id: TG, store_id: null, ticket_number: null },
  ]);
  s.partsRepo = memoryPartsCheckRepo({ tickets: [{ id: TV, store_id: "vejle", status: "modtaget", parts_status: "needs_order",
    parts_shortage: [{ shared_sku: "SCR-IP13-OLED", name: "Skærm", needed: 1, available: 0 }], parts_notified_key: "k",
    ticket_number: "PS-2026-0001", device_model: "iPhone 13", customer_name: "K", booking_details: null, services: null }], links: [] });
  s.client = {
    getPart: vi.fn(async (sku: string) => ({ shared_sku: sku, name: "Skærm iPhone 13", cost_price_ore: 41500 })),
    postMovement: vi.fn(async (i: { idempotency_key: string }) => ({ movement: { id: `mv:${i.idempotency_key}` }, replayed: false })),
  };
});

it("GET reports the feature as off when the lagersystem is not configured", async () => {
  s.client = null;
  const res = await GET(new NextRequest(`https://x/api/admin/lager/repair-parts/${TV}`), ctx(TV));
  expect(await res.json()).toEqual({ enabled: false });
});

it("POST stores a pending TAKE on vejle-hub and sends it after the response", async () => {
  const res = await post(TV, { shared_sku: "SCR-IP13-OLED", qty: 1 });
  expect(res.status).toBe(201);
  const { part } = await res.json();
  expect(part).toMatchObject({ status: "pending", location_code: "vejle-hub" });
  await runAfter();
  expect(s.client!.postMovement).toHaveBeenCalledWith(expect.objectContaining({ type: "TAKE", location: "vejle-hub", qty: 1 }));
  const list = await (await GET(new NextRequest(`https://x/api/admin/lager/repair-parts/${TV}`), ctx(TV))).json();
  expect(list).toMatchObject({ enabled: true, location: "vejle-hub", parts: [{ status: "synced" }] });
});

it("POST on a Generel ticket is refused with a clear message", async () => {
  const res = await post(TG, { shared_sku: "S", qty: 1 });
  expect(res.status).toBe(409);
  expect((await res.json()).error).toBe("Vælg butik på sagen, før du registrerer dele");
});

it("POST validates the body and the ticket id", async () => {
  expect((await post(TV, { shared_sku: "", qty: 1 })).status).toBe(400);
  expect((await post("not-a-uuid", { shared_sku: "S", qty: 1 })).status).toBe(404);
});

it("DELETE books a RETURN and sends it once the TAKE is synced", async () => {
  const { part } = await (await post(TV, { shared_sku: "S", qty: 2 })).json();
  await runAfter();
  const res = await DELETE(new NextRequest(`https://x/api/admin/lager/repair-parts/${TV}/${part.id}`, { method: "DELETE" }), ctx2(TV, part.id));
  expect(res.status).toBe(200);
  await runAfter();
  expect(s.client!.postMovement).toHaveBeenLastCalledWith(expect.objectContaining({ type: "RETURN", qty: 2, location: "vejle-hub" }));
});

it("writes are refused while the feature is off", async () => {
  s.client = null;
  const res = await post(TV, { shared_sku: "S", qty: 1 });
  expect(res.status).toBe(404);
});

const asStaff = (slug: string) => { s.staff = { id: "staff-2", role: "staff", name: "Jens", email: null, location_id: "x", location_slug: slug }; };
const patch = (ticketId: string, partId: string, body: unknown) =>
  PATCH(new NextRequest(`https://x/api/admin/lager/repair-parts/${ticketId}/${partId}`, { method: "PATCH", body: JSON.stringify(body) }), ctx2(ticketId, partId));

it("staff of another store get 404 on read, add, remove and retry; own store and owner are allowed", async () => {
  const { part } = await (await post(TV, { shared_sku: "S", qty: 1 })).json();
  await runAfter();
  asStaff("slagelse");
  expect((await GET(new NextRequest(`https://x/a/${TV}`), ctx(TV))).status).toBe(404);
  expect((await post(TV, { shared_sku: "S", qty: 1 })).status).toBe(404);
  expect((await DELETE(new NextRequest(`https://x/a/${TV}/${part.id}`, { method: "DELETE" }), ctx2(TV, part.id))).status).toBe(404);
  expect((await patch(TV, part.id, { action: "retry" })).status).toBe(404);
  asStaff("vejle");
  expect((await GET(new NextRequest(`https://x/a/${TV}`), ctx(TV))).status).toBe(200);
});

it("a Generel ticket is hidden from a physical-store staff member", async () => {
  asStaff("vejle");
  expect((await GET(new NextRequest(`https://x/a/${TG}`), ctx(TG))).status).toBe(404);
});

it("PATCH retry validates the body and the part-ticket pairing", async () => {
  const { part } = await (await post(TV, { shared_sku: "S", qty: 1 })).json();
  expect((await patch(TV, part.id, { action: "nope" })).status).toBe(400);
  expect((await patch(TV, part.id, { action: "retry" })).status).toBe(409);
  expect((await patch(TG, part.id, { action: "retry" })).status).toBe(404);
});

it("DELETE of a part that belongs to another ticket is 404", async () => {
  const { part } = await (await post(TV, { shared_sku: "S", qty: 1 })).json();
  const res = await DELETE(new NextRequest(`https://x/a/${TG}/${part.id}`, { method: "DELETE" }), ctx2(TG, part.id));
  expect(res.status).toBe(404);
});

it("POST ignores a client-supplied name and cost: both come from the lagersystem", async () => {
  const res = await post(TV, { shared_sku: "SCR", qty: 1, part_name: "Gratis del", cost_price_ore: 1 });
  expect(res.status).toBe(201);
  expect(s.client!.getPart).toHaveBeenCalledWith("SCR");
  const { part } = await res.json();
  expect(part).toMatchObject({ part_name: "Skærm iPhone 13", cost_at_time_ore: 41500 });
});

it("POST answers 404 for a part the lagersystem does not know, and stores nothing", async () => {
  s.client!.getPart.mockRejectedValue(new LagersystemError(404, "unknown_part", "no"));
  const res = await post(TV, { shared_sku: "NOPE", qty: 1 });
  expect(res.status).toBe(404);
  const list = await (await GET(new NextRequest(`https://x/a/${TV}`), ctx(TV))).json();
  expect(list.parts).toEqual([]);
});

it("cost_at_time_ore is hidden from non-owner staff, in GET and in the POST response; the owner sees it", async () => {
  const owner = await (await post(TV, { shared_sku: "S", qty: 1 })).json();
  expect(owner.part.cost_at_time_ore).toBe(41500);
  asStaff("vejle");
  const staffPost = await (await post(TV, { shared_sku: "S", qty: 1 })).json();
  expect(staffPost.part).not.toHaveProperty("cost_at_time_ore");
  const staffList = await (await GET(new NextRequest(`https://x/a/${TV}`), ctx(TV))).json();
  expect(staffList.parts.length).toBeGreaterThan(0);
  for (const p of staffList.parts) expect(p).not.toHaveProperty("cost_at_time_ore");
  s.staff = { id: "staff-1", role: "owner", name: "Maria", email: null, location_id: null, location_slug: null };
  const ownerList = await (await GET(new NextRequest(`https://x/a/${TV}`), ctx(TV))).json();
  expect(ownerList.parts[0].cost_at_time_ore).toBe(41500);
});

it("adding the missing part clears Skal bestilles and GET reports it", async () => {
  await post(TV, { shared_sku: "SCR-IP13-OLED", part_name: "Skærm iPhone 13", qty: 1 });
  const list = await (await GET(new NextRequest(`https://x/api/admin/lager/repair-parts/${TV}`), ctx(TV))).json();
  expect(list).toMatchObject({ parts_status: "ok", parts_shortage: null });
});

it("GET returns the ticket number as reference for the claim form", async () => {
  const list = await (await GET(new NextRequest(`https://x/api/admin/lager/repair-parts/${TV}`), ctx(TV))).json();
  expect(list).toMatchObject({ enabled: true, reference: "PS-2026-0001" });
});
