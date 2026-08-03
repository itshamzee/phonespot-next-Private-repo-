import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { resend } from "@/lib/email/resend";
import { createBuybackReturnLabel, customerLabelUrl } from "@/lib/shipmondo/buyback-label";
import { trackingUrlFor } from "@/lib/shipmondo/carriers";
import { readLeadDevices, deviceLabel } from "@/lib/buyback/lead-devices";
import { render } from "@react-email/render";
import OfferAcceptanceEmail from "@/lib/email/templates/offer-acceptance";
import { logBuybackEvent } from "@/lib/buyback/events";
import { sendCriticalAlert } from "@/lib/buyback/alerts";
import { loadBuybackSettings } from "@/lib/buyback/settings";
import { formatDKK } from "@/lib/supabase/trade-in-types";
import { detectDeviceGuide } from "@/lib/supabase/email-types";
import { parsePostalCity } from "@/lib/buyback/seller-address";

/* POST /api/trade-in/accept — customer accepts offer via token */
export async function POST(req: Request) {
  const body = await req.json();
  const { token, seller_name, seller_address, seller_postal_city, seller_bank_reg, seller_bank_account } = body;

  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
  if (!seller_name || !seller_bank_reg || !seller_bank_account) {
    return NextResponse.json({ error: "Navn og bankoplysninger er påkrævet" }, { status: 400 });
  }

  // Without a usable address there is no return label, and the customer is left
  // holding a device they have agreed to sell. This used to be optional.
  if (!seller_address?.trim() || !parsePostalCity(seller_postal_city)) {
    return NextResponse.json(
      { error: "Adresse, postnummer og by er påkrævet" },
      { status: 400 },
    );
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
    return NextResponse.json({ error: "Token er ugyldigt eller udløbet" }, { status: 400 });
  }

  if (new Date(offer.token_expires_at) < new Date()) {
    await supabase.from("trade_in_offers").update({ status: "expired" }).eq("id", offer.id);
    return NextResponse.json({ error: "Tilbuddet er udløbet" }, { status: 410 });
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

  // The acceptance is the moment money starts moving, so it goes in the event
  // log, and above the threshold it also reaches a phone.
  const buybackSettings = await loadBuybackSettings(supabase);
  await logBuybackEvent(supabase, {
    type: "accepted",
    severity: "info",
    summary: `Kunde accepterede ${formatDKK(offer.offer_amount)}`,
    inquiryId: offer.inquiry_id,
    offerId: offer.id,
  });
  if (offer.offer_amount >= buybackSettings.smsAcceptThresholdOre) {
    await sendCriticalAlert(supabase, `kunde accepterede ${formatDKK(offer.offer_amount)}`);
  }

  // 3. Fetch inquiry for context
  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("*")
    .eq("id", offer.inquiry_id)
    .single();

  if (inquiry) {
    // Through readLeadDevices, because metadata.device is the old flat shape
    // and the current wizard writes `devices: []` — reading the old one left the
    // device blank in both the staff alert and the customer's acceptance mail.
    const leadDevices = readLeadDevices(inquiry.metadata);
    const firstDevice = leadDevices[0]?.device;

    // 5. Notify admin
    try {
      await resend.emails.send({
        from: "PhoneSpot <noreply@phonespot.dk>",
        to: "info@phonespot.dk",
        subject: `Tilbud accepteret: ${inquiry.name} \— ${deviceLabel(firstDevice)}`,
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

    // 7. Auto-generate shipping label and send styled acceptance email (non-fatal)
    try {
      const { data: company } = await supabase.from("company_settings").select("*").single();

      let labelUrl: string | null = null;
      let trackingNumber: string | null = null;

      // One implementation, shared with the admin button. This used to book
      // PNORD_DK_YPAKKE from us to the customer — a product that does not exist,
      // in the wrong direction — and swallow the failure, so nobody ever learned
      // that the automatic label had never once been produced.
      const labelResult = await createBuybackReturnLabel(supabase, {
        offerId: offer.id,
        sellerName: seller_name || inquiry.name,
        sellerAddress: seller_address,
        sellerPostalCity: seller_postal_city,
        customerEmail: inquiry.email,
        customerPhone: inquiry.phone,
      });

      if (labelResult.ok) {
        trackingNumber = labelResult.trackingNumber;
        labelUrl = customerLabelUrl(offer.token);
      } else {
        // Not fatal — the acceptance email still goes out — but it must be
        // visible, so someone can press the button by hand.
        await logBuybackEvent(supabase, {
          type: "error",
          severity: "critical",
          summary: `Automatisk returlabel fejlede: ${labelResult.error}`,
          inquiryId: inquiry.id,
          offerId: offer.id,
        });
      }

      const brand = firstDevice?.brand || firstDevice?.brandCustom || "";
      const model = firstDevice?.model || firstDevice?.modelCustom || "";
      const storage = firstDevice?.storage || null;

      const { data: staffProfile } = await supabase
        .from("staff_profiles").select("*").eq("is_active", true).limit(1).single();

      const html = await render(OfferAcceptanceEmail({
        customerName: seller_name || inquiry.name,
        brand,
        model,
        storage,
        offerAmountKr: formatDKK(offer.offer_amount),
        trackingNumber,
        trackingUrl: trackingNumber ? trackingUrlFor("pdk", trackingNumber) : null,
        labelDownloadUrl: labelUrl,
        deviceGuide: detectDeviceGuide(brand),
        staffProfile,
        companySettings: company,
      }));

      await resend.emails.send({
        from: "PhoneSpot <info@phonespot.dk>",
        to: inquiry.email,
        replyTo: "support@reply.phonespot.dk",
        subject: `Tilbud accepteret — ${[brand, model].filter(Boolean).join(" ")}`,
        html,
      });
    } catch (err) {
      console.error("Auto-shipment/email failed (non-fatal):", err);
    }
  }

  return NextResponse.json({ success: true });
}
