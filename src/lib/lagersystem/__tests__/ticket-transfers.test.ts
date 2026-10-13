// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { Transfer } from "../api-types";
import type { TicketForCheck } from "../parts-check-run";
import { notifyNewTransferOnce, pollRequestedTransfers, requestPartForTicket, syncOpenTicketTransfers, syncTicketsForTransfer } from "../ticket-transfers";
import { memoryPartsCheckRepo } from "./memory-parts-check-repo";
import { memoryTicketTransfersRepo } from "./memory-ticket-transfers-repo";

const T0 = new Date("2026-10-13T12:00:00Z");
const staff = { id: "s1", name: "Maria", email: null };
const shortage = [{ shared_sku: "SCR-IP13", name: "Skærm iPhone 13", needed: 1, available: 0 }];
const ticket = (over: Partial<TicketForCheck> = {}): TicketForCheck => ({
  id: "t1", store_id: "slagelse", status: "modtaget", parts_status: "needs_order", parts_shortage: shortage, parts_notified_key: "k",
  ticket_number: "PS-2026-0042", device_model: "iPhone 13", customer_name: "K", booking_details: null, services: null, ...over,
});
const tr = (over: Partial<Transfer> = {}): Transfer => ({
  id: "tr1", from: "phonespot-esbjerg", to: "phonespot-slagelse", requested_by_company: "phonespot", status: "REQUESTED",
  reference: "PS-2026-0042", note: null, reject_reason: null, requested_by_label: "PhoneSpot-admin: Maria", sent_by_label: null,
  received_by_label: null, created_at: T0.toISOString(), sent_at: null, received_at: null,
  lines: [{ shared_sku: "SCR-IP13", part_name: "Skærm iPhone 13", qty_requested: 1, qty_sent: null, qty_received: 0, qty_written_off: 0, write_off_reason: null, unit_cost_ore: 41500 }],
  ...over,
});
const client = (over: Record<string, unknown> = {}) => ({
  getAvailability: vi.fn(async () => [{ location: "phonespot-esbjerg", location_name: "PhoneSpot Esbjerg", qty: 2 }]),
  createTransfer: vi.fn(async () => ({ transfer: tr(), replayed: false })),
  getTransfer: vi.fn(async () => tr({ status: "SENT" })),
  listTransfers: vi.fn(async () => [tr()]),
  ...over,
});

describe("requestPartForTicket", () => {
  it("requests the deficit to the ticket's location with the ticket number as reference, and shows Anmodet", async () => {
    const parts = memoryPartsCheckRepo({ tickets: [ticket()], links: [] });
    const links = memoryTicketTransfersRepo();
    const c = client();
    const r = await requestPartForTicket({ ticketId: "t1", sharedSku: "SCR-IP13", from: "phonespot-esbjerg", staff }, { parts, links, client: c as never, now: T0 });
    expect(r.ok).toBe(true);
    expect(c.createTransfer).toHaveBeenCalledWith({
      idempotency_key: "repair:t1:transfer:SCR-IP13:0", from: "phonespot-esbjerg", to: "phonespot-slagelse",
      lines: [{ shared_sku: "SCR-IP13", qty: 1 }], reference: "PS-2026-0042", note: "Til reparation: iPhone 13", actor_label: "PhoneSpot-admin: Maria",
    });
    expect(links.rows).toEqual([{ transfer_id: "tr1", ticket_id: "t1", shared_sku: "SCR-IP13", from_location: "phonespot-esbjerg", qty: 1, status: "REQUESTED" }]);
    expect(parts.tickets[0].parts_status).toBe("requested");
    expect(parts.tickets[0].parts_shortage).toEqual(shortage);
  });

  it("a double click reuses the idempotency key, so only one transfer exists", async () => {
    const parts = memoryPartsCheckRepo({ tickets: [ticket()], links: [] });
    const links = memoryTicketTransfersRepo();
    const c = client({ createTransfer: vi.fn(async () => ({ transfer: tr(), replayed: true })) });
    await Promise.all([1, 2].map(() => requestPartForTicket({ ticketId: "t1", sharedSku: "SCR-IP13", from: "phonespot-esbjerg", staff }, { parts, links, client: c as never, now: T0 })));
    const keys = c.createTransfer.mock.calls.map((call) => ((call as unknown[])[0] as { idempotency_key: string }).idempotency_key);
    expect(new Set(keys).size).toBe(1);
    expect(links.rows).toHaveLength(1);
  });

  it("refuses parts that are not missing, the ticket's own location, and locations without stock", async () => {
    const deps = () => ({ parts: memoryPartsCheckRepo({ tickets: [ticket()], links: [] }), links: memoryTicketTransfersRepo(), client: client() as never, now: T0 });
    expect(await requestPartForTicket({ ticketId: "t1", sharedSku: "OTHER", from: "phonespot-esbjerg", staff }, deps())).toMatchObject({ ok: false, status: 409 });
    expect(await requestPartForTicket({ ticketId: "t1", sharedSku: "SCR-IP13", from: "phonespot-slagelse", staff }, deps())).toMatchObject({ ok: false, status: 409 });
    const empty = { ...deps(), client: client({ getAvailability: vi.fn(async () => []) }) as never };
    expect(await requestPartForTicket({ ticketId: "t1", sharedSku: "SCR-IP13", from: "phonespot-esbjerg", staff }, empty)).toMatchObject({ ok: false, status: 409, message: "Esbjerg har ikke delen længere" });
  });
});

