import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBuybackSettings } from "@/lib/buyback/settings";
import { collectDigestData } from "@/lib/buyback/digest-data";
import { buildDigestHtml, buildDigestSubject } from "@/lib/email/buyback-digest";
import { logBuybackEvent } from "@/lib/buyback/events";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * GET /api/cron/buyback-digest
 * The daily buyback work list: who to pay, what to register as received, what is
 * waiting, and anything that went wrong. Auth: Bearer CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const settings = await loadBuybackSettings(supabase);

  if (!settings.digestRecipient) {
    await logBuybackEvent(supabase, {
      type: "error",
      severity: "warn",
      summary: "Morgenmailen blev ikke sendt — ingen modtager er sat i indstillingerne",
    });
    return NextResponse.json({ skipped: "no recipient" });
  }

  const data = await collectDigestData(supabase);

  try {
    const sent = await resend.emails.send({
      from: settings.fromAddress,
      to: settings.digestRecipient,
      subject: buildDigestSubject(data),
      html: buildDigestHtml(data),
    });

    if (sent.error) {
      await logBuybackEvent(supabase, {
        type: "error",
        severity: "warn",
        summary: `Morgenmailen kunne ikke sendes: ${sent.error.message}`,
      });
      return NextResponse.json({ error: sent.error.message }, { status: 500 });
    }

    return NextResponse.json({
      sent: true,
      toPay: data.toPay.length,
      toReceive: data.toReceive.length,
      waiting: data.waiting.total,
      problems: data.problems.length,
    });
  } catch (err) {
    await logBuybackEvent(supabase, {
      type: "error",
      severity: "warn",
      summary: "Morgenmailen fejlede",
      detail: { error: err instanceof Error ? err.message : String(err) },
    });
    return NextResponse.json({ error: "digest failed" }, { status: 500 });
  }
}
