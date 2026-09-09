import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/require-staff";
import { logBuybackEvent } from "@/lib/buyback/events";
import { readLeadDevices, deviceLabel } from "@/lib/buyback/lead-devices";

/**
 * POST /api/trade-in/[id]/device-imei — gem IMEI/serienummer på en af
 * henvendelsens enheder.
 *
 * Body: { device_index: number, imei: string } — tom streng rydder feltet.
 *
 * IMEI'en lever i contact_inquiries.metadata sammen med resten af
 * enhedsdataene (begge historiske former: `devices: []` og det gamle flade
 * `device`), så den følger sagen og kan forudfyldes i slutsedlen.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: inquiryId } = await params;
  const body = await req.json().catch(() => ({}));

  const index = Number(body.device_index);
  const imei = typeof body.imei === "string" ? body.imei.trim() : null;
  if (!Number.isInteger(index) || index < 0 || imei === null || imei.length > 64) {
    return NextResponse.json({ error: "Ugyldigt input" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("id, source, metadata")
    .eq("id", inquiryId)
    .maybeSingle();

  if (!inquiry || inquiry.source !== "saelg-enhed") {
    return NextResponse.json({ error: "Henvendelsen findes ikke" }, { status: 404 });
  }

  const metadata = (inquiry.metadata ?? {}) as Record<string, unknown>;

  if (Array.isArray(metadata.devices)) {
    const entry = metadata.devices[index];
    if (!entry || typeof entry !== "object") {
      return NextResponse.json({ error: "Enheden findes ikke" }, { status: 404 });
    }
    const device = (entry as Record<string, unknown>).device;
    if (!device || typeof device !== "object") {
      return NextResponse.json({ error: "Enheden findes ikke" }, { status: 404 });
    }
    (device as Record<string, unknown>).imei = imei;
  } else if (metadata.device && typeof metadata.device === "object" && index === 0) {
    (metadata.device as Record<string, unknown>).imei = imei;
  } else {
    return NextResponse.json({ error: "Enheden findes ikke" }, { status: 404 });
  }

  const { error } = await supabase
    .from("contact_inquiries")
    .update({ metadata })
    .eq("id", inquiryId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const label = deviceLabel(readLeadDevices(metadata)[index]?.device);
  const who = staff.name || staff.email || "Admin";
  await logBuybackEvent(supabase, {
    type: "manual",
    severity: "info",
    summary: imei
      ? `IMEI ${imei} registreret på ${label} af ${who}`
      : `IMEI fjernet fra ${label} af ${who}`,
    inquiryId,
  });

  return NextResponse.json({ ok: true, imei });
}
