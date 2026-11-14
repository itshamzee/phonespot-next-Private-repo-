import { expect, it } from "vitest";
import { buildCatalogRows, toCsv } from "../spare-parts-export";

it("escapes commas, quotes and newlines; empty for null", () => {
  expect(toCsv([{ a: "x,y", b: 'sagde "hej"', c: null, d: 3 }, { a: "linje\nto", b: "", c: "z", d: 0 }])).toBe(
    'a,b,c,d\n"x,y","sagde ""hej""",,3\n"linje\nto",,z,0\n',
  );
});

it("joins quality tier and per-store stock", () => {
  const rows = buildCatalogRows(
    [{ id: "p1", title: "Skærm iPhone 13", brand: "Apple", device_model: "iPhone 13", product_number: "FD-1", ean: null, cost_price: 41500, spare_part_quality_tiers: { name: "Soft OLED" } }],
    new Map([["p1", { slagelse: 3, vejle: 1 }]]),
  );
  expect(rows).toEqual([{ phonespot_id: "p1", title: "Skærm iPhone 13", brand: "Apple", device_model: "iPhone 13", quality: "Soft OLED", product_number: "FD-1", ean: null, cost_price_ore: 41500, slagelse_qty: 3, vejle_qty: 1 }]);
});
