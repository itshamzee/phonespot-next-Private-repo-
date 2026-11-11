import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendFollowup } from "@/lib/buyback/followup-run";
import type { FollowupKind } from "@/lib/buyback/followup";

/**
 * POST /api/admin/opkoeb/[offerId]/remind — the "Send påmindelse nu" button.
 * Sends the message that fits where the offer is: a reminder while it is
 * pending, "har du sendt den?" once accepted. Logged as kind 'manual', so it
 * does not use up the automatic steps.
 */
export async function POST(request: Request, { params }: { params: Promise<{ offerId: string }> }) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: "Kun medarbejdere" }, { status: 401 });

  const { offerId } = await params;
  const db = createAdminClient();

  const { data: offer } = await db
    .from("trade_in_offers")
    .select(
      "id, inquiry_id, status, offer_amount, token, token_expires_at, responded_at, received_at, created_at, scheduled_send_at, send_state, seller_name",
    )
    .eq("id", offerId)
    .maybeSingle();
  if (!offer) return NextResponse.json({ error: "Tilbuddet findes ikke" }, { status: 404 });

  let kind: FollowupKind;
  if (offer.status === "pending") {
    const left = offer.token_expires_at ? new Date(offer.token_expires_at).getTime() - Date.now() : 0;
    if (left <= 0) {
      return NextResponse.json(
        { error: "Tilbuddet er udløbet. Send et nyt bud i stedet." },
        { status: 409 },
      );
    }
    kind = left < 3 * 86_400_000 ? "reminder_72h" : "reminder_24h";
  } else if (offer.status === "accepted" && !offer.received_at) {
    kind = "ship_3d";
  } else {
    return NextResponse.json(
      { error: "Der er ikke noget at minde kunden om på dette tilbud." },
      { status: 409 },
    );
  }

  const { data: inquiry } = await db
    .from("contact_inquiries")
    .select("id, name, email, phone, metadata, store_id")
    .eq("id", offer.inquiry_id)
    .maybeSingle();
  if (!inquiry) return NextResponse.json({ error: "Henvendelsen findes ikke" }, { status: 404 });

  const channels = await sendFollowup(db, { offer, inquiry }, kind, staff.name ?? "Admin", {
    manual: true,
  });
  if (channels.length === 0) {
    return NextResponse.json({ error: "Påmindelsen kunne ikke sendes" }, { status: 502 });
  }
  return NextResponse.json({ sent: true, channels });
}
