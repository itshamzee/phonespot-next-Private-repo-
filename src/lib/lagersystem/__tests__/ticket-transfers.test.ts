// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { Transfer } from "../api-types";
import { LagersystemError } from "../client";
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
  // Sagen har skærmskift koblet til SCR-IP13, så lagertjekket kan køre for alvor.
  const svcLinks = [
    { service_id: "svc-screen", shared_sku: "SCR-IP13", qty: 1, part_name: "Skærm iPhone 13" },
    { service_id: "svc-battery", shared_sku: "BAT-IP13", qty: 1, part_name: "Batteri iPhone 13" },
  ];
  const booked = (services: string[]) => ({ booking_details: { selected_services: services.map((id) => ({ id, name: id, price_dkk: 1 })) } }) as Partial<TicketForCheck>;
  const stock = (qty: Record<string, number>) => ({
    getBalances: vi.fn(async (location: string) => ({ location, as_of: T0.toISOString(), balances: Object.entries(qty).map(([shared_sku, q]) => ({ shared_sku, qty: q, updated_at: "t" })) })),
    getPart: vi.fn(async (sku: string) => ({ shared_sku: sku, name: sku, category: null, quality: null, device_models: [], cost_price_ore: null, active: true })),
    getTransfer: vi.fn(async () => tr({ status: "SENT" })),
  });
  const deps = (parts: ReturnType<typeof memoryPartsCheckRepo>, links: ReturnType<typeof memoryTicketTransfersRepo>, c: ReturnType<typeof stock>, notify = vi.fn(async () => {})) =>
    ({ parts, links, client: c as never, notify, now: T0 });
  const received = (qty_received: number, qty_written_off = 0) => tr({
    status: "RECEIVED",
    lines: [{ shared_sku: "SCR-IP13", part_name: "Skærm iPhone 13", qty_requested: 1, qty_sent: 1, qty_received, qty_written_off, write_off_reason: qty_written_off ? "Knækket" : null, unit_cost_ore: 41500 }],
  });

  it("moves the badge to Undervejs when sent, without a stock check", async () => {
    const parts = memoryPartsCheckRepo({ tickets: [ticket({ parts_status: "requested", ...booked(["svc-screen"]) })], links: svcLinks });
    const c = stock({});
    await syncTicketsForTransfer(tr({ status: "SENT" }), deps(parts, memoryTicketTransfersRepo([link]), c));
    expect(parts.tickets[0].parts_status).toBe("in_transit");
    expect(c.getBalances).not.toHaveBeenCalled();
  });

  it("RECEIVED with nothing received (all written off) runs the stock check and ends Skal bestilles again", async () => {
    const parts = memoryPartsCheckRepo({ tickets: [ticket({ parts_status: "in_transit", ...booked(["svc-screen"]) })], links: svcLinks });
    const c = stock({ "SCR-IP13": 0 });
    await syncTicketsForTransfer(received(0, 1), deps(parts, memoryTicketTransfersRepo([{ ...link, status: "SENT" }]), c));
    expect(c.getBalances).toHaveBeenCalledWith("phonespot-slagelse");
    expect(parts.tickets[0].parts_status).toBe("needs_order");
    expect(parts.tickets[0].parts_shortage).toEqual([{ shared_sku: "SCR-IP13", name: "Skærm iPhone 13", needed: 1, available: 0 }]);
  });

  it("RECEIVED with the full quantity and stock present is ok, from the stock check", async () => {
    const parts = memoryPartsCheckRepo({ tickets: [ticket({ parts_status: "in_transit", ...booked(["svc-screen"]) })], links: svcLinks });
    const c = stock({ "SCR-IP13": 1 });
    await syncTicketsForTransfer(received(1), deps(parts, memoryTicketTransfersRepo([{ ...link, status: "SENT" }]), c));
    expect(parts.tickets[0].parts_status).toBe("ok");
    expect(parts.tickets[0].parts_shortage).toBeNull();
  });

  it("RECEIVED never forces ok: if the stock is gone again (other tickets took it), it is Skal bestilles", async () => {
    const parts = memoryPartsCheckRepo({ tickets: [ticket({ parts_status: "in_transit", ...booked(["svc-screen"]) })], links: svcLinks });
    await syncTicketsForTransfer(received(1), deps(parts, memoryTicketTransfersRepo([{ ...link, status: "SENT" }]), stock({ "SCR-IP13": 0 })));
    expect(parts.tickets[0].parts_status).toBe("needs_order");
  });

  it("rejected or cancelled goes back to the stock check", async () => {
    for (const status of ["REJECTED", "CANCELLED"] as const) {
      const parts = memoryPartsCheckRepo({ tickets: [ticket({ parts_status: "requested", ...booked(["svc-screen"]) })], links: svcLinks });
      await syncTicketsForTransfer(tr({ status }), deps(parts, memoryTicketTransfersRepo([link]), stock({ "SCR-IP13": 0 })));
      expect(parts.tickets[0].parts_status).toBe("needs_order");
    }
  });

  it("keeps Anmodet while another transfer for the ticket is still live", async () => {
    const both = [
      { shared_sku: "SCR-IP13", name: "Skærm iPhone 13", needed: 1, available: 0 },
      { shared_sku: "BAT-IP13", name: "Batteri iPhone 13", needed: 1, available: 0 },
    ];
    const parts = memoryPartsCheckRepo({ tickets: [ticket({ parts_status: "in_transit", parts_shortage: both, ...booked(["svc-screen", "svc-battery"]) })], links: svcLinks });
    const links = memoryTicketTransfersRepo([{ ...link, status: "SENT" }, { ...link, transfer_id: "tr2", shared_sku: "BAT-IP13" }]);
    await syncTicketsForTransfer(received(1), deps(parts, links, stock({ "SCR-IP13": 1, "BAT-IP13": 0 })));
    expect(parts.tickets[0].parts_status).toBe("requested");
    expect(parts.tickets[0].parts_shortage).toEqual([{ shared_sku: "BAT-IP13", name: "Batteri iPhone 13", needed: 1, available: 0 }]);
  });

  it("a live transfer stays Anmodet/Undervejs even when the lagersystem is down during the check", async () => {
    const both = [
      { shared_sku: "SCR-IP13", name: "Skærm iPhone 13", needed: 1, available: 0 },
      { shared_sku: "BAT-IP13", name: "Batteri iPhone 13", needed: 1, available: 0 },
    ];
    const parts = memoryPartsCheckRepo({ tickets: [ticket({ parts_status: "in_transit", parts_shortage: both, ...booked(["svc-screen", "svc-battery"]) })], links: svcLinks });
    const links = memoryTicketTransfersRepo([{ ...link, status: "SENT" }, { ...link, transfer_id: "tr2", shared_sku: "BAT-IP13", status: "SENT" }]);
    const down = { ...stock({}), getBalances: vi.fn(async () => { throw new Error("down"); }) };
    await syncTicketsForTransfer(received(1), deps(parts, links, down as never));
    expect(parts.tickets[0].parts_status).toBe("in_transit");
  });

  it("never resurrects a ticket whose part was already used (status ok)", async () => {
    const parts = memoryPartsCheckRepo({ tickets: [ticket({ parts_status: "ok", parts_shortage: null, ...booked(["svc-screen"]) })], links: svcLinks });
    const c = stock({ "SCR-IP13": 0 });
    await syncTicketsForTransfer(tr({ status: "REJECTED" }), deps(parts, memoryTicketTransfersRepo([link]), c));
    expect(parts.tickets[0].parts_status).toBe("ok");
    expect(c.getBalances).not.toHaveBeenCalled();
  });

  it("syncOpenTicketTransfers fetches each open transfer once", async () => {
    const parts = memoryPartsCheckRepo({ tickets: [ticket({ parts_status: "requested", ...booked(["svc-screen"]) })], links: svcLinks });
    const c = stock({});
    expect(await syncOpenTicketTransfers({ ...deps(parts, memoryTicketTransfersRepo([link]), c) })).toBe(1);
    expect(c.getTransfer).toHaveBeenCalledWith("tr1");
    expect(parts.tickets[0].parts_status).toBe("in_transit");
  });

  it("stops at the first network error", async () => {
    const parts = memoryPartsCheckRepo({ tickets: [ticket({ parts_status: "requested", ...booked(["svc-screen"]) })], links: svcLinks });
    const links = memoryTicketTransfersRepo([link, { ...link, transfer_id: "tr2" }, { ...link, transfer_id: "tr3" }]);
    const c = { ...stock({}), getTransfer: vi.fn(async () => { throw new LagersystemError(0, "network", "timeout"); }) };
    vi.spyOn(console, "error").mockImplementation(() => {});
    await syncOpenTicketTransfers({ ...deps(parts, links, c as never) });
    expect(c.getTransfer).toHaveBeenCalledTimes(1);
  });
  it("continues after a non-network error", async () => {
    const parts = memoryPartsCheckRepo({ tickets: [ticket({ parts_status: "requested", ...booked(["svc-screen"]) })], links: svcLinks });
    const links = memoryTicketTransfersRepo([link, { ...link, transfer_id: "tr2" }]);
    const c = { ...stock({}), getTransfer: vi.fn(async () => { throw new LagersystemError(200, "bad_response", "x"); }) };
    vi.spyOn(console, "error").mockImplementation(() => {});
    await syncOpenTicketTransfers({ ...deps(parts, links, c as never) });
    expect(c.getTransfer).toHaveBeenCalledTimes(2);
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
