/**
 * Regler for opkøb i butikken (slutseddel). Rene funktioner, ingen I/O.
 * API-ruter, UI og SQL spejler disse regler. Beløb er hele øre.
 */

/** ID kræves kun når totalen er STRENGT over 2.000 kr. */
export const ID_REQUIRED_ABOVE_OERE = 200000;

export const ID_TYPES = ["pas", "koerekort", "id_kort", "mitid"] as const;
export type IdType = (typeof ID_TYPES)[number];

export const ID_TYPE_LABELS: Record<IdType, string> = {
  pas: "Pas",
  koerekort: "Kørekort",
  id_kort: "ID-kort",
  mitid: "MitID",
};

export type SellerType = "private" | "business";

export const INVOICE_TYPES = ["med_moms", "brugtmoms", "eu_normal"] as const;
export type InvoiceType = (typeof INVOICE_TYPES)[number];

export const PAYOUT_METHODS = ["bank", "modregning"] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export type ConditionLabel = "Perfekt" | "God" | "Acceptabel" | "Defekt";

export const GRADE_FROM_CONDITION: Record<ConditionLabel, "A" | "B" | "C"> = {
  Perfekt: "A",
  God: "B",
  Acceptabel: "C",
  Defekt: "C",
};

export type ReceiptItemForRules = {
  template_id: string | null;
  imei_serial: string | null;
  price: number | null;
};

/** De kolonner på opkøbsslutsedlen (Task 2) som reglerne læser. */
export type ReceiptForRules = {
  total_amount: number;
  status: string;
  seller_type: SellerType;
  seller_cvr: string | null;
  invoice_type: InvoiceType | null;
  seller_name: string | null;
  seller_address: string | null;
  seller_age_confirmed: boolean;
  lock_checks_confirmed: boolean;
  id_type: IdType | null;
  id_number: string | null;
  /** ISO-dato (YYYY-MM-DD) */
  id_expiry: string | null;
  attestation: string | null;
  signed_scan_path: string | null;
  invoice_file_path: string | null;
  payout_method: PayoutMethod | null;
  seller_bank_reg: string | null;
  seller_bank_account: string | null;
  account_owner_confirmed: boolean;
  offset_amount: number | null;
  suspected_at: string | null;
  items: ReceiptItemForRules[];
};

// ---------------------------------------------------------------- identifikatorer

