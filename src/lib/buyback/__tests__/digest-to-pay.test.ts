import { describe, it, expect } from "vitest";
import { maskAccount, receiptsToPay } from "../digest-data";

const row = (over: Record<string, unknown> = {}) => ({
  receipt_number: "SS-2026-0001",
  seller_name: "Mette Hansen",
  seller_bank_reg: "1234",
  seller_bank_account: "5678901234",
  total_amount: 300000,
  offset_amount: null,
  payout_method: "bank",
  status: "confirmed",
  ...over,
});

describe("receiptsToPay", () => {
  it("lists a bank slip with its full amount and a masked account", () => {
    expect(receiptsToPay([row()])).toEqual([
      { sellerName: "Mette Hansen", bankReg: "1234", bankAccount: "••••1234", amountKr: 3000, receiptNumber: "SS-2026-0001" },
    ]);
  });

  it("leaves out a modregning slip the till has not offset yet", () => {
    expect(receiptsToPay([row({ payout_method: "modregning", offset_amount: null })])).toEqual([]);
  });

  it("shows only the remainder of a partly offset slip", () => {
    const [p] = receiptsToPay([row({ payout_method: "modregning", offset_amount: 120000 })]);
    expect(p.amountKr).toBe(1800);
  });

  it("leaves out fully offset and paid slips", () => {
    expect(receiptsToPay([row({ payout_method: "modregning", offset_amount: 300000 })])).toEqual([]);
    expect(receiptsToPay([row({ status: "paid" })])).toEqual([]);
  });

  it("treats an online slip without payout method as bank", () => {
    expect(receiptsToPay([row({ payout_method: null })])).toHaveLength(1);
  });
});

describe("maskAccount", () => {
  it("keeps only the last four digits", () => {
    expect(maskAccount("5678901234")).toBe("••••1234");
    expect(maskAccount("123")).toBe("••••");
    expect(maskAccount(null)).toBe("");
    expect(maskAccount("")).toBe("");
  });
});
