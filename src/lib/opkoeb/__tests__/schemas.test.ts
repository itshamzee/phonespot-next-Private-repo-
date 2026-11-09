import { describe, it, expect } from "vitest";
import {
  receiptDraftSchema,
  uploadKindSchema,
  suspicionBodySchema,
  voidBodySchema,
  payBodySchema,
} from "../schemas";

const item = {
  template_id: "123e4567-e89b-42d3-a456-426614174000",
  imei_serial: "490154203237518",
  brand: "Apple",
  model: "iPhone 13",
  condition_grade: "God",
  price: 250000,
};

describe("receiptDraftSchema", () => {
  it("accepts a minimal private draft with one item", () => {
    const r = receiptDraftSchema.safeParse({ seller_type: "private", items: [item] });
    expect(r.success).toBe(true);
  });
  it("rejects CPR-like id_number", () => {
    for (const v of ["010190-1234", "0101901234"]) {
      const r = receiptDraftSchema.safeParse({ seller_type: "private", id_number: v, items: [item] });
      expect(r.success).toBe(false);
      expect(JSON.stringify(r.error?.issues)).toContain("Skriv ikke CPR-nummer");
    }
  });
  it("rejects sundhedskort", () => {
    expect(receiptDraftSchema.safeParse({ seller_type: "private", id_type: "sundhedskort", items: [item] }).success).toBe(false);
  });
  it("rejects malformed values", () => {
    expect(receiptDraftSchema.safeParse({ items: [{ ...item, price: 0 }] }).success).toBe(true);
    expect(receiptDraftSchema.safeParse({ items: [{ ...item, price: -1 }] }).success).toBe(false);
    expect(receiptDraftSchema.safeParse({ items: [{ ...item, battery_health: 101 }] }).success).toBe(false);
    expect(receiptDraftSchema.safeParse({ seller_bank_reg: "12" }).success).toBe(false);
    expect(receiptDraftSchema.safeParse({ seller_cvr: "123" }).success).toBe(false);
  });
});

describe("other schemas", () => {
  it("validates upload kinds and bodies", () => {
    expect(uploadKindSchema.safeParse("payout_proof").success).toBe(true);
    expect(uploadKindSchema.safeParse("x").success).toBe(false);
    expect(suspicionBodySchema.safeParse({ note: "Stjålet?", police_notified: false }).success).toBe(true);
    expect(suspicionBodySchema.safeParse({ note: " ", police_notified: true }).success).toBe(false);
    expect(suspicionBodySchema.safeParse({ note: "x" }).success).toBe(false);
    expect(suspicionBodySchema.safeParse({ note: "x".repeat(1001), police_notified: true }).success).toBe(false);
    expect(voidBodySchema.safeParse({ reason: "Fejl" }).success).toBe(true);
    const pay = {
      payout_method: "bank",
      seller_bank_reg: "1234",
      seller_bank_account: "1234567",
      account_owner_confirmed: true,
    };
    expect(payBodySchema.safeParse({}).success).toBe(false);
    expect(payBodySchema.safeParse(pay).success).toBe(true);
    expect(payBodySchema.safeParse({ ...pay, account_owner_confirmed: false }).success).toBe(false);
    expect(payBodySchema.safeParse({ ...pay, payout_method: "modregning" }).success).toBe(false);
    expect(payBodySchema.safeParse({ ...pay, seller_bank_reg: "12" }).success).toBe(false);
  });
});
