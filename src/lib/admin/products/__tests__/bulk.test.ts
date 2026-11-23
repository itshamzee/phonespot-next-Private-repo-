import { describe, expect, it } from "vitest";
import { bulkChangeSchema, chunk, groupByPatch, planBulkChange, type BulkRow } from "../bulk";

const row = (over: Partial<BulkRow> = {}): BulkRow => ({ id: "a", title: "Cover", selling_price: 27900, sale_price: null, ...over });

describe("bulkChangeSchema", () => {
  it("afviser en tom ændring og ukendte felter", () => {
    expect(bulkChangeSchema.safeParse({}).success).toBe(false);
    expect(bulkChangeSchema.safeParse({ title: "x" }).success).toBe(false);
    expect(bulkChangeSchema.safeParse({ price: { mode: "percent", percent: 0 } }).success).toBe(false);
  });

  it("godtager status, pris og tilbud", () => {
    expect(bulkChangeSchema.safeParse({ status: "published" }).success).toBe(true);
    expect(bulkChangeSchema.safeParse({ price: { mode: "set", oere: 19900 } }).success).toBe(true);
    expect(bulkChangeSchema.safeParse({ sale: { mode: "clear" } }).success).toBe(true);
    expect(bulkChangeSchema.safeParse({ price: { mode: "set", oere: 0 } }).success).toBe(false);
  });
});

describe("planBulkChange", () => {
  it("sætter kun status, når kun status er valgt", () => {
    const plan = planBulkChange([row(), row({ id: "b", sale_price: 19900 })], { status: "published" });
    expect(plan.skipped).toEqual([]);
    expect(plan.updates).toEqual([
      { id: "a", patch: { status: "published" } },
      { id: "b", patch: { status: "published" } },
    ]);
  });

  it("sætter en fast pris", () => {
    const plan = planBulkChange([row()], { price: { mode: "set", oere: 19900 } });
    expect(plan.updates[0].patch).toEqual({ selling_price: 19900 });
  });

  it("regner procent ud på hele kroner", () => {
    const plan = planBulkChange([row({ selling_price: 27900 }), row({ id: "b", selling_price: 24900 })], { price: { mode: "percent", percent: -10 } });
    expect(plan.updates.map((u) => u.patch.selling_price)).toEqual([25100, 22400]);
  });

  it("springer over, når en gammel tilbudspris ville overhale den nye pris", () => {
    const plan = planBulkChange([row({ sale_price: 19900 })], { price: { mode: "set", oere: 14900 } });
    expect(plan.updates).toEqual([]);
    expect(plan.skipped[0].reason).toMatch(/nuværende tilbudspris/);
  });

  it("beholder en gammel tilbudspris, der stadig er lavere", () => {
    const plan = planBulkChange([row({ sale_price: 9900 })], { price: { mode: "set", oere: 14900 } });
    expect(plan.updates[0].patch).toEqual({ selling_price: 14900 });
  });

  it("sætter tilbud i procent af prisen", () => {
    const plan = planBulkChange([row({ selling_price: 24900 })], { sale: { mode: "percent", percent: 20 } });
    expect(plan.updates[0].patch).toEqual({ sale_price: 19900 });
  });

  it("regner tilbud ud fra den nye pris, når begge ændres", () => {
    const plan = planBulkChange([row()], { price: { mode: "set", oere: 20000 }, sale: { mode: "percent", percent: 50 } });
    expect(plan.updates[0].patch).toEqual({ selling_price: 20000, sale_price: 10000 });
  });

  it("springer over en tilbudspris, der ikke er lavere end prisen", () => {
    const plan = planBulkChange([row({ selling_price: 14900 }), row({ id: "b", selling_price: 27900 })], { sale: { mode: "set", oere: 19900 } });
    expect(plan.skipped.map((s) => s.id)).toEqual(["a"]);
    expect(plan.updates).toEqual([{ id: "b", patch: { sale_price: 19900 } }]);
  });

  it("fjerner tilbud", () => {
    const plan = planBulkChange([row({ sale_price: 19900 })], { sale: { mode: "clear" } });
    expect(plan.updates[0].patch).toEqual({ sale_price: null });
  });

  it("springer over en pris under 1 kr.", () => {
    const plan = planBulkChange([row({ selling_price: 300 })], { price: { mode: "percent", percent: -90 } });
    expect(plan.updates).toEqual([]);
    expect(plan.skipped).toHaveLength(1);
  });

  it("ændrer intet på et produkt, der springes over", () => {
    const plan = planBulkChange([row({ selling_price: 14900 })], { status: "published", sale: { mode: "set", oere: 19900 } });
    expect(plan.updates).toEqual([]);
  });
});

describe("groupByPatch", () => {
  it("samler ens ændringer og skelner mellem 'fjern tilbud' og 'rør ikke tilbud'", () => {
    const groups = groupByPatch([
      { id: "a", patch: { selling_price: 100 } },
      { id: "b", patch: { selling_price: 100 } },
      { id: "c", patch: { selling_price: 100, sale_price: null } },
      { id: "d", patch: { selling_price: 200 } },
    ]);
    expect(groups.map((g) => g.ids)).toEqual([["a", "b"], ["c"], ["d"]]);
  });
});

describe("chunk", () => {
  it("deler i bidder", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
});
