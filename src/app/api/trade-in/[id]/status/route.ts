import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/require-staff";
import { logBuybackEvent } from "@/lib/buyback/events";
import { parseManualStatus } from "@/lib/supabase/trade-in-types";

const STATUS_LABELS: Record<string, string> = {
  ny: "Ny",
  tilbud_sendt: "Tilbud sendt",
  accepteret: "Accepteret",
  afventer_forsendelse: "Afventer forsendelse",
  paa_vej: "På vej",
  leveret: "Leveret",
  afvist: "Afvist",
  modtaget: "Modtaget",
  vurderet: "Vurderet",
  betalt: "Betalt",
  lukket: "Lukket",
};

/**
 * POST /api/trade-in/[id]/status — sæt eller ryd manuel status på et opkøb.
 *
 * Body: { status: TradeInDerivedStatus | null }. Null rydder overriden, så
 * status igen afledes af papirsporet (tilbud, labels, kvitteringer).
 * Overriden ændrer kun hvad admin ser — den udløser ingen mails eller labels.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: inquiryId } = await params;
  const body = await req.json().catch(() => ({}));

  const manual = body.status === null ? null : parseManualStatus(body.status);
  if (body.status !== null && manual === null) {
    return NextResponse.json({ error: "Ugyldig status" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("id, source")
    .eq("id", inquiryId)
    .maybeSingle();

  if (!inquiry || inquiry.source !== "saelg-enhed") {
    return NextResponse.json({ error: "Henvendelsen findes ikke" }, { status: 404 });
  }

  const { error } = await supabase
    .from("contact_inquiries")
    .update({ manual_status: manual })
    .eq("id", inquiryId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const who = staff.name || staff.email || "Admin";
  await logBuybackEvent(supabase, {
    type: "manual",
    severity: "info",
    summary: manual
      ? `Status manuelt sat til "${STATUS_LABELS[manual]}" af ${who}`
      : `Manuel status fjernet af ${who} — følger igen forløbet`,
    inquiryId,
  });

  return NextResponse.json({ ok: true, manual_status: manual });
}
