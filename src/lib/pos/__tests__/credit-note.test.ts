import { describe, it, expect } from "vitest";
import { buildCreditNote, CreditNoteError, type OriginalLine, type ReturnedSoFar } from "../credit-note";

const device: OriginalLine = {
  id: "i-dev",
  itemType: "device",
  deviceId: "d1",
  skuProductId: null,
  description: "iPhone 14 128 GB",
  quantity: 1,
  unitPrice: 100000,
  totalPrice: 100000,
  discountAmount: 10000,
  vatAmount: 2000, // brugtmoms on net 90000 with purchase 80000
  vatScheme: "brugtmoms",
  purchasePrice: 80000,
};

const cable: OriginalLine = {
  id: "i-sku",
  itemType: "sku_product",
  deviceId: null,
  skuProductId: "s1",
  description: "Kabel",
  quantity: 3,
  unitPrice: 10000,
  totalPrice: 30000,
  discountAmount: 4000,
  vatAmount: 5200, // 26000 / 5
  vatScheme: "regular",
  purchasePrice: 2000,
};

const lines = [device, cable];
const none: Record<string, ReturnedSoFar | undefined> = {};

describe("buildCreditNote", () => {
  it("builds a negative credit line for a fully returned device and refunds the discounted price", () => {
    const note = buildCreditNote(lines, none, [{ orderItemId: "i-dev", quantity: 1, restock: true }]);
    const l = note.lines[0];
    expect(l).toMatchObject({
      originalItemId: "i-dev",
      quantity: -1,
      totalPrice: -100000,
      discountAmount: -10000,
      vatAmount: -2000,
      restock: true,
    });
    expect(note.subtotal).toBe(-100000);
    expect(note.discount).toBe(-10000);
    expect(note.total).toBe(-90000);
    expect(note.refundAmount).toBe(90000);
    expect(note.brugtmomsTotal).toBe(-2000);
    expect(note.vatTotal).toBe(0);
  });

  it("returns a partial quantity proportionally", () => {
    const note = buildCreditNote(lines, none, [{ orderItemId: "i-sku", quantity: 1, restock: true }]);
    expect(note.lines[0]).toMatchObject({ quantity: -1, totalPrice: -10000, discountAmount: -1333, vatAmount: -1733 });
    expect(note.refundAmount).toBe(10000 - 1333);
    expect(note.vatTotal).toBe(-1733);
  });

  it("successive partial returns add up to exactly the original line", () => {
    let returned: Record<string, ReturnedSoFar | undefined> = {};
    let total = 0;
    let discount = 0;
    let vat = 0;
    for (let step = 0; step < 3; step++) {
      const note = buildCreditNote(lines, returned, [{ orderItemId: "i-sku", quantity: 1, restock: false }]);
      const l = note.lines[0];
      total += -l.totalPrice;
      discount += -l.discountAmount;
      vat += -l.vatAmount;
      returned = { "i-sku": { quantity: step + 1, total, discount, vat } };
    }
    expect({ total, discount, vat }).toEqual({ total: 30000, discount: 4000, vat: 5200 });
  });

  it("refuses to return more than what is left", () => {
    expect(() =>
      buildCreditNote(lines, { "i-sku": { quantity: 2, total: 20000, discount: 2667, vat: 3467 } }, [
        { orderItemId: "i-sku", quantity: 2, restock: true },
      ]),
    ).toThrow(CreditNoteError);
    try {
      buildCreditNote(lines, { "i-dev": { quantity: 1, total: 100000, discount: 10000, vat: 2000 } }, [
        { orderItemId: "i-dev", quantity: 1, restock: true },
      ]);
      expect.unreachable();
    } catch (e) {
      expect((e as CreditNoteError).code).toBe("return_quantity_invalid");
    }
  });

  it("rejects unknown lines, duplicates and empty requests", () => {
    expect(() => buildCreditNote(lines, none, [{ orderItemId: "nope", quantity: 1, restock: false }])).toThrow(/findes ikke/);
    expect(() =>
      buildCreditNote(lines, none, [
        { orderItemId: "i-sku", quantity: 1, restock: false },
        { orderItemId: "i-sku", quantity: 1, restock: false },
      ]),
    ).toThrow(/to gange/);
    expect(() => buildCreditNote(lines, none, [{ orderItemId: "i-sku", quantity: 0, restock: false }])).toThrow(/mindst/);
  });

  it("combines several lines into one credit note total", () => {
    const note = buildCreditNote(lines, none, [
      { orderItemId: "i-dev", quantity: 1, restock: false },
      { orderItemId: "i-sku", quantity: 3, restock: true },
    ]);
    expect(note.refundAmount).toBe(90000 + 26000);
    expect(note.vatTotal).toBe(-5200);
    expect(note.brugtmomsTotal).toBe(-2000);
    expect(note.lines.map((l) => l.restock)).toEqual([false, true]);
  });
});
