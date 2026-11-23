import { describe, expect, it } from "vitest";
import { invoiceLegalEntity, receiptLegalLine } from "@/lib/legal-entity";

describe("receiptLegalLine", () => {
  it("keeps the legacy text when there is no snapshot", () => {
    expect(receiptLegalLine({ legal_name: null, legal_cvr: null })).toBe("CVR: 44588819");
  });
  it("uses the snapshot", () => {
    expect(receiptLegalLine({ legal_name: "PhoneGo ApS", legal_cvr: "38688766" })).toBe("PhoneGo ApS · CVR: 38688766");
  });
});

describe("invoiceLegalEntity", () => {
  it("defaults to PhoneGo for orders without snapshot", () => {
    expect(invoiceLegalEntity({ legal_name: null, legal_cvr: null })).toEqual({ name: "PhoneGo ApS", cvr: "38688766" });
  });
  it("uses the snapshot", () => {
    expect(invoiceLegalEntity({ legal_name: "Fixon ApS", legal_cvr: "46079019" })).toEqual({ name: "Fixon ApS", cvr: "46079019" });
  });
});
