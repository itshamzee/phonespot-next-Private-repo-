import { describe, expect, it } from "vitest";
import type { Transfer } from "../api-types";
import { availabilityElsewhere, formatKr, locationLabel, outstanding, partyFor, requestQty, settlement, ticketStatusFromTransfers } from "../transfers";

const line = (over = {}) => ({ shared_sku: "S", part_name: "Skærm", qty_requested: 2, qty_sent: 2, qty_received: 0, qty_written_off: 0, write_off_reason: null, unit_cost_ore: 41500, ...over });
const transfer = (over: Partial<Transfer> = {}): Transfer => ({
  id: "tr1", from: "phonespot-esbjerg", to: "vejle-hub", requested_by_company: "phonespot", status: "SENT",
  reference: "PS-2026-0042", note: null, reject_reason: null, requested_by_label: "PhoneSpot-admin: Maria",
  sent_by_label: null, received_by_label: null, created_at: "2026-10-13T10:00:00Z", sent_at: null, received_at: null,
  lines: [line()], ...over,
});

describe("names (spec §2: vejle-hub is always Hovedlager Vejle)", () => {
  it("labels locations and parties", () => {
    expect(locationLabel("vejle-hub", "whatever the API says")).toBe("Hovedlager Vejle");
    expect(locationLabel("phonespot-slagelse")).toBe("Slagelse");
    expect(locationLabel("other-place", "Andet sted")).toBe("Andet sted");
    expect(partyFor("vejle-hub")).toBe("Hovedlager Vejle");
    expect(partyFor("phonespot-esbjerg")).toBe("PhoneSpot");
  });
});

describe("outstanding", () => {
  it("is sent minus received minus written off, never negative, 0 before sending", () => {
    expect(outstanding(line({ qty_sent: 3, qty_received: 1, qty_written_off: 1 }))).toBe(1);
    expect(outstanding(line({ qty_sent: null }))).toBe(0);
  });
});

describe("settlement (spec §3.5)", () => {
  it("shows nothing before anything is received", () => {
    expect(settlement(transfer())).toEqual({ kind: "none" });
  });
  it("store to Hovedlager Vejle: the hub owes PhoneSpot the cost of what was received", () => {
    const s = settlement(transfer({ lines: [line({ qty_received: 2 })] }));
    expect(s).toMatchObject({ kind: "owed", debtor: "Hovedlager Vejle", creditor: "PhoneSpot", amount_ore: 83000, missingCost: false });
    expect(s.kind === "owed" && s.text).toBe("Hovedlager Vejle skylder PhoneSpot 830,00 kr. (kostpris)");
  });
  it("between two PhoneSpot stores it is an internal move without an amount", () => {
    expect(settlement(transfer({ from: "phonespot-slagelse", to: "phonespot-esbjerg", lines: [line({ qty_received: 1 })] })))
      .toEqual({ kind: "internal", text: "Intern flytning, intet beløb" });
  });
  it("flags lines without a cost price", () => {
    const s = settlement(transfer({ lines: [line({ qty_received: 1, unit_cost_ore: null })] }));
    expect(s).toMatchObject({ kind: "owed", amount_ore: 0, missingCost: true });
  });
});

describe("availabilityElsewhere", () => {
  it("drops the ticket's own location and empty stock, and uses our names", () => {
    expect(availabilityElsewhere([
      { location: "phonespot-esbjerg", location_name: "PhoneSpot Esbjerg", qty: 2 },
      { location: "vejle-hub", location_name: "vejle-hub", qty: 5 },
      { location: "phonespot-slagelse", location_name: "PhoneSpot Slagelse", qty: 0 },
    ], "phonespot-slagelse")).toEqual([
      { location: "phonespot-esbjerg", label: "Esbjerg", qty: 2 },
      { location: "vejle-hub", label: "Hovedlager Vejle", qty: 5 },
    ]);
  });
});

it("formatKr is deterministic", () => {
  expect(formatKr(123456)).toBe("1.234,56 kr.");
});

describe("ticketStatusFromTransfers (badge: Skal bestilles -> Anmodet -> Undervejs)", () => {
  it("stays needs_order while a missing part has no live request", () => {
    expect(ticketStatusFromTransfers(["A", "B"], [{ shared_sku: "A", status: "REQUESTED" }])).toBe("needs_order");
  });
  it("is requested, then in transit", () => {
    expect(ticketStatusFromTransfers(["A"], [{ shared_sku: "A", status: "REQUESTED" }])).toBe("requested");
    expect(ticketStatusFromTransfers(["A"], [{ shared_sku: "A", status: "SENT" }])).toBe("in_transit");
    expect(ticketStatusFromTransfers(["A"], [{ shared_sku: "A", status: "PARTIALLY_RECEIVED" }])).toBe("in_transit");
  });
  it("never says ok because a transfer was received; only the stock check may (review fix 1)", () => {
    expect(ticketStatusFromTransfers(["A"], [{ shared_sku: "A", status: "RECEIVED" }])).toBe("needs_order");
  });
  it("falls back to needs_order when the request is rejected or cancelled", () => {
    expect(ticketStatusFromTransfers(["A"], [{ shared_sku: "A", status: "REJECTED" }])).toBe("needs_order");
    expect(ticketStatusFromTransfers(["A"], [{ shared_sku: "A", status: "CANCELLED" }, { shared_sku: "A", status: "REQUESTED" }])).toBe("requested");
  });
});

describe("requestQty", () => {
  const l = { shared_sku: "A", name: "A", needed: 2, available: -1 };
  it("asks for the deficit, capped by what the other location has, at least 1", () => {
    expect(requestQty(l, 5)).toBe(2);
    expect(requestQty(l, 1)).toBe(1);
    expect(requestQty({ ...l, available: 1 }, 5)).toBe(1);
  });
});
