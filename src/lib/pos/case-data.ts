import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/client";
import { caseLines, computeCaseTotals, isRepairLineKind, type CaseLine } from "@/lib/repairs/case-money";
import { loadCaseItems } from "@/lib/repairs/case-items";
import { ticketLabel } from "@/lib/repairs/ticket-label";
import { getCaseDeposits, type CaseDepositWithBalance } from "./deposits";
import type { CaseQuery } from "./case-lookup";

/** A repair case as the Kasse needs it to take a deposit or the final payment. */
export type PosCase = {
  id: string;
  ticketNumber: string;
  label: string;
  status: string;
  paid: boolean;
  storeId: string | null;
  customer: { id: string | null; name: string; phone: string | null; email: string | null };
  deviceLabel: string;
  /** Case lines as on the case page (case items first, then services, booking or quote). */
  lines: CaseLine[];
  /** Case total after the booking discount (oere). 0 when the case has no price yet. */
  totalOere: number;
  discountOere: number;
  /** One cart line description: "Sag PS-2026-0123 · iPhone 13 · Skærm". */
  description: string;
  deposits: CaseDepositWithBalance[];
  /** false if deposits could not be read (migration not applied yet): do not trust the deduction. */
  depositsOk: boolean;
  openDepositOere: number;
};

const TICKET_COLUMNS =
  "id, ticket_number, customer_name, customer_email, customer_phone, customer_id, device_type, device_model, status, paid, store_id, services, booking_details";

type TicketRow = {
  id: string;
  ticket_number: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_id: string | null;
  device_type: string | null;
  device_model: string | null;
  status: string;
  paid: boolean | null;
  store_id: string | null;
  services: { id?: string; name: string; price_dkk: number }[] | null;
  booking_details: Parameters<typeof caseLines>[0]["booking_details"];
};

/** Candidate case ids for a query. Digits can match several years, so up to 5 rows. */
export async function findCaseRows(
  query: CaseQuery,
  supabase: SupabaseClient = createServerClient(),
): Promise<Array<Pick<TicketRow, "id" | "ticket_number" | "store_id">>> {
  let q = supabase.from("repair_tickets").select("id, ticket_number, store_id");
  if (query.kind === "id") q = q.eq("id", query.value);
  else if (query.kind === "number") q = q.ilike("ticket_number", query.value);
  else q = q.ilike("ticket_number", `PS-%-${query.value}`);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(5);
  if (error) throw new Error(`Kunne ikke søge efter sag: ${error.message}`);
  return (data ?? []) as Array<Pick<TicketRow, "id" | "ticket_number" | "store_id">>;
}

export async function loadPosCase(
  id: string,
  supabase: SupabaseClient = createServerClient(),
): Promise<PosCase | null> {
  const { data, error } = await supabase.from("repair_tickets").select(TICKET_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Kunne ikke hente sagen: ${error.message}`);
  if (!data) return null;
  const t = data as unknown as TicketRow;

  const { data: quotes } = await supabase
    .from("repair_quotes")
    .select("price_dkk, accepted_at, declined_at, created_at")
    .eq("ticket_id", id);

  let deposits: CaseDepositWithBalance[] = [];
  let depositsOk = true;
  try {
    deposits = await getCaseDeposits(id);
  } catch (err) {
    console.error("[pos/case] deposits failed:", id, err);
    depositsOk = false;
  }

  const items = await loadCaseItems(supabase, id);
  const lines = caseLines(t, (quotes ?? []) as Parameters<typeof caseLines>[1], items);
  const totals = computeCaseTotals(lines, [], { paid: t.paid ?? false, booking: t.booking_details });
  const label = ticketLabel({ id: t.id, ticket_number: t.ticket_number });
  const device = [t.device_type, t.device_model].filter(Boolean).join(" ").trim();
  // Product/device lines are sold as their own cart lines, so they are not part of the repair description.
  const serviceNames = lines.filter((l) => isRepairLineKind(l.kind)).map((l) => l.name).join(", ");

  return {
    id: t.id,
    ticketNumber: label,
    label,
    status: t.status,
    paid: t.paid ?? false,
    storeId: t.store_id,
    customer: { id: t.customer_id, name: t.customer_name, phone: t.customer_phone, email: t.customer_email },
    deviceLabel: device,
    lines,
    totalOere: totals.total_oere,
    discountOere: totals.discount_oere,
    description: ["Sag " + label, device, serviceNames].filter(Boolean).join(" · "),
    deposits,
    depositsOk,
    openDepositOere: deposits.reduce((s, d) => s + Math.max(0, d.remaining_oere), 0),
  };
}
