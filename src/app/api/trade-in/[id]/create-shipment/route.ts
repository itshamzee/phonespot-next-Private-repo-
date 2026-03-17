// src/app/api/trade-in/[id]/create-shipment/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { createShipment, getShipmentLabel } from "@/lib/shipmondo/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: offerId } = await params;
  const supabase = createServerClient();

  // Get offer + inquiry
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

  // Check if label already exists
  const { data: existingLabel } = await supabase
    .from("shipping_labels")
    .select("id")
    .eq("offer_id", offerId)
    .single();

  if (existingLabel) {
    return NextResponse.json({ error: "Label already exists for this offer" }, { status: 409 });
  }

  // Get company settings for sender address
  const { data: company } = await supabase
    .from("company_settings")
    .select("*")
    .single();

  const inquiry = offer.contact_inquiries;

  // Parse postal_city into postal_code + city
  const sellerPostalCity = offer.seller_postal_city || "";
  const postalMatch = sellerPostalCity.match(/^(\d{4})\s+(.+)$/);
  const receiverPostal = postalMatch ? postalMatch[1] : "2200";
  const receiverCity = postalMatch ? postalMatch[2] : "København N";

  const companyPostalCity = company?.postal_city || "2200 København N";
  const companyPostalMatch = companyPostalCity.match(/^(\d{4})\s+(.+)$/);
  const senderPostal = companyPostalMatch ? companyPostalMatch[1] : "2200";
  const senderCity = companyPostalMatch ? companyPostalMatch[2] : "København N";

  try {
    const shipment = await createShipment({
      carrier_code: "postnord",
      product_code: "PDKEP",
      sender: {
        name: company?.company_name || "PhoneSpot",
        address1: company?.address || "Nørrebrogade 42",
        zipcode: senderPostal,
        city: senderCity,
        country_code: "DK",
        email: company?.email || "support@phonespot.dk",
        phone: company?.phone || "",
      },
      receiver: {
        name: offer.seller_name || inquiry.name,
        address1: offer.seller_address || "",
        zipcode: receiverPostal,
        city: receiverCity,
        country_code: "DK",
        email: inquiry.email,
        phone: inquiry.phone || "",
      },
      parcels: [{ weight: 1000 }],
      reference: `TradeIn-${offerId.slice(0, 8)}`,
    });

    // Get label PDF
    const labelBase64 = await getShipmentLabel(shipment.id);
    const labelBuffer = Buffer.from(labelBase64, "base64");

    // Upload to Supabase Storage
    const fileName = `label-${offerId}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from("shipping-labels")
      .upload(fileName, labelBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });
    }

    // Generate a signed URL (7 days expiry) for private bucket
    const { data: urlData, error: urlErr } = await supabase.storage
      .from("shipping-labels")
      .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days

    if (urlErr || !urlData?.signedUrl) {
      return NextResponse.json({ error: "Failed to generate label URL" }, { status: 500 });
    }

    // Save to shipping_labels table
    const trackingNumber = shipment.tracking_number || shipment.parcels?.[0]?.tracking_number || null;

    const { data: label, error: labelErr } = await supabase
      .from("shipping_labels")
      .insert({
        offer_id: offerId,
        provider: "postnord",
        tracking_number: trackingNumber,
        label_url: urlData.signedUrl,
        status: "label_created",
        shipmondo_shipment_id: String(shipment.id),
      })
      .select()
      .single();

    if (labelErr) {
      return NextResponse.json({ error: labelErr.message }, { status: 500 });
    }

    return NextResponse.json({ label, tracking_number: trackingNumber });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Shipmondo API error" }, { status: 500 });
  }
}
