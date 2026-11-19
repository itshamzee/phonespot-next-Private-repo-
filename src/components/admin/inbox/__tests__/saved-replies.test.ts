import { describe, expect, it } from "vitest";
import { fillTemplate, firstName, storeName } from "../saved-replies";

describe("fillTemplate", () => {
  it("udfylder {fornavn} og {butik} overalt", () => {
    expect(fillTemplate("Hej {fornavn}. Kom forbi {butik}. Hilsen {butik}", { fornavn: "Camilla", butik: "Vejle" })).toBe(
      "Hej Camilla. Kom forbi Vejle. Hilsen Vejle",
    );
  });

  it("uden fornavn forsvinder pladsen pænt", () => {
    expect(fillTemplate("Hej {fornavn}, tak for din besked.", { fornavn: "", butik: "Vejle" })).toBe("Hej, tak for din besked.");
    expect(fillTemplate("Hej {fornavn}.", { fornavn: null, butik: null })).toBe("Hej.");
  });

  it("uden butik står der PhoneSpot", () => {
    expect(fillTemplate("Velkommen i {butik}", { fornavn: "A", butik: null })).toBe("Velkommen i PhoneSpot");
  });

  it("andre krøllede pladsholdere bliver stående", () => {
    expect(fillTemplate("Din {enhed} er klar", { fornavn: "A", butik: "B" })).toBe("Din {enhed} er klar");
  });
});

describe("firstName", () => {
  it("tager første ord i et navn", () => {
    expect(firstName("Camilla Holm")).toBe("Camilla");
    expect(firstName("  mads ")).toBe("mads");
  });
  it("bruger ikke mails, tal eller tomme navne", () => {
    expect(firstName("camilla@eksempel.dk")).toBe("");
    expect(firstName("+45 20 12 34 56")).toBe("");
    expect(firstName("")).toBe("");
    expect(firstName(null)).toBe("");
  });
});

describe("storeName", () => {
  it("giver butikkens navn med stort", () => {
    expect(storeName("vejle")).toBe("Vejle");
    expect(storeName("slagelse")).toBe("Slagelse");
    expect(storeName(null)).toBeNull();
    expect(storeName("webshop")).toBeNull();
  });
});
