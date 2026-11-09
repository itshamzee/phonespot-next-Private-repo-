import { createServerClient } from "@/lib/supabase/client";
import type { StaffIdentity } from "@/lib/auth/require-staff";
import { buildLocationIndex, canAccessStore, isOwner } from "@/lib/auth/store-scope";
import { assertLocationAccess } from "@/lib/pos/pos-context";
import { PosError } from "@/lib/pos/errors";
import type { ReceiptDraft } from "./schemas";
import type { ReceiptForRules } from "./rules";

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
    // Kontonummeret er maskeret eller udeladt; klientens regler skal kun vide, om det findes.
    has_bank_account: Boolean(rest.seller_bank_reg) && Boolean(seller_bank_account),
    id_number: id_number == null ? null : draft ? id_number : maskTail(id_number),
  };
  if (opts.bankAccount === "draft-only") {
    out.seller_bank_account = seller_bank_account == null ? null : draft ? seller_bank_account : maskTail(seller_bank_account);
  }
  return out;
}

const NAME_FIELDS = [
  ["created_by", "created_by_name"],
  ["confirmed_by", "confirmed_by_name"],
  ["paid_by", "paid_by_name"],
] as const;

/**
 * Tilføjer medarbejdernavne (created_by_name m.fl.) til sedlerne med én
 * forespørgsel på staff for alle id'erne. Ukendt eller manglende id giver null.
 */
export async function withStaffNames(
  rows: Array<Record<string, unknown>>,
  fields: ReadonlyArray<(typeof NAME_FIELDS)[number][0]>,
): Promise<Array<Record<string, unknown>>> {
  const wanted = NAME_FIELDS.filter(([from]) => fields.includes(from));
  const ids = [...new Set(rows.flatMap((r) => wanted.map(([from]) => r[from]).filter((v): v is string => typeof v === "string")))];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data, error } = await createServerClient().from("staff").select("id, name").in("id", ids);
    if (error) throw new Error(`Failed to load staff names: ${error.message}`);
    for (const s of data ?? []) if (typeof s.name === "string" && s.name) names.set(s.id as string, s.name);
  }
  return rows.map((r) => ({
    ...r,
    ...Object.fromEntries(wanted.map(([from, to]) => [to, typeof r[from] === "string" ? (names.get(r[from] as string) ?? null) : null])),
  }));
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
    // 0 = ikke sat endnu; trade_in_confirm kræver > 0.
    price: i.price ?? 0,
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
  // MitID har ingen udløbsdato; de andre ID-typer skal have en.
  const idFilled = Boolean(merged.id_type && merged.id_number && (merged.id_type === "mitid" || merged.id_expiry));
  if (idFilled) {
    if (touched.id || !existing?.id_checked_by) Object.assign(out, { id_checked_by: actorId, id_checked_at: nowIso });
  } else if (existing?.id_checked_by) {
    Object.assign(out, { id_checked_by: null, id_checked_at: null });
  }
  return out;
}

/** En række fra trade_in_receipts og dens varer, som confirmBlockers/payBlockers læser dem. */
export function receiptForRules(
  row: Record<string, unknown>,
  items: Array<Record<string, unknown>>,
): ReceiptForRules {
  const s = (v: unknown) => (typeof v === "string" ? v : null);
  return {
    total_amount: typeof row.total_amount === "number" ? row.total_amount : 0,
    status: s(row.status) ?? "draft",
    seller_type: row.seller_type === "business" ? "business" : "private",
    seller_cvr: s(row.seller_cvr),
    invoice_type: s(row.invoice_type) as ReceiptForRules["invoice_type"],
    seller_name: s(row.seller_name),
    seller_address: s(row.seller_address),
    seller_age_confirmed: row.seller_age_confirmed === true,
    lock_checks_confirmed: row.lock_checks_confirmed === true,
    id_type: s(row.id_type) as ReceiptForRules["id_type"],
    id_number: s(row.id_number),
    id_expiry: s(row.id_expiry),
    attestation: s(row.attestation),
    signed_scan_path: s(row.signed_scan_path),
    invoice_file_path: s(row.invoice_file_path),
    payout_method: s(row.payout_method) as ReceiptForRules["payout_method"],
    seller_bank_reg: s(row.seller_bank_reg),
    seller_bank_account: s(row.seller_bank_account),
    account_owner_confirmed: row.account_owner_confirmed === true,
    offset_amount: typeof row.offset_amount === "number" ? row.offset_amount : null,
    suspected_at: s(row.suspected_at),
    items: items.map((i) => ({
      template_id: s(i.template_id),
      imei_serial: s(i.imei_serial),
      price: typeof i.price === "number" ? i.price : null,
    })),
  };
}

const LOCK_FIELDS = ["lock_checks_confirmed"] as const;
const ID_FIELDS = ["id_type", "id_number", "id_expiry"] as const;
const same = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);

/**
 * Hvilke tjek-grupper en skrivning faktisk ændrer. Autogem sender alle felter
 * hver gang; uændrede værdier må ikke flytte stemplet til en anden medarbejder.
 */
export function touchedChecks(
  fields: Record<string, unknown>,
  existing: Record<string, unknown> | null,
): { lock: boolean; id: boolean } {
  const changed = (keys: readonly string[]) => keys.some((k) => k in fields && !same(fields[k], existing?.[k]));
  return { lock: changed(LOCK_FIELDS), id: changed(ID_FIELDS) };
}

export type Attestation = "online_accept" | "paper_scan";

/**
 * Sælger har accepteret online (og slipper for en underskrevet seddel ved
 * udbetaling) kun når alt dette holder:
 *  a) tilbuddet er accepteret og hører til sedlens henvendelse,
 *  b) ingen anden ikke-annulleret seddel bruger samme tilbud,
 *  c) sedlens total er højst det accepterede beløb.
 * Afledes altid her på serveren; klienten kan ikke sende feltet.
 */
export async function attestationFor(args: {
  offerId: unknown;
  inquiryId: unknown;
  /** Sedlen selv, som ikke tæller som "en anden" seddel. null ved oprettelse. */
  receiptId: string | null;
  totalOere: number;
}): Promise<Attestation> {
  const { offerId, inquiryId, receiptId, totalOere } = args;
  if (typeof offerId !== "string" || typeof inquiryId !== "string") return "paper_scan";
  const supabase = createServerClient();
  const { data: offer, error } = await supabase
    .from("trade_in_offers")
    .select("id, offer_amount")
    .eq("id", offerId)
    .eq("inquiry_id", inquiryId)
    .eq("status", "accepted")
    .maybeSingle();
  if (error) throw new Error(`Failed to load offer: ${error.message}`);
  if (!offer) return "paper_scan";
  if (typeof offer.offer_amount !== "number" || totalOere > offer.offer_amount) return "paper_scan";

  let others = supabase.from("trade_in_receipts").select("id").eq("offer_id", offerId).neq("status", "voided");
  if (receiptId) others = others.neq("id", receiptId);
  const { data: used, error: usedErr } = await others;
  if (usedErr) throw new Error(`Failed to check offer use: ${usedErr.message}`);
  return (used ?? []).length > 0 ? "paper_scan" : "online_accept";
}

/** Unik-indekset trade_in_receipts_offer_once: ét tilbud, én (ikke-annulleret) seddel. */
export function offerUsedConflict(error: { code?: string; message?: string } | null | undefined): PosError | null {
  if (error?.code === "23505" && (error.message ?? "").includes("trade_in_receipts_offer_once")) {
    return new PosError("offer_used", "Tilbuddet er allerede brugt på en anden slutseddel", 409);
  }
  return null;
}
