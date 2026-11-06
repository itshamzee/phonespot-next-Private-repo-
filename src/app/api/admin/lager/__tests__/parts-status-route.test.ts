// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { memoryPartsCheckRepo } from "@/lib/lagersystem/__tests__/memory-parts-check-repo";

const TV = "11111111-1111-4111-8111-111111111111";
const s = vi.hoisted(() => ({
  client: null as unknown,
  repo: null as unknown,
  staff: null as unknown,
}));
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: async () => s.staff }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/lagersystem/parts-check-repo", () => ({ createSupabasePartsCheckRepo: () => s.repo }));
vi.mock("@/lib/lagersystem/client", async (orig) => ({ ...(await orig<typeof import("@/lib/lagersystem/client")>()), getLagersystemClient: () => s.client }));

import { PATCH } from "../parts-status/[ticketId]/route";

const owner = { id: "o", role: "owner", name: "M", email: null, location_id: null, location_slug: null };
const slagelseStaff = { id: "s", role: "staff", name: "S", email: null, location_id: "x", location_slug: "slagelse" };
const call = (body: unknown, id = TV) =>
  PATCH(new NextRequest(`https://x/api/admin/lager/parts-status/${id}`, { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ ticketId: id }) });

beforeEach(() => {
  s.client = {};
  s.staff = owner;
  s.repo = memoryPartsCheckRepo({ tickets: [{ id: TV, store_id: "vejle", status: "modtaget", parts_status: "needs_order",
    parts_shortage: [{ shared_sku: "A", name: "A", needed: 1, available: 0 }], parts_notified_key: "k",
    ticket_number: null, device_model: "iPhone 13", customer_name: "K", booking_details: null, services: null }], links: [] });
});

it("marks the ticket as ordered, then refuses a second time", async () => {
  const res = await call({ action: "ordered" });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ parts_status: "ordered" });
  expect((await call({ action: "ordered" })).status).toBe(409);
});

it("requires staff, the flag, a valid id and a known action", async () => {
  s.staff = null;
  expect((await call({ action: "ordered" })).status).toBe(401);
  s.staff = owner; s.client = null;
  expect((await call({ action: "ordered" })).status).toBe(404);
  s.client = {};
  expect((await call({ action: "ordered" }, "nope")).status).toBe(404);
  expect((await call({ action: "x" })).status).toBe(400);
});

it("hides another store's ticket as 404", async () => {
  s.staff = slagelseStaff;
  expect((await call({ action: "ordered" })).status).toBe(404);
  expect((s.repo as { tickets: { parts_status: string }[] }).tickets[0].parts_status).toBe("needs_order");
});
