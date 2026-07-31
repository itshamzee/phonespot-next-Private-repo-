import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyShipmondoJwt,
  extractToken,
  extractTrackingNumber,
  extractStatus,
  mapCarrierStatus,
} from "@/lib/shipmondo/webhook";
import { logBuybackEvent } from "@/lib/buyback/events";

/**
 * Carrier progress for buyback parcels.
 *
 * Shipmondo signs the payload as a JWT with the key given when the subscription
 * was created, so the signature is the whole verification. The payload shape is
 * not in the OpenAPI spec, which is why every field is read defensively and an
 * unrecognised status changes nothing rather than guessing.
 */
export async function POST(req: Request) {
  const key = process.env.SHIPMONDO_WEBHOOK_KEY;
  if (!key) {
    console.error("[shipmondo webhook] SHIPMONDO_WEBHOOK_KEY is not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const raw = await req.text();
  const token = extractToken(raw);
  const payload = token ? verifyShipmondoJwt(token, key) : null;

  if (!payload) {
    // Unsigned or wrongly signed. This is the one case worth refusing outright.
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const trackingNumber = extractTrackingNumber(payload);
  const carrierStatus = extractStatus(payload);

  // A webhook that gets an error is retried indefinitely, and we also ship
  // parcels that have nothing to do with buyback. Acknowledge and move on.
  if (!trackingNumber) return NextResponse.json({ ok: true, ignored: "no tracking number" });

  const supabase = createAdminClient();

  const { data: label } = await supabase
    .from("shipping_labels")
    .select("id, offer_id, status, in_transit_at, delivered_at")
    .eq("tracking_number", trackingNumber)
    .maybeSingle();

  if (!label) return NextResponse.json({ ok: true, ignored: "unknown parcel" });

  const now = new Date().toISOString();
  const progress = mapCarrierStatus(carrierStatus);

  const update: Record<string, unknown> = {
    carrier_status: carrierStatus,
    last_event_at: now,
    updated_at: now,
  };

  if (progress === "in_transit" && !label.in_transit_at) {
    update.in_transit_at = now;
    update.status = "in_transit";
  }

  if (progress === "delivered") {
    if (!label.delivered_at) update.delivered_at = now;
    // A parcel can be reported delivered without us ever having seen a transit
    // event; the timeline should not have a hole in the middle.
    if (!label.in_transit_at) update.in_transit_at = now;
    update.status = "delivered";
  }

  await supabase.from("shipping_labels").update(update).eq("id", label.id);

  if (!progress) {
    // Recorded rather than dropped, so an unmapped carrier vocabulary shows up
    // as something we can go and read.
    await logBuybackEvent(supabase, {
      type: "manual",
      severity: "info",
      offerId: label.offer_id,
      summary: `Ukendt fragtstatus "${carrierStatus ?? "(tom)"}" på pakke ${trackingNumber}`,
      detail: { trackingNumber, carrierStatus },
    });
  }

  return NextResponse.json({ ok: true, status: progress ?? "unmapped" });
}
