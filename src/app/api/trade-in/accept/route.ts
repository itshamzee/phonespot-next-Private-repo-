import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/* POST /api/trade-in/accept — customer accepts offer via token */
export async function POST(req: Request) {
  const body = await req.json();
  const { token, seller_name, seller_address, seller_postal_city, seller_bank_reg, seller_bank_account } = body;

  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
  if (!seller_name || !seller_bank_reg || !seller_bank_account) {
    return NextResponse.json({ error: "Navn og bankoplysninger er p\u00e5kr\u00e6vet" }, { status: 400 });
  }

  const supabase = createServerClient();

  // 1. Validate token
  const { data: offer, error } = await supabase
    .from("trade_in_offers")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (error || !offer) {
    return NextResponse.json({ error: "Token er ugyldigt eller udl\u00f8bet" }, { status: 400 });
  }

  if (new Date(offer.token_expires_at) < new Date()) {
    await supabase.from("trade_in_offers").update({ status: "expired" }).eq("id", offer.id);
    return NextResponse.json({ error: "Tilbuddet er udl\u00f8bet" }, { status: 410 });
  }

  // 2. Update offer with customer details + accepted status
  const { error: updateErr } = await supabase
    .from("trade_in_offers")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
      seller_name,
      seller_address: seller_address || null,
      seller_postal_city: seller_postal_city || null,
      seller_bank_reg,
      seller_bank_account,
    })
    .eq("id", offer.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // 3. Fetch inquiry for context
  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("*")
    .eq("id", offer.inquiry_id)
    .single();

  // 4. Send confirmation email to customer
  if (inquiry) {
    const metadata = (inquiry.metadata || {}) as Record<string, any>;
    const deliveryMethod = metadata.deliveryMethod || "";
    const deliveryText = deliveryMethod === "Aflever i butik"
      ? "Du har valgt at aflevere i butikken. Vi kontakter dig med detaljer."
      : "Vi sender et gratis forsendelseslabel til din email inden for 24 timer.";

    try {
      await resend.emails.send({
        from: "PhoneSpot <noreply@phonespot.dk>",
        to: inquiry.email,
        replyTo: "ha@phonespot.dk",
        subject: "Tilbud accepteret \u2014 PhoneSpot",
        html: `<p>Hej ${seller_name},</p>
<p>Tak! Du har accepteret vores tilbud. ${deliveryText}</p>
<p>Med venlig hilsen,<br>PhoneSpot</p>`,
      });
    } catch { /* email failure is non-fatal */ }

    // 5. Notify admin
    try {
      await resend.emails.send({
        from: "PhoneSpot <noreply@phonespot.dk>",
        to: "ha@phonespot.dk",
        subject: `Tilbud accepteret: ${inquiry.name} \u2014 ${metadata.device?.model || "enhed"}`,
        html: `<p>${inquiry.name} har accepteret tilbuddet.</p>
<p>Bankinfo: Reg ${seller_bank_reg}, Konto ${seller_bank_account}</p>
<p><a href="https://phonespot.dk/admin/opkoeb/${offer.inquiry_id}">Se henvendelse</a></p>`,
      });
    } catch { /* email failure is non-fatal */ }

    // 6. Log message
    await supabase.from("inquiry_messages").insert({
      inquiry_id: offer.inquiry_id,
      sender: "customer",
      channel: "email",
      body: "Tilbud accepteret",
    });
  }

  return NextResponse.json({ success: true });
}
