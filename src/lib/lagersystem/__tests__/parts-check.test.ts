import { describe, expect, it } from "vitest";
import {
  aggregateNeeds, aggregateOpenDemand, applyPartAdded, computePartsStatus, countsAsOpenDemand, serviceIdsForTicket,
} from "../parts-check";
import type { ServicePartLink } from "../types";

const NOW = new Date("2026-10-13T12:00:00Z");
const links: ServicePartLink[] = [
  { service_id: "svc-screen", shared_sku: "SCR-IP13", qty: 1, part_name: "Skærm iPhone 13" },
  { service_id: "svc-combo", shared_sku: "SCR-IP13", qty: 1, part_name: null },
  { service_id: "svc-combo", shared_sku: "ADH-IP13", qty: 2, part_name: "Tape" },
];
const booked = (id: string, svc = "svc-screen", over: Record<string, unknown> = {}) => ({
  id, booking_details: { selected_services: [{ id: svc, name: "x", price_dkk: 1 }] }, services: null,
  paid: false, stripe_session_id: null, created_at: NOW.toISOString(), ...over,
});

describe("serviceIdsForTicket", () => {
  it("reads online bookings and in-store intake, skips custom services and duplicates", () => {
    expect(serviceIdsForTicket({ booking_details: { selected_services: [{ id: "a" }, { id: "a" }] }, services: null })).toEqual(["a"]);
    expect(serviceIdsForTicket({ booking_details: null, services: [{ id: "b" }, { id: "custom-123-ab" }, { name: "no id" }] })).toEqual(["b"]);
    expect(serviceIdsForTicket({ booking_details: "garbage", services: 42 })).toEqual([]);
  });
});

describe("aggregateNeeds", () => {
  it("sums the same part across services and keeps the first known name", () => {
    const needs = aggregateNeeds(["svc-screen", "svc-combo"], links);
    expect(needs.get("SCR-IP13")).toEqual({ qty: 2, name: "Skærm iPhone 13" });
    expect(needs.get("ADH-IP13")).toEqual({ qty: 2, name: "Tape" });
  });
  it("ignores links for services the ticket does not have", () => {
    expect(aggregateNeeds(["svc-screen"], links).has("ADH-IP13")).toBe(false);
  });
});

describe("countsAsOpenDemand", () => {
  it("drops abandoned prepaid checkouts after two hours, keeps everything else", () => {
    const old = new Date(NOW.getTime() - 3 * 3600_000).toISOString();
    expect(countsAsOpenDemand({ id: "x", stripe_session_id: "cs_1", paid: false, created_at: old }, NOW)).toBe(false);
    expect(countsAsOpenDemand({ id: "x", stripe_session_id: "cs_1", paid: false, created_at: NOW.toISOString() }, NOW)).toBe(true);
    expect(countsAsOpenDemand({ id: "x", stripe_session_id: "cs_1", paid: true, created_at: old }, NOW)).toBe(true);
    expect(countsAsOpenDemand({ id: "x", stripe_session_id: null, paid: false, created_at: old }, NOW)).toBe(true);
    expect(countsAsOpenDemand({ id: "x", stripe_session_id: "cs_1", paid: false, created_at: "not-a-date" }, NOW)).toBe(true);
  });
});

describe("aggregateOpenDemand", () => {
  it("counts what other open tickets still need, minus parts they already used", () => {
    const demand = aggregateOpenDemand(
      [booked("t1"), booked("t2"), booked("t3", "svc-combo")],
      links,
      [{ ticket_id: "t2", shared_sku: "SCR-IP13", qty: 1 }],
      NOW,
    );
    expect(demand.get("SCR-IP13")).toBe(2); // t1 1 + t2 0 + t3 1
    expect(demand.get("ADH-IP13")).toBe(2);
  });
});

