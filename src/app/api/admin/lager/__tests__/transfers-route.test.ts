// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { LagersystemError } from "@/lib/lagersystem/client";

const OWNER = { id: "s1", role: "owner", name: "Maria", email: null, location_id: null, location_slug: null };
const s = vi.hoisted(() => ({
  client: null as null | Record<string, ReturnType<typeof vi.fn>>, afterFns: [] as Array<() => Promise<void>>, sync: vi.fn(), notify: vi.fn(),
  staff: null as null | Record<string, unknown>, request: vi.fn(), ticket: null as null | { id: string; store_id: string | null },
}));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (fn: () => Promise<void>) => { s.afterFns.push(fn); } }));
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: async () => s.staff }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/lagersystem/parts-check-repo", () => ({ createSupabasePartsCheckRepo: () => ({ getTicket: async () => s.ticket }) }));
vi.mock("@/lib/lagersystem/ticket-transfers-repo", () => ({ createSupabaseTicketTransfersRepo: () => ({}) }));
vi.mock("@/lib/lagersystem/ticket-transfers", async (orig) => ({ ...(await orig<typeof import("@/lib/lagersystem/ticket-transfers")>()), syncTicketsForTransfer: s.sync, notifyNewTransferOnce: s.notify, requestPartForTicket: s.request }));
vi.mock("@/lib/lagersystem/client", async (orig) => ({ ...(await orig<typeof import("@/lib/lagersystem/client")>()), getLagersystemClient: () => s.client }));

import { GET as listGET, POST as createPOST } from "../transfers/route";
import { POST as actionPOST } from "../transfers/[id]/[action]/route";
import { GET as availGET } from "../availability/route";
import { POST as repairTransferPOST } from "../repair-transfers/[ticketId]/route";

const KEY = "44444444-4444-4444-8444-444444444444";
const TICKET = "55555555-5555-4555-8555-555555555555";
const transfer = { id: "tr1", status: "REQUESTED", from: "phonespot-esbjerg", to: "vejle-hub", requested_by_company: "phonespot", lines: [] };
const post = (url: string, body: unknown) => new NextRequest(url, { method: "POST", body: JSON.stringify(body) });
const act = (action: string, body: unknown) => actionPOST(post(`https://x/api/admin/lager/transfers/tr1/${action}`, body), { params: Promise.resolve({ id: "tr1", action }) });

beforeEach(() => {
  s.afterFns = [];
  s.staff = { ...OWNER };
  s.ticket = { id: TICKET, store_id: "slagelse" };
  s.request.mockReset().mockResolvedValue({ ok: true, value: transfer });
  s.sync.mockReset().mockResolvedValue(0);
  s.notify.mockReset().mockResolvedValue(true);
  s.client = {
    listTransfers: vi.fn(async () => [transfer]),
    createTransfer: vi.fn(async () => ({ transfer, replayed: false })),
    sendTransfer: vi.fn(async () => ({ ...transfer, status: "SENT" })),
    receiveTransfer: vi.fn(async () => ({ ...transfer, status: "RECEIVED" })),
    rejectTransfer: vi.fn(async () => ({ ...transfer, status: "REJECTED" })),
    cancelTransfer: vi.fn(async () => ({ ...transfer, status: "CANCELLED" })),
    getTransfer: vi.fn(async () => transfer),
    getAvailability: vi.fn(async () => [{ location: "vejle-hub", location_name: "vejle-hub", qty: 3 }, { location: "phonespot-slagelse", location_name: "x", qty: 1 }]),
  };
});

it("lists transfers only for PhoneSpot locations", async () => {
  expect((await listGET(new NextRequest("https://x/api/admin/lager/transfers?location=fixon-van-1&direction=in"))).status).toBe(400);
  const res = await listGET(new NextRequest("https://x/api/admin/lager/transfers?location=vejle-hub&direction=in"));
  expect(await res.json()).toEqual({ transfers: [transfer] });
  expect(s.client!.listTransfers).toHaveBeenCalledWith({ location: "vejle-hub", direction: "in" });
});

it("creates a request to our own location with a prefixed key and mails after the response", async () => {
  const res = await createPOST(post("https://x/api/admin/lager/transfers", { idempotency_key: KEY, from: "phonespot-esbjerg", to: "vejle-hub", shared_sku: "S", qty: 2, reference: "Lager" }));
  expect(res.status).toBe(201);
  expect(s.client!.createTransfer).toHaveBeenCalledWith({ idempotency_key: `admin:${KEY}`, from: "phonespot-esbjerg", to: "vejle-hub", lines: [{ shared_sku: "S", qty: 2 }], reference: "Lager", note: null, actor_label: "PhoneSpot-admin: Maria" });
  await Promise.all(s.afterFns.map((f) => f()));
  expect(s.notify).toHaveBeenCalledWith(transfer, expect.anything());
});

