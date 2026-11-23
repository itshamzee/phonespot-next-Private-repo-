import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { requireInquiryAccess } from "@/lib/inquiries/inquiry-access";
import { parseSnoozeUntil, staffDisplayName } from "@/lib/inquiries/inbox";

const ACTIONS = ["take", "release", "snooze", "unsnooze", "done", "waiting", "reopen", "note", "verdict"] as const;
type ActionType = (typeof ACTIONS)[number];

interface ActionBody {
  type?: unknown;
  until?: unknown;
  body?: unknown;
  draftId?: unknown;
  verdict?: unknown;
  note?: unknown;
  expectAssignedTo?: unknown;
  to?: unknown;
  snoozedUntil?: unknown;
}

interface Current {
  id: string;
  status: string;
  assigned_to: string | null;
  assigned_name: string | null;
  snoozed_until: string | null;
}

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const FAILED = "Handlingen kunne ikke gennemføres. Prøv igen.";
const CLOSED = "Sagen er lukket. Genåbn den først.";
const SNOOZE_ERROR = "Vælg et tidspunkt i fremtiden, højst 30 dage frem.";

/**
 * POST /api/admin/inbox/[id]/action — tildeling, udsættelse, lukning, interne
 * noter og dom over Fiks-udkast. Adgang og butiksafgrænsning via requireInquiryAccess.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireInquiryAccess(request, id);
  if (!access.ok) return access.response;
  const { staff } = access;

  let payload: ActionBody;
  try {
    payload = (await request.json()) ?? {};
  } catch {
    return bad("Ugyldig forespørgsel");
  }
  const type = payload.type as ActionType;
  if (typeof type !== "string" || !ACTIONS.includes(type)) return bad("Ukendt handling");

  const sb = createServerClient();
  const myName = staffDisplayName(staff);
  const now = new Date();

  const { data: current, error: loadErr } = await sb
    .from("contact_inquiries")
    .select("id, status, assigned_to, assigned_name, snoozed_until")
    .eq("id", id)
    .maybeSingle();
  if (loadErr) {
    console.error("[admin/inbox] action load failed:", id, loadErr.message);
    return bad(FAILED, 500);
  }
  if (!current) return bad("Henvendelse ikke fundet", 404);
  const cur = current as Current;

  const respond = (patch: Partial<Current>) =>
    NextResponse.json({ ok: true, inquiry: { ...cur, ...patch } }, { headers: { "Cache-Control": "no-store" } });

  const taken = (name: string | null) =>
    NextResponse.json(
      { error: `Sagen er allerede taget af ${name?.trim() || "en kollega"}.`, assignedName: name ?? null },
      { status: 409 },
    );
  async function currentAssignee(): Promise<string | null> {
    const { data } = await sb.from("contact_inquiries").select("assigned_name").eq("id", id).maybeSingle();
    return (data?.assigned_name as string | null) ?? null;
  }

  async function apply(patch: Record<string, unknown>): Promise<boolean> {
    const { error } = await sb.from("contact_inquiries").update(patch).eq("id", id);
    if (error) console.error("[admin/inbox] action update failed:", id, type, error.message);
    return !error;
  }

  switch (type) {
    case "take": {
      // Forventet ansvarlig er OBLIGATORISK (string eller null): klienten skal sige, hvad den så.
      if (!("expectAssignedTo" in payload) || !(payload.expectAssignedTo === null || typeof payload.expectAssignedTo === "string")) {
        return bad("Opdater siden og prøv igen.");
      }
      if (cur.status === "lukket") return bad(CLOSED, 409);
      const expect = payload.expectAssignedTo;
      if (cur.assigned_to === staff.id) return respond({}); // allerede min
      if (cur.assigned_to !== expect) return taken(cur.assigned_name);

      const patch = { assigned_to: staff.id, assigned_name: myName };
      // Betinget skrivning: mister vi et kapløb, rører vi ingenting.
      const base = sb.from("contact_inquiries").update(patch).eq("id", id);
      const { data, error } = await (expect === null ? base.is("assigned_to", null) : base.eq("assigned_to", expect)).select("id");
      if (error) {
        console.error("[admin/inbox] take failed:", id, error.message);
        return bad(FAILED, 500);
      }
      if ((data ?? []).length === 0) return taken(await currentAssignee());
      return respond(patch);
    }

    case "release": {
      if (!cur.assigned_to) return respond({}); // allerede ledig
      const isOwner = staff.role === "owner";
      if (cur.assigned_to !== staff.id && !isOwner) return taken(cur.assigned_name);
      const patch = { assigned_to: null, assigned_name: null };
      // Betinget på den ansvarlige, vi så: slipper aldrig en sag, der imens er skiftet hånd.
      const { data, error } = await sb
        .from("contact_inquiries")
        .update(patch)
        .eq("id", id)
        .eq("assigned_to", cur.assigned_to)
        .select("id");
      if (error) {
        console.error("[admin/inbox] release failed:", id, error.message);
        return bad(FAILED, 500);
      }
      if ((data ?? []).length === 0) return taken(await currentAssignee());
      return respond(patch);
    }

    case "snooze": {
      if (cur.status === "lukket") return bad(CLOSED, 409);
      const until = parseSnoozeUntil(payload.until, now);
      if (!until) return bad(SNOOZE_ERROR);
      return (await apply({ snoozed_until: until })) ? respond({ snoozed_until: until }) : bad(FAILED, 500);
    }

    case "unsnooze":
      return (await apply({ snoozed_until: null })) ? respond({ snoozed_until: null }) : bad(FAILED, 500);

    case "done": {
      const patch = { status: "lukket", snoozed_until: null };
      return (await apply(patch)) ? respond(patch) : bad(FAILED, 500);
    }

    case "waiting": {
      // Fx en offentlig anmeldelse, hvor svaret er skrevet på anmeldelsessiden.
      if (cur.status === "lukket") return bad(CLOSED, 409);
      const patch: Record<string, unknown> = { status: "besvaret", snoozed_until: null };
      if (!cur.assigned_to) Object.assign(patch, { assigned_to: staff.id, assigned_name: myName });
      return (await apply(patch)) ? respond(patch as Partial<Current>) : bad(FAILED, 500);
    }

    case "reopen": {
      // `to` gendanner forrige status ved fortryd; `snoozedUntil` gendanner en udsættelse.
      const to = payload.to === undefined ? "ny" : payload.to;
      if (to !== "ny" && to !== "venter_paa_svar" && to !== "besvaret") return bad("Ugyldig status.");
      const patch: Record<string, unknown> = { status: to };
      if (payload.snoozedUntil !== undefined && payload.snoozedUntil !== null) {
        const until = parseSnoozeUntil(payload.snoozedUntil, now);
        if (!until) return bad(SNOOZE_ERROR);
        patch.snoozed_until = until;
      }
      return (await apply(patch)) ? respond(patch as Partial<Current>) : bad(FAILED, 500);
    }

    case "note": {
      const text = typeof payload.body === "string" ? payload.body.trim() : "";
      if (!text) return bad("Skriv en note først");
      if (text.length > 5000) return bad("Noten er for lang (højst 5000 tegn).");
      const { data, error } = await sb
        .from("inquiry_messages")
        .insert({
          inquiry_id: id,
          sender: "staff",
          channel: "system",
          body: text,
          staff_name: myName,
          is_internal: true,
        })
        .select()
        .single();
      if (error || !data) {
        console.error("[admin/inbox] note failed:", id, error?.message);
        return bad("Noten blev ikke gemt. Prøv igen.", 500);
      }
      return NextResponse.json({ ok: true, message: data }, { status: 201 });
    }

    case "verdict": {
      const verdict = payload.verdict;
      const note = typeof payload.note === "string" ? payload.note.trim() : "";
      if (typeof payload.draftId !== "string" || !payload.draftId) return bad("Udkast mangler");
      if (verdict !== "correct" && verdict !== "wrong") return bad("Ugyldig dom");
      if (verdict === "wrong" && !note) return bad("Skriv en kort note om, hvad der var forkert.");

      const { data: draft } = await sb
        .from("ai_drafts")
        .select("id, inquiry_id")
        .eq("id", payload.draftId)
        .maybeSingle();
      if (!draft || draft.inquiry_id !== id) return bad("Udkast ikke fundet", 404);

      const { error } = await sb
        .from("ai_drafts")
        .update({ review_verdict: verdict, review_note: note || null, reviewed_verdict_by: staff.id })
        .eq("id", payload.draftId);
      if (error) {
        console.error("[admin/inbox] verdict failed:", id, error.message);
        return bad(FAILED, 500);
      }
      if (verdict === "correct") return respond({});

      // Bevidst: "wrong" genåbner også en lukket sag, så en forkert Fiks-besvarelse altid lander hos et menneske.
      const patch = { status: "ny", assigned_to: staff.id, assigned_name: myName, snoozed_until: null };
      return (await apply(patch)) ? respond(patch) : bad(FAILED, 500);
    }
  }
}
