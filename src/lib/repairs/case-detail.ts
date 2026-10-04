/**
 * Alt sagssiden og sidepanelet skal bruge om én sag, samlet server-side:
 * sagen, tilbud, statuslog, kommentarer, enhed, SMS-tråd, depositum, linjer og
 * totaler, garanti og kundens historik. `light` springer det tunge over
 * (fotos, kommentarer, historik) og bruges af sidepanelet.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCaseDeposits, type CaseDeposit } from "@/lib/pos/deposits";
import { withSignedRepairPhotos } from "@/lib/repairs/photo-storage";
import { caseLines, computeCaseTotals, type CaseLine, type CaseTotals } from "@/lib/repairs/case-money";
import { loadCaseItems, loadCaseItemViews } from "@/lib/repairs/case-items";
import type { CaseItemView } from "@/lib/repairs/new-case-types";
import type {
  CustomerDevice,
  RepairComment,
  RepairQuote,
  RepairStatusLog,
  RepairTicket,
  SmsLogEntry,
} from "@/lib/supabase/types";

export type CaseDetail = {
  ticket: RepairTicket & { repair_model_id?: string | null; device_passcode?: string | null; promised_at?: string | null; assigned_to?: string | null; signature_url?: string | null };
  quotes: RepairQuote[];
  logs: RepairStatusLog[];
  comments: RepairComment[];
  sms: SmsLogEntry[];
  device: Pick<CustomerDevice, "brand" | "model" | "serial_number" | "color" | "condition_notes"> | null;
  deposits: CaseDeposit[];
  /** false hvis depositum ikke kunne hentes; så er "rest" ikke til at stole på. */
  deposits_ok: boolean;
  lines: CaseLine[];
  /** Sagens linjer (Ny sag) med lagerstatus. Tom for ældre sager. */
  items: CaseItemView[];
  totals: CaseTotals;
  warranty: string | null;
  history: { tickets: number | null; orders: number | null } | null;
  light: boolean;
};

export async function loadCaseDetail(
  supabase: SupabaseClient,
  id: string,
  opts: { light?: boolean; canSeeCost?: boolean } = {},
): Promise<CaseDetail | null> {
  const light = Boolean(opts.light);

  const ticketRes = await supabase.from("repair_tickets").select("*").eq("id", id).maybeSingle();
  if (ticketRes.error) throw new Error(ticketRes.error.message);
  if (!ticketRes.data) return null;
  const raw = ticketRes.data as CaseDetail["ticket"];

  const smsQuery = supabase.from("sms_log").select("*").eq("ticket_id", id);

  const [quotes, logs, comments, sms, device, depositsResult] = await Promise.all([
    supabase.from("repair_quotes").select("*").eq("ticket_id", id).order("created_at", { ascending: false }),
    light
      ? Promise.resolve({ data: [] as RepairStatusLog[] })
      : supabase.from("repair_status_log").select("*").eq("ticket_id", id).order("created_at", { ascending: false }),
    light
      ? Promise.resolve({ data: [] as RepairComment[] })
      : supabase.from("repair_comments").select("*").eq("ticket_id", id).order("created_at", { ascending: true }),
    light ? smsQuery.order("created_at", { ascending: false }).limit(1) : smsQuery.order("created_at", { ascending: true }),
    raw.device_id
      ? supabase
          .from("customer_devices")
          .select("brand, model, serial_number, color, condition_notes")
          .eq("id", raw.device_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getCaseDeposits(id).then(
      (deposits) => ({ deposits, ok: true }),
      (err) => {
        console.error("[admin/repairs] deposits failed:", id, err);
        return { deposits: [] as CaseDeposit[], ok: false };
      },
    ),
  ]);

  const quoteRows = (quotes.data ?? []) as RepairQuote[];
  const [itemRows, itemViews] = await Promise.all([
    loadCaseItems(supabase, id),
    loadCaseItemViews(supabase, id, Boolean(opts.canSeeCost)),
  ]);
  const lines = caseLines(raw, quoteRows, itemRows);
  const totals = computeCaseTotals(lines, depositsResult.deposits, { paid: raw.paid, booking: raw.booking_details });

  let warranty: string | null = null;
  let history: CaseDetail["history"] = null;
  if (!light) {
    const [w, h] = await Promise.all([loadWarranty(supabase, raw), loadHistory(supabase, raw)]);
    warranty = w;
    history = h;
  }

  return {
    // Adgangskoden følger kun med den fulde sagsside, aldrig sidepanelet.
    ticket: light ? { ...raw, device_passcode: undefined } : await withSignedRepairPhotos(supabase, raw),
    quotes: quoteRows,
    logs: (logs.data ?? []) as RepairStatusLog[],
    comments: (comments.data ?? []) as RepairComment[],
    sms: (sms.data ?? []) as SmsLogEntry[],
    device: (device.data as CaseDetail["device"]) ?? null,
    deposits: depositsResult.deposits,
    deposits_ok: depositsResult.ok,
    lines,
    items: itemViews,
    totals,
    warranty,
    history,
    light,
  };
}

/** Garantitekst fra de ydelser sagen er oprettet med (repair_services.warranty_info). */
async function loadWarranty(supabase: SupabaseClient, ticket: RepairTicket): Promise<string | null> {
  const ids = [...(ticket.services ?? []), ...(ticket.booking_details?.selected_services ?? [])]
    .map((s) => s.id)
    .filter((v): v is string => typeof v === "string" && v.length > 0 && !v.startsWith("custom-"));
  if (ids.length === 0) return null;
  const { data, error } = await supabase.from("repair_services").select("id, warranty_info").in("id", ids);
  if (error) return null;
  const texts = Array.from(
    new Set(
      ((data ?? []) as { warranty_info: string | null }[])
        .map((r) => r.warranty_info?.trim())
        .filter((v): v is string => Boolean(v)),
    ),
  );
  return texts.length ? texts.join(" · ") : null;
}

/** Antal tidligere sager og køb for kunden (kun tal; selve rækkerne hører til kunden). */
async function loadHistory(supabase: SupabaseClient, ticket: RepairTicket): Promise<CaseDetail["history"]> {
  const head = { count: "exact" as const, head: true };
  const tickets = ticket.customer_id
    ? await supabase.from("repair_tickets").select("id", head).eq("customer_id", ticket.customer_id).neq("id", ticket.id)
    : ticket.customer_phone
      ? await supabase.from("repair_tickets").select("id", head).eq("customer_phone", ticket.customer_phone).neq("id", ticket.id)
      : null;
  const orders = ticket.customer_id
    ? await supabase.from("orders").select("id", head).eq("customer_id", ticket.customer_id)
    : null;
  return {
    tickets: tickets && !tickets.error ? (tickets.count ?? 0) : null,
    orders: orders && !orders.error ? (orders.count ?? 0) : null,
  };
}
