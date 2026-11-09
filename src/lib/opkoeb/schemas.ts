import { z } from "zod";
import { ID_TYPES, INVOICE_TYPES, PAYOUT_METHODS, looksLikeCpr } from "./rules";

/**
 * Kladder må være ufuldstændige; fuldstændighed er confirmBlockers' ansvar.
 * Skemaet afviser kun forkerte værdier (CPR, sundhedskort, forkerte typer).
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dato skal være ÅÅÅÅ-MM-DD");
const text = (max = 200) => z.string().trim().max(max);

export const receiptItemSchema = z.object({
  template_id: z.string().uuid().nullish(),
  imei_serial: text(40).nullish(),
  brand: text().nullish(),
  model: text().nullish(),
  storage: text(50).nullish(),
  color: text(50).nullish(),
  condition_grade: z.enum(["Perfekt", "God", "Acceptabel", "Defekt"]).nullish(),
  battery_health: z.number().int().min(0).max(100).nullish(),
  suggested_price: z.number().int().min(0).nullish(),
  price: z.number().int().min(0).nullish(),
  condition_notes: text(1000).nullish(),
});

export const receiptDraftSchema = z.object({
  seller_type: z.enum(["private", "business"]).optional(),
  seller_name: text().nullish(),
  seller_address: text().nullish(),
  seller_postal_city: text().nullish(),
  seller_phone: text(50).nullish(),
  seller_email: z.string().trim().email().max(200).nullish(),
  seller_cvr: z.string().regex(/^\d{8}$/, "CVR skal være 8 cifre").nullish(),
  invoice_type: z.enum(INVOICE_TYPES).nullish(),
  seller_age_confirmed: z.boolean().optional(),
  lock_checks_confirmed: z.boolean().optional(),
  id_type: z.enum(ID_TYPES).nullish(),
  id_number: text(50)
    .refine((v) => !looksLikeCpr(v), "Skriv ikke CPR-nummer")
    .nullish(),
  id_expiry: isoDate.nullish(),
  payout_method: z.enum(PAYOUT_METHODS).nullish(),
  seller_bank_reg: z.string().regex(/^\d{4}$/, "Reg.nr. skal være 4 cifre").nullish(),
  seller_bank_account: z
    .string()
    .regex(/^\d{6,10}$/, "Kontonummer skal være 6 til 10 cifre")
    .nullish(),
  account_owner_confirmed: z.boolean().optional(),
  inquiry_id: z.string().uuid().nullish(),
  offer_id: z.string().uuid().nullish(),
  items: z.array(receiptItemSchema).max(50).optional(),
});

export type ReceiptDraft = z.infer<typeof receiptDraftSchema>;

export const payBodySchema = z.object({
  payout_method: z.literal("bank"),
  seller_bank_reg: z.string().regex(/^\d{4}$/, "Reg.nr. skal være 4 cifre"),
  seller_bank_account: z
    .string()
    .regex(/^\d{6,10}$/, "Kontonummer skal være 6 til 10 cifre"),
  account_owner_confirmed: z.literal(true),
  /** Det beløb (øre), medarbejderen så som "udbetales til bank". Skal stemme med restbeløbet nu. */
  expected_amount_oere: z.number().int().min(1),
});

export const suspicionBodySchema = z.object({
  note: z.string().trim().min(1, "Skriv en note").max(1000),
  police_notified: z.boolean(),
});

export const suspicionReleaseBodySchema = z.object({
  note: z.string().trim().min(1, "Skriv en note").max(1000),
});

export const voidBodySchema = z.object({
  reason: z.string().trim().min(1, "Skriv en begrundelse").max(1000),
});

export const uploadKindSchema = z.enum(["signed_scan", "invoice", "payout_proof"]);
export type UploadKind = z.infer<typeof uploadKindSchema>;

/** Hvilken kolonne på slutsedlen hver filtype gemmes i. Bruges af upload- og files-ruterne. */
export const UPLOAD_COLUMN: Record<UploadKind, "signed_scan_path" | "invoice_file_path" | "payout_proof_path"> = {
  signed_scan: "signed_scan_path",
  invoice: "invoice_file_path",
  payout_proof: "payout_proof_path",
};