describe("computePartsStatus", () => {
  const needs = () => aggregateNeeds(["svc-screen"], links);
  it("is ok when stock minus other open tickets covers the need", () => {
    expect(computePartsStatus({ needs: needs(), balances: new Map([["SCR-IP13", 2]]), otherDemand: new Map([["SCR-IP13", 1]]), ownTaken: new Map() }))
      .toEqual({ status: "ok", shortage: [] });
  });
  it("needs ordering when other open tickets already claim the last unit", () => {
    expect(computePartsStatus({ needs: needs(), balances: new Map([["SCR-IP13", 1]]), otherDemand: new Map([["SCR-IP13", 1]]), ownTaken: new Map() }))
      .toEqual({ status: "needs_order", shortage: [{ shared_sku: "SCR-IP13", name: "Skærm iPhone 13", needed: 1, available: 0 }] });
  });
  it("treats a part missing from the balances as zero, and negative stock as negative", () => {
    const r = computePartsStatus({ needs: needs(), balances: new Map([["OTHER", 9]]), otherDemand: new Map(), ownTaken: new Map() });
    expect(r.shortage[0]).toMatchObject({ available: 0 });
    const neg = computePartsStatus({ needs: needs(), balances: new Map([["SCR-IP13", -2]]), otherDemand: new Map(), ownTaken: new Map() });
    expect(neg.shortage[0]).toMatchObject({ available: -2 });
  });
  it("is unknown when the lagersystem could not be reached", () => {
    expect(computePartsStatus({ needs: needs(), balances: null, otherDemand: new Map(), ownTaken: new Map() }))
      .toEqual({ status: "unknown", shortage: [] });
  });
  it("is ok without asking the lagersystem when the ticket already used its parts", () => {
    expect(computePartsStatus({ needs: needs(), balances: null, otherDemand: new Map(), ownTaken: new Map([["SCR-IP13", 1]]) }))
      .toEqual({ status: "ok", shortage: [] });
  });
  it("only counts what a partly used part still needs (need 2, taken 1)", () => {
    const n = new Map([["SCR-IP13", { qty: 2, name: "Skærm" }]]);
    expect(computePartsStatus({ needs: n, balances: new Map([["SCR-IP13", 1]]), otherDemand: new Map(), ownTaken: new Map([["SCR-IP13", 1]]) }))
      .toEqual({ status: "ok", shortage: [] });
    expect(computePartsStatus({ needs: n, balances: new Map([["SCR-IP13", 0]]), otherDemand: new Map(), ownTaken: new Map([["SCR-IP13", 1]]) }))
      .toEqual({ status: "needs_order", shortage: [{ shared_sku: "SCR-IP13", name: "Skærm", needed: 1, available: 0 }] });
  });
  it("is null (not checked) when no service has linked parts", () => {
    expect(computePartsStatus({ needs: new Map(), balances: new Map(), otherDemand: new Map(), ownTaken: new Map() }))
      .toEqual({ status: null, shortage: [] });
  });
  it("falls back to the sku as name", () => {
    const r = computePartsStatus({ needs: new Map([["X-1", { qty: 1, name: null }]]), balances: new Map(), otherDemand: new Map(), ownTaken: new Map() });
    expect(r.shortage[0].name).toBe("X-1");
  });
});

describe("applyPartAdded", () => {
  const line = (sku: string) => ({ shared_sku: sku, name: sku, needed: 1, available: 0 });
  it("clears the badge when the last missing part is added", () => {
    expect(applyPartAdded("needs_order", [line("A")], "A")).toEqual({ status: "ok", shortage: null, changed: true });
    expect(applyPartAdded("ordered", [line("A")], "A")).toEqual({ status: "ok", shortage: null, changed: true });
  });
  it("keeps the badge while other parts are still missing", () => {
    expect(applyPartAdded("needs_order", [line("A"), line("B")], "A")).toEqual({ status: "needs_order", shortage: [line("B")], changed: true });
  });
  it("does nothing for other statuses or unrelated parts", () => {
    expect(applyPartAdded("ok", null, "A").changed).toBe(false);
    expect(applyPartAdded("unknown", null, "A").changed).toBe(false);
    expect(applyPartAdded("needs_order", [line("B")], "A").changed).toBe(false);
  });
});
