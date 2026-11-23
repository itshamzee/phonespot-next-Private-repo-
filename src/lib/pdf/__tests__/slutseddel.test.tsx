// @vitest-environment node
import React from "react";
import { describe, it, expect } from "vitest";
import { SlutseddelDocument, renderSlutseddelPdf, type SlutseddelData } from "../slutseddel";

/** Samler al tekst i react-pdf-træet. Funktionskomponenter kaldes, så Document/Page/View foldes ud. */
function rawText(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(rawText).join(" ");
  const el = node as React.ReactElement<{ children?: unknown }>;
  if (typeof el.type === "function") {
    return rawText((el.type as (p: unknown) => unknown)(el.props));
  }
  return rawText(el.props?.children);
}

const textOf = (node: unknown) => rawText(node).replace(/\s+/g, " ");

const slagelse: SlutseddelData = {
  receipt_number: "SP-2026-0007",
  date: "2026-11-09T10:00:00Z",
  buyer_company: "PhoneGo ApS",
  buyer_cvr: "38688766",
  buyer_address: "Skovsøvej 3, 4200 Slagelse",
  location_name: "Slagelse",
  staff_name: "Maja",
  seller_name: "Kunde Kundesen",
  seller_address: "Vejvej 1",
  seller_postal_city: "4200 Slagelse",
  seller_phone: "12345678",
  seller_type: "private",
  seller_cvr: null,
  invoice_type: null,
  items: [
    { model: "iPhone 13", storage: "128 GB", imei_serial: "356938035643809", condition_grade: "God", battery_health: 87, price: 350000 },
  ],
  total_amount: 350000,
  id_type: "pas",
  id_number: "AB991234",
  id_expiry: "2030-05-01",
  payout_method: "bank",
  seller_bank_reg: "1234",
  seller_bank_account: "1234565678",
};

describe("slutseddel", () => {
  it("shows buyer, masked id and account, and the no-vat line, never the full id or a VAT amount", () => {
    const t = textOf(<SlutseddelDocument data={slagelse} />);
    expect(t).toContain("Slutseddel");
    expect(t).toContain("PhoneGo ApS");
    expect(t).toContain("38688766");
    expect(t).toContain("••••1234");
    expect(t).toContain("••••5678");
    expect(t).toContain("indeholder ikke moms");
    expect(t).toContain("Maja");
    expect(t).toContain("phonespot.dk/privatlivspolitik");
    expect(t).not.toContain("AB991234");
    expect(t).not.toContain("1234565678");
    expect(t).not.toMatch(/25\s*%\s*moms/i);
    expect(t).not.toMatch(/moms:/i);
  });

  it("Esbjerg: shows the store name and the buying company's address", () => {
    const t = textOf(
      <SlutseddelDocument
        data={{ ...slagelse, receipt_number: "SS-2026-0001", buyer_company: "Fixon ApS", buyer_cvr: "46079019", buyer_address: "Løversysselvej 3C, 7100 Vejle", location_name: "Esbjerg" }}
      />,
    );
    expect(t).toContain("Butik: Esbjerg");
    expect(t).toContain("Løversysselvej 3C, 7100 Vejle");
  });

  it("masks values of four characters or fewer completely", () => {
    const t = textOf(<SlutseddelDocument data={{ ...slagelse, id_number: "AB12", seller_bank_account: "9876" }} />);
    expect(t).not.toContain("AB12");
    expect(t).not.toContain("9876");
    expect(t).toContain("Pas ••••,");
    expect(t).toContain("konto ••••");
  });

  it("under the id limit and offset payout", () => {
    const t = textOf(
      <SlutseddelDocument data={{ ...slagelse, id_type: null, id_number: null, id_expiry: null, payout_method: "modregning", seller_bank_reg: null, seller_bank_account: null }} />,
    );
    expect(t).toContain("Ikke påkrævet (2.000 kr. eller derunder)");
    expect(t).toContain("Modregnes i køb");
  });

  it("business seller shows CVR and invoice type", () => {
    const t = textOf(<SlutseddelDocument data={{ ...slagelse, seller_type: "business", seller_cvr: "12345678", invoice_type: "brugtmoms" }} />);
    expect(t).toContain("12345678");
    expect(t).toContain("Brugtmoms");
    expect(t).toContain("Beløbet indeholder ikke moms.");
  });

  it("business seller with a VAT invoice: the amount includes 25 % VAT, never 'ikke moms'", () => {
    const t = textOf(<SlutseddelDocument data={{ ...slagelse, seller_type: "business", seller_cvr: "12345678", invoice_type: "med_moms" }} />);
    expect(t).toContain("Beløbet er inkl. 25 % moms jf. sælgers faktura.");
    expect(t).not.toContain("indeholder ikke moms");
  });

  it("renders a real PDF", async () => {
    const buf = await renderSlutseddelPdf(slagelse);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
