// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { LagersystemError } from "@/lib/lagersystem/client";
import { memoryRepo } from "@/lib/lagersystem/__tests__/memory-repo";
import { addPart } from "@/lib/lagersystem/repair-parts";

const TV = "11111111-1111-4111-8111-111111111111";
const TS = "22222222-2222-4222-8222-222222222222";
const KEY = "66666666-6666-4666-8666-666666666666";
const s = vi.hoisted(() => ({
  afterFns: [] as Array<() => Promise<void>>,
  client: null as null | Record<string, ReturnType<typeof vi.fn>>,
  repo: null as unknown,
  staff: {} as Record<string, unknown>,
}));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (fn: () => Promise<void>) => { s.afterFns.push(fn); } }));
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: async () => s.staff }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/lagersystem/supabase-repo", () => ({ createSupabaseRepairPartsRepo: () => s.repo }));
vi.mock("@/lib/lagersystem/client", async (orig) => ({ ...(await orig<typeof import("@/lib/lagersystem/client")>()), getLagersystemClient: () => s.client }));

import { GET, POST } from "../rma/route";
import { POST as ACTION } from "../rma/[id]/[action]/route";

const item = (over: Record<string, unknown> = {}) => ({
  id: "rma1", shared_sku: "SCR-IP13", part_name: "Skærm iPhone 13", qty: 1, location: "vejle-hub", found_by_company: "fixon",
  found_by_label: "Fixon", supplier: "Foneday", reason: "Død pixel", reference: null, status: "REGISTERED", supplier_ref: null,
  resolution_note: null, credit_ore: null, unit_cost_ore: 41500, created_at: "2026-10-13T10:00:00Z", sent_at: null, resolved_at: null, ...over,
});
const owner = { id: "staff-1", role: "owner", name: "Maria", email: null, location_id: null, location_slug: null };
const asStore = (slug: string) => ({ id: "staff-2", role: "staff", name: "Jens", email: null, location_id: "l", location_slug: slug });
const post = (body: Record<string, unknown>) => POST(new NextRequest("https://x/api/admin/lager/rma", { method: "POST", body: JSON.stringify({ idempotency_key: KEY, ...body }) }));
const act = (action: string, body: Record<string, unknown>, id = "rma1") =>
  ACTION(new NextRequest(`https://x/api/admin/lager/rma/${id}/${action}`, { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id, action }) });

beforeEach(() => {
  s.afterFns = [];
  s.staff = owner;
  s.repo = memoryRepo([{ id: TV, store_id: "vejle", ticket_number: "PS-2026-0001" }, { id: TS, store_id: "slagelse", ticket_number: "PS-2026-0002" }]);
  s.client = {
    listRma: vi.fn(async () => [item()]),
    createRma: vi.fn(async () => ({ item: item(), replayed: false })),
    sendRma: vi.fn(async () => item({ status: "SENT" })),
    resolveRma: vi.fn(async () => item({ status: "CREDITED", credit_ore: 41500 })),
  };
});

it("lists RMAs for a location the staff may use; cost only for the owner", async () => {
  const res = await GET(new NextRequest("https://x/api/admin/lager/rma?location=vejle-hub&status=REGISTERED,SENT,bogus"));
  expect(res.status).toBe(200);
  expect(s.client!.listRma).toHaveBeenCalledWith({ location: "vejle-hub", status: ["REGISTERED", "SENT"] });
  expect((await res.json()).items[0]).toMatchObject({ found_by_label: "Fixon", unit_cost_ore: 41500 });
  s.staff = asStore("vejle");
  const staffRes = await (await GET(new NextRequest("https://x/api/admin/lager/rma?location=vejle-hub"))).json();
  expect(staffRes.items[0]).not.toHaveProperty("unit_cost_ore");
  expect(staffRes.items[0]).not.toHaveProperty("credit_ore");
});

