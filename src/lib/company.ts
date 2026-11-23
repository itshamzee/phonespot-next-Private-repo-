/**
 * The legal entity behind PhoneSpot. Every customer-facing document (footer,
 * terms, privacy policy, checkout, invoices, receipts, slutsedler, mails)
 * reads its company name and CVR from here, so a change of entity is one
 * edit.
 *
 * Fixon ApS took over the webshop and the stores on 2026-11-06 (owner
 * decision). The brand stays "PhoneSpot"; only the legal line changes, and
 * the switch is deliberately not announced anywhere on the site.
 */
export const LEGAL_ENTITY = {
  name: "Fixon ApS",
  cvr: "46079019",
  vatId: "DK46079019",
} as const;

/** "Fixon ApS · CVR: 46079019" — the one-line legal mention. */
export const LEGAL_LINE = `${LEGAL_ENTITY.name} · CVR: ${LEGAL_ENTITY.cvr}`;
