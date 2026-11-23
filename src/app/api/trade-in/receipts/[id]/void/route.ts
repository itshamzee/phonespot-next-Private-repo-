import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/platform/activity-log";
import { parseBody, posErrorResponse, requirePosStaff, UNAUTHORIZED } from "@/lib/pos/route-helpers";
import { PosError } from "@/lib/pos/errors";
import { loadReceiptForActor, sanitizeReceipt } from "@/lib/opkoeb/receipt-access";
import { rpcConflict } from "@/lib/opkoeb/rpc-conflict";
import { voidBodySchema } from "@/lib/opkoeb/schemas";

/**
 * POST /api/trade-in/receipts/[id]/void: annullerer en bekræftet, ikke-udbetalt seddel via
 * trade_in_void (spærrer enhederne). En seddel under mistanke kan ikke annulleres.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requirePosStaff(req);
    if (!staff) return UNAUTHORIZED();
    const { actor } = staff;
    const { id } = await params;
    const row = await loadReceiptForActor(actor, id);

    const parsed = await parseBody(req, voidBodySchema);
    if (!parsed.ok) return parsed.response;
    const { reason } = parsed.data;

    if (row.suspected_at) throw new PosError("receipt_suspected", "Opkøbet er spærret ved mistanke", 409);

    const supabase = createServerClient();
    const { error: rpcErr } = await supabase.rpc("trade_in_void", {
      p_receipt_id: id,
      p_staff_id: actor.id,
      p_reason: reason,
    });
    if (rpcErr) {
      const conflict = rpcConflict(rpcErr);
      if (conflict) throw conflict;
      throw new Error(`trade_in_void: ${rpcErr.message}`);
    }

    await logActivity({
      supabase,
      actorId: actor.id,
      action: "opkoeb_voided",
      entityType: "trade_in_receipt",
      entityId: id,
      details: { receipt_number: row.receipt_number, reason },
    });

    const fresh = await loadReceiptForActor(actor, id);
    return NextResponse.json(sanitizeReceipt(fresh, { bankAccount: "draft-only" }));
  } catch (err) {
    return posErrorResponse(err, "Kunne ikke annullere slutsedlen");
  }
}
