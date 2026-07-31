import { describe, it, expect } from "vitest";
import { deriveTradeInStatus } from "@/lib/supabase/trade-in-types";

describe("deriveTradeInStatus with declines", () => {
  it("is afvist when a decline exists and there is no offer", () => {
    expect(deriveTradeInStatus("ny", [], [], [{ id: "d1" }])).toBe("afvist");
  });

  it("is afvist when a decline exists after a pending offer", () => {
    expect(deriveTradeInStatus("ny", [{ status: "pending" }], [], [{ id: "d1" }])).toBe("afvist");
  });

  it("keeps accepted ahead of a decline", () => {
    expect(deriveTradeInStatus("ny", [{ status: "accepted" }], [], [{ id: "d1" }])).toBe("accepteret");
  });

  it("keeps a received device ahead of a decline", () => {
    expect(deriveTradeInStatus("ny", [], [{ status: "draft" }], [{ id: "d1" }])).toBe("modtaget");
  });

  it("keeps a paid receipt ahead of a decline", () => {
    expect(deriveTradeInStatus("ny", [], [{ status: "paid" }], [{ id: "d1" }])).toBe("betalt");
  });

  it("behaves exactly as before when no declines are passed", () => {
    expect(deriveTradeInStatus("ny", [{ status: "pending" }], [])).toBe("tilbud_sendt");
    expect(deriveTradeInStatus("ny", [], [])).toBe("ny");
    expect(deriveTradeInStatus("lukket", [], [])).toBe("lukket");
    expect(deriveTradeInStatus("ny", [{ status: "rejected" }], [])).toBe("afvist");
  });
});

describe("deriveTradeInStatus through the shipment", () => {
  const accepted = [{ status: "accepted" as const }];

  it("stays accepted while no label exists — an in-store drop-off never gets one", () => {
    expect(deriveTradeInStatus("ny", accepted, [], [], {})).toBe("accepteret");
  });

  it("waits for dispatch once a label exists but nothing has moved", () => {
    expect(
      deriveTradeInStatus("ny", accepted, [], [], { label: { in_transit_at: null, delivered_at: null } }),
    ).toBe("afventer_forsendelse");
  });

  it("reports transit and delivery from the carrier", () => {
    expect(
      deriveTradeInStatus("ny", accepted, [], [], { label: { in_transit_at: "2026-07-30T10:00:00Z" } }),
    ).toBe("paa_vej");
    expect(
      deriveTradeInStatus("ny", accepted, [], [], {
        label: { in_transit_at: "2026-07-30T10:00:00Z", delivered_at: "2026-07-31T09:00:00Z" },
      }),
    ).toBe("leveret");
  });

  it("separates the carrier's 'delivered' from our 'received'", () => {
    // The whole point: a delivered parcel nobody has opened is not received.
    const delivered = { label: { delivered_at: "2026-07-31T09:00:00Z" } };
    expect(deriveTradeInStatus("ny", accepted, [], [], delivered)).toBe("leveret");
    expect(
      deriveTradeInStatus("ny", accepted, [], [], { ...delivered, receivedAt: "2026-07-31T11:00:00Z" }),
    ).toBe("modtaget");
  });

  it("moves on to assessed and paid via the slutseddel", () => {
    expect(deriveTradeInStatus("ny", accepted, [{ status: "draft" }], [], {})).toBe("modtaget");
    expect(deriveTradeInStatus("ny", accepted, [{ status: "confirmed" }], [], {})).toBe("vurderet");
    expect(deriveTradeInStatus("ny", accepted, [{ status: "paid" }], [], {})).toBe("betalt");
    expect(deriveTradeInStatus("ny", accepted, [{ status: "completed" }], [], {})).toBe("betalt");
  });

  it("reads rows from before received_at existed as received", () => {
    // Backwards compatibility: every historical row has a slutseddel and no
    // received_at, and must not fall back to a shipping status.
    expect(
      deriveTradeInStatus("ny", accepted, [{ status: "draft" }], [], {
        label: { delivered_at: null, in_transit_at: null },
      }),
    ).toBe("modtaget");
  });

  it("ignores shipment progress when the lead never got an offer", () => {
    expect(deriveTradeInStatus("ny", [], [], [], { label: { delivered_at: "x" } })).toBe("ny");
  });
});
