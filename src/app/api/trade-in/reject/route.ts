import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/* POST /api/trade-in/reject — customer rejects offer via token */
export async function POST(req: Request) {
  const body = await req.json();
  const { token, customer_response_note } = body;

  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const supabase = createServerClient();

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

  // Update offer
  await supabase
    .from("trade_in_offers")
    .update({
      status: "rejected",
      responded_at: new Date().toISOString(),
      customer_response_note: customer_response_note || null,
    })
    .eq("id", offer.id);

  // Fetch inquiry and notify admin
  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("name, email, metadata")
    .eq("id", offer.inquiry_id)
    .single();

  if (inquiry) {
    const metadata = (inquiry.metadata || {}) as Record<string, any>;
    try {
      await resend.emails.send({
        from: "PhoneSpot <noreply@phonespot.dk>",
        to: "ha@phonespot.dk",
        subject: `Tilbud afvist: ${inquiry.name} \u2014 ${metadata.device?.model || "enhed"}`,
        html: `<p>${inquiry.name} har afvist tilbuddet.</p>
${customer_response_note ? `<p>Kundens kommentar: ${customer_response_note}</p>` : ""}
<p><a href="https://phonespot.dk/admin/opkoeb/${offer.inquiry_id}">Se henvendelse</a></p>`,
      });
    } catch { /* non-fatal */ }

    await supabase.from("inquiry_messages").insert({
      inquiry_id: offer.inquiry_id,
      sender: "customer",
      channel: "email",
      body: `Tilbud afvist${customer_response_note ? `: ${customer_response_note}` : ""}`,
    });
  }

  return NextResponse.json({ success: true });
}
