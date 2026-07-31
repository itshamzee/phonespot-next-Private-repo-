import { describe, it, expect } from "vitest";
import { buildOfferLines, singleLine, readOfferLines } from "../offer-lines";
import type { LeadDevice } from "../lead-devices";

function device(model: string, brand = "Apple"): LeadDevice {
  return {
    device: {
      deviceType: "Telefon",
      brand,
      model,
      storage: "128GB",
      ram: "",
      useCustom: false,
      brandCustom: "",
      modelCustom: "",
    },
    condition: { screen: "", back: "", battery: "", allWorking: "", brokenParts: [], cloudLocked: "" },
  };
}

const TWO = [device("iPhone 12"), device("iPad Air 4")];

/* A caller sends kroner-free øre amounts, same as the rest of the buyback code. */
function input(entries: Array<Partial<{ index: number; amount_ore: number; excluded: boolean; reason_code: string | null }>>) {
  return entries.map((e, i) => ({
    index: e.index ?? i,
    amount_ore: e.amount_ore ?? 0,
    excluded: e.excluded ?? false,
    reason_code: e.reason_code ?? null,
  }));
}

describe("buildOfferLines", () => {
  it("totals the included lines", () => {
    const result = buildOfferLines(TWO, input([{ amount_ore: 180000 }, { amount_ore: 90000 }]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totalOre).toBe(270000);
    expect(result.lines).toHaveLength(2);
  });

  it("leaves excluded lines out of the total and zeroes their amount", () => {
    const result = buildOfferLines(
      TWO,
      input([{ amount_ore: 180000 }, { amount_ore: 90000, excluded: true, reason_code: "icloud_laast" }]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totalOre).toBe(180000);
    expect(result.lines[1].amount_ore).toBe(0);
    expect(result.lines[1].reason_code).toBe("icloud_laast");
  });

  it("freezes the device label on the line", () => {
    const result = buildOfferLines(TWO, input([{ amount_ore: 100 }, { amount_ore: 100 }]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines[0].label).toBe("Apple iPhone 12 128GB");
  });

  it("rejects an excluded line without a valid reason", () => {
    const missing = buildOfferLines(TWO, input([{ amount_ore: 180000 }, { excluded: true }]));
    expect(missing.ok).toBe(false);

    const bogus = buildOfferLines(
      TWO,
      input([{ amount_ore: 180000 }, { excluded: true, reason_code: "fordi_jeg_ikke_gider" }]),
    );
    expect(bogus.ok).toBe(false);
  });

  it("rejects an included line with no amount", () => {
    const result = buildOfferLines(TWO, input([{ amount_ore: 180000 }, { amount_ore: 0 }]));
    expect(result.ok).toBe(false);
  });

  it("rejects negative and fractional amounts", () => {
    expect(buildOfferLines(TWO, input([{ amount_ore: -100 }, { amount_ore: 100 }])).ok).toBe(false);
    expect(buildOfferLines(TWO, input([{ amount_ore: 100.5 }, { amount_ore: 100 }])).ok).toBe(false);
  });

  it("rejects an offer where every device is excluded — that is a decline, not an offer", () => {
    const result = buildOfferLines(
      TWO,
      input([
        { excluded: true, reason_code: "vandskade" },
        { excluded: true, reason_code: "icloud_laast" },
      ]),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects the wrong number of lines", () => {
    expect(buildOfferLines(TWO, input([{ amount_ore: 100 }])).ok).toBe(false);
    expect(
      buildOfferLines(TWO, input([{ amount_ore: 100 }, { amount_ore: 100 }, { amount_ore: 100 }])).ok,
    ).toBe(false);
  });

  it("rejects duplicate or out-of-range indexes", () => {
    expect(
      buildOfferLines(TWO, input([{ index: 0, amount_ore: 100 }, { index: 0, amount_ore: 100 }])).ok,
    ).toBe(false);
    expect(
      buildOfferLines(TWO, input([{ index: 0, amount_ore: 100 }, { index: 7, amount_ore: 100 }])).ok,
    ).toBe(false);
  });

  it("rejects input that is not a list of line objects", () => {
    expect(buildOfferLines(TWO, null).ok).toBe(false);
    expect(buildOfferLines(TWO, "1800").ok).toBe(false);
    expect(buildOfferLines(TWO, [{ nonsense: true }, { nonsense: true }]).ok).toBe(false);
  });

  it("rejects a lead with no devices", () => {
    expect(buildOfferLines([], input([])).ok).toBe(false);
  });

  it("returns a Danish error message the admin can act on", () => {
    const result = buildOfferLines(TWO, input([{ amount_ore: 180000 }, { amount_ore: 0 }]));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/beløb/i);
  });
});

describe("singleLine", () => {
  it("describes a one-device lead", () => {
    const lines = singleLine([device("iPhone 12")], 180000);
    expect(lines).toEqual([
      { index: 0, label: "Apple iPhone 12 128GB", amount_ore: 180000, excluded: false, reason_code: null },
    ]);
  });

  it("returns nothing for a lead that is not a single device", () => {
    expect(singleLine([], 180000)).toBeNull();
    expect(singleLine(TWO, 180000)).toBeNull();
  });
});

describe("readOfferLines", () => {
  it("reads back what was written", () => {
    const written = singleLine([device("iPhone 12")], 180000);
    expect(readOfferLines(JSON.parse(JSON.stringify(written)))).toEqual(written);
  });

  it("returns null for offers created before the column existed", () => {
    expect(readOfferLines(null)).toBeNull();
    expect(readOfferLines(undefined)).toBeNull();
  });

  it("returns null rather than throwing on malformed content", () => {
    expect(readOfferLines("[]")).toBeNull();
    expect(readOfferLines([{ label: "kun et navn" }])).toBeNull();
    expect(readOfferLines([])).toBeNull();
  });
});
