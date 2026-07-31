import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/require-staff";
import { logBuybackEvent } from "@/lib/buyback/events";
import { readLeadDevices, deviceLabel } from "@/lib/buyback/lead-devices";

/**
 * POST /api/trade-in/[id]/receive — someone has the device in their hands.
 *
 * Deliberately separate from the carrier's "delivered": a parcel PostNord has
 * handed over can still be sitting unopened, and that gap is the one place a
 * device can go missing without anybody noticing. This is the human saying
 * they have actually seen it.
 *
 * [id] is the inquiry id, matching the other admin buyback routes.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: inquiryId } = await params;
  const supabase = createAdminClient();

  const { data: offer } = await supabase
    .from("trade_in_offers")
    .select("id, status, received_at")
    .eq("inquiry_id", inquiryId)
    .eq("status", "accepted")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!offer) {
    return NextResponse.json(
      { error: "Der er ikke noget accepteret tilbud på henvendelsen" },
      { status: 404 },
    );
  }

  if (offer.received_at) {
    // Already marked. Not an error — two people clicking is not a failure.
    return NextResponse.json({ ok: true, received_at: offer.received_at, already: true });
  }

  const now = new Date().toISOString();
  const receivedBy = staff.name || staff.email || "Admin";

  const { error } = await supabase
    .from("trade_in_offers")
    .update({ received_at: now, received_by: receivedBy, updated_at: now })
    .eq("id", offer.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("metadata")
    .eq("id", inquiryId)
    .maybeSingle();

  await logBuybackEvent(supabase, {
    type: "manual",
    severity: "info",
    summary: `${deviceLabel(readLeadDevices(inquiry?.metadata)[0]?.device)} modtaget af ${receivedBy}`,
    inquiryId,
    offerId: offer.id,
  });

  return NextResponse.json({ ok: true, received_at: now, received_by: receivedBy });
}
