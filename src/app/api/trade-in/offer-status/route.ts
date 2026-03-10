import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/* GET /api/trade-in/offer-status?token=xxx — public, no auth */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const supabase = createServerClient();

  const { data: offer, error } = await supabase
    .from("trade_in_offers")
    .select("id, inquiry_id, offer_amount, status, token_expires_at, responded_at")
    .eq("token", token)
    .single();

  if (error || !offer) {
    return NextResponse.json({ error: "invalid_token", message: "Ugyldigt link." }, { status: 404 });
  }

  // Check if already responded
  if (offer.status === "accepted") {
    return NextResponse.json({ error: "already_accepted", message: "Du har allerede accepteret dette tilbud." }, { status: 410 });
  }
  if (offer.status === "rejected") {
    return NextResponse.json({ error: "already_rejected", message: "Du har allerede afvist dette tilbud." }, { status: 410 });
  }
  if (offer.status === "expired") {
    return NextResponse.json({ error: "expired", message: "Dit tilbud er desv\u00e6rre udl\u00f8bet." }, { status: 410 });
  }

  // Check expiry
  if (new Date(offer.token_expires_at) < new Date()) {
    // Auto-expire
    await supabase
      .from("trade_in_offers")
      .update({ status: "expired" })
      .eq("id", offer.id);
    return NextResponse.json({ error: "expired", message: "Dit tilbud er desv\u00e6rre udl\u00f8bet." }, { status: 410 });
  }

  // Fetch inquiry for pre-fill data
  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("name, email, phone, metadata")
    .eq("id", offer.inquiry_id)
    .single();

  const metadata = (inquiry?.metadata || {}) as Record<string, any>;

  return NextResponse.json({
    offer_id: offer.id,
    offer_amount: offer.offer_amount,
    expires_at: offer.token_expires_at,
    prefill: {
      name: inquiry?.name || "",
      email: inquiry?.email || "",
      phone: inquiry?.phone || "",
      device: metadata.device || {},
      condition: metadata.condition || {},
      deliveryMethod: metadata.deliveryMethod || "",
    },
  });
}
