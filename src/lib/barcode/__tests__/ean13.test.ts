import { describe, expect, it } from "vitest";
import { ean13CheckDigit, ean13Pattern, ean13Svg, isValidEan13 } from "@/lib/barcode/ean13";
import { generateInternalEan } from "@/lib/supabase/accessories";

describe("ean13", () => {
  it("computes the check digit of a known code", () => {
    expect(ean13CheckDigit("400638133393")).toBe(1);
    expect(isValidEan13("4006381333931")).toBe(true);
    expect(isValidEan13("4006381333932")).toBe(false);
  });

  it("encodes a known code to the standard 95-module pattern", () => {
    expect(ean13Pattern("4006381333931")).toBe(
      // First digit 4 = parity LGLLGG for 0 0 6 3 8 1
      "101" + "0001101" + "0100111" + "0101111" + "0111101" + "0001001" + "0110011" +
        "01010" + "1000010" + "1000010" + "1000010" + "1110100" + "1000010" + "1100110" + "101",
    );
  });

  it("accepts internally generated codes and renders them", () => {
    const code = generateInternalEan();
    expect(isValidEan13(code)).toBe(true);
    expect(ean13Svg(code)).toContain(code);
  });
});
