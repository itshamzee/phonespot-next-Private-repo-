import { describe, expect, it } from "vitest";
import { caseLines, computeCaseTotals, formatKr } from "../case-money";
import { buildTimeline } from "../case-timeline";

describe("rest ved afhentning", () => {
  const services = [
    { id: "1", name: "Skærmskift", price_dkk: 1199 },
    { id: "2", name: "Bagglas", price_dkk: 499 },
  ];

  it("deducts deposits from the total", () => {
    const totals = computeCaseTotals(caseLines({ services }), [{ amount_oere: 50000 }]);
    expect(totals.total_oere).toBe(169800);
    expect(totals.deposits_oere).toBe(50000);
    expect(totals.rest_oere).toBe(119800);
    expect(formatKr(totals.rest_oere)).toBe("1.198,00 kr.");
  });

  it("never goes below zero and reports overpaid deposits", () => {
    const totals = computeCaseTotals(caseLines({ services }), [{ amount_oere: 100000 }, { amount_oere: 100000 }]);
    expect(totals.rest_oere).toBe(0);
    expect(totals.overpaid_oere).toBe(30200);
  });

  it("a paid case has no rest", () => {
    expect(computeCaseTotals(caseLines({ services }), [], { paid: true }).rest_oere).toBe(0);
  });

  it("uses the web booking total (discount) and the glass line", () => {
    const booking = {
      selected_services: [{ id: "x", name: "Batteri", price_dkk: 500 }],
      includes_tempered_glass: true,
      total_price_dkk: 539.1,
      discount_percent: 10,
    };
    const lines = caseLines({ booking_details: booking });
    expect(lines.map((l) => l.name)).toEqual(["Batteri", "Beskyttelsesglas"]);
    const totals = computeCaseTotals(lines, [], { booking });
    expect(totals.subtotal_oere).toBe(59900);
    expect(totals.total_oere).toBe(53910);
    expect(totals.discount_oere).toBe(5990);
  });

  it("falls back to the latest non-declined quote when there are no lines", () => {
    const lines = caseLines({}, [
      { price_dkk: 899, created_at: "2026-10-01" },
      { price_dkk: 500, declined_at: "x", created_at: "2026-10-02" },
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].total_oere).toBe(89900);
  });
});

describe("timeline", () => {
  it("merges status, sms, notes and deposits newest first", () => {
    const items = buildTimeline({
      ticket: {
        id: "t",
        created_at: "2026-09-18T09:00:00Z",
        internal_notes: [{ text: "Del bestilt", author: "Mikkel", timestamp: "2026-09-18T10:00:00Z" }],
      },
      logs: [{ id: "l1", old_status: "modtaget", new_status: "i_gang", note: null, created_at: "2026-09-19T09:00:00Z" }],
      sms: [{ id: "s1", message: "Hej", status: "sent", created_at: "2026-09-18T09:05:00Z" }],
      deposits: [{ id: "d1", order_id: "o1", amount_oere: 50000, paid_at: "2026-09-18T09:30:00Z", method: "card", receipt_no: "V1-000412" }],
    });
    expect(items.map((i) => i.kind)).toEqual(["status", "note", "depositum", "sms", "oprettet"]);
    expect(items[2].text).toBe("Depositum 500 kr. betalt med kort, bon V1-000412");
  });
});
