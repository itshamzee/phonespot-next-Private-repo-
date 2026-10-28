import { describe, expect, it } from "vitest";
import { isPublicAttribute } from "../internal-attributes";

describe("isPublicAttribute", () => {
  it("skjuler interne nøgler fra AI-optagelsen", () => {
    for (const key of ["ai_read_text", "genuine", "udsalg", "_source", "source", "id", "cost_price", "supplier_id"]) {
      expect(isPublicAttribute(key)).toBe(false);
    }
  });
  it("viser almindelige specifikationer", () => {
    expect(isPublicAttribute("case_type")).toBe(true);
    expect(isPublicAttribute("color")).toBe(true);
  });
});
