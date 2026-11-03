import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  RECOVERY_ORDER_SELECT,
  sendRecoveryEmail,
} from "@/lib/recovery/send-recovery-email";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Admin-knappen "Send påmindelse" på /admin/platform/abandoned-checkouts.
 * Bag middleware-gaten for /api/platform/**. Sender samme mail som cron-jobbet,
 * men uden 24-timers-spærren — personalet har bevidst valgt at sende.
 */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(`status, payment_status, ${RECOVERY_ORDER_SELECT}`)
    .eq("id", id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Ordren findes ikke" }, { status: 404 });
  }

  if (order.payment_status === "paid") {
    return NextResponse.json({ error: "Ordren er allerede betalt" }, { status: 409 });
  }

  const result = await sendRecoveryEmail(supabase, order as any);
  if (!result.ok) {
    const message =
      result.reason === "missing_email"
        ? "Kunden har ingen e-mailadresse"
        : result.reason === "missing_token"
          ? "Ordren har intet genoptag-link"
          : `Mailen kunne ikke sendes${result.detail ? `: ${result.detail}` : ""}`;
    return NextResponse.json({ error: message }, { status: 502 });
  }

  await supabase.from("activity_log").insert({
    action: "recovery_email_sent_manual",
    entity_type: "order",
    entity_id: id,
    details: { to: result.to },
  });

  return NextResponse.json({ ok: true, to: result.to });
}
