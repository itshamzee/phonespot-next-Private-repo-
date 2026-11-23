import { describe, it, expect } from "vitest";

import { toPosError } from "../errors";

/** Fejlkoder fra trade_in_confirm / trade_in_void (migration 20261109121000). */
const cases: Array<[string, number, string]> = [
  ["pos:receipt_not_found", 404, "Slutsedlen findes ikke"],
  ["pos:receipt_not_draft", 409, "Slutsedlen er ikke længere en kladde"],
  ["pos:receipt_empty", 400, "Tilføj mindst én vare"],
  ["pos:item_invalid:2", 400, "Vare 2: vælg model, skriv et gyldigt IMEI eller serienummer, og angiv en pris"],
  ["pos:seller_missing", 400, "Udfyld sælgers navn og adresse"],
  ["pos:age_missing", 400, "Bekræft, at sælger er fyldt 18"],
  ["pos:business_fields_missing", 400, "Udfyld firmaets CVR-nummer (8 cifre) og vælg fakturatype"],
  ["pos:checks_missing", 400, "Tjek Find My og spærring, og sæt kryds"],
  ["pos:id_required", 400, "ID kræves, når opkøbet er over 2.000 kr."],
  ["pos:id_incomplete", 400, "Udfyld ID-type, ID-nummer og udløbsdato"],
  ["pos:id_expired", 400, "ID'et er udløbet"],
  ["pos:imei_in_stock:359999000000018", 409, "IMEI'et 359999000000018 findes allerede på en enhed på lager"],
  ["pos:imei_in_stock", 409, "IMEI'et findes allerede på en enhed på lager"],
  ["pos:location_missing", 400, "Butikken mangler et firma med nummerserie til slutsedler"],
  [
    "pos:receipt_not_voidable",
    409,
    "Slutsedlen kan ikke annulleres. Den er udbetalt, modregnet eller allerede annulleret, eller en enhed er ikke længere i modtagelse.",
  ],
  ["pos:void_reason_required", 400, "Skriv en begrundelse for annulleringen"],
];

describe("toPosError for opkøb", () => {
  it.each(cases)("%s → %i %s", (raw, status, message) => {
    const e = toPosError({ message: raw });
    expect(e?.status).toBe(status);
    expect(e?.message).toBe(message);
  });
});

describe("toPosError for retur af opkøbsbetalte salg", () => {
  it("maps opkoeb_refund_tilgodebevis to 409 with the Danish message", () => {
    const e = toPosError({ message: "pos:opkoeb_refund_tilgodebevis" });
    expect(e?.status).toBe(409);
    expect(e?.message).toBe("Den del af købet, der blev betalt med et opkøb, kan kun refunderes som tilgodebevis");
  });
});
