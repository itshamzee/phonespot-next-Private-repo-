// @vitest-environment node
import React from "react";
import { describe, it, expect } from "vitest";
import { SlutseddelDocument, renderSlutseddelPdf, type SlutseddelData } from "../slutseddel";

/** Samler al tekst i react-pdf-træet. Funktionskomponenter kaldes, så Document/Page/View foldes ud. */
function textOf(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  const el = node as React.ReactElement<{ children?: unknown }>;
  if (typeof el.type === "function") {
    return textOf((el.type as (p: unknown) => unknown)(el.props));
  }
  return textOf(el.props?.children);
}

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
  it("shows buyer, masked id and account, and the no-vat line, never the full id or 25 %", () => {
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
    expect(t).not.toContain("25 %");
  });

  it("Esbjerg: store name but no address", () => {
    const t = textOf(
      <SlutseddelDocument
        data={{ ...slagelse, receipt_number: "SS-2026-0001", buyer_company: "Fixon ApS", buyer_cvr: "46079019", buyer_address: null, location_name: "Esbjerg" }}
      />,
    );
    expect(t).toContain("Esbjerg");
    expect(t).toContain("Fixon ApS");
    expect(t).not.toContain("Løversysselvej");
    expect(t).not.toContain("Skovsøvej");
  });

  it("under the id limit and offset payout", () => {
    const t = textOf(
      <SlutseddelDocument data={{ ...slagelse, id_type: null, id_number: null, id_expiry: null, payout_method: "modregning", seller_bank_reg: null, seller_bank_account: null }} />,
    );
    expect(t).toContain("Ikke påkrævet (under 2.000 kr.)");
    expect(t).toContain("Modregnes i køb");
  });

  it("business seller shows CVR and invoice type", () => {
    const t = textOf(<SlutseddelDocument data={{ ...slagelse, seller_type: "business", seller_cvr: "12345678", invoice_type: "brugtmoms" }} />);
    expect(t).toContain("12345678");
    expect(t).toContain("Brugtmoms");
  });

  it("renders a real PDF", async () => {
    const buf = await renderSlutseddelPdf(slagelse);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
