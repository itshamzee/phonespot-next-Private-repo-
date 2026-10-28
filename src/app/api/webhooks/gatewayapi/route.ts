import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyDeliveryKey } from "@/lib/gateway-api/delivery";

/**
 * Delivery reports from GatewayAPI (the callback_url set on every SMS).
 * Payload: { id, msisdn, time, status, error?, code?, ... }.
 *
 * The key on the URL is the whole verification. Anything else is acknowledged
 * with 2xx, because GatewayAPI retries every non-2xx answer.
 */
export async function POST(req: Request) {
  const key = new URL(req.url).searchParams.get("k");
  if (!verifyDeliveryKey(key)) {
    return NextResponse.json({ error: "invalid key" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    id?: number | string;
    status?: string;
    error?: string;
    code?: string;
    time?: number;
  } | null;
  if (!body?.id || !body.status) return NextResponse.json({ ok: true, ignored: "no id/status" });

  const error = [body.code, body.error].filter(Boolean).join(" ") || null;
  const supabase = createAdminClient();
  const { error: dbError } = await supabase
    .from("sms_log")
    .update({
      delivery_status: body.status,
      delivery_error: error,
      delivery_at: body.time ? new Date(body.time * 1000).toISOString() : new Date().toISOString(),
    })
    .eq("provider_message_id", String(body.id));

  if (dbError) {
    console.error("[gatewayapi webhook] sms_log update failed:", dbError);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
  if (body.status !== "DELIVERED" && body.status !== "ENROUTE" && body.status !== "BUFFERED") {
    console.warn("[gatewayapi webhook] not delivered:", body.id, body.status, error);
  }
  return NextResponse.json({ ok: true });
}
