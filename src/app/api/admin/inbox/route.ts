import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { applyStoreScope, requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import {
  buildInboxRows,
  buildSearchFilter,
  isInboxView,
  matchesView,
  staffDisplayName,
  viewCounts,
  type InboxDraftInput,
  type InboxInquiryInput,
  type InboxMessageInput,
  type InboxView,
} from "@/lib/inquiries/inbox";

const MAX_ROWS = 200;
const DONE_ROWS = 100;
const COUNT_ROWS = 1000;

const PAGE_COLUMNS =
  "id, name, subject, message, status, channel, mailbox, store_id, assigned_to, assigned_name, snoozed_until, last_inbound_at, source, created_at";
const COUNT_COLUMNS =
  "id, status, channel, store_id, assigned_to, assigned_name, snoozed_until, last_inbound_at, source, created_at";

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
    // ---- 1. siden af henvendelser ----
    let restrictIds: string[] | null = null;
    if (view === "need" || view === "fiks") {
      const q =
        view === "need"
          ? sb.from("ai_drafts").select("inquiry_id").eq("status", "pending").eq("needs_human", true)
          : sb.from("ai_drafts").select("inquiry_id").eq("status", "auto_sent");
      const { data, error } = await q.order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      restrictIds = [...new Set((data ?? []).map((d) => d.inquiry_id as string))];
    }
    if (view === "ch-chat" || (restrictIds && restrictIds.length === 0)) {
      return NextResponse.json({ rows: [], counts: await countsFor(sb, scope, me.id, now), me }, { headers: NO_STORE });
    }

    let query = applyStoreScope(sb.from("contact_inquiries").select(PAGE_COLUMNS), scope);
    if (view === "done") {
      query = query
        .eq("status", "lukket")
        .order("last_inbound_at", { ascending: false, nullsFirst: false })
        .limit(DONE_ROWS);
    } else if (view === "waiting") {
      query = query
        .eq("status", "besvaret")
        .order("last_inbound_at", { ascending: false, nullsFirst: false })
        .limit(MAX_ROWS);
    } else {
      query = query
        .neq("status", "lukket")
        .order("last_inbound_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .limit(MAX_ROWS);
      if (view === "mine") query = query.eq("assigned_to", me.id);
      if (view === "unassigned") query = query.is("assigned_to", null);
      if (view === "snoozed") query = query.gt("snoozed_until", nowIso);
      if (view === "mine" || view === "unassigned" || view === "need") {
        query = query.or(`snoozed_until.is.null,snoozed_until.lte.${nowIso}`);
      }
      const channels = CHANNEL_BY_VIEW[view];
      if (channels) query = query.in("channel", channels);
      if (restrictIds) query = query.in("id", restrictIds);
    }
    const search = buildSearchFilter(url.searchParams.get("q") ?? "");
    if (search) query = query.or(search);

    const { data: inquiries, error } = await query;
    if (error) throw error;
    const page = (inquiries ?? []) as unknown as InboxInquiryInput[];
    const ids = page.map((i) => i.id);

    // ---- 2 + 3. beskeder og udkast for hele siden, ét hug hver ----
    let messages: InboxMessageInput[] = [];
    let drafts: InboxDraftInput[] = [];
    if (ids.length > 0) {
      const [msgRes, draftRes] = await Promise.all([
        sb
          .from("inquiry_messages")
          .select("inquiry_id, sender, body, is_internal, created_at")
          .in("inquiry_id", ids)
          .eq("is_internal", false)
          .order("created_at", { ascending: false })
          .limit(ids.length * 8),
        sb
          .from("ai_drafts")
          .select("inquiry_id, status, needs_human, reason, draft_body, created_at")
          .in("inquiry_id", ids)
          .in("status", ["pending", "auto_sent"])
          .order("created_at", { ascending: false })
          .limit(ids.length * 4),
      ]);
      if (msgRes.error) throw msgRes.error;
      if (draftRes.error) throw draftRes.error;
      messages = (msgRes.data ?? []) as unknown as InboxMessageInput[];
      drafts = (draftRes.data ?? []) as unknown as InboxDraftInput[];
    }

    const rows = buildInboxRows(page, messages, drafts)
      .filter((r) => matchesView(view, r, me.id, now))
      .slice(0, MAX_ROWS);

    return NextResponse.json(
      { rows, counts: await countsFor(sb, scope, me.id, now), me },
      { headers: NO_STORE },
    );
  } catch (err) {
    console.error("[admin/inbox] list failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Kunne ikke hente indbakken" }, { status: 500 });
  }
}

/** Tællere for de tre faste visninger: alle åbne sager i scopet, uafhængigt af valgt visning og søgning. */
async function countsFor(sb: ReturnType<typeof createServerClient>, scope: Parameters<typeof applyStoreScope>[1], meId: string, now: Date) {
  const { data, error } = await applyStoreScope(sb.from("contact_inquiries").select(COUNT_COLUMNS), scope)
    .neq("status", "lukket")
    .limit(COUNT_ROWS);
  if (error) throw error;
  const open = (data ?? []) as unknown as InboxInquiryInput[];
  if (open.length === 0) return { mine: 0, unassigned: 0, need: 0 };

  const { data: draftData, error: draftErr } = await sb
    .from("ai_drafts")
    .select("inquiry_id, status, needs_human, reason, created_at")
    .in("status", ["pending", "auto_sent"])
    .order("created_at", { ascending: false })
    .limit(5000);
  if (draftErr) throw draftErr;
  const rows = buildInboxRows(open, [], (draftData ?? []) as unknown as InboxDraftInput[]);
  return viewCounts(rows, meId, now);
}
