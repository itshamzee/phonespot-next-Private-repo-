import { createServerClient } from "@/lib/supabase/client";
import type { StaffIdentity } from "@/lib/auth/require-staff";
import { buildLocationIndex, canAccessStore, isOwner } from "@/lib/auth/store-scope";
import { assertLocationAccess } from "@/lib/pos/pos-context";
import { PosError } from "@/lib/pos/errors";
import type { ReceiptDraft } from "./schemas";

/** En række fra trade_in_receipts (select "*"). Kolonnerne er løst typet, fordi tabellen er vokset flere gange. */
export type ReceiptRow = Record<string, unknown> & {
  id: string;
  status: string;
  location_id: string | null;
};

const notFound = () => new PosError("receipt_not_found", "Slutsedlen findes ikke", 404);

/**
 * Henter en slutseddel til en aktør. 404 hvis den ikke findes, og også 404
 * (ikke 403), hvis aktøren ikke har adgang til butikken, så eksistens ikke
 * afsløres. Sedler uden butik (ældre rækker) er forbeholdt ejeren.
 */
export async function loadReceiptForActor(actor: StaffIdentity, id: string): Promise<ReceiptRow> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("trade_in_receipts").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load receipt: ${error.message}`);
  if (!data) throw notFound();
  const row = data as ReceiptRow;
  await assertReceiptVisible(actor, row);
  return row;
}

/** Kaster 404, hvis aktøren ikke må se sedlen. */
export async function assertReceiptVisible(actor: StaffIdentity, row: { location_id: string | null }): Promise<void> {
  if (isOwner(actor)) return;
  if (!row.location_id) throw notFound();
  try {
    await assertLocationAccess(actor, row.location_id);
  } catch (err) {
    if (err instanceof PosError && err.status === 403) throw notFound();
    throw err;
  }
}

/** null = ejeren, ingen afgrænsning. Ellers uuid'erne på de butikker, aktøren har adgang til. */
export async function accessibleLocationIds(actor: StaffIdentity): Promise<string[] | null> {
  if (isOwner(actor)) return null;
  const supabase = createServerClient();
  const { data, error } = await supabase.from("locations").select("id, name, slug, type");
  if (error) throw new Error(`Failed to load locations: ${error.message}`);
  const index = buildLocationIndex(data ?? []);
  return Object.entries(index.slugById)
    .filter(([, slug]) => canAccessStore(actor, slug))
    .map(([id]) => id);
}

export function maskTail(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return `••••${value.slice(-4)}`;
}

type SanitizeOptions = {
  /** Kontonummer: aldrig i lister; i enkeltopslag kun i klartekst på en kladde. */
  bankAccount: "omit" | "draft-only";
};

/**
 * Det eneste sted, en slutseddel forlader serveren. Filstierne erstattes af
 * has_*-flag, ID-nummer maskeres, når sedlen ikke længere er en kladde, og
 * kontonummer følger valgmuligheden.
 */
export function sanitizeReceipt<T extends Record<string, unknown>>(row: T, opts: SanitizeOptions): Record<string, unknown> {
  const { signed_scan_path, invoice_file_path, payout_proof_path, id_number, seller_bank_account, ...rest } = row as Record<
    string,
    unknown
  >;
  const draft = rest.status === "draft";
  const out: Record<string, unknown> = {
    ...rest,
    has_signed_scan: signed_scan_path != null,
    has_invoice: invoice_file_path != null,
    has_payout_proof: payout_proof_path != null,
    id_number: id_number == null ? null : draft ? id_number : maskTail(id_number),
  };
  if (opts.bankAccount === "draft-only") {
    out.seller_bank_account = seller_bank_account == null ? null : draft ? seller_bank_account : maskTail(seller_bank_account);
  }
  return out;
}

const RECEIPT_SCALARS = [
  "seller_type",
  "seller_cvr",
  "invoice_type",
  "seller_age_confirmed",
  "lock_checks_confirmed",
  "id_type",
  "id_number",
  "id_expiry",
  "payout_method",
  "seller_bank_reg",
  "seller_bank_account",
  "account_owner_confirmed",
  "seller_address",
  "seller_postal_city",
  "seller_phone",
  "seller_email",
  "inquiry_id",
  "offer_id",
] as const;

/** Felterne fra kladden, som de skrives til tabellen. Udeladte felter er undefined og røres ikke. */
export function draftColumns(draft: ReceiptDraft): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of RECEIPT_SCALARS) {
    if (draft[key] !== undefined) out[key] = draft[key];
  }
  if (draft.seller_name !== undefined) out.seller_name = draft.seller_name ?? "";
  return out;
}

export type DraftItem = NonNullable<ReceiptDraft["items"]>[number];

/** price er NOT NULL (> 0) i tabellen; en varelinje kan derfor først gemmes, når den har en pris. */
export function itemsMissingPrice(items: DraftItem[]): boolean {
  return items.some((i) => !i.price || i.price <= 0);
}

export function itemRows(receiptId: string, items: DraftItem[]) {
  return items.map((i) => ({
    receipt_id: receiptId,
    template_id: i.template_id ?? null,
    imei_serial: i.imei_serial || null,
    brand: i.brand ?? "",
    model: i.model ?? "",
    storage: i.storage || null,
    color: i.color || null,
    condition_grade: i.condition_grade ?? null,
    battery_health: i.battery_health ?? null,
    suggested_price: i.suggested_price ?? null,
    price: i.price as number,
    condition_notes: i.condition_notes || null,
  }));
}

export const itemsTotal = (items: DraftItem[]) => items.reduce((s, i) => s + (i.price ?? 0), 0);

/**
 * Hvem tjekkede, og hvornår. Sættes først, når felterne er udfyldt, og
 * nulstilles, hvis de igen bliver ufuldstændige.
 */
export function checkStamps(
  merged: Record<string, unknown>,
  existing: Record<string, unknown> | null,
  actorId: string,
  nowIso: string,
  /** Hvilke grupper denne skrivning rører; en rettet værdi stemples på ny af den, der rettede. */
  touched: { lock: boolean; id: boolean },
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (merged.lock_checks_confirmed === true) {
    if (touched.lock || !existing?.lock_checks_by) Object.assign(out, { lock_checks_by: actorId, lock_checks_at: nowIso });
  } else if (existing?.lock_checks_by) {
    Object.assign(out, { lock_checks_by: null, lock_checks_at: null });
  }
  const idFilled = Boolean(merged.id_type && merged.id_number && merged.id_expiry);
  if (idFilled) {
    if (touched.id || !existing?.id_checked_by) Object.assign(out, { id_checked_by: actorId, id_checked_at: nowIso });
  } else if (existing?.id_checked_by) {
    Object.assign(out, { id_checked_by: null, id_checked_at: null });
  }
  return out;
}
