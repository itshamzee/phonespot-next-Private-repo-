/**
 * Server-side hentning til sagslisten. Afgrænsningen til personalets butik
 * lægges på selve forespørgslen (applyStoreScope), så en medarbejder aldrig
 * får rækker fra en anden butik — heller ikke til tabeltal og søgning.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyStoreScope } from "@/lib/auth/store-scope-server";
import type { StoreScope } from "@/lib/auth/store-scope";
import {
  compareRows,
  inTab,
  isCaseTab,
  matchesSearch,
  tabCounts,
  toCaseRow,
  type CaseCounts,
  type CaseListTicket,
  type CaseRow,
  type CaseTab,
} from "@/lib/repairs/case-list";

/** Listen henter bevidst ikke fotos, tjekliste eller noter; de hører til sagssiden. */
const BASE_COLUMNS =
  "id, ticket_number, customer_name, customer_email, customer_phone, device_type, device_model, issue_description, service_type, status, paid, on_hold_reason, is_urgent, store_id, created_at, device_id, booking_details, services";
/** Findes først efter migrationen 2026100420…_repair_promised_assigned.sql. */
const OPTIONAL_COLUMNS = "promised_at, assigned_to";
const EMBEDS = "customer_devices(serial_number, color), repair_quotes(estimated_days, created_at)";

const PAGE_FETCH = 1000; // Supabase afkorter som standard svar ved 1000 rækker.
const MAX_PAGES = 5;

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

type Selection = { columns: string; hasOptional: boolean };

const SELECTIONS: Selection[] = [
  { columns: `${BASE_COLUMNS}, ${OPTIONAL_COLUMNS}, ${EMBEDS}`, hasOptional: true },
  { columns: `${BASE_COLUMNS}, ${EMBEDS}`, hasOptional: false },
  { columns: BASE_COLUMNS, hasOptional: false },
];

/**
 * Alle sager i scope, nyeste først. Prøver først med de valgfrie kolonner og
 * relationerne; mangler kolonnerne endnu (migrationen er ikke kørt), falder den
 * tilbage til færre kolonner i stedet for at give en tom liste.
 */
export async function fetchScopedTickets(
  supabase: SupabaseClient,
  scope: StoreScope,
): Promise<{ tickets: CaseListTicket[]; error: string | null }> {
  let lastError: string | null = null;

  for (const selection of SELECTIONS) {
    const tickets: CaseListTicket[] = [];
    let failed = false;

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const from = page * PAGE_FETCH;
      const { data, error } = await applyStoreScope(
        supabase
          .from("repair_tickets")
          .select(selection.columns)
          .order("created_at", { ascending: false })
          .range(from, from + PAGE_FETCH - 1),
        scope,
      );
      if (error) {
        lastError = error.message;
        failed = true;
        break;
      }
      const rows = (data ?? []) as unknown as CaseListTicket[];
      tickets.push(...rows);
      if (rows.length < PAGE_FETCH) break;
    }

    if (!failed) return { tickets, error: null };
  }
  return { tickets: [], error: lastError ?? "unknown" };
}

export type CaseListParams = {
  tab: CaseTab;
  q: string;
  page: number;
  pageSize: number;
  assignee: string | null;
};

export function parseListParams(url: URL): CaseListParams {
  const tabParam = url.searchParams.get("tab");
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const size = Number.parseInt(url.searchParams.get("pageSize") ?? `${DEFAULT_PAGE_SIZE}`, 10);
  return {
    tab: isCaseTab(tabParam) ? tabParam : "igang",
    q: (url.searchParams.get("q") ?? "").slice(0, 100),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(size) && size > 0 ? Math.min(size, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE,
    assignee: url.searchParams.get("ansvarlig")?.trim() || null,
  };
}

export type CaseListResult = {
  rows: CaseRow[];
  counts: CaseCounts;
  total: number;
  page: number;
  pageSize: number;
  assignees: string[];
};

/** Søgning, ansvarlig, faner, sortering og sideinddeling over de hentede sager. */
export function buildCaseList(tickets: CaseListTicket[], params: CaseListParams): CaseListResult {
  const assignees = Array.from(
    new Set(tickets.map((t) => t.assigned_to?.trim()).filter((v): v is string => Boolean(v))),
  ).sort((a, b) => a.localeCompare(b, "da"));

  // Fanernes tal følger søgningen og ansvarlig-filteret, så man kan se hvor hits ligger.
  const matching = tickets.filter(
    (t) => (!params.assignee || t.assigned_to?.trim() === params.assignee) && matchesSearch(t, params.q),
  );
  const counts = tabCounts(matching);

  const inActiveTab = matching.filter((t) => inTab(t, params.tab)).map(toCaseRow).sort(compareRows);
  const total = inActiveTab.length;
  const pages = Math.max(1, Math.ceil(total / params.pageSize));
  const page = Math.min(params.page, pages);
  const start = (page - 1) * params.pageSize;

  return {
    rows: inActiveTab.slice(start, start + params.pageSize),
    counts,
    total,
    page,
    pageSize: params.pageSize,
    assignees,
  };
}
