import { LEGAL_ENTITY } from "@/lib/company";

/** Client-safe: pure helpers for the legal entity printed on documents. */
export type LegalEntityInfo = { name: string; cvr: string };

type Snapshot = { legal_name: string | null; legal_cvr: string | null };

/** The website-wide entity (Fixon) as a plain info object. */
export const DEFAULT_LEGAL_ENTITY: LegalEntityInfo = { name: LEGAL_ENTITY.name, cvr: LEGAL_ENTITY.cvr };

/**
 * Legal line on a POS receipt, from the snapshot stored on the order.
 * Orders from before the snapshot existed (both null) keep the legacy text.
 */
export function receiptLegalLine(order: Snapshot): string {
  if (order.legal_name && order.legal_cvr) return `${order.legal_name} · CVR: ${order.legal_cvr}`;
  return "CVR: 44588819";
}

/** Entity on an invoice. Orders without a snapshot were sold by PhoneGo ApS. */
export function invoiceLegalEntity(order: Snapshot): LegalEntityInfo {
  if (order.legal_name && order.legal_cvr) return { name: order.legal_name, cvr: order.legal_cvr };
  return { name: "PhoneGo ApS", cvr: "38688766" };
}