it("a Slagelse employee cannot list or register on Hovedlager Vejle", async () => {
  s.staff = asStore("slagelse");
  expect((await GET(new NextRequest("https://x/api/admin/lager/rma?location=vejle-hub"))).status).toBe(403);
  expect((await post({ location: "vejle-hub", shared_sku: "S", qty: 1, reason: "x" })).status).toBe(403);
  expect(s.client!.createRma).not.toHaveBeenCalled();
});

it("registers a defect with server-side actor, prefixed key and a required reason", async () => {
  expect((await post({ location: "vejle-hub", shared_sku: "S", qty: 1, reason: " " })).status).toBe(400);
  const res = await post({ location: "vejle-hub", shared_sku: "SCR-IP13", qty: 2, reason: "Død pixel", supplier: "Foneday", reference: "Lager" });
  expect(res.status).toBe(201);
  expect(s.client!.createRma).toHaveBeenCalledWith({
    idempotency_key: `admin:${KEY}`, location: "vejle-hub", shared_sku: "SCR-IP13", qty: 2, reason: "Død pixel",
    supplier: "Foneday", reference: "Lager", actor_label: "PhoneSpot-admin: Maria",
  });
  expect(await res.json()).toMatchObject({ part_removed: false });
});

it("a ticket from another store is invisible (404), and the ticket number wins as reference", async () => {
  s.staff = asStore("vejle");
  expect((await post({ location: "vejle-hub", shared_sku: "S", qty: 1, reason: "x", ticket_id: TS })).status).toBe(404);
  await post({ location: "vejle-hub", shared_sku: "S", qty: 1, reason: "x", ticket_id: TV, reference: "noget andet" });
  expect(s.client!.createRma).toHaveBeenLastCalledWith(expect.objectContaining({ reference: "PS-2026-0001" }));
});

it("from a Dele brugt row: uses the part's location and sku, a per-part key, and removes the part (RETURN)", async () => {
  const repo = s.repo as ReturnType<typeof memoryRepo>;
  const added = await addPart(repo, { ticketId: TV, sharedSku: "SCR-IP13", partName: "Skærm iPhone 13", qty: 1, costPriceOre: 41500, staff: owner });
  if (!added.ok) throw new Error("setup");
  const res = await post({ location: "phonespot-slagelse", shared_sku: "WRONG", qty: 1, reason: "Død pixel", ticket_id: TV, part_id: added.value.id });
  expect(res.status).toBe(201);
  expect(s.client!.createRma).toHaveBeenCalledWith(expect.objectContaining({
    idempotency_key: `repair:${TV}:defect:${added.value.id}`, location: "vejle-hub", shared_sku: "SCR-IP13", reference: "PS-2026-0001",
  }));
  expect(await res.json()).toMatchObject({ part_removed: true });
  expect(repo.rows.some((r) => r.movement_type === "RETURN" && r.reverses_id === added.value.id)).toBe(true);
});

it("from a Dele brugt row: cannot claim more than was used, and nothing is removed if the RMA fails", async () => {
  const repo = s.repo as ReturnType<typeof memoryRepo>;
  const added = await addPart(repo, { ticketId: TV, sharedSku: "SCR-IP13", partName: "Skærm", qty: 1, costPriceOre: null, staff: owner });
  if (!added.ok) throw new Error("setup");
  expect((await post({ location: "vejle-hub", shared_sku: "SCR-IP13", qty: 2, reason: "x", ticket_id: TV, part_id: added.value.id })).status).toBe(400);
  s.client!.createRma.mockRejectedValue(new LagersystemError(0, "network", "down"));
  expect((await post({ location: "vejle-hub", shared_sku: "SCR-IP13", qty: 1, reason: "x", ticket_id: TV, part_id: added.value.id })).status).toBe(502);
  expect(repo.rows.some((r) => r.movement_type === "RETURN")).toBe(false);
});

it("send checks that the RMA is open on a location the staff may use", async () => {
  expect((await act("send", { location: "vejle-hub", supplier_ref: "FD-77" }, "other")).status).toBe(404);
  const res = await act("send", { location: "vejle-hub", supplier_ref: "FD-77" });
  expect(res.status).toBe(200);
  expect(s.client!.listRma).toHaveBeenCalledWith({ location: "vejle-hub", status: ["REGISTERED", "SENT"] });
  expect(s.client!.sendRma).toHaveBeenCalledWith("rma1", { actor_label: "PhoneSpot-admin: Maria", supplier_ref: "FD-77" });
  s.staff = asStore("slagelse");
  expect((await act("send", { location: "vejle-hub" })).status).toBe(403);
});

