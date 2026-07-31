// src/app/api/trade-in/[id]/create-shipment/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { createShipment, getShipmentLabel } from "@/lib/shipmondo/client";
import { BUYBACK_RETURN_PRODUCT, SENDER_ADDRESSES } from "@/lib/shipmondo/carriers";
import { normalizeStoreId } from "@/lib/stores";

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

  const inquiry = offer.contact_inquiries;

  // Parse the seller's "4200 Slagelse" into its two parts.
  const sellerPostalCity = offer.seller_postal_city || "";
  const postalMatch = sellerPostalCity.match(/^(\d{4})\s+(.+)$/);

  if (!postalMatch || !offer.seller_address) {
    // Without a real sender address the label is worthless, and Shipmondo would
    // happily bill us for it. Better to say so than to ship into a fallback
    // address in Copenhagen, which is what this used to do.
    return NextResponse.json(
      { error: "Sælgers adresse og postnummer mangler på tilbuddet" },
      { status: 400 },
    );
  }

  // The customer sends the device to us, so they are the sender and the store is
  // the receiver. This was the other way round, which would have shipped a
  // parcel from us to the customer.
  const store = SENDER_ADDRESSES[
    normalizeStoreId(inquiry?.store_id) === "vejle" ? "vejle" : "slagelse"
  ];

  try {
    const shipment = await createShipment({
      ...BUYBACK_RETURN_PRODUCT,
      sender: {
        name: offer.seller_name || inquiry.name,
        address1: offer.seller_address,
        zipcode: postalMatch[1],
        city: postalMatch[2],
        country_code: "DK",
        email: inquiry.email,
        phone: inquiry.phone || "",
      },
      receiver: {
        name: store.name,
        address1: store.address1,
        zipcode: store.zipcode,
        city: store.city,
        country_code: store.country_code,
        email: store.email,
        phone: store.phone,
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Shipmondo API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
