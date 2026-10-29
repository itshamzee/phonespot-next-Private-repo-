// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement, isValidElement, type ReactNode } from "react";
import { PosReceiptPDF, receiptHeight, type PosReceiptProps } from "../receipt-pdf";

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
    bundleDiscountAmount: 0,
    total: 150000,
    payments: [{ label: "MobilePay", amount: 150000, reference: null }],
    customerName: "Søren",
    hasBrugtmomsItems: false,
    hasRegularVatItems: true,
    hasLagersalgItems: false,
    vatTotal: 30000,
  };
}

/** All text in the receipt's element tree (the PDF's own streams are compressed). */
function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) {
    const el = node as { type: unknown; props: { children?: ReactNode } };
    if (typeof el.type === "function") return textOf((el.type as (p: unknown) => ReactNode)(el.props));
    return textOf(el.props.children);
  }
  return "";
}

function lagersalgReceipt(over: Partial<PosReceiptProps> = {}): PosReceiptProps {
  return {
    ...receipt("Cover"),
    items: [
      { name: "Cover", quantity: 2, unitPrice: 5900, lineTotal: 11800, vatScheme: "regular", lagersalg: true },
      { name: "Cover", quantity: 1, unitPrice: 7900, lineTotal: 7900, vatScheme: "regular", lagersalg: true },
    ],
    subtotal: 19700,
    bundleDiscountAmount: 5900,
    total: 13800,
    payments: [{ label: "Kontant", amount: 13800, reference: null }],
    hasLagersalgItems: true,
    vatTotal: 2760,
    ...over,
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

  it("viser 3 for 2-rabatten og lagersalgsnotitsen", async () => {
    const r = lagersalgReceipt();
    const text = textOf(createElement(PosReceiptPDF, { receipt: r }));
    expect(text).toContain("Lagersalg 3 for 2");
    expect(text).toContain("-59,00");
    expect(text).toContain("Lagersalgsvarer tages ikke retur. Reklamationsretten gælder ved fejl.");
    expect(receiptHeight(r)).toBeGreaterThan(receiptHeight({ ...r, bundleDiscountAmount: 0, hasLagersalgItems: false }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdf = await renderToBuffer(createElement(PosReceiptPDF, { receipt: r }) as any);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  }, 15000);

  it("ingen lagersalgsnotits på en kreditnota eller uden lagersalgsvarer", () => {
    const credit = textOf(createElement(PosReceiptPDF, { receipt: lagersalgReceipt({ isCreditNote: true, bundleDiscountAmount: 0 }) }));
    expect(credit).not.toContain("tages ikke retur");
    const plain = textOf(createElement(PosReceiptPDF, { receipt: receipt("Vare") }));
    expect(plain).not.toContain("tages ikke retur");
    expect(plain).not.toContain("Lagersalg 3 for 2");
  });
});
