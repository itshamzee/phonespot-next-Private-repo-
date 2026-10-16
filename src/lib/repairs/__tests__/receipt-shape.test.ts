import { describe, expect, it } from "vitest";
import { caseLines, computeCaseTotals, type CaseItemRow } from "@/lib/repairs/case-money";
import { agreedPriceNote, shapeReceiptMoney, sumReceiptMoney } from "@/lib/repairs/receipt-shape";

function item(over: Partial<CaseItemRow> & { id: string }): CaseItemRow {
  return {
    kind: "repair",
    description: "Skærmskift",
    qty: 1,
    unit_price_oere: 100_000,
    stock_status: "none",
    created_at: "2026-10-01T10:00:00Z",
    ...over,
  };
}

function build(items: CaseItemRow[], list: Record<string, number>, deposits: number[] = [], booking?: object) {
  const lines = caseLines({ services: [] }, [], items);
  const totals = computeCaseTotals(lines, deposits.map((d) => ({ amount_oere: d })));
  void booking;
  return shapeReceiptMoney(lines, totals, new Map(Object.entries(list)));
}

describe("shapeReceiptMoney", () => {
  it("viser produkter og enheder, ikke interne delrækker", () => {
    const m = build(
      [
        item({ id: "r", created_at: "2026-10-01T10:00:00Z" }),
        item({ id: "p", kind: "part", parent_item_id: "r", description: "Skærm OEM", unit_price_oere: 0, created_at: "2026-10-01T10:01:00Z" }),
        item({ id: "g", kind: "product", description: "Beskyttelsesglas", qty: 2, unit_price_oere: 9_900, created_at: "2026-10-01T10:02:00Z" }),
      ],
      { r: 100_000, p: 0, g: 9_900 },
    );
    expect(m.lines.map((l) => l.name)).toEqual(["Skærmskift", "Beskyttelsesglas"]);
    expect(m.lines[1]).toMatchObject({ qty: 2, total_oere: 19_800 });
    expect(m.total_oere).toBe(119_800);
    expect(m.rest_oere).toBe(119_800);
  });

  it("markerer afvigende pris med listepris, uden intern begrundelse", () => {
    const m = build([item({ id: "r", unit_price_oere: 90_000 })], { r: 119_900 });
    expect(m.lines[0].list_unit_oere).toBe(119_900);
    expect(agreedPriceNote(m.lines[0])).toBe("Aftalt pris (listepris 1.199 kr.)");
    expect(JSON.stringify(m)).not.toMatch(/reason|begrund/i);
  });

  it("markerer ikke linjer med listepris, fritekst eller uden kendt listepris", () => {
    const m = build(
      [
        item({ id: "a", created_at: "2026-10-01T10:00:00Z" }),
        item({ id: "b", kind: "free_text", description: "Rens", unit_price_oere: 5_000, created_at: "2026-10-01T10:01:00Z" }),
      ],
      { a: 100_000, b: 10_000 },
    );
    expect(m.lines.every((l) => l.list_unit_oere === null)).toBe(true);
    expect(agreedPriceNote(m.lines[0])).toBeNull();
  });

  it("trækker depositum fra og giver rest", () => {
    const m = build([item({ id: "r" })], { r: 100_000 }, [30_000]);
    expect(m).toMatchObject({ subtotal_oere: 100_000, total_oere: 100_000, deposits_oere: 30_000, rest_oere: 70_000 });
  });

  it("virker for ældre sager uden items (ticket.services)", () => {
    const lines = caseLines({ services: [{ name: "Batteri", price_dkk: 499 }] });
    const m = shapeReceiptMoney(lines, computeCaseTotals(lines, []));
    expect(m.lines).toEqual([{ name: "Batteri", qty: 1, unit_oere: 49_900, total_oere: 49_900, list_unit_oere: null, sold: false }]);
    expect(m.total_oere).toBe(49_900);
  });

  it("viser rabat fra webbooking", () => {
    const booking = { selected_services: [{ name: "Skærm", price_dkk: 1000 }], total_price_dkk: 900 };
    const lines = caseLines({ booking_details: booking });
    const m = shapeReceiptMoney(lines, computeCaseTotals(lines, [], { booking }));
    expect(m).toMatchObject({ subtotal_oere: 100_000, discount_oere: 10_000, total_oere: 90_000 });
  });

  it("summerer flere sager", () => {
    const a = build([item({ id: "r" })], {}, [20_000]);
    const b = build([item({ id: "r2", unit_price_oere: 50_000 })], {});
    expect(sumReceiptMoney([a, b])).toMatchObject({ total_oere: 150_000, deposits_oere: 20_000, rest_oere: 130_000 });
  });
});
