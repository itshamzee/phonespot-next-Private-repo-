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

  // Per-device breakdown (null on offers created before the column existed).
  // Read it with readOfferLines from @/lib/buyback/offer-lines.
  offer_lines?: unknown | null;

  // Set when a person has the device in their hands — deliberately not the same
  // as the carrier reporting the parcel delivered.
  received_at?: string | null;
  received_by?: string | null;

  // Automation (nullable on rows created before the migration ran)
  auto_sent?: boolean;
  pricing_breakdown?: unknown | null;
  scheduled_send_at?: string | null;
  resend_email_id?: string | null;
  send_state?: "scheduled" | "sent" | "cancelled" | "failed";
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
  | "afventer_forsendelse"
  | "paa_vej"
  | "leveret"
  | "afvist"
  | "modtaget"
  | "vurderet"
  | "betalt"
  | "lukket";

/** In the order a device moves through them. Drives the pipeline display. */
export const TRADE_IN_PIPELINE: TradeInDerivedStatus[] = [
  "ny",
  "tilbud_sendt",
  "accepteret",
  "afventer_forsendelse",
  "paa_vej",
  "leveret",
  "modtaget",
  "vurderet",
  "betalt",
];

/**
 * What the carrier and the staff have told us about a device on its way in.
 * Optional throughout: a caller that only needs to know whether a lead is new
 * (the queue) can leave it out entirely.
 */
export interface TradeInProgress {
  label?: { in_transit_at?: string | null; delivered_at?: string | null } | null;
  /** trade_in_offers.received_at — someone has the device in their hands. */
  receivedAt?: string | null;
}

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
  declines: { id: string }[] = [],
  progress: TradeInProgress = {},
): TradeInDerivedStatus {
  // Money has moved or the deal is agreed — a later decline cannot undo that.
  if (receipts.some((r) => r.status === "paid" || r.status === "completed")) return "betalt";
  if (receipts.some((r) => r.status === "confirmed")) return "vurderet";
  // A slutseddel in draft means the device is in front of someone. This also
  // keeps every row created before received_at existed reading as "modtaget".
  if (receipts.some((r) => r.status === "draft")) return "modtaget";
  if (progress.receivedAt) return "modtaget";

  if (offers.some((o) => o.status === "accepted")) {
    // The carrier's word, which is not the same as ours: a delivered parcel can
    // still be sitting unopened, and that gap is where devices go missing.
    if (progress.label?.delivered_at) return "leveret";
    if (progress.label?.in_transit_at) return "paa_vej";
    if (progress.label) return "afventer_forsendelse";
    return "accepteret";
  }
  // An admin decline outranks a pending offer: it is the newer decision, and it
  // is what makes declining a lead possible before any offer exists.
  if (declines.length > 0) return "afvist";
  if (offers.some((o) => o.status === "pending")) return "tilbud_sendt";
  if (offers.length > 0 && offers.every((o) => o.status === "rejected" || o.status === "expired")) return "afvist";
  if (inquiryStatus === "lukket") return "lukket";
  return "ny";
}
