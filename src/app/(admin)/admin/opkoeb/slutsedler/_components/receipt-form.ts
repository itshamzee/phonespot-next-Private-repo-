/**
 * Formularen bag opkøbs-editoren og de rene oversættelser til og fra API'et.
 * Felterne er strenge, som de står i inputfelterne; toDraftPayload er det ene
 * sted, de bliver til en kladde, som receiptDraftSchema accepterer.
 */
import {
  idRequired,
  normalizeIdentifier,
  type ConditionLabel,
  type IdType,
  type InvoiceType,
  type PayoutMethod,
  type ReceiptForRules,
  type SellerType,
} from "@/lib/opkoeb/rules";
import type { ReceiptDraft } from "@/lib/opkoeb/schemas";

export const CONDITIONS: ConditionLabel[] = ["Perfekt", "God", "Acceptabel", "Defekt"];

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  med_moms: "Faktura med moms",
  brugtmoms: "Faktura med brugtmoms",
  eu_normal: "EU-faktura uden dansk moms",
};

export type ItemForm = {
  /** Kun til React-nøgler. */
  key: string;
  imei: string;
  template_id: string | null;
  brand: string;
  model: string;
  storage: string;
  /** Modellens lagervalg, når en model er valgt. */
  storage_options: string[];
  condition: ConditionLabel | "";
  battery: string;
  /** Øre fra prisforslaget, null før der er et. */
  suggested: number | null;
  priceKr: string;
  note: string;
};

export type ReceiptForm = {
  seller_type: SellerType;
  seller_name: string;
  seller_address: string;
  seller_postal_city: string;
  seller_phone: string;
  seller_email: string;
  seller_cvr: string;
  invoice_type: InvoiceType | "";
  seller_age_confirmed: boolean;
  lock_checks_confirmed: boolean;
  id_type: IdType | "";
  id_number: string;
  id_expiry: string;
  payout_method: PayoutMethod | "";
  seller_bank_reg: string;
  seller_bank_account: string;
  account_owner_confirmed: boolean;
  inquiry_id: string | null;
  offer_id: string | null;
  items: ItemForm[];
};

let keySeq = 0;
export const newKey = () => `item-${++keySeq}`;

export function emptyItem(over: Partial<ItemForm> = {}): ItemForm {
  return {
    key: newKey(),
    imei: "",
    template_id: null,
    brand: "",
    model: "",
    storage: "",
    storage_options: [],
    condition: "",
    battery: "",
    suggested: null,
    priceKr: "",
    note: "",
    ...over,
  };
}

export function emptyForm(): ReceiptForm {
  return {
    seller_type: "private",
    seller_name: "",
    seller_address: "",
    seller_postal_city: "",
    seller_phone: "",
    seller_email: "",
    seller_cvr: "",
    invoice_type: "",
    seller_age_confirmed: false,
    lock_checks_confirmed: false,
    id_type: "",
    id_number: "",
    id_expiry: "",
    payout_method: "",
    seller_bank_reg: "",
    seller_bank_account: "",
    account_owner_confirmed: false,
    inquiry_id: null,
    offer_id: null,
    items: [emptyItem()],
  };
}

// ---------------------------------------------------------------- beløb