it("refuses a request to a location PhoneSpot does not own, or from itself", async () => {
  expect((await createPOST(post("https://x/api/admin/lager/transfers", { idempotency_key: KEY, from: "vejle-hub", to: "fixon-office", shared_sku: "S", qty: 1 }))).status).toBe(400);
  expect((await createPOST(post("https://x/api/admin/lager/transfers", { idempotency_key: KEY, from: "vejle-hub", to: "vejle-hub", shared_sku: "S", qty: 1 }))).status).toBe(400);
});

it("sends with chosen quantities and syncs linked tickets", async () => {
  const res = await act("send", { lines: [{ shared_sku: "S", qty_sent: 1 }] });
  expect(res.status).toBe(200);
  expect(s.client!.sendTransfer).toHaveBeenCalledWith("tr1", { actor_label: "PhoneSpot-admin: Maria", lines: [{ shared_sku: "S", qty_sent: 1 }] });
  expect(s.sync).toHaveBeenCalledWith(expect.objectContaining({ status: "SENT" }), expect.anything());
});

it("receive requires a reason for any write-off", async () => {
  expect((await act("receive", { lines: [{ shared_sku: "S", qty_received: 1, qty_written_off: 1 }] })).status).toBe(400);
  expect((await act("receive", { lines: [{ shared_sku: "S", qty_received: 1, qty_written_off: 1, write_off_reason: "Knækket i transport" }] })).status).toBe(200);
});

it("reject needs a reason; unknown actions are 404", async () => {
  expect((await act("reject", {})).status).toBe(400);
  expect((await act("reject", { reason: "Bruger den selv" })).status).toBe(200);
  expect((await act("explode", {})).status).toBe(404);
});

it("passes invalid_state through as 409 with Danish text", async () => {
  s.client!.cancelTransfer.mockRejectedValue(new LagersystemError(409, "invalid_state", "sent"));
  const res = await act("cancel", {});
  expect(res.status).toBe(409);
  expect((await res.json()).error).toBe("Flytningen har skiftet status i mellemtiden. Genindlæs siden og prøv igen.");
});

it("availability drops the excluded location and names the hub Hovedlager Vejle", async () => {
  const res = await availGET(new NextRequest("https://x/api/admin/lager/availability?sku=S&exclude=phonespot-slagelse"));
  expect(await res.json()).toEqual({ shared_sku: "S", availability: [{ location: "vejle-hub", label: "Hovedlager Vejle", qty: 3 }] });
});

it("everything 404s while the feature is off", async () => {
  s.client = null;
  expect((await listGET(new NextRequest("https://x/api/admin/lager/transfers?location=vejle-hub"))).status).toBe(404);
  expect((await act("cancel", {})).status).toBe(404);
});

/* ---------------- butiksafgrænsning og roller (sikkerhed) ---------------- */

const employee = (store: string, role = "employee") => ({ ...OWNER, role, location_slug: store, location_id: "loc" });

it("refuses everything to non-staff before calling the lagersystem", async () => {
  s.staff = null;
  expect((await listGET(new NextRequest("https://x/api/admin/lager/transfers?location=vejle-hub"))).status).toBe(401);
  expect((await act("cancel", {})).status).toBe(401);
  expect((await availGET(new NextRequest("https://x/api/admin/lager/availability?sku=S"))).status).toBe(401);
  expect(s.client!.listTransfers).not.toHaveBeenCalled();
  expect(s.client!.cancelTransfer).not.toHaveBeenCalled();
});

it("store staff only list their own store's transfers", async () => {
  s.staff = employee("slagelse");
  expect((await listGET(new NextRequest("https://x/api/admin/lager/transfers?location=vejle-hub"))).status).toBe(403);
  expect((await listGET(new NextRequest("https://x/api/admin/lager/transfers?location=phonespot-slagelse"))).status).toBe(200);
  expect(s.client!.listTransfers).toHaveBeenCalledTimes(1);
});

it("store staff request to their own store or Hovedlager Vejle, never another store", async () => {
  s.staff = employee("slagelse");
  const create = (from: string, to: string) => createPOST(post("https://x/api/admin/lager/transfers", { idempotency_key: KEY, from, to, shared_sku: "S", qty: 1 }));
  expect((await create("vejle-hub", "phonespot-esbjerg")).status).toBe(403);
  expect(s.client!.createTransfer).not.toHaveBeenCalled();
  expect((await create("phonespot-esbjerg", "phonespot-slagelse")).status).toBe(201);
  expect((await create("phonespot-esbjerg", "vejle-hub")).status).toBe(201);
});

