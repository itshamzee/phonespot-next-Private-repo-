import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/admin/sms/status — SMS health check (staff, via middleware).
 *
 * Returns the GatewayAPI account (credit) and asks GatewayAPI for the delivery
 * status of every SMS sent in the last 7 days (older data is gone there),
 * writing the answer to sms_log. Covers messages sent before the delivery
 * webhook existed.
 */
const API = "https://gatewayapi.eu/rest";

export async function GET() {
  const token = (process.env.GATEWAYAPI_TOKEN ?? "").trim();
  if (!token) return NextResponse.json({ error: "GATEWAYAPI_TOKEN is not set" }, { status: 500 });
  const headers = { Authorization: `Token ${token}` };

  const meRes = await fetch(`${API}/me`, { headers });
  const account = meRes.ok ? await meRes.json() : { error: meRes.status, body: await meRes.text() };

  const supabase = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: rows } = await supabase
    .from("sms_log")
    .select("id, phone, provider_message_id, created_at, message")
    .not("provider_message_id", "is", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const messages = [];
  for (const row of rows ?? []) {
    const res = await fetch(`${API}/mtsms/${row.provider_message_id}`, { headers });
    let delivery_status: string | null = null;
    let delivery_error: string | null = null;
    let delivery_at: string | null = null;
    if (res.ok) {
      const data = await res.json();
      const r = data.recipients?.[0] ?? {};
      delivery_status = r.dsnstatus ?? null;
      delivery_error = r.dsnerrorcode ?? null;
      delivery_at = r.dsntime ? new Date(r.dsntime * 1000).toISOString() : null;
      if (delivery_status) {
        await supabase.from("sms_log").update({ delivery_status, delivery_error, delivery_at }).eq("id", row.id);
      }
    } else {
      delivery_error = `lookup ${res.status}`;
    }
    messages.push({
      created_at: row.created_at,
      phone: row.phone,
      id: row.provider_message_id,
      start: row.message.slice(0, 40),
      delivery_status,
      delivery_error,
    });
  }

  return NextResponse.json({ account, messages });
}
