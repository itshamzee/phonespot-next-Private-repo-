import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { isOwner } from "@/lib/auth/store-scope";
import { logActivity } from "@/lib/platform/activity-log";
import { FORBIDDEN, parseBody, posErrorResponse, requirePosStaff, UNAUTHORIZED } from "@/lib/pos/route-helpers";
import { PosError } from "@/lib/pos/errors";
import { loadReceiptForActor, sanitizeReceipt } from "@/lib/opkoeb/receipt-access";
import { suspicionBodySchema, suspicionReleaseBodySchema } from "@/lib/opkoeb/schemas";

const SOLD = ["sold", "shipped", "picked_up"];
const REASON_PREFIX = "Mistanke:";

async function receiptDeviceIds(receiptId: string): Promise<string[]> {
  const { data, error } = await createServerClient()
    .from("trade_in_receipt_items")
    .select("device_id")
    .eq("receipt_id", receiptId);
  if (error) throw new Error(`items: ${error.message}`);
  return (data ?? []).map((r) => (r as { device_id: string | null }).device_id).filter((d): d is string => !!d);
}

/**
 * Spærrer sedlens enheder. Idempotent: kun enheder uden spærring rammes, så en anden årsag
 * (fx 'Slutseddel annulleret') eller en tidligere mistanke aldrig overskrives. To sætninger i
 * stedet for at læse status først, så et samtidigt salg ikke kan snige sig forbi.
 */
async function blockDevices(ids: string[], reason: string, now: string): Promise<void> {
  if (ids.length === 0) return;
  const supabase = createServerClient();
  const blocked = { blocked_at: now, blocked_reason: reason };
  const { error: unsoldErr } = await supabase
    .from("devices")
    .update({ ...blocked, status: "delisted" })
    .in("id", ids)
    .is("blocked_at", null)
    .not("status", "in", `(${SOLD.join(",")})`);
  if (unsoldErr) throw new Error(`block devices: ${unsoldErr.message}`);
  const { error: soldErr } = await supabase
    .from("devices")
    .update(blocked)
    .in("id", ids)
    .is("blocked_at", null)
    .in("status", SOLD);
  if (soldErr) throw new Error(`block sold devices: ${soldErr.message}`);
}

