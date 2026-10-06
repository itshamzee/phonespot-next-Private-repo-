import { describe, it, expect } from "vitest";
import { checkTerminalReceipt, withTerminalReceipt } from "../terminal-receipt";

describe("terminal receipt number", () => {
  it("trims, treats empty as not given", () => {
    expect(checkTerminalReceipt("  AB-123 ")).toEqual({ ok: true, value: "AB-123" });
    expect(checkTerminalReceipt("   ")).toEqual({ ok: true, value: null });
    expect(checkTerminalReceipt(undefined)).toEqual({ ok: true, value: null });
  });

  it("allows only letters, digits and hyphen, max 40", () => {
    expect(checkTerminalReceipt("12 34").ok).toBe(false);
    expect(checkTerminalReceipt("12/34").ok).toBe(false);
    expect(checkTerminalReceipt("a".repeat(40)).ok).toBe(true);
    expect(checkTerminalReceipt("a".repeat(41)).ok).toBe(false);
  });

  it("without a number the payment lines are the very same array (payload unchanged)", () => {
    const lines = [{ type: "kort_terminal", amountOere: 100 }];
    expect(withTerminalReceipt(lines, "")).toBe(lines);
    expect(withTerminalReceipt(lines, undefined)).toBe(lines);
    expect(withTerminalReceipt(lines, "bad value!")).toBe(lines);
    expect(JSON.stringify(withTerminalReceipt(lines, ""))).toBe('[{"type":"kort_terminal","amountOere":100}]');
  });

  it("puts the number on the first card line only", () => {
    const lines = [
      { type: "kontant", amountOere: 50 },
      { type: "kort_terminal", amountOere: 100 },
      { type: "kort_terminal", amountOere: 200 },
    ];
    expect(withTerminalReceipt(lines, " 0042 ")).toEqual([
      { type: "kontant", amountOere: 50 },
      { type: "kort_terminal", amountOere: 100, reference: "0042" },
      { type: "kort_terminal", amountOere: 200 },
    ]);
  });
});
