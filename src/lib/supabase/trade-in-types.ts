/* ------------------------------------------------------------------ */
/*  Trade-In & Slutseddel Types                                        */
/* ------------------------------------------------------------------ */

export type TradeInOfferStatus = "pending" | "accepted" | "rejected" | "expired";

export interface TradeInOffer {
  id: string;
  inquiry_id: string;
  offer_amount: number;
  status: TradeInOfferStatus;
  token: string;
  token_expires_at: string;
  admin_note: string | null;
  customer_response_note: string | null;
  responded_at: string | null;
  seller_name: string | null;
  seller_address: string | null;
  seller_postal_city: string | null;
  seller_bank_reg: string | null;
  seller_bank_account: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TradeInReceiptStatus = "draft" | "confirmed" | "paid" | "completed";

export interface TradeInReceipt {
  id: string;
  receipt_number: string;
  inquiry_id: string | null;
  offer_id: string | null;
  store_location_id: string | null;
  seller_name: string;
  seller_address: string | null;
  seller_postal_city: string | null;
  seller_phone: string | null;
  seller_email: string | null;
  seller_bank_reg: string | null;
  seller_bank_account: string | null;
  buyer_company: string;
  buyer_cvr: string;
  buyer_address: string | null;
  buyer_postal_city: string | null;
  buyer_email: string;
  buyer_phone: string | null;
  total_amount: number;
  status: TradeInReceiptStatus;
  staff_initials: string | null;
  pdf_url: string | null;
  delivery_method: "shipping" | "in_store" | null;
  confirmed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeInReceiptItem {
  id: string;
  receipt_id: string;
  imei_serial: string | null;
  brand: string;
  model: string;
  storage: string | null;
  ram: string | null;
  condition_grade: "Perfekt" | "God" | "Acceptabel" | "Defekt" | null;
  color: string | null;
  condition_notes: string | null;
  price: number;
  created_at: string;
  updated_at: string;
}

export type TradeInDerivedStatus =
  | "ny"
  | "tilbud_sendt"
  | "accepteret"
  | "afvist"
  | "modtaget"
  | "betalt"
  | "lukket";

export function formatDKK(ore: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 2,
  }).format(ore / 100);
}

export function deriveTradeInStatus(
  inquiryStatus: string,
  offers: Pick<TradeInOffer, "status">[],
  receipts: Pick<TradeInReceipt, "status">[],
): TradeInDerivedStatus {
  if (receipts.some((r) => r.status === "paid" || r.status === "completed")) return "betalt";
  if (receipts.some((r) => r.status === "draft" || r.status === "confirmed")) return "modtaget";
  if (offers.some((o) => o.status === "accepted")) return "accepteret";
  if (offers.some((o) => o.status === "pending")) return "tilbud_sendt";
  if (offers.length > 0 && offers.every((o) => o.status === "rejected" || o.status === "expired")) return "afvist";
  if (inquiryStatus === "lukket") return "lukket";
  return "ny";
}
