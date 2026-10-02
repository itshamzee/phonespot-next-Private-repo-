/**
 * Account mapping for the Dinero export. The numbers are PLACEHOLDERS: the
 * bookkeeper fills them in (or tells us the real chart of accounts) before the
 * CSV is imported. Until then the export carries the bracketed placeholder so
 * a wrong import is impossible to miss.
 */

export type DineroKey =
  | "omsaetning"
  | "udgaaende_moms"
  | "brugt_salg"
  | "brugtmoms_skyld"
  | "kassebeholdning"
  | "kort"
  | "mobilepay"
  | "klarna"
  | "debitorer"
  | "tilgodebevis"
  | "gavekort"
  | "kassedifference"
  | "bank"
  | "udlaeg";

export const DINERO_ACCOUNTS: Record<DineroKey, { label: string; account: string }> = {
  omsaetning: { label: "Omsætning (salg med 25 % moms, ekskl. moms)", account: "[KONTO-OMSAETNING]" },
  udgaaende_moms: { label: "Udgående moms 25 %", account: "[KONTO-UDGAAENDE-MOMS]" },
  brugt_salg: { label: "Brugt-salg (brugtmoms, ekskl. brugtmoms)", account: "[KONTO-BRUGT-SALG]" },
  brugtmoms_skyld: { label: "Brugtmoms (skyldig, 25/125 af avance)", account: "[KONTO-BRUGTMOMS]" },
  kassebeholdning: { label: "Kassebeholdning", account: "[KONTO-KASSEBEHOLDNING]" },
  kort: { label: "Kortbetalinger (terminal)", account: "[KONTO-KORT]" },
  mobilepay: { label: "MobilePay", account: "[KONTO-MOBILEPAY]" },
  klarna: { label: "Klarna", account: "[KONTO-KLARNA]" },
  debitorer: { label: "Debitorer (faktura)", account: "[KONTO-DEBITORER]" },
  tilgodebevis: { label: "Tilgodebeviser", account: "[KONTO-TILGODEBEVIS]" },
  gavekort: { label: "Gavekort", account: "[KONTO-GAVEKORT]" },
  kassedifference: { label: "Kassedifference", account: "[KONTO-KASSEDIFFERENCE]" },
  bank: { label: "Bank / pengeskab", account: "[KONTO-BANK]" },
  udlaeg: { label: "Dagens udlæg", account: "[KONTO-UDLAEG]" },
};

export const PAYMENT_TO_DINERO: Record<string, DineroKey> = {
  kontant: "kassebeholdning",
  kort_terminal: "kort",
  mobilepay: "mobilepay",
  klarna: "klarna",
  faktura: "debitorer",
  tilgodebevis: "tilgodebevis",
  gavekort: "gavekort",
};
