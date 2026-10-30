import { describe, expect, it } from "vitest";
import { boxLabel, boxesLabel, picksForOrder } from "../boxes";

describe("kassenumre", () => {
  it("formaterer kassenumre", () => {
    expect(boxLabel(1)).toBe("Kasse 01");
    expect(boxLabel(12)).toBe("Kasse 12");
    expect(boxesLabel([])).toBe("Ingen kasse");
    expect(boxesLabel([3, 1])).toBe("Kasse 01, 03");
  });
});

describe("picksForOrder", () => {
  it("samler kassenumre pr. produkt, stigende og unikke", async () => {
    const calls: unknown[][] = [];
    const rows = [
      { product_id: "A", sale_boxes: { number: 3 } },
      { product_id: "A", sale_boxes: [{ number: 1 }] },
      { product_id: "A", sale_boxes: { number: 3 } },
      { product_id: "B", sale_boxes: { number: 2 } },
    ];
    const db = {
      from: (t: string) => {
        calls.push(["from", t]);
        const q = {
          select: () => q,
          eq: async (c: string, v: string) => {
            calls.push(["eq", c, v]);
            return { data: rows, error: null };
          },
        };
        return q;
      },
    } as never;
    const out = await picksForOrder(db, "o1");
    expect(calls).toEqual([
      ["from", "sale_box_picks"],
      ["eq", "order_id", "o1"],
    ]);
    expect(Object.fromEntries(out)).toEqual({ A: [1, 3], B: [2] });
  });
});
