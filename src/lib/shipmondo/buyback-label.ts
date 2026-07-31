import type { createAdminClient } from "@/lib/supabase/admin";
import { createShipment, getShipmentLabel } from "./client";
import { BUYBACK_RETURN_PRODUCT, BUYBACK_DESTINATION, DEFAULT_PARCEL } from "./carriers";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

const BUCKET = "shipping-labels";

export interface BuybackLabelInput {
  offerId: string;
  sellerName: string;
  sellerAddress: string | null;
  /** "4200 Slagelse" as stored on the offer. */
  sellerPostalCity: string | null;
  customerEmail: string;
  customerPhone?: string | null;
}

export type BuybackLabelResult =
  | { ok: true; trackingNumber: string; labelPath: string; shipmentId: number }
  | { ok: false; error: string };

export function labelPathFor(offerId: string): string {
  return `label-${offerId}.pdf`;
}

/**
 * Books the label a customer uses to send us a device, stores the PDF, and
 * records the parcel.
 *
 * One implementation on purpose. This existed twice — once on accept and once
 * behind the admin button — and the two drifted apart until both were broken in
 * different ways: one booked PNORD_DK_YPAKKE, the other PDKEP, neither product
 * exists, and both addressed the parcel from us to the customer rather than the
 * other way round.
 */
export async function createBuybackReturnLabel(
  client: SupabaseAdmin,
  input: BuybackLabelInput,
): Promise<BuybackLabelResult> {
  const postal = (input.sellerPostalCity ?? "").match(/^(\d{4})\s+(.+)$/);
  if (!postal || !input.sellerAddress) {
    // No fallback address. Shipping to a guessed postcode bills us for a label
    // that sends the customer's device somewhere nobody is waiting for it.
    return { ok: false, error: "Sælgers adresse og postnummer mangler på tilbuddet" };
  }

  let shipment;
  try {
    shipment = await createShipment({
      ...BUYBACK_RETURN_PRODUCT,
      // The customer posts the device to us: they are the sender.
      sender: {
        name: input.sellerName,
        address1: input.sellerAddress,
        zipcode: postal[1],
        city: postal[2],
        country_code: "DK",
        email: input.customerEmail,
        phone: input.customerPhone ?? "",
      },
      receiver: { ...BUYBACK_DESTINATION },
      parcels: [{ weight: DEFAULT_PARCEL.weight * 2 }],
      reference: `Opkoeb-${input.offerId.slice(0, 8)}`,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Shipmondo-fejl" };
  }

  // pkg_no, not tracking_number — see ShipmondoShipmentResponse.
  const trackingNumber = shipment.pkg_no || shipment.parcels?.[0]?.pkg_no || "";
  if (!trackingNumber) {
    return { ok: false, error: "Shipmondo returnerede ingen pakkenummer" };
  }

  const labelPath = labelPathFor(input.offerId);

  try {
    const pdf = Buffer.from(await getShipmentLabel(shipment.id), "base64");
    const { error: uploadErr } = await client.storage
      .from(BUCKET)
      .upload(labelPath, pdf, { contentType: "application/pdf", upsert: true });
    if (uploadErr) return { ok: false, error: `Kunne ikke gemme label: ${uploadErr.message}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Kunne ikke hente label" };
  }

  const { error: insertErr } = await client.from("shipping_labels").upsert(
    {
      offer_id: input.offerId,
      provider: "postnord",
      tracking_number: trackingNumber,
      label_path: labelPath,
      // Kept for rows read by older code paths; the live link is minted per
      // request from label_path, because a signed URL expires.
      label_url: "",
      status: "label_created",
      shipmondo_shipment_id: String(shipment.id),
    },
    { onConflict: "offer_id" },
  );

  if (insertErr) return { ok: false, error: insertErr.message };

  return { ok: true, trackingNumber, labelPath, shipmentId: shipment.id };
}

/**
 * The link that goes in the customer's email.
 *
 * Not the staff route: that one requires a session, so a customer clicking it
 * from their inbox got a 401 and could not fetch the label they were told to
 * print. The offer token is the credential, as it is for accepting the offer.
 */
export function customerLabelUrl(offerToken: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://phonespot.dk";
  return `${base}/api/trade-in/hent-label?token=${offerToken}`;
}

/** A link that works today. Signed URLs expire, so they are made on demand. */
export async function signedLabelUrl(
  client: SupabaseAdmin,
  labelPath: string,
  seconds = 60 * 10,
): Promise<string | null> {
  const { data } = await client.storage.from(BUCKET).createSignedUrl(labelPath, seconds);
  return data?.signedUrl ?? null;
}