it("resolve passes credit only for CREDITED", async () => {
  await act("resolve", { location: "vejle-hub", outcome: "CREDITED", credit_ore: 41500, note: "Kreditnota 1234" });
  expect(s.client!.resolveRma).toHaveBeenLastCalledWith("rma1", { actor_label: "PhoneSpot-admin: Maria", outcome: "CREDITED", credit_ore: 41500, note: "Kreditnota 1234" });
  await act("resolve", { location: "vejle-hub", outcome: "REJECTED", credit_ore: 999, note: "Brugerskade" });
  expect(s.client!.resolveRma).toHaveBeenLastCalledWith("rma1", { actor_label: "PhoneSpot-admin: Maria", outcome: "REJECTED", note: "Brugerskade" });
  expect((await act("resolve", { location: "vejle-hub", outcome: "LOST" })).status).toBe(400);
  expect((await act("explode", { location: "vejle-hub" })).status).toBe(404);
});

it("invalid_state shows RMA-specific text", async () => {
  s.client!.sendRma.mockRejectedValue(new LagersystemError(409, "invalid_state", "x"));
  const res = await act("send", { location: "vejle-hub" });
  expect(res.status).toBe(409);
  expect((await res.json()).error).toBe("Reklamationen har ændret status. Genindlæs siden og prøv igen.");
});

it("everything 404s while the feature is off", async () => {
  s.client = null;
  expect((await GET(new NextRequest("https://x/api/admin/lager/rma?location=vejle-hub"))).status).toBe(404);
  expect((await post({ location: "vejle-hub", shared_sku: "S", qty: 1, reason: "x" })).status).toBe(404);
  expect((await act("send", { location: "vejle-hub" })).status).toBe(404);
});

// --- Rettigheder ud over briefen (spec §3.6 + ejerens regler for penge og lager) ---

const asManager = (slug: string) => ({ id: "staff-3", role: "manager", name: "Lone", email: null, location_id: "l", location_slug: slug });

it("Vejle staff may register, send and resolve on Hovedlager Vejle (Vejle acts for PhoneSpot on the hub)", async () => {
  s.staff = asStore("vejle");
  expect((await post({ location: "vejle-hub", shared_sku: "S", qty: 1, reason: "x" })).status).toBe(201);
  expect((await act("send", { location: "vejle-hub" })).status).toBe(200);
  expect((await act("resolve", { location: "vejle-hub", outcome: "REJECTED", note: "Brugerskade" })).status).toBe(200);
  expect((await act("resolve", { location: "vejle-hub", outcome: "CREDITED" })).status).toBe(200);
  expect(s.client!.sendRma).toHaveBeenCalledWith("rma1", { actor_label: "PhoneSpot-admin: Jens" });
});

it("only the store's own staff (and the owner) can act on a store location", async () => {
  s.staff = asStore("vejle");
  expect((await GET(new NextRequest("https://x/api/admin/lager/rma?location=phonespot-slagelse"))).status).toBe(403);
  expect((await post({ location: "phonespot-slagelse", shared_sku: "S", qty: 1, reason: "x" })).status).toBe(403);
  expect((await act("send", { location: "phonespot-slagelse" })).status).toBe(403);
  s.staff = asStore("slagelse");
  s.client!.listRma.mockResolvedValue([item({ location: "phonespot-slagelse" })]);
  expect((await act("send", { location: "phonespot-slagelse" })).status).toBe(200);
  s.staff = asStore("webshop");
  expect((await GET(new NextRequest("https://x/api/admin/lager/rma?location=vejle-hub"))).status).toBe(403);
  s.staff = { ...asStore("vejle"), location_id: null, location_slug: null };
  expect((await GET(new NextRequest("https://x/api/admin/lager/rma?location=vejle-hub"))).status).toBe(403);
  expect(s.client!.listRma).toHaveBeenCalledTimes(1);
});

