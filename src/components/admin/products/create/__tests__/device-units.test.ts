import { describe, expect, it } from "vitest";
import { buildUnitPayloads, emptyUnitRow, unitRowError } from "../device-units";

describe("unitRowError", () => {
  it("kræver salgspris, indkøbspris og lagerplads", () => {
    expect(unitRowError(emptyUnitRow())).toMatch(/Salgspris/);
    expect(unitRowError(emptyUnitRow({ price: "1999" }))).toMatch(/Indkøbspris/);
    expect(unitRowError(emptyUnitRow({ price: "1999", purchasePrice: "1200" }))).toMatch(/lagerplads/);
    expect(unitRowError(emptyUnitRow({ price: "1999", purchasePrice: "1200", locationId: "vejle" }))).toBeNull();
  });
  it("afviser IMEI på flere enheder ad gangen", () => {
    expect(unitRowError(emptyUnitRow({ price: "1", purchasePrice: "1", locationId: "x", count: "2", imei: "123" }))).toMatch(/IMEI/);
  });
});

describe("buildUnitPayloads", () => {
  it("laver ét kald pr. eksemplar med priser i øre og listed-status", () => {
    const rows = [
      emptyUnitRow({ grade: "B", storage: "128GB", color: "Sort", price: "1.999", purchasePrice: "1200", locationId: "vejle", count: "2" }),
      emptyUnitRow({ grade: "A", price: "2499", purchasePrice: "1500", locationId: "online", imei: "356", batteryHealth: "91" }),
    ];
    const payloads = buildUnitPayloads("tpl", rows);
    expect(payloads).toHaveLength(3);
    expect(payloads[0]).toEqual({
      template_id: "tpl", grade: "B", storage: "128GB", color: "Sort", purchase_price: 120000, selling_price: 199900,
      location_id: "vejle", imei: undefined, battery_health: undefined, vat_scheme: "brugtmoms", status: "listed",
    });
    expect(payloads[2]).toMatchObject({ grade: "A", imei: "356", battery_health: 91, location_id: "online" });
  });
  it("kaster med rækkens fejl", () => {
    expect(() => buildUnitPayloads("tpl", [emptyUnitRow()])).toThrow(/Salgspris/);
    expect(() => buildUnitPayloads("tpl", [])).toThrow(/mindst én/);
  });
});
