import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBuybackSettings } from "@/lib/buyback/settings";
import { requireStaff } from "@/lib/auth/require-staff";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST — send a test mail from the configured buyback sender.
 *
 * This is the gate before automation may be switched on. info@ and ordre@ have
 * been suppressed in Resend before, and a suppressed sender drops mail silently:
 * the offers would look sent in our own database and never arrive. If this test
 * does not land in the inbox, automation must stay off.
 */
export async function POST(req: Request) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const settings = await loadBuybackSettings(supabase);

  if (!settings.digestRecipient) {
    return NextResponse.json(
      { error: "Udfyld modtager af morgenmail først — testmailen sendes dertil" },
      { status: 400 },
    );
  }

  try {
    const sent = await resend.emails.send({
      from: settings.fromAddress,
      to: settings.digestRecipient,
      subject: "PhoneSpot opkøb — test af afsender",
      html: `
        <p>Denne mail bekræfter at afsenderen <strong>${settings.fromAddress}</strong> virker.</p>
        <p>Kom den frem, kan automatikken slås til. Kom den ikke, er afsenderen
        formentlig suppresset i Resend, og automatiske bud ville forsvinde uden besked.</p>
      `,
    });

    if (sent.error) {
      return NextResponse.json(
        { ok: false, from: settings.fromAddress, to: settings.digestRecipient, error: sent.error.message },
        { status: 200 },
      );
    }

    return NextResponse.json({
      ok: true,
      from: settings.fromAddress,
      to: settings.digestRecipient,
      id: sent.data?.id ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        from: settings.fromAddress,
        to: settings.digestRecipient,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 200 },
    );
  }
}
