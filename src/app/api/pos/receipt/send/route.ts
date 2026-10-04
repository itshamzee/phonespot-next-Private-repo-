import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-staff";
import { renderReceiptPdf } from "@/lib/pos/receipt-data";
import { receiptUrl } from "@/lib/pos/receipt-link";
import { UNAUTHORIZED, parseBody, posErrorResponse } from "@/lib/pos/route-helpers";
import { uuidSchema } from "@/lib/pos/schemas";
import { createServerClient } from "@/lib/supabase/client";

const bodySchema = z.discriminatedUnion("channel", [
  z.object({ channel: z.literal("email"), orderId: uuidSchema, to: z.string().trim().email("Ugyldig e-mailadresse") }),
  z.object({
    channel: z.literal("sms"),
    orderId: uuidSchema,
    to: z.string().trim().regex(/^(\+?45)?\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{2}$/, "Ugyldigt telefonnummer"),
  }),
]);

/**
 * POST /api/pos/receipt/send
 *   { channel: "email", orderId, to }   receipt PDF as attachment
 *   { channel: "sms",   orderId, to }   SMS with a signed link to the receipt PDF
 * Staff only. Used by the Kasse after a completed sale.
 */
export async function POST(request: NextRequest) {
  try {
    const staff = await requireStaff(request);
    if (!staff) return UNAUTHORIZED();
    const parsed = await parseBody(request, bodySchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const supabase = createServerClient();
    const { data: order } = await supabase
      .from("orders")
      .select("id, type, receipt_number, order_number")
      .eq("id", body.orderId)
      .maybeSingle();
    if (!order || (order.type !== "pos" && order.type !== "credit_note")) {
      return NextResponse.json({ error: "Salget findes ikke" }, { status: 404 });
    }
    const number = order.receipt_number ?? order.order_number;

    if (body.channel === "email") {
      const pdf = await renderReceiptPdf(order.id);
      if (!pdf) return NextResponse.json({ error: "Kvitteringen kunne ikke genereres" }, { status: 500 });
      const { resend, EMAIL_FROM } = await import("@/lib/email/resend");
      const { error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: body.to,
        subject: `Din kvittering fra PhoneSpot (${number})`,
        text: `Tak for dit køb hos PhoneSpot.\n\nDin kvittering ${number} ligger som vedhæftet PDF.\n\nPhoneSpot · phonespot.dk`,
        attachments: [{ filename: `kvittering-${number}.pdf`, content: pdf }],
      });
      if (error) {
        console.error("[pos] receipt email failed:", error);
        return NextResponse.json({ error: "E-mailen kunne ikke sendes" }, { status: 502 });
      }
      return NextResponse.json({ sent: true });
    }

    const { sendSms } = await import("@/lib/gateway-api/client");
    const message = `Tak for dit køb hos PhoneSpot. Din kvittering ${number}: ${receiptUrl(order.id)}`;
    const result = await sendSms(body.to, message);
    await supabase.from("sms_log").insert({
      ticket_id: null,
      customer_id: null,
      phone: body.to,
      message,
      provider_message_id: result.messageId,
      status: result.success ? "sent" : "failed",
    });
    if (!result.success) return NextResponse.json({ error: result.error ?? "SMS kunne ikke sendes" }, { status: 502 });
    return NextResponse.json({ sent: true });
  } catch (err) {
    return posErrorResponse(err, "Fejl ved afsendelse af kvittering");
  }
}