it("REPLACED and a credit amount need owner or manager, checked before any upstream call", async () => {
  s.staff = asStore("vejle");
  const replaced = await act("resolve", { location: "vejle-hub", outcome: "REPLACED" });
  expect(replaced.status).toBe(403);
  expect((await replaced.json()).error).toMatch(/ejer eller leder/);
  expect((await act("resolve", { location: "vejle-hub", outcome: "CREDITED", credit_ore: 100 })).status).toBe(403);
  expect(s.client!.listRma).not.toHaveBeenCalled();
  expect(s.client!.resolveRma).not.toHaveBeenCalled();
  s.staff = asManager("vejle");
  expect((await act("resolve", { location: "vejle-hub", outcome: "REPLACED" })).status).toBe(200);
  expect((await act("resolve", { location: "vejle-hub", outcome: "CREDITED", credit_ore: 100 })).status).toBe(200);
  expect(s.client!.resolveRma).toHaveBeenLastCalledWith("rma1", { actor_label: "PhoneSpot-admin: Lone", outcome: "CREDITED", credit_ore: 100 });
});

it("a manager sees no cost fields (cost is owner-only, as in Dele brugt)", async () => {
  s.staff = asManager("vejle");
  const body = await (await GET(new NextRequest("https://x/api/admin/lager/rma?location=vejle-hub"))).json();
  expect(body.items[0]).not.toHaveProperty("unit_cost_ore");
});

it("a part from another store's ticket is 404 before any upstream call", async () => {
  const repo = s.repo as ReturnType<typeof memoryRepo>;
  const added = await addPart(repo, { ticketId: TS, sharedSku: "SCR", partName: "Skærm", qty: 1, costPriceOre: null, staff: owner });
  if (!added.ok) throw new Error("setup");
  s.staff = asStore("vejle");
  expect((await post({ location: "vejle-hub", shared_sku: "SCR", qty: 1, reason: "x", ticket_id: TS, part_id: added.value.id })).status).toBe(404);
  // part_id på en anden sag end ticket_id
  s.staff = owner;
  expect((await post({ location: "vejle-hub", shared_sku: "SCR", qty: 1, reason: "x", ticket_id: TV, part_id: added.value.id })).status).toBe(404);
  expect((await post({ location: "vejle-hub", shared_sku: "SCR", qty: 1, reason: "x", part_id: added.value.id })).status).toBe(400);
  expect(s.client!.createRma).not.toHaveBeenCalled();
});

it("a removed (voided) part cannot be claimed again", async () => {
  const repo = s.repo as ReturnType<typeof memoryRepo>;
  const added = await addPart(repo, { ticketId: TV, sharedSku: "SCR", partName: "Skærm", qty: 1, costPriceOre: null, staff: owner });
  if (!added.ok) throw new Error("setup");
  expect((await post({ location: "vejle-hub", shared_sku: "SCR", qty: 1, reason: "x", ticket_id: TV, part_id: added.value.id })).status).toBe(201);
  expect((await post({ location: "vejle-hub", shared_sku: "SCR", qty: 1, reason: "x", ticket_id: TV, part_id: added.value.id })).status).toBe(404);
  expect(s.client!.createRma).toHaveBeenCalledTimes(1);
});

it("a replay returns 200", async () => {
  s.client!.createRma.mockResolvedValue({ item: item(), replayed: true });
  expect((await post({ location: "vejle-hub", shared_sku: "S", qty: 1, reason: "x" })).status).toBe(200);
});

it("unauthenticated is 401", async () => {
  s.staff = null as unknown as Record<string, unknown>;
  expect((await GET(new NextRequest("https://x/api/admin/lager/rma?location=vejle-hub"))).status).toBe(401);
  expect((await post({ location: "vejle-hub", shared_sku: "S", qty: 1, reason: "x" })).status).toBe(401);
  expect((await act("send", { location: "vejle-hub" })).status).toBe(401);
});
