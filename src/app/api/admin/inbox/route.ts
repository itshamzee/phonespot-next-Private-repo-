import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { applyStoreScope, requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { loadInboxRows } from "@/lib/inquiries/inbox-data";
import {
  buildSearchFilter,
  isInboxView,
  matchesView,
  staffDisplayName,
  viewCounts,
  type InboxInquiryInput,
  type InboxView,
} from "@/lib/inquiries/inbox";

const MAX_ROWS = 200;
const DONE_ROWS = 100;
const COUNT_ROWS = 1000;
const NEED_CANDIDATES = 1000;
const FIKS_CANDIDATES = 600;
const OPEN_STATUSES = ["ny", "venter_paa_svar"];

const PAGE_COLUMNS =
  "id, name, subject, message, status, channel, mailbox, store_id, assigned_to, assigned_name, snoozed_until, last_inbound_at, source, created_at";

const CHANNEL_BY_VIEW: Partial<Record<InboxView, string[]>> = {
  "ch-mail": ["email"],
  "ch-sms": ["sms"],
  "ch-messenger": ["messenger"],
  "ch-form": ["form"],
  "ch-reviews": ["google_review", "trustpilot_review"],
};

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/admin/inbox?view=&store=&q= — Kundecenterets liste.
 * Butiksafgrænsningen kommer fra personalets scope; ?store kan kun indsnævre den.
 */
export async function GET(request: Request) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();

  const url = new URL(request.url);
  const viewParam = url.searchParams.get("view") ?? "mine";
  if (!isInboxView(viewParam)) return NextResponse.json({ error: "Ukendt visning" }, { status: 400 });
  const view: InboxView = viewParam;

  // Scope fra session/cookie; et eksplicit ?store må kun indsnævre "alle".
  let scope = ctx.scope;
  const storeParam = url.searchParams.get("store");
  if (scope === "alle" && (storeParam === "vejle" || storeParam === "slagelse")) scope = storeParam;

  const me = { id: ctx.staff.id, name: staffDisplayName(ctx.staff) };
  const sb = createServerClient();
  const now = new Date();
  const nowIso = now.toISOString();

  try {
    const counts = await countsFor(sb, scope, me.id, now);
    if (view === "ch-chat") return NextResponse.json({ rows: [], counts, me }, { headers: NO_STORE });

    // ---- kandidater: statusfilter i SQL FØR sortering og grænse, så besvarede sager aldrig fortrænger åbne ----
    let query = applyStoreScope(sb.from("contact_inquiries").select(PAGE_COLUMNS), scope);
    if (view === "done") {
      query = query
        .eq("status", "lukket")
        .order("last_inbound_at", { ascending: false, nullsFirst: false })
        .limit(DONE_ROWS);
    } else if (view === "waiting" || view === "fiks") {
      // fiks: besvarede sager, hvor seneste udkast er auto_sent (afgøres bagefter pr. gruppe).
      query = query
        .eq("status", "besvaret")
        .order("last_inbound_at", { ascending: false, nullsFirst: false })
        .limit(view === "fiks" ? FIKS_CANDIDATES : MAX_ROWS);
    } else if (view === "snoozed") {
      query = query
        .neq("status", "lukket")
        .gt("snoozed_until", nowIso)
        .order("snoozed_until", { ascending: true })
        .limit(MAX_ROWS);
    } else {
      query = query
        .in("status", OPEN_STATUSES)
        .order("last_inbound_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .limit(view === "need" ? NEED_CANDIDATES : MAX_ROWS);
      if (view === "mine") query = query.eq("assigned_to", me.id);
      if (view === "unassigned") query = query.is("assigned_to", null);
      // To .or() efter hinanden giver to `or`-parametre, som PostgREST OG'er (se rapporten).
      if (view === "mine" || view === "unassigned" || view === "need") {
        query = query.or(`snoozed_until.is.null,snoozed_until.lte.${nowIso}`);
      }
      const channels = CHANNEL_BY_VIEW[view];
      if (channels) query = query.in("channel", channels);
    }
    const search = buildSearchFilter(url.searchParams.get("q") ?? "");
    if (search) query = query.or(search);

    const { data: inquiries, error } = await query;
    if (error) throw error;
    const candidates = (inquiries ?? []) as unknown as InboxInquiryInput[];

    const rows = (await loadInboxRows(sb, candidates))
      .filter((r) => matchesView(view, r, me.id, now))
      .slice(0, MAX_ROWS);

    return NextResponse.json({ rows, counts, me }, { headers: NO_STORE });
  } catch (err) {
    console.error("[admin/inbox] list failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Kunne ikke hente indbakken" }, { status: 500 });
  }
}

/**
 * Tællere for de tre faste visninger. Samme kandidatregler som listen (kun åbne statusser,
 * scope, samme rækkebygning), så tal og liste stemmer for de samme data.
 */
async function countsFor(
  sb: ReturnType<typeof createServerClient>,
  scope: Parameters<typeof applyStoreScope>[1],
  meId: string,
  now: Date,
) {
  const { data, error } = await applyStoreScope(sb.from("contact_inquiries").select(PAGE_COLUMNS), scope)
    .in("status", OPEN_STATUSES)
    .order("last_inbound_at", { ascending: true, nullsFirst: false })
    .limit(COUNT_ROWS);
  if (error) throw error;
  const open = (data ?? []) as unknown as InboxInquiryInput[];
  if (open.length === 0) return { mine: 0, unassigned: 0, need: 0 };
  return viewCounts(await loadInboxRows(sb, open), meId, now);
}
