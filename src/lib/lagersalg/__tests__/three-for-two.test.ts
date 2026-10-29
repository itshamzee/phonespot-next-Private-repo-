import { describe, it, expect } from "vitest";
import { threeForTwo, isFreeBundleLine } from "../three-for-two";
import { isLagersalg } from "../is-lagersalg";

const L = (key: string, unitPriceOere: number, quantity = 1, lagersalg = true) => ({ key, unitPriceOere, quantity, lagersalg });

describe("isLagersalg", () => {
  it("er sand for udsalg=Ja uden for glas", () => {
    expect(isLagersalg({ subcategory: "cover", attributes: { udsalg: "Ja" } })).toBe(true);
    expect(isLagersalg({ subcategory: "bag", attributes: { udsalg: "Ja" } })).toBe(true);
  });
  it("er falsk for glas, manglende flag og null", () => {
    expect(isLagersalg({ subcategory: "screen_protector", attributes: { udsalg: "Ja" } })).toBe(false);
    expect(isLagersalg({ subcategory: "cover", attributes: {} })).toBe(false);
    expect(isLagersalg({ subcategory: "cover", attributes: null })).toBe(false);
  });
});

describe("threeForTwo", () => {
  it("giver ingen rabat ved 0, 1 og 2 enheder, og siger hvor mange der mangler", () => {
    expect(threeForTwo([])).toMatchObject({ totalOere: 0, freeUnits: 0, lagersalgUnits: 0, unitsToNextFree: null });
    expect(threeForTwo([L("a", 5900)])).toMatchObject({ totalOere: 0, unitsToNextFree: 2 });
    expect(threeForTwo([L("a", 5900), L("b", 7900)])).toMatchObject({ totalOere: 0, unitsToNextFree: 1 });
  });
  it("gør den billigste af tre gratis og bogfører rabatten på dens linje", () => {
    const r = threeForTwo([L("a", 7900), L("b", 5900), L("c", 9900)]);
    expect(r).toMatchObject({ totalOere: 5900, freeUnits: 1, lagersalgUnits: 3, unitsToNextFree: null });
    expect(r.byKey).toEqual({ b: { discountOere: 5900, freeUnits: 1 } });
  });
  it("giver to gratis ved seks og én ved fem", () => {
    const six = threeForTwo([L("a", 9900, 2), L("b", 7900, 2), L("c", 5900, 2)]);
    expect(six.totalOere).toBe(11800);
    expect(six.byKey).toEqual({ c: { discountOere: 11800, freeUnits: 2 } });
    const five = threeForTwo([L("a", 9900, 2), L("b", 7900, 2), L("c", 5900, 1)]);
    expect(five).toMatchObject({ totalOere: 5900, freeUnits: 1, unitsToNextFree: 1 });
  });
  it("tæller antal på samme linje: tre ens covers giver ét gratis", () => {
    const r = threeForTwo([L("a", 5900, 3)]);
    expect(r.byKey).toEqual({ a: { discountOere: 5900, freeUnits: 1 } });
  });
  it("ignorerer ikke-lagersalgsvarer helt", () => {
    const r = threeForTwo([L("a", 5900), L("b", 5900), L("dyr", 599900, 1, false)]);
    expect(r).toMatchObject({ totalOere: 0, lagersalgUnits: 2, unitsToNextFree: 1 });
  });
  it("vælger de billigste på tværs af grupper, ikke pr. gruppe", () => {
    // 4 enheder: 100, 100, 100, 10 → én gratis = den til 10
    const r = threeForTwo([L("a", 10000, 3), L("b", 1000)]);
    expect(r.byKey).toEqual({ b: { discountOere: 1000, freeUnits: 1 } });
  });
});

describe("isFreeBundleLine", () => {
  it("er gratis når linjerabatten dækker hele linjeprisen", () => {
    expect(isFreeBundleLine({ totalOere: 5900, discountOere: 5900 })).toBe(true);
  });
  it("er ikke gratis ved delvis eller ingen rabat", () => {
    expect(isFreeBundleLine({ totalOere: 5900, discountOere: 1000 })).toBe(false);
    expect(isFreeBundleLine({ totalOere: 5900, discountOere: null })).toBe(false);
  });
  it("en 0 kr.-linje er ikke markeret som 3 for 2", () => {
    expect(isFreeBundleLine({ totalOere: 0, discountOere: 0 })).toBe(false);
  });
});