/**
 * POST /api/trade-in/receipts/[id]/suspicion: marker sedlen som mistænkt og spærrer alle dens
 * enheder. Enheder, der ikke er solgt, tages af lager (delisted); solgte får kun spærringen.
 * Er sedlen allerede mistænkt, lægges spærringerne igen (200), så en fejlet spærring kan
 * gentages; sedlens mistanke og note ændres ikke.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requirePosStaff(req);
    if (!staff) return UNAUTHORIZED();
    const { actor } = staff;
    const { id } = await params;
    const row = await loadReceiptForActor(actor, id);

    const parsed = await parseBody(req, suspicionBodySchema);
    if (!parsed.ok) return parsed.response;
    const { note, police_notified } = parsed.data;

    if (row.status !== "confirmed" && row.status !== "paid") {
      throw new PosError("receipt_not_suspectable", "Kun bekræftede eller udbetalte slutsedler kan markeres", 409);
    }
    const supabase = createServerClient();
    const now = new Date().toISOString();

    if (row.suspected_at) {
      const ids = await receiptDeviceIds(id);
      await blockDevices(ids, `${REASON_PREFIX} ${String(row.suspicion_note ?? note)}`, now);
      await logActivity({
        supabase,
        actorId: actor.id,
        action: "opkoeb_suspicion",
        entityType: "trade_in_receipt",
        entityId: id,
        details: { receipt_number: row.receipt_number, reapplied: true, device_ids: ids },
      });
      return NextResponse.json(sanitizeReceipt(row as Record<string, unknown>, { bankAccount: "draft-only" }));
    }

    // Først selve markeringen (betinget); kun hvis den ramte, spærres enhederne.
    const { data, error } = await supabase
      .from("trade_in_receipts")
      .update({
        suspected_at: now,
        suspected_by: actor.id,
        suspicion_note: note,
        police_notified_at: police_notified ? now : null,
      })
      .eq("id", id)
      .in("status", ["confirmed", "paid"])
      .is("suspected_at", null)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(`suspicion: ${error.message}`);
    if (!data) throw new PosError("receipt_changed", "Slutsedlen er ændret. Genindlæs og prøv igen.", 409);

    const ids = await receiptDeviceIds(id);
    await blockDevices(ids, `${REASON_PREFIX} ${note}`, now);

    await logActivity({
      supabase,
      actorId: actor.id,
      action: "opkoeb_suspicion",
      entityType: "trade_in_receipt",
      entityId: id,
      details: { receipt_number: row.receipt_number, note, police_notified, device_ids: ids },
    });

    return NextResponse.json(sanitizeReceipt(data as Record<string, unknown>, { bankAccount: "draft-only" }));
  } catch (err) {
    return posErrorResponse(err, "Kunne ikke markere mistanken");
  }
}

/**
 * DELETE /api/trade-in/receipts/[id]/suspicion (kun ejeren, body {note}): ophæver spærringen på
 * sedlens enheder. Enheder, der blev taget af lager pga. mistanken, går tilbage til intake.
 * Mistanke-felterne på sedlen nulstilles (ellers kunne den aldrig udbetales eller annulleres);
 * historikken ligger i activity_log (opkoeb_suspicion + opkoeb_suspicion_released) og i suspicion_note.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requirePosStaff(req);
    if (!staff) return UNAUTHORIZED();
    const { actor } = staff;
    if (!isOwner(actor)) return FORBIDDEN("Kun ejeren kan ophæve en mistanke");
    const { id } = await params;
    const row = await loadReceiptForActor(actor, id);

    const parsed = await parseBody(req, suspicionReleaseBodySchema);
    if (!parsed.ok) return parsed.response;
    const { note } = parsed.data;

    if (!row.suspected_at) throw new PosError("not_suspected", "Opkøbet er ikke markeret som mistænkt", 409);

    const supabase = createServerClient();
    const ids = await receiptDeviceIds(id);
    const cleared = { blocked_at: null, blocked_reason: null };

    if (ids.length > 0) {
      const { error: delErr } = await supabase
        .from("devices")
        .update({ ...cleared, status: "intake" })
        .in("id", ids)
        .eq("status", "delisted")
        .like("blocked_reason", `${REASON_PREFIX}%`);
      if (delErr) throw new Error(`release devices: ${delErr.message}`);
      const { error: restErr } = await supabase
        .from("devices")
        .update(cleared)
        .in("id", ids)
        .like("blocked_reason", `${REASON_PREFIX}%`);
      if (restErr) throw new Error(`release sold devices: ${restErr.message}`);
    }

    const { data, error } = await supabase
      .from("trade_in_receipts")
      .update({ suspected_at: null, suspected_by: null, police_notified_at: null })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(`release: ${error.message}`);
    if (!data) throw new PosError("receipt_changed", "Slutsedlen er ændret. Genindlæs og prøv igen.", 409);

    await logActivity({
      supabase,
      actorId: actor.id,
      action: "opkoeb_suspicion_released",
      entityType: "trade_in_receipt",
      entityId: id,
      details: {
        receipt_number: row.receipt_number,
        note,
        previous: {
          suspected_at: row.suspected_at,
          suspected_by: row.suspected_by,
          suspicion_note: row.suspicion_note,
          police_notified_at: row.police_notified_at,
        },
        device_ids: ids,
      },
    });

    return NextResponse.json(sanitizeReceipt(data as Record<string, unknown>, { bankAccount: "draft-only" }));
  } catch (err) {
    return posErrorResponse(err, "Kunne ikke ophæve mistanken");
  }
}
