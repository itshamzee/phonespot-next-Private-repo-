import { describe, it, expect } from "vitest";
import {
  isValidImei,
  normalizeIdentifier,
  idRequired,
  vatSchemeFor,
  deviceCostOere,
  confirmBlockers,
  payBlockers,
  payoutRemainderOere,
  GRADE_FROM_CONDITION,
  ID_TYPE_LABELS,
  type ReceiptForRules,
} from "../rules";

const TODAY = "2026-11-09";

function receipt(over: Partial<ReceiptForRules> = {}): ReceiptForRules {
  return {
    total_amount: 100000,
    status: "draft",
    seller_type: "private",
    seller_cvr: null,
    invoice_type: null,
    seller_name: "Mette Hansen",
    seller_address: "Vestergade 1, 7100 Vejle",
    seller_age_confirmed: true,
    lock_checks_confirmed: true,
    id_type: null,
    id_number: null,
    id_expiry: null,
    attestation: null,
    signed_scan_path: null,
    invoice_file_path: null,
    payout_method: "bank",
    seller_bank_reg: "1234",
    seller_bank_account: "1234567",
    account_owner_confirmed: true,
    offset_amount: null,
    suspected_at: null,
    items: [{ template_id: "t1", imei_serial: "490154203237518", price: 100000 }],
    ...over,
  };
}

const has = (list: string[], text: string) =>
  list.some((m) => m.includes(text));

describe("identifiers", () => {
  it("validates IMEI with Luhn", () => {
    expect(isValidImei("490154203237518")).toBe(true);
    expect(isValidImei("490154203237519")).toBe(false);
    expect(isValidImei("49015420323751")).toBe(false);
  });
  it("normalizes identifiers", () => {
    expect(normalizeIdentifier(" 4901 5420 3237 518 ")).toEqual({ kind: "imei", value: "490154203237518" });
    expect(normalizeIdentifier("490154203237519")).toBeNull();
    expect(normalizeIdentifier("c02xk1zjjg5h")).toEqual({ kind: "serial", value: "C02XK1ZJJG5H" });
    expect(normalizeIdentifier("ab")).toBeNull();
    expect(normalizeIdentifier("abc-123-xyz")).toBeNull();
    expect(normalizeIdentifier("")).toBeNull();
  });
});

describe("amounts and VAT", () => {
  it("requires ID strictly above 2000 kr.", () => {
    expect(idRequired(200000)).toBe(false);
    expect(idRequired(200001)).toBe(true);
  });
  it("picks VAT scheme", () => {
    expect(vatSchemeFor("private", null)).toBe("brugtmoms");
    expect(vatSchemeFor("business", "med_moms")).toBe("regular");
    expect(vatSchemeFor("business", "brugtmoms")).toBe("brugtmoms");
    expect(vatSchemeFor("business", "eu_normal")).toBe("regular");
    expect(vatSchemeFor("business", null)).toBe("brugtmoms");
  });
  it("computes device cost", () => {
    expect(deviceCostOere(125000, "business", "med_moms")).toBe(100000);
    expect(deviceCostOere(125000, "private", null)).toBe(125000);
    expect(deviceCostOere(125000, "business", "brugtmoms")).toBe(125000);
    expect(deviceCostOere(125000, "business", "eu_normal")).toBe(125000);
    expect(deviceCostOere(12345, "business", "med_moms")).toBe(9876);
  });
  it("maps grades and labels", () => {
    expect(GRADE_FROM_CONDITION).toEqual({ Perfekt: "A", God: "B", Acceptabel: "C", Defekt: "C" });
    expect(ID_TYPE_LABELS.koerekort).toBe("Kørekort");
  });
});

