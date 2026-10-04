import type { DailySummary } from "./daily-summary";
import { DINERO_ACCOUNTS, PAYMENT_TO_DINERO, type DineroKey } from "./dinero-mapping";

export type JournalRow = {
  date: string;
  register: string;
  text: string;
  account: string;
  debit: number; // oere
  credit: number; // oere
};

/**
 * Journal lines for Dinero. A negative amount flips to the other side, so a day
 * with net returns on a payment type still balances. Every group is a balanced
 * pair/set: payments = revenue + VAT, cash difference vs kassebeholdning, cash
 * to bank vs kassebeholdning, expenses vs kassebeholdning.
 */
export function buildJournalRows(s: DailySummary): JournalRow[] {
  const rows: JournalRow[] = [];
  const register = s.registerName ?? "Alle kasser";

  const add = (key: DineroKey, amount: number, side: "debit" | "credit", text?: string) => {
    if (amount === 0) return;
    const flip = amount < 0;
    const actual = flip ? (side === "debit" ? "credit" : "debit") : side;
    const acct = DINERO_ACCOUNTS[key];
    rows.push({
      date: s.date,
      register,
      text: text ?? acct.label,
      account: acct.account,
      debit: actual === "debit" ? Math.abs(amount) : 0,
      credit: actual === "credit" ? Math.abs(amount) : 0,
    });
  };

  // Debit side: where the money (or claim) ended up.
  for (const p of s.payments) add(PAYMENT_TO_DINERO[p.type], p.net, "debit");

  // Credit side: revenue and VAT. A repair deposit is a prepayment: VAT is due when
  // it is received (momsloven § 23, stk. 3), but it is not revenue until the case is
  // delivered. Received deposits (ex VAT) are credited to the deposit account and
  // applied deposits are debited from it; revenue excludes both.
  const depReceivedEx = s.deposits.received - s.deposits.receivedVat;
  const depAppliedEx = s.deposits.applied - s.deposits.appliedVat;
  add("omsaetning", s.regularGross - s.vatStandard - depReceivedEx + depAppliedEx, "credit");
  add("depositum", depReceivedEx, "credit", "Depositum modtaget (ekskl. moms)");
  add("depositum", depAppliedEx, "debit", "Depositum modregnet (ekskl. moms)");
  add("udgaaende_moms", s.vatStandard, "credit");
  add("brugt_salg", s.brugtGross - s.brugtmoms, "credit");
  add("brugtmoms_skyld", s.brugtmoms, "credit");

  // Cash handling from the locked sessions of the day.
  add("kassebeholdning", s.cash.difference, "debit", "Kassebeholdning (kassedifference)");
  add("kassedifference", s.cash.difference, "credit");
  add("bank", s.cash.cashToBank, "debit");
  add("kassebeholdning", s.cash.cashToBank, "credit", "Kassebeholdning (til bank)");
  add("udlaeg", s.cash.expensesTotal, "debit");
  add("kassebeholdning", s.cash.expensesTotal, "credit", "Kassebeholdning (udlæg)");

  return rows;
}

function fmt(oere: number): string {
  if (oere === 0) return "";
  const sign = oere < 0 ? "-" : "";
  const abs = Math.abs(oere);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

function esc(v: string): string {
  return /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Semicolon CSV with a UTF-8 BOM (Excel/Dinero friendly), Danish decimal comma. */
export function summaryToCsv(s: DailySummary): string {
  const rows = buildJournalRows(s);
  const header = ["Dato", "Kasse", "Tekst", "Konto", "Debet", "Kredit"].join(";");
  const body = rows.map((r) =>
    [r.date, esc(r.register), esc(r.text), esc(r.account), fmt(r.debit), fmt(r.credit)].join(";"),
  );
  const debit = rows.reduce((a, r) => a + r.debit, 0);
  const credit = rows.reduce((a, r) => a + r.credit, 0);
  const meta = [
    `# Dagsopgørelse ${s.date} - ${s.registerName ?? "alle kasser"}`,
    `# Bonnumre: ${s.receiptRange.first ?? "-"} til ${s.receiptRange.last ?? "-"} (${s.receiptRange.count} bon)`,
    `# Konti er pladsholdere og skal erstattes med Dineros kontoplan`,
    `# Sum debet ${fmt(debit) || "0,00"} / kredit ${fmt(credit) || "0,00"}`,
  ];
  // Header first so an importer sees a clean table; the notes trail after a blank line.
  return "﻿" + [header, ...body, "", ...meta].join("\r\n") + "\r\n";
}
