import { describe, it, expect } from "vitest";
import { emptyForm, idNumberError, toDraftPayload } from "../_components/receipt-form";

const CPR_VARIANTS = ["010190-1234", "0101901234", "010190 1234", "010190–1234", "010190—1234", " 0101 90-12 34 "];

describe("CPR i ID-nummerfeltet", () => {
  it.each(CPR_VARIANTS)("warns for %j", (v) => {
    expect(idNumberError(v)).toBe("Det ligner et CPR-nummer. Skriv ID'ets nummer.");
  });

  it("does not warn for an ordinary ID number", () => {
    expect(idNumberError("AB123456")).toBeNull();
    expect(idNumberError("123456789")).toBeNull();
  });

  it.each(CPR_VARIANTS)("never sends %j to the server", (v) => {
    const form = {
      ...emptyForm(),
      id_type: "pas" as const,
      id_number: v,
      items: [{ ...emptyForm().items[0], priceKr: "2500" }],
    };
    expect(toDraftPayload(form).id_number).toBeNull();
  });
});
