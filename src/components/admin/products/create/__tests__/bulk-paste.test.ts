import { describe, expect, it } from "vitest";
import { parseRows } from "../bulk-paste";
import { parseKrToOere } from "../money";

describe("parseKrToOere", () => {
  it.each([
    ["199", 19900],
    ["1.299", 129900],
    ["1299,50", 129950],
    ["1299.50", 129950],
    ["299 kr", 29900],
    ["", null],
    ["abc", null],
  ])("%s → %s", (input, expected) => {
    expect(parseKrToOere(input)).toBe(expected);
  });
});

describe("parseRows", () => {
  it("læser tab-separerede rækker og springer overskriftsrækken over", () => {
    const rows = parseRows(
      "Navn\tMærke\tModeller\tPris\n" +
      "Swissten Clear Cover {model}\tSwissten\tiPhone 17 Pro, iphone-17\t199\t60\t5701234567890\thttps://x/y.jpg\t10\n",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: "Swissten Clear Cover {model}",
      brand: "Swissten",
      models: ["iphone-17-pro", "iphone-17"],
      unknownModels: [],
      price: 19900,
      costPrice: 6000,
      ean: "5701234567890",
      image: "https://x/y.jpg",
      online: 10,
      error: null,
    });
  });

  it("markerer rækker med manglende pris eller ukendt model", () => {
    const rows = parseRows("Kabel\tRexus\t\t\nCover {model}\tRexus\tNokia 3310\t99\n");
    expect(rows[0].error).toMatch(/Pris/);
    expect(rows[1].error).toMatch(/Nokia 3310/);
  });
});
