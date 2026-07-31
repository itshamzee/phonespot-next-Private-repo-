// src/app/api/trade-in/[id]/create-shipment/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/require-staff";
import { createBuybackReturnLabel } from "@/lib/shipmondo/buyback-label";
import { logBuybackEvent } from "@/lib/buyback/events";

/**
 * POST /api/trade-in/[id]/create-shipment — books the return label by hand.
 *
 * The same label is booked automatically when the customer accepts; this is the
 * button for when that failed or the offer predates it. Both go through
 * createBuybackReturnLabel so they cannot drift apart again.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: offerId } = await params;
  const supabase = createAdminClient();

  const { data: offer, error: offerErr } = await supabase
    .from("trade_in_offers")
    .select("*, contact_inquiries(*)")
    .eq("id", offerId)
    .single();

  if (offerErr || !offer) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }
  if (offer.status !== "accepted") {
    return NextResponse.json({ error: "Offer must be accepted first" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("shipping_labels")
    .select("id")
    .eq("offer_id", offerId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Label already exists for this offer" }, { status: 409 });
  }

  const inquiry = offer.contact_inquiries;

  const result = await createBuybackReturnLabel(supabase, {
    offerId,
    sellerName: offer.seller_name || inquiry?.name || "",
    sellerAddress: offer.seller_address,
    sellerPostalCity: offer.seller_postal_city,
    customerEmail: inquiry?.email ?? "",
    customerPhone: inquiry?.phone,
  });

  if (!result.ok) {
    await logBuybackEvent(supabase, {
      type: "error",
      severity: "critical",
      summary: `Kunne ikke oprette returlabel: ${result.error}`,
      inquiryId: inquiry?.id,
      offerId,
    });
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    tracking_number: result.trackingNumber,
    label_url: `/api/trade-in/${offerId}/label`,
  });
}