/** "2.000,01", "2000,01", "2000.5" og "2000" til øre. null for tomt eller ugyldigt. */
export function parseKr(raw: string): number | null {
  let s = raw.replace(/\s|kr\.?/gi, "");
  if (s === "") return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

/** Øre som kroner til et inputfelt: "2.400" eller "2.000,01". */
export function formatKrInput(oere: number): string {
  const whole = oere % 100 === 0;
  return (oere / 100).toLocaleString("da-DK", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function formatKr(oere: number): string {
  return `${(oere / 100).toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr.`;
}

export function totalOere(form: ReceiptForm): number {
  return form.items.reduce((s, i) => s + (parseKr(i.priceKr) ?? 0), 0);
}

// ---------------------------------------------------------------- felter

export const CPR_PATTERN = /^\d{6}-?\d{4}$/;

const opt = (v: string) => (v.trim() === "" ? null : v.trim());
/** Felter som skemaet tjekker med et mønster: kun gyldige værdier sendes, ellers null. */
const matching = (v: string, re: RegExp) => {
  const s = v.replace(/[\s-]/g, "");
  return re.test(s) ? s : null;
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const fieldPatterns = {
  cvr: /^\d{8}$/,
  reg: /^\d{4}$/,
  account: /^\d{6,10}$/,
};

/** Vises ved feltet, når der står noget, som ikke kan gemmes. */
export function fieldError(kind: keyof typeof fieldPatterns, value: string): string | null {
  if (value.trim() === "" || matching(value, fieldPatterns[kind])) return null;
  return {
    cvr: "CVR skal være 8 cifre",
    reg: "Reg.nr. skal være 4 cifre",
    account: "Kontonummer skal være 6 til 10 cifre",
  }[kind];
}

export function emailError(value: string): string | null {
  return value.trim() === "" || EMAIL.test(value.trim()) ? null : "Ugyldig e-mail";
}

export function idNumberError(value: string): string | null {
  return CPR_PATTERN.test(value.trim()) ? "Det ligner et CPR-nummer. Skriv ID'ets nummer." : null;
}

/** Batteritilstand i hele procent, 0 til 100. Tomt er tilladt. */
export function batteryError(value: string): string | null {
  const v = value.trim();
  if (v === "") return null;
  return /^\d{1,3}$/.test(v) && Number(v) <= 100 ? null : "Batteri skal være mellem 0 og 100 %";
}

export function imeiError(value: string): string | null {
  if (value.trim() === "" || normalizeIdentifier(value)) return null;
  return /^\d{15}$/.test(value.replace(/\s+/g, "")) ? "Ugyldigt IMEI" : "Ugyldigt IMEI eller serienummer";
}

/**
 * Den ene normalisering fra formular til kladde. Tomme felter og felter, der
 * (endnu) ikke opfylder skemaets mønstre, sendes som null, så en halvt indtastet
 * værdi aldrig får hele gemningen afvist. ID sendes kun, når det kræves.
 */
export function toDraftPayload(form: ReceiptForm): ReceiptDraft {
  const business = form.seller_type === "business";
  const bank = form.payout_method === "bank";
  const needsId = idRequired(totalOere(form));
  const idNumber = opt(form.id_number);
  return {
    seller_type: form.seller_type,
    seller_name: opt(form.seller_name),
    seller_address: opt(form.seller_address),
    seller_postal_city: opt(form.seller_postal_city),
    seller_phone: opt(form.seller_phone),
    seller_email: EMAIL.test(form.seller_email.trim()) ? form.seller_email.trim() : null,
    seller_cvr: business ? matching(form.seller_cvr, fieldPatterns.cvr) : null,
    invoice_type: business && form.invoice_type ? form.invoice_type : null,
    seller_age_confirmed: !business && form.seller_age_confirmed,
    lock_checks_confirmed: form.lock_checks_confirmed,
    id_type: needsId && form.id_type ? form.id_type : null,
    id_number: needsId && idNumber && !CPR_PATTERN.test(idNumber) ? idNumber : null,
    id_expiry: needsId && form.id_type && form.id_type !== "mitid" && /^\d{4}-\d{2}-\d{2}$/.test(form.id_expiry) ? form.id_expiry : null,
    payout_method: form.payout_method || null,
    seller_bank_reg: bank ? matching(form.seller_bank_reg, fieldPatterns.reg) : null,
    seller_bank_account: bank ? matching(form.seller_bank_account, fieldPatterns.account) : null,
    account_owner_confirmed: bank && form.account_owner_confirmed,
    inquiry_id: form.inquiry_id,
    offer_id: form.offer_id,
    items: form.items.map((i) => {
      const battery = /^\d{1,3}$/.test(i.battery.trim()) ? Number(i.battery.trim()) : null;
      return {
        template_id: i.template_id,
        imei_serial: normalizeIdentifier(i.imei)?.value ?? (opt(i.imei)?.slice(0, 40) ?? null),
        brand: opt(i.brand),
        model: opt(i.model),
        storage: opt(i.storage),
        condition_grade: i.condition || null,
        battery_health: battery !== null && battery <= 100 ? battery : null,
        suggested_price: i.suggested,
        price: parseKr(i.priceKr),
        condition_notes: opt(i.note),
      };
    }),
  };
}

/** Det samme billede af sedlen, som serveren ser, efter kladden er gemt. */
export function toRulesInput(form: ReceiptForm): ReceiptForRules {
  const d = toDraftPayload(form);
  return {
    total_amount: totalOere(form),
    status: "draft",
    seller_type: form.seller_type,
    seller_cvr: d.seller_cvr ?? null,
    invoice_type: d.invoice_type ?? null,
    seller_name: d.seller_name ?? null,
    seller_address: d.seller_address ?? null,
    seller_age_confirmed: d.seller_age_confirmed ?? false,
    lock_checks_confirmed: d.lock_checks_confirmed ?? false,
    id_type: d.id_type ?? null,
    id_number: d.id_number ?? null,
    id_expiry: d.id_expiry ?? null,
    attestation: null,
    signed_scan_path: null,
    invoice_file_path: null,
    payout_method: d.payout_method ?? null,
    seller_bank_reg: d.seller_bank_reg ?? null,
    seller_bank_account: d.seller_bank_account ?? null,
    account_owner_confirmed: d.account_owner_confirmed ?? false,
    offset_amount: null,
    suspected_at: null,
    items: (d.items ?? []).map((i) => ({
      template_id: i.template_id ?? null,
      imei_serial: i.imei_serial ?? null,
      price: i.price ?? null,
    })),
  };
}

// ---------------------------------------------------------------- indlæsning

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** En gemt kladde (GET /api/trade-in/receipts/[id]) tilbage i formularen. */
export function formFromReceipt(r: Record<string, unknown>): ReceiptForm {
  const rawItems = Array.isArray(r.trade_in_receipt_items) ? (r.trade_in_receipt_items as Array<Record<string, unknown>>) : [];
  const items = [...rawItems]
    .sort((a, b) => str(a.created_at).localeCompare(str(b.created_at)))
    .map((i) =>
      emptyItem({
        imei: str(i.imei_serial),
        template_id: typeof i.template_id === "string" ? i.template_id : null,
        brand: str(i.brand),
        model: str(i.model),
        storage: str(i.storage),
        condition: (CONDITIONS as string[]).includes(str(i.condition_grade)) ? (i.condition_grade as ConditionLabel) : "",
        battery: typeof i.battery_health === "number" ? String(i.battery_health) : "",
        suggested: typeof i.suggested_price === "number" ? i.suggested_price : null,
        priceKr: typeof i.price === "number" && i.price > 0 ? formatKrInput(i.price) : "",
        note: str(i.condition_notes),
      }),
    );
  return {
    seller_type: r.seller_type === "business" ? "business" : "private",
    seller_name: str(r.seller_name),
    seller_address: str(r.seller_address),
    seller_postal_city: str(r.seller_postal_city),
    seller_phone: str(r.seller_phone),
    seller_email: str(r.seller_email),
    seller_cvr: str(r.seller_cvr),
    invoice_type: (str(r.invoice_type) as InvoiceType) || "",
    seller_age_confirmed: r.seller_age_confirmed === true,
    lock_checks_confirmed: r.lock_checks_confirmed === true,
    id_type: (str(r.id_type) as IdType) || "",
    id_number: str(r.id_number),
    id_expiry: str(r.id_expiry),
    payout_method: (str(r.payout_method) as PayoutMethod) || "",
    seller_bank_reg: str(r.seller_bank_reg),
    seller_bank_account: str(r.seller_bank_account),
    account_owner_confirmed: r.account_owner_confirmed === true,
    inquiry_id: typeof r.inquiry_id === "string" ? r.inquiry_id : null,
    offer_id: typeof r.offer_id === "string" ? r.offer_id : null,
    items: items.length > 0 ? items : [emptyItem()],
  };
}