describe("requestPartForTicket: one live request per part", () => {
  const link = (status: "REQUESTED" | "REJECTED") => ({ transfer_id: "old", ticket_id: "t1", shared_sku: "SCR-IP13", from_location: "vejle-hub", qty: 1, status });
  it("refuses a second request while one is alive, and uses a new key after a rejection", async () => {
    const c = client();
    const live = { parts: memoryPartsCheckRepo({ tickets: [ticket({ parts_status: "requested" })], links: [] }), links: memoryTicketTransfersRepo([link("REQUESTED")]), client: c as never, now: T0 };
    expect(await requestPartForTicket({ ticketId: "t1", sharedSku: "SCR-IP13", from: "phonespot-esbjerg", staff }, live)).toMatchObject({ ok: false, status: 409 });
    expect(c.createTransfer).not.toHaveBeenCalled();
    const after = { ...live, links: memoryTicketTransfersRepo([link("REJECTED")]) };
    expect((await requestPartForTicket({ ticketId: "t1", sharedSku: "SCR-IP13", from: "phonespot-esbjerg", staff }, after)).ok).toBe(true);
    expect(c.createTransfer).toHaveBeenCalledWith(expect.objectContaining({ idempotency_key: "repair:t1:transfer:SCR-IP13:1" }));
  });
});

describe("syncTicketsForTransfer", () => {
  const link = { transfer_id: "tr1", ticket_id: "t1", shared_sku: "SCR-IP13", from_location: "phonespot-esbjerg", qty: 1, status: "REQUESTED" as const };
  it("moves the badge to Undervejs when sent and back to Skal bestilles when rejected", async () => {
    const parts = memoryPartsCheckRepo({ tickets: [ticket({ parts_status: "requested" })], links: [] });
    const links = memoryTicketTransfersRepo([link]);
    await syncTicketsForTransfer(tr({ status: "SENT" }), { parts, links, now: T0 });
    expect(parts.tickets[0].parts_status).toBe("in_transit");
    await syncTicketsForTransfer(tr({ status: "REJECTED" }), { parts, links, now: T0 });
    expect(parts.tickets[0].parts_status).toBe("needs_order");
  });
  it("never resurrects a ticket whose part was already used (status ok)", async () => {
    const parts = memoryPartsCheckRepo({ tickets: [ticket({ parts_status: "ok", parts_shortage: null })], links: [] });
    await syncTicketsForTransfer(tr({ status: "REJECTED" }), { parts, links: memoryTicketTransfersRepo([link]), now: T0 });
    expect(parts.tickets[0].parts_status).toBe("ok");
  });
  it("syncOpenTicketTransfers fetches each open transfer once", async () => {
    const parts = memoryPartsCheckRepo({ tickets: [ticket({ parts_status: "requested" })], links: [] });
    const c = client();
    expect(await syncOpenTicketTransfers({ parts, links: memoryTicketTransfersRepo([link]), client: c as never, now: T0 })).toBe(1);
    expect(c.getTransfer).toHaveBeenCalledWith("tr1");
    expect(parts.tickets[0].parts_status).toBe("in_transit");
  });
});

describe("notifyNewTransferOnce / pollRequestedTransfers", () => {
  it("mails the sending store once per transfer id", async () => {
    const links = memoryTicketTransfersRepo();
    const send = vi.fn(async () => {});
    expect(await notifyNewTransferOnce(tr(), { links, send })).toBe(true);
    expect(await notifyNewTransferOnce(tr(), { links, send })).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("does not mail for non-requests or senders outside PhoneSpot's locations", async () => {
    const send = vi.fn(async () => {});
    expect(await notifyNewTransferOnce(tr({ status: "SENT" }), { links: memoryTicketTransfersRepo(), send })).toBe(false);
    expect(await notifyNewTransferOnce(tr({ from: "fixon-van-3" }), { links: memoryTicketTransfersRepo(), send })).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
  it("releases the claim when the mail fails, so the next poll tries again", async () => {
    const links = memoryTicketTransfersRepo();
    expect(await notifyNewTransferOnce(tr(), { links, send: vi.fn(async () => { throw new Error("smtp"); }) })).toBe(false);
    expect(links.mailed.has("tr1")).toBe(false);
  });
  it("polls outgoing requests for every PhoneSpot location and survives one location failing", async () => {
    const listTransfers = vi.fn(async ({ location }: { location: string }) => {
      if (location === "phonespot-esbjerg") throw new Error("unknown_location");
      return location === "vejle-hub" ? [tr({ id: "a", from: "vejle-hub" })] : [tr({ id: "b", from: "phonespot-slagelse" })];
    });
    const send = vi.fn(async () => {});
    expect(await pollRequestedTransfers({ client: { listTransfers } as never, links: memoryTicketTransfersRepo(), send })).toBe(2);
    expect(listTransfers).toHaveBeenCalledWith({ location: "vejle-hub", status: ["REQUESTED"], direction: "out" });
  });
});
