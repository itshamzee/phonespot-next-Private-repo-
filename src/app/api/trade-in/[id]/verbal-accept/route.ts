import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/require-staff";
import { logBuybackEvent } from "@/lib/buyback/events";
import { clearManualStatusOnAccept } from "@/lib/buyback/accept-offer";
import { formatDKK } from "@/lib/supabase/trade-in-types";

/**
 * POST /api/trade-in/[id]/verbal-accept — staff register that the customer
 * accepted the latest pending offer by phone or in the store.
 *
 * [id] is the inquiry id. The offer becomes a real accepted offer, so the
 * payout card, the label button and the overview all treat it like an
 * acceptance through the customer link. Unlike the customer flow it sends no
 * mail and books no label: the customer is already on the line, and bank
 * details and address are filled in afterwards on the case.
 *
 * Optional body: { seller_bank_reg, seller_bank_account } when the customer
 * gave them while on the phone.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: inquiryId } = await params;
  const body = await req.json().catch(() => ({}));
  const supabase = createAdminClient();

  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("id, source, name")
    .eq("id", inquiryId)
    .maybeSingle();

  if (!inquiry || inquiry.source !== "saelg-enhed") {
    return NextResponse.json({ error: "Henvendelsen findes ikke" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("trade_in_offers")
    .select("id")
    .eq("inquiry_id", inquiryId)
    .eq("status", "accepted")
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Tilbuddet er allerede accepteret" }, { status: 409 });
  }

  const { data: offer } = await supabase
    .from("trade_in_offers")
    .select("id, offer_amount, seller_name")
    .eq("inquiry_id", inquiryId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!offer) {
    return NextResponse.json(
      { error: "Der er intet afventende tilbud at registrere accept på" },
      { status: 404 },
    );
  }

  const now = new Date().toISOString();
  const bankReg = typeof body.seller_bank_reg === "string" ? body.seller_bank_reg.trim() : "";
  const bankAccount =
    typeof body.seller_bank_account === "string" ? body.seller_bank_account.trim() : "";

  const update: Record<string, unknown> = {
    status: "accepted",
    responded_at: now,
    updated_at: now,
    seller_name: offer.seller_name ?? inquiry.name,
  };
  if (bankReg && bankAccount) {
    update.seller_bank_reg = bankReg;
    update.seller_bank_account = bankAccount;
  }

  // Guarded on status so a customer accepting through the link at the same
  // moment cannot be accepted twice.
  const { data: updated, error } = await supabase
    .from("trade_in_offers")
    .update(update)
    .eq("id", offer.id)
    .eq("status", "pending")
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "Tilbuddet er allerede besvaret" }, { status: 409 });
  }

  await clearManualStatusOnAccept(supabase, inquiryId, offer.id);

  const who = staff.name || staff.email || "Admin";
  await logBuybackEvent(supabase, {
    type: "accepted",
    severity: "info",
    summary: `Mundtlig accept på ${formatDKK(offer.offer_amount)} registreret af ${who}`,
    inquiryId,
    offerId: offer.id,
    detail: { verbal: true },
  });

  return NextResponse.json({ ok: true, offer_id: offer.id });
}
