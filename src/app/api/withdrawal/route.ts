import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { validateWithdrawalToken } from "@/lib/withdrawal";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/withdrawal
 * Process a fortrydelsesret (right of withdrawal) request.
 * Validates the token, checks eligibility, updates order status, sends confirmation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, reason } = body;

    if (!token) {
      return NextResponse.json({ error: "Manglende token" }, { status: 400 });
    }

    const order = await validateWithdrawalToken(token);

    if (!order) {
      return NextResponse.json({ error: "Ugyldigt link" }, { status: 404 });
    }

    if (!order.eligible) {
      return NextResponse.json({ error: (order as { reason: string }).reason }, { status: 400 });
    }

    const supabase = createServerClient();

    // Log the withdrawal in activity_log
    await supabase.from("activity_log").insert({
      action: "withdrawal_requested",
      entity_type: "order",
      entity_id: order.id,
      details: {
        order_number: order.order_number,
        reason: reason || null,
        requested_at: new Date().toISOString(),
      },
    });

    // Update order notes (don't change status yet — that happens when goods are returned)
    await supabase
      .from("orders")
      .update({
        notes: `Fortrydelsesret udøvet ${new Date().toLocaleDateString("da-DK")}. ${reason ? `Begrundelse: ${reason}` : "Ingen begrundelse angivet."}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    // Send confirmation email
    const customerEmail = (order.customers as unknown as { email: string } | null)?.email;
    const customerName = (order.customers as unknown as { name: string } | null)?.name;

    if (customerEmail) {
      await resend.emails.send({
        from: "PhoneSpot <noreply@phonespot.dk>",
        to: customerEmail,
        subject: `Bekræftelse af fortrydelse — Ordre #${order.order_number}`,
        text: [
          `Kære ${customerName || "kunde"},`,
          "",
          `Vi har modtaget din fortrydelse af ordre #${order.order_number}.`,
          "",
          "Næste skridt:",
          "1. Send varen retur til: PhoneSpot ApS, VestsjællandsCentret 10, 4200 Slagelse",
          "2. Returomkostninger afholdes af dig som køber",
          "3. Tilbagebetaling sker senest 14 dage efter vi har modtaget din fortrydelsesmeddelelse, dog tidligst når vi har modtaget varen retur",
          "",
          "Husk at pakke varen forsvarligt. Varen skal returneres i væsentligt samme stand og mængde.",
          "",
          "Har du spørgsmål? Kontakt os på info@phonespot.dk.",
          "",
          "Med venlig hilsen,",
          "PhoneSpot",
        ].join("\n"),
      });
    }

    // Notify PhoneSpot staff
    await resend.emails.send({
      from: "PhoneSpot System <noreply@phonespot.dk>",
      to: "info@phonespot.dk",
      subject: `Fortrydelsesret — Ordre #${order.order_number}`,
      text: [
        `Kunde: ${customerName || "Ukendt"} (${customerEmail || "ingen email"})`,
        `Ordre: #${order.order_number}`,
        `Total: ${(order.total / 100).toFixed(2)} DKK`,
        `Begrundelse: ${reason || "Ingen angivet"}`,
        "",
        "Handling påkrævet: Afvent returnering af varen, derefter gennemfør refusion.",
      ].join("\n"),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Withdrawal error:", err);
    return NextResponse.json(
      { error: "Der opstod en fejl. Prøv venligst igen." },
      { status: 500 }
    );
  }
}
