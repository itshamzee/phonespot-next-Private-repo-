import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PickupLine, isOpenNow } from "@/components/product/pickup-line";
import { STORES } from "@/lib/store-config";

describe("PickupLine", () => {
  it("names the store and its street when the unit is in a shop", () => {
    render(<PickupLine stockByStore={[{ slug: "vejle", count: 1 }]} />);
    expect(screen.getByText(/Vejle/)).toBeInTheDocument();
    expect(screen.getByText(/Løversysselvej 3B/)).toBeInTheDocument();
  });

  it("mentions both stores when stock is in both", () => {
    render(<PickupLine stockByStore={[{ slug: "vejle", count: 1 }, { slug: "slagelse", count: 2 }]} />);
    expect(screen.getByText(/Vejle/)).toBeInTheDocument();
    expect(screen.getByText(/Slagelse/)).toBeInTheDocument();
  });

  it("falls back to delivery copy and never claims pickup when no shop holds stock", () => {
    render(<PickupLine stockByStore={[]} />);
    expect(screen.queryByText(/hentes/i)).not.toBeInTheDocument();
    expect(screen.getByText(/levering/i)).toBeInTheDocument();
  });
});

// Regression coverage for the Europe/Copenhagen-vs-server-UTC bug: Vercel's Node
// runtime has no TZ set (so its local clock is UTC), but STORES.*.hours is
// written in Danish wall-clock time. isOpenNow/PickupLine must evaluate opening
// hours against explicit Europe/Copenhagen time, never the runtime's own local
// getters — otherwise the copy is wrong by 1-2 hours on every SSR/ISR render.
//
// Instants below are pinned to real calendar dates (2026-08-10 is a Monday,
// 2026-08-09 the preceding Sunday) with the UTC offset worked out by hand
// (Europe/Copenhagen is UTC+2 in August/CEST) so each test asserts what the
// *Danish* wall clock reads, independent of the machine running the suite.
describe("isOpenNow — Europe/Copenhagen, not server-local time", () => {
  it("18:00 Danish time on a weekday is closed (Vejle closes 17:30)", () => {
    // 2026-08-10T16:00:00Z = 2026-08-10 18:00 Europe/Copenhagen (UTC+2, Monday)
    const danish18h = new Date("2026-08-10T16:00:00Z");
    expect(isOpenNow(STORES.vejle.hours, danish18h)).toBe(false);
  });

  it("18:00 Danish time never renders an 'i dag' pickup claim", () => {
    const danish18h = new Date("2026-08-10T16:00:00Z");
    render(<PickupLine stockByStore={[{ slug: "vejle", count: 1 }]} now={danish18h} />);
    expect(screen.getByText(/Vejle/)).toBeInTheDocument();
    expect(screen.queryByText(/i dag/i)).not.toBeInTheDocument();
  });

  it("11:00 Danish time on a weekday is open (naive UTC reading would see 09:00, before Vejle's 10:00 open)", () => {
    // 2026-08-10T09:00:00Z = 2026-08-10 11:00 Europe/Copenhagen (Monday)
    const danish11h = new Date("2026-08-10T09:00:00Z");
    expect(isOpenNow(STORES.vejle.hours, danish11h)).toBe(true);
  });

  it("11:00 Danish time renders the 'i dag' pickup claim", () => {
    const danish11h = new Date("2026-08-10T09:00:00Z");
    render(<PickupLine stockByStore={[{ slug: "vejle", count: 1 }]} now={danish11h} />);
    expect(screen.getByText(/i dag/i)).toBeInTheDocument();
  });

  it("on a Sunday, uses the Sunday window rather than the weekday window", () => {
    // 2026-08-09T14:00:00Z = 2026-08-09 16:00 Europe/Copenhagen (Sunday).
    // Synthetic hours: 16:00 falls outside the (narrow) weekday window but
    // inside the (wide) Sunday window — only correct if isOpenNow branches on
    // the *Danish* weekday and picks `hours.sunday`, not `hours.weekdays`.
    const sunday16h = new Date("2026-08-09T14:00:00Z");
    const hours = { weekdays: "09:00 – 10:00", saturday: "09:00 – 10:00", sunday: "09:00 – 18:00" };
    expect(isOpenNow(hours, sunday16h)).toBe(true);
  });
});