describe("confirmBlockers", () => {
  it("is empty for a complete private receipt", () => {
    expect(confirmBlockers(receipt(), TODAY)).toEqual([]);
  });
  it("requires ID above 2000 kr.", () => {
    const r = receipt({ total_amount: 250000 });
    expect(has(confirmBlockers(r, TODAY), "ID kræves over 2.000 kr.")).toBe(true);
    expect(has(confirmBlockers(receipt({ total_amount: 200000 }), TODAY), "ID kræves")).toBe(false);
  });
  it("rejects expired photo ID but accepts today and mitid", () => {
    const base = { total_amount: 250000, id_number: "12345678" };
    const expired = receipt({ ...base, id_type: "koerekort", id_expiry: "2026-11-08" });
    expect(has(confirmBlockers(expired, TODAY), "ID'et er udløbet")).toBe(true);
    const okToday = receipt({ ...base, id_type: "koerekort", id_expiry: "2026-11-09" });
    expect(confirmBlockers(okToday, TODAY)).toEqual([]);
    const noExpiry = receipt({ ...base, id_type: "pas", id_expiry: null });
    expect(has(confirmBlockers(noExpiry, TODAY), "udløbsdato")).toBe(true);
    const mitid = receipt({ ...base, id_type: "mitid", id_expiry: null });
    expect(confirmBlockers(mitid, TODAY)).toEqual([]);
    const noNumber = receipt({ total_amount: 250000, id_type: "pas", id_expiry: "2030-01-01" });
    expect(has(confirmBlockers(noNumber, TODAY), "ID-nummer")).toBe(true);
  });
  it("requires 18+ only for private", () => {
    expect(has(confirmBlockers(receipt({ seller_age_confirmed: false }), TODAY), "Sælger skal være fyldt 18")).toBe(true);
    const biz = receipt({ seller_type: "business", seller_cvr: "12345678", invoice_type: "med_moms", seller_age_confirmed: false });
    expect(has(confirmBlockers(biz, TODAY), "fyldt 18")).toBe(false);
  });
  it("requires lock checks", () => {
    expect(has(confirmBlockers(receipt({ lock_checks_confirmed: false }), TODAY), "Tjek Find My og spærring")).toBe(true);
  });
  it("requires name and address for every seller type", () => {
    const b = confirmBlockers(receipt({ seller_name: " ", seller_address: null }), TODAY);
    expect(has(b, "navn")).toBe(true);
    expect(has(b, "adresse")).toBe(true);
    const biz = receipt({ seller_type: "business", seller_cvr: "12345678", invoice_type: "med_moms", seller_address: null });
    expect(has(confirmBlockers(biz, TODAY), "adresse")).toBe(true);
  });
  it("requires CVR and invoice type for business", () => {
    const b = confirmBlockers(receipt({ seller_type: "business", seller_cvr: "1234", invoice_type: null }), TODAY);
    expect(has(b, "CVR")).toBe(true);
    expect(has(b, "fakturatype")).toBe(true);
  });
  it("requires a payout method, and complete bank details when it is bank", () => {
    expect(confirmBlockers(receipt({ payout_method: null }), TODAY)).toContain("Vælg udbetaling");
    expect(confirmBlockers(receipt({ payout_method: "modregning", seller_bank_reg: null, seller_bank_account: null, account_owner_confirmed: false }), TODAY)).toEqual([]);
    expect(confirmBlockers(receipt({ seller_bank_reg: "123" }), TODAY)).toContain("Reg.nr. skal være 4 cifre");
    expect(confirmBlockers(receipt({ seller_bank_reg: null }), TODAY)).toContain("Reg.nr. skal være 4 cifre");
    expect(confirmBlockers(receipt({ seller_bank_account: "12345" }), TODAY)).toContain("Kontonummer skal være 6 til 10 cifre");
    expect(confirmBlockers(receipt({ seller_bank_account: "12345678901" }), TODAY)).toContain("Kontonummer skal være 6 til 10 cifre");
    expect(confirmBlockers(receipt({ seller_bank_account: "123456" }), TODAY)).toEqual([]);
    expect(confirmBlockers(receipt({ account_owner_confirmed: false }), TODAY)).toContain("Bekræft at kontoen står i sælgers navn");
  });
  it("checks items and numbers them", () => {
    expect(has(confirmBlockers(receipt({ items: [] }), TODAY), "mindst én vare")).toBe(true);
    const items = [
      { template_id: "t1", imei_serial: "490154203237518", price: 1000 },
      { template_id: null, imei_serial: "490154203237518", price: 1000 },
      { template_id: "t1", imei_serial: "490154203237519", price: 1000 },
      { template_id: "t1", imei_serial: "490154203237518", price: 0 },
    ];
    const b = confirmBlockers(receipt({ items }), TODAY);
    expect(b.filter((m) => m.includes("Vare 1"))).toEqual([]);
    expect(has(b, "Vare 2")).toBe(true);
    expect(has(b, "Vare 3")).toBe(true);
    expect(has(b, "Vare 4")).toBe(true);
  });
});

describe("payBlockers", () => {
  const confirmed = (over: Partial<ReceiptForRules> = {}) =>
    receipt({ status: "confirmed", signed_scan_path: "scan.pdf", ...over });

  it("is empty when ready", () => {
    expect(payBlockers(confirmed())).toEqual([]);
  });
  it("requires status confirmed and no suspicion", () => {
    expect(has(payBlockers(confirmed({ status: "draft" })), "Kun bekræftede slutsedler kan udbetales")).toBe(true);
    expect(has(payBlockers(confirmed({ suspected_at: "2026-11-09T10:00:00Z" })), "Opkøbet er spærret ved mistanke")).toBe(true);
  });
  it("requires signed scan for private unless online_accept", () => {
    expect(has(payBlockers(confirmed({ signed_scan_path: null })), "Læg den underskrevne slutseddel op")).toBe(true);
    expect(payBlockers(confirmed({ signed_scan_path: null, attestation: "online_accept" }))).toEqual([]);
  });
  it("requires invoice file for business", () => {
    const biz = confirmed({ seller_type: "business", seller_cvr: "12345678", invoice_type: "med_moms", signed_scan_path: "scan.pdf" });
    expect(has(payBlockers(biz), "Læg firmaets faktura op")).toBe(true);
    expect(payBlockers({ ...biz, invoice_file_path: "inv.pdf" })).toEqual([]);
  });
  it("checks bank details", () => {
    expect(has(payBlockers(confirmed({ seller_bank_reg: "12" })), "Reg.nr.")).toBe(true);
    expect(has(payBlockers(confirmed({ seller_bank_account: "123" })), "Kontonummer")).toBe(true);
    expect(has(payBlockers(confirmed({ account_owner_confirmed: false })), "kontoens ejer")).toBe(true);
    expect(has(payBlockers(confirmed({ payout_method: null })), "udbetaling")).toBe(true);
  });
  it("handles offsets", () => {
    const partial = confirmed({ total_amount: 300000, offset_amount: 100000 });
    expect(payoutRemainderOere(partial)).toBe(200000);
    expect(payBlockers(partial)).toEqual([]);
    expect(has(payBlockers({ ...partial, seller_bank_reg: null }), "Reg.nr.")).toBe(true);
    const full = confirmed({ total_amount: 300000, offset_amount: 300000, signed_scan_path: null, seller_bank_reg: null });
    expect(payoutRemainderOere(full)).toBe(0);
    expect(payBlockers(full)).toEqual(["Opkøbet er allerede modregnet"]);
    expect(payoutRemainderOere(confirmed())).toBe(100000);
  });
});
