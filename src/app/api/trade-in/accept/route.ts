import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { resend } from "@/lib/email/resend";
import { createShipment, getShipmentLabel } from "@/lib/shipmondo/client";
import { render } from "@react-email/render";
import OfferAcceptanceEmail from "@/lib/email/templates/offer-acceptance";
import { formatDKK } from "@/lib/supabase/trade-in-types";
import { detectDeviceGuide } from "@/lib/supabase/email-types";

/* POST /api/trade-in/accept — customer accepts offer via token */
export async function POST(req: Request) {
  const body = await req.json();
  const { token, seller_name, seller_address, seller_postal_city, seller_bank_reg, seller_bank_account } = body;

  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
  if (!seller_name || !seller_bank_reg || !seller_bank_account) {
    return NextResponse.json({ error: "Navn og bankoplysninger er påkrævet" }, { status: 400 });
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

  // 3. Fetch inquiry for context
  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("*")
    .eq("id", offer.inquiry_id)
    .single();

  if (inquiry) {
    const metadata = (inquiry.metadata || {}) as Record<string, unknown>;
    const deviceMeta = (metadata.device || {}) as Record<string, unknown>;

    // 5. Notify admin
    try {
      await resend.emails.send({
        from: "PhoneSpot <noreply@phonespot.dk>",
        to: "ha@phonespot.dk",
        subject: `Tilbud accepteret: ${inquiry.name} \— ${(deviceMeta.model as string) || "enhed"}`,
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

      const sellerPC = (seller_postal_city || "").match(/^(\d{4})\s+(.+)$/);
      const companyPC = (company?.postal_city || "2200 København N").match(/^(\d{4})\s+(.+)$/);

      let labelUrl: string | null = null;
      let trackingNumber: string | null = null;

      try {
        const shipment = await createShipment({
          carrier_code: "postnord",
          product_code: "PNORD_DK_YPAKKE",
          sender: {
            name: company?.company_name || "PhoneSpot",
            address1: company?.address || "",
            zipcode: companyPC?.[1] || "2200",
            city: companyPC?.[2] || "København N",
            country_code: "DK",
            email: company?.email || "support@phonespot.dk",
          },
          receiver: {
            name: seller_name || inquiry.name,
            address1: seller_address || "",
            zipcode: sellerPC?.[1] || "2200",
            city: sellerPC?.[2] || "København N",
            country_code: "DK",
            email: inquiry.email,
          },
          parcels: [{ weight: 500 }],
          reference: `TradeIn-${offer.id.slice(0, 8)}`,
        });

        const labelBase64 = await getShipmentLabel(shipment.id);
        const labelBuffer = Buffer.from(labelBase64, "base64");
        const fileName = `label-${offer.id}.pdf`;

        await supabase.storage.from("shipping-labels").upload(fileName, labelBuffer, {
          contentType: "application/pdf", upsert: true,
        });

        const { data: urlData } = await supabase.storage
          .from("shipping-labels").createSignedUrl(fileName, 60 * 60 * 24 * 7);

        labelUrl = urlData?.signedUrl || null;
        trackingNumber = shipment.tracking_number || shipment.parcels?.[0]?.tracking_number || null;

        await supabase.from("shipping_labels").insert({
          offer_id: offer.id,
          provider: "postnord",
          tracking_number: trackingNumber,
          label_url: labelUrl || "",
          status: "label_created",
          shipmondo_shipment_id: String(shipment.id),
        });
      } catch (shipErr) {
        console.error("Shipmondo label generation failed (non-fatal):", shipErr);
      }

      const brand = (metadata.brand as string) || (deviceMeta.brand as string) || "";
      const model = (metadata.model as string) || (deviceMeta.model as string) || "";
      const storage = (metadata.storage as string) || (deviceMeta.storage as string) || null;

      const { data: staffProfile } = await supabase
        .from("staff_profiles").select("*").eq("is_active", true).limit(1).single();

      const html = await render(OfferAcceptanceEmail({
        customerName: seller_name || inquiry.name,
        brand,
        model,
        storage,
        offerAmountKr: formatDKK(offer.offer_amount),
        trackingNumber,
        trackingUrl: trackingNumber ? `https://tracking.postnord.com/tracking/${trackingNumber}` : null,
        labelDownloadUrl: labelUrl,
        deviceGuide: detectDeviceGuide(brand),
        staffProfile,
        companySettings: company,
      }));

      await resend.emails.send({
        from: "PhoneSpot <support@phonespot.dk>",
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