export function isValidImei(s: string): boolean {
  if (!/^\d{15}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = Number(s[14 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function normalizeIdentifier(
  raw: string,
): { kind: "imei" | "serial"; value: string } | null {
  const value = raw.replace(/\s+/g, "").toUpperCase();
  if (/^\d{15}$/.test(value)) {
    return isValidImei(value) ? { kind: "imei", value } : null;
  }
  if (/^[A-Z0-9]{5,30}$/.test(value)) return { kind: "serial", value };
  return null;
}

/**
 * Ligner værdien et CPR-nummer? Mellemrum og bindestreger (også tankestreger) fjernes
 * først, så "010190 1234" og "010190–1234" fanges som "0101901234".
 */
export function looksLikeCpr(raw: string): boolean {
  const stripped = raw.replace(/[\s\-\u2010-\u2015\u2212]/g, "");
  return /^\d{10}$/.test(stripped) || /^\d{6}-?\d{4}$/.test(raw.trim());
}

// ---------------------------------------------------------------- beløb og moms

export function idRequired(totalOere: number): boolean {
  return totalOere > ID_REQUIRED_ABOVE_OERE;
}

/** Privat sælger og brugtmoms-faktura giver brugtmoms; øvrige firmakøb er almindelig moms. */
export function vatSchemeFor(
  seller: SellerType,
  invoice: InvoiceType | null,
): "brugtmoms" | "regular" {
  if (seller === "private") return "brugtmoms";
  return invoice === "med_moms" || invoice === "eu_normal" ? "regular" : "brugtmoms";
}

/**
 * Enhedens kostpris eksklusive fradragsberettiget moms. Kun faktura med dansk
 * moms (25 %) trækkes ud; brugtmoms, EU-faktura uden dansk moms og private
 * køb er kostpris = pris.
 */
export function deviceCostOere(
  priceOere: number,
  seller: SellerType,
  invoice: InvoiceType | null,
): number {
  if (seller === "business" && invoice === "med_moms") {
    return Math.round(priceOere / 1.25);
  }
  return priceOere;
}

// ---------------------------------------------------------------- blokkere

const PHOTO_ID_TYPES: readonly IdType[] = ["pas", "koerekort", "id_kort"];

const blank = (v: string | null | undefined) => !v || v.trim() === "";

/** Tom liste betyder, at slutsedlen kan bekræftes. */
export function confirmBlockers(r: ReceiptForRules, today: string): string[] {
  const out: string[] = [];

  if (blank(r.seller_name)) out.push("Sælgers navn mangler");
  // Bilaget skal bære sælgers adresse for alle sælgertyper (momsbek. § 122).
  if (blank(r.seller_address)) out.push("Sælgers adresse mangler");
  if (r.seller_type === "private") {
    if (!r.seller_age_confirmed) out.push("Sælger skal være fyldt 18");
  } else {
    if (!r.seller_cvr || !/^\d{8}$/.test(r.seller_cvr)) {
      out.push("Firmaets CVR-nummer (8 cifre) mangler");
    }
    if (!r.invoice_type) out.push("Vælg fakturatype for firmaets faktura");
  }

  if (!r.lock_checks_confirmed) out.push("Tjek Find My og spærring, og sæt kryds");

  if (!r.id_type) {
    if (idRequired(r.total_amount)) out.push("ID kræves over 2.000 kr.");
  } else {
    if (blank(r.id_number)) out.push("ID-nummer mangler");
    if (PHOTO_ID_TYPES.includes(r.id_type)) {
      if (!r.id_expiry) out.push("ID'ets udløbsdato mangler");
      else if (r.id_expiry < today) out.push("ID'et er udløbet");
    }
  }

  if (r.items.length === 0) out.push("Tilføj mindst én vare");
  r.items.forEach((item, i) => {
    const n = i + 1;
    if (!item.template_id) out.push(`Vare ${n}: vælg model`);
    if (!item.imei_serial || !normalizeIdentifier(item.imei_serial)) {
      out.push(`Vare ${n}: IMEI eller serienummer er ugyldigt`);
    }
    if (!item.price || item.price <= 0) out.push(`Vare ${n}: pris mangler`);
  });

  // Kontooplysningerne låses ved bekræftelsen, så de skal være på plads inden.
  // Ved modregning er kontoen valgfri (et restbeløb udbetales til bank), men er den
  // udfyldt, gælder samme krav som ved bank.
  const accountGiven = !blank(r.seller_bank_reg) || !blank(r.seller_bank_account);
  if (!r.payout_method) {
    out.push("Vælg udbetaling");
  } else if (r.payout_method === "bank" || accountGiven) {
    if (!r.seller_bank_reg || !/^\d{4}$/.test(r.seller_bank_reg)) out.push("Reg.nr. skal være 4 cifre");
    if (!r.seller_bank_account || !/^\d{6,10}$/.test(r.seller_bank_account)) {
      out.push("Kontonummer skal være 6 til 10 cifre");
    }
    if (!r.account_owner_confirmed) out.push("Bekræft at kontoen står i sælgers navn");
  }

  return out;
}

export function payoutRemainderOere(r: ReceiptForRules): number {
  return r.total_amount - (r.offset_amount ?? 0);
}

/** Tom liste betyder, at udbetaling kan ske. */
export function payBlockers(r: ReceiptForRules): string[] {
  const out: string[] = [];

  if (r.suspected_at) out.push("Opkøbet er spærret ved mistanke");
  if (r.status !== "confirmed") out.push("Kun bekræftede slutsedler kan udbetales");

  if (payoutRemainderOere(r) <= 0) {
    out.push("Opkøbet er allerede modregnet");
    return out;
  }

  if (r.seller_type === "business") {
    if (!r.invoice_file_path) out.push("Læg firmaets faktura op");
  } else if (r.attestation !== "online_accept" && !r.signed_scan_path) {
    out.push("Læg den underskrevne slutseddel op");
  }

  if (r.payout_method !== "bank") {
    out.push("Vælg udbetaling til bank");
  } else {
    if (!r.seller_bank_reg || !/^\d{4}$/.test(r.seller_bank_reg)) {
      out.push("Reg.nr. skal være 4 cifre");
    }
    if (!r.seller_bank_account || !/^\d{6,10}$/.test(r.seller_bank_account)) {
      out.push("Kontonummer skal være 6 til 10 cifre");
    }
    if (!r.account_owner_confirmed) {
      out.push("Bekræft at sælger er kontoens ejer");
    }
  }

  return out;
}