it("webshop staff get no lager access", async () => {
  s.staff = employee("webshop");
  expect((await availGET(new NextRequest("https://x/api/admin/lager/availability?sku=S"))).status).toBe(403);
  expect((await createPOST(post("https://x/api/admin/lager/transfers", { idempotency_key: KEY, from: "phonespot-esbjerg", to: "vejle-hub", shared_sku: "S", qty: 1 }))).status).toBe(403);
  expect(s.client!.getAvailability).not.toHaveBeenCalled();
  expect(s.client!.createTransfer).not.toHaveBeenCalled();
});

it("only the sending store may send or reject, checked against the transfer from the lagersystem", async () => {
  s.staff = employee("slagelse");
  expect((await act("send", {})).status).toBe(403); // sendes fra Esbjerg
  expect((await act("reject", { reason: "x" })).status).toBe(403);
  expect(s.client!.getTransfer).toHaveBeenCalledWith("tr1");
  expect(s.client!.sendTransfer).not.toHaveBeenCalled();
  expect(s.client!.rejectTransfer).not.toHaveBeenCalled();
  s.staff = employee("vejle");
  expect((await act("send", {})).status).toBe(403);
  s.client!.getTransfer.mockResolvedValue({ ...transfer, from: "phonespot-slagelse", to: "vejle-hub" });
  s.staff = employee("slagelse");
  expect((await act("send", {})).status).toBe(200);
});

it("only the receiving store may receive, and only owner or manager may write off", async () => {
  s.staff = employee("slagelse");
  expect((await act("receive", { lines: [{ shared_sku: "S", qty_received: 1 }] })).status).toBe(403); // til Hovedlager Vejle
  s.staff = employee("vejle");
  expect((await act("receive", { lines: [{ shared_sku: "S", qty_received: 1 }] })).status).toBe(200);
  expect((await act("receive", { lines: [{ shared_sku: "S", qty_received: 0, qty_written_off: 1, write_off_reason: "Knækket" }] })).status).toBe(403);
  s.staff = employee("vejle", "manager");
  expect((await act("receive", { lines: [{ shared_sku: "S", qty_received: 0, qty_written_off: 1, write_off_reason: "Knækket" }] })).status).toBe(200);
});

it("passes a receive idempotency key through with the admin prefix", async () => {
  await act("receive", { idempotency_key: KEY, lines: [{ shared_sku: "S", qty_received: 1 }] });
  expect(s.client!.receiveTransfer).toHaveBeenCalledWith("tr1", { actor_label: "PhoneSpot-admin: Maria", idempotency_key: `admin:${KEY}`, lines: [{ shared_sku: "S", qty_received: 1 }] });
});

it("only PhoneSpot's own requests can be cancelled, by the requesting side", async () => {
  s.client!.getTransfer.mockResolvedValue({ ...transfer, requested_by_company: "fixon", to: "phonespot-slagelse" });
  s.staff = employee("slagelse");
  expect((await act("cancel", {})).status).toBe(403);
  s.client!.getTransfer.mockResolvedValue({ ...transfer, requested_by_company: "phonespot", to: "phonespot-slagelse" });
  expect((await act("cancel", {})).status).toBe(200);
  s.staff = employee("vejle");
  expect((await act("cancel", {})).status).toBe(403);
});

it("request from a ticket checks the ticket's store before calling the lagersystem", async () => {
  const req = (ticketId: string) => repairTransferPOST(post(`https://x/api/admin/lager/repair-transfers/${ticketId}`, { shared_sku: "S", from: "vejle-hub" }), { params: Promise.resolve({ ticketId }) });
  s.staff = employee("vejle");
  expect((await req(TICKET)).status).toBe(404); // sagen hører til Slagelse
  s.ticket = null;
  s.staff = { ...OWNER };
  expect((await req(TICKET)).status).toBe(404);
  expect(s.request).not.toHaveBeenCalled();
  s.ticket = { id: TICKET, store_id: "slagelse" };
  s.staff = employee("slagelse");
  const res = await req(TICKET);
  expect(res.status).toBe(201);
  expect(s.request).toHaveBeenCalledWith({ ticketId: TICKET, sharedSku: "S", from: "vejle-hub", staff: s.staff }, expect.anything());
  await Promise.all(s.afterFns.map((f) => f()));
  expect(s.notify).toHaveBeenCalledWith(transfer, expect.anything());
});
