import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/platform/activity-log";
import { parseBody, posErrorResponse, requirePosStaff, UNAUTHORIZED } from "@/lib/pos/route-helpers";
import { PosError } from "@/lib/pos/errors";
import { loadReceiptForActor, sanitizeReceipt } from "@/lib/opkoeb/receipt-access";
import { payBlockers, type ReceiptForRules } from "@/lib/opkoeb/rules";
import { payBodySchema } from "@/lib/opkoeb/schemas";

/**
 * POST /api/trade-in/receipts/[id]/pay: markerer en bekræftet slutseddel som udbetalt (bank).
 * Modregning sættes kun af kassen og afvises her. Kontooplysningerne er låst efter
 * bekræftelsen, så de skal stå på sedlen og stemme med kroppen.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requirePosStaff(req);
    if (!staff) return UNAUTHORIZED();
    const { actor } = staff;
    const { id } = await params;
    const row = await loadReceiptForActor(actor, id);

    const parsed = await parseBody(req, payBodySchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const merged = {
      ...row,
      payout_method: "bank",
      seller_bank_reg: body.seller_bank_reg,
      seller_bank_account: body.seller_bank_account,
      account_owner_confirmed: true,
      items: [],
    } as unknown as ReceiptForRules;
    const blockers = payBlockers(merged);
    if (blockers.length > 0) throw new PosError("pay_blocked", blockers[0], 409);

    // seller_bank_reg/-account kan ikke skrives efter bekræftelsen (slutseddel-låsen).
    if (!row.seller_bank_reg || !row.seller_bank_account) {
      throw new PosError("bank_not_on_slip", "Kontooplysningerne skal stå på slutsedlen før den bekræftes", 409);
    }
    if (row.seller_bank_reg !== body.seller_bank_reg || row.seller_bank_account !== body.seller_bank_account) {
      throw new PosError("bank_mismatch", "Kontooplysningerne stemmer ikke med slutsedlen", 409);
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("trade_in_receipts")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        paid_by: actor.id,
        payout_method: "bank",
        account_owner_confirmed: true,
      })
      .eq("id", id)
      .eq("status", "confirmed")
      .is("suspected_at", null)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(`pay: ${error.message}`);
    if (!data) throw new PosError("receipt_changed", "Slutsedlen er ændret. Genindlæs og prøv igen.", 409);

    await logActivity({
      supabase,
      actorId: actor.id,
      action: "opkoeb_paid",
      entityType: "trade_in_receipt",
      entityId: id,
      details: { receipt_number: row.receipt_number, amount: row.total_amount },
    });

    return NextResponse.json(sanitizeReceipt(data as Record<string, unknown>, { bankAccount: "draft-only" }));
  } catch (err) {
    return posErrorResponse(err, "Kunne ikke markere udbetalingen");
  }
}
