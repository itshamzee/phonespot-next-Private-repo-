import { describe, expect, it } from "vitest";
import { deltaText, deltaTone, kr, pct } from "../format";

describe("kr", () => {
  it("øre til hele kroner med dansk tusindtalsseparator", () => {
    expect(kr(2748500)).toBe("27.485 kr.");
  });
  it("negative beløb", () => {
    expect(kr(-150000)).toBe("-1.500 kr.");
  });
  it("aldrig -0", () => {
    expect(kr(-49)).toBe("0 kr.");
  });
});

describe("pct", () => {
  it("én decimal med komma", () => {
    expect(pct(36.4)).toBe("36,4 %");
  });
  it("null bliver en tankestreg", () => {
    expect(pct(null)).toBe("–");
  });
});

describe("deltaTone og deltaText", () => {
  it("op, ned og ingen", () => {
    expect(deltaTone(12)).toBe("up");
    expect(deltaTone(0)).toBe("up");
    expect(deltaTone(-3.2)).toBe("down");
    expect(deltaTone(null)).toBe("none");
  });
  it("fortegn og ægte minus", () => {
    expect(deltaText(12.34)).toBe("+12,3 %");
    expect(deltaText(-4.1)).toBe("−4,1 %");
    expect(deltaText(null)).toBe("");
  });
});
