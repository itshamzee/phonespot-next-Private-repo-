import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedLabelUrl, labelPathFor } from "@/lib/shipmondo/buyback-label";

/**
 * GET /api/trade-in/hent-label?token=... — the customer's own label.
 *
 * PUBLIC by design: this link goes in the acceptance email, so it cannot ask
 * for a staff session. The offer token is the credential — the same unguessable
 * uuid that authorises accepting and rejecting the offer.
 *
 * Token expiry is deliberately not enforced here. It exists to stop an old
 * offer being accepted; a customer who accepted and then took ten days to get
 * to a parcel shop still needs their label.
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Mangler token" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: offer } = await supabase
    .from("trade_in_offers")
    .select("id, status")
    .eq("token", token)
    .maybeSingle();

  if (!offer || offer.status !== "accepted") {
    return NextResponse.json(
      { error: "Linket er ikke gyldigt. Kontakt os, så sender vi en ny label." },
      { status: 404 },
    );
  }

  const { data: label } = await supabase
    .from("shipping_labels")
    .select("label_path")
    .eq("offer_id", offer.id)
    .maybeSingle();

  const url = await signedLabelUrl(
    supabase,
    label?.label_path || labelPathFor(offer.id),
    // Long enough to open, print, and reopen on a phone at the shop.
    60 * 60,
  );

  if (!url) {
    return NextResponse.json(
      { error: "Vi kan ikke finde din label. Skriv til os, så sender vi en ny." },
      { status: 404 },
    );
  }

  // A redirect, not JSON: the customer reaches this by clicking a link in an
  // email and expects the PDF to open.
  return NextResponse.redirect(url);
}
