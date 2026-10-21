// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { PosReceiptPDF, type PosReceiptProps } from "../receipt-pdf";

function receipt(itemName: string): PosReceiptProps {
  return {
    receiptNumber: "V1-000003",
    date: "2026-10-21T10:01:26.000Z",
    locationName: "PhoneSpot Vejle",
    locationAddress: "Vejle",
    registerName: "Kasse 1",
    staffName: "Admin",
    items: [{ name: itemName, quantity: 1, unitPrice: 150000, lineTotal: 150000, vatScheme: "regular", kind: "repair_service" }],
    subtotal: 150000,
    discountAmount: 0,
    total: 150000,
    payments: [{ label: "MobilePay", amount: 150000, reference: null }],
    customerName: "Søren",
    hasBrugtmomsItems: false,
    hasRegularVatItems: true,
    vatTotal: 30000,
  };
}

async function render(itemName: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(createElement(PosReceiptPDF, { receipt: receipt(itemName) }) as any);
}

describe("PosReceiptPDF", () => {
  it("renders a plain receipt", async () => {
    const pdf = await render("Vare");
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  }, 15000);

  it("renders a repair-case line", async () => {
    const pdf = await render('Sag PS-2026-0104 · laptop MacBook Pro 13" M1 · Batteriskift');
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  }, 15000);

  it("keeps a long receipt on one page", async () => {
    const long = receipt("x");
    long.items = Array.from({ length: 25 }, (_, i) => ({
      name: `Sag PS-2026-${i} · iPhone 15 Pro Max · Skærmskift med original kvalitet`,
      quantity: 2,
      unitPrice: 50000,
      lineTotal: 100000,
      vatScheme: "regular" as const,
    }));
    long.discountAmount = 5000;
    long.discountReason = "Kundeservice";
    long.payments = [
      { label: "Kort (terminal)", amount: 1000000, reference: "1234567890-ABCDEFGHIJ-terminal" },
      { label: "Kontant", amount: 495000, reference: null },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdf = await renderToBuffer(createElement(PosReceiptPDF, { receipt: long }) as any);
    const pages = pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? [];
    expect(pages).toHaveLength(1);
  }, 15000);
});
