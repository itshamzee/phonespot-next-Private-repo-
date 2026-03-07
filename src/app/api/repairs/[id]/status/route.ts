import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/client";
import { STORE } from "@/lib/store-config";
import { sendSms } from "@/lib/gateway-api/client";
import { getSmsTemplate } from "@/lib/gateway-api/templates";
import type { RepairStatus } from "@/lib/supabase/types";

const resend = new Resend(process.env.RESEND_API_KEY);

const VALID_STATUSES: RepairStatus[] = [
  "modtaget",
  "diagnostik",
  "tilbud_sendt",
  "godkendt",
  "i_gang",
  "faerdig",
  "afhentet",
];

const STATUS_EMAIL_SUBJECTS: Partial<Record<RepairStatus, string>> = {
  godkendt: "Din reparation er godkendt",
  i_gang: "Din reparation er i gang",
  faerdig: "Din reparation er faerdig",
};

function getStatusEmailBody(
  status: RepairStatus,
  customerName: string,
  deviceType: string,
  deviceModel: string,
): string | null {
  switch (status) {
    case "godkendt":
      return [
        `Hej ${customerName},`,
        "",
        `Tak! Dit tilbud paa reparation af din ${deviceType} ${deviceModel} er blevet godkendt.`,
        "",
        "Vi gaar i gang med reparationen hurtigst muligt og holder dig opdateret.",
        "",
        "Med venlig hilsen,",
        STORE.name,
        STORE.email,
      ].join("\n");
    case "i_gang":
      return [
        `Hej ${customerName},`,
        "",
        `Vi er nu i gang med at reparere din ${deviceType} ${deviceModel}.`,
        "",
        "Vi giver dig besked saa snart reparationen er faerdig.",
        "",
        "Med venlig hilsen,",
        STORE.name,
        STORE.email,
      ].join("\n");
    case "faerdig":
      return [
        `Hej ${customerName},`,
        "",
        `Din ${deviceType} ${deviceModel} er nu faerdigrepareret og klar til afhentning/forsendelse.`,
        "",
        "Kontakt os for at aftale afhentning eller returnering.",
        "",
        "Med venlig hilsen,",
        STORE.name,
        `${STORE.street}, ${STORE.zip} ${STORE.city}`,
        STORE.email,
      ].join("\n");
    default:
      return null;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { status, note } = body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "Ugyldig status" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  try {
    // Get the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("repair_tickets")
      .select("*")
      .eq("id", id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: "Sag ikke fundet" },
        { status: 404 },
      );
    }

    const oldStatus = ticket.status;

    // Update ticket status
    const { error: updateError } = await supabase
      .from("repair_tickets")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      console.error("Status update error:", updateError);
      return NextResponse.json(
        { error: "Kunne ikke opdatere status" },
        { status: 500 },
      );
    }

    // Log status change
    await supabase.from("repair_status_log").insert({
      ticket_id: id,
      old_status: oldStatus,
      new_status: status,
      note: note ?? null,
    });

    // Send email for specific statuses
    const emailSubject = STATUS_EMAIL_SUBJECTS[status as RepairStatus];
    const emailBody = getStatusEmailBody(
      status as RepairStatus,
      ticket.customer_name,
      ticket.device_type,
      ticket.device_model,
    );

    if (emailSubject && emailBody && ticket.customer_email) {
      await resend.emails.send({
        from: "PhoneSpot Reparation <noreply@phonespot.dk>",
        to: ticket.customer_email,
        subject: `${emailSubject} — ${ticket.device_type} ${ticket.device_model}`,
        text: emailBody,
      });
    }

    // Send SMS notification
    const customerPhone = ticket.customer_phone;
    if (customerPhone) {
      try {
        const smsMessage = getSmsTemplate(status, {
          customerName: ticket.customer_name,
          deviceName: `${ticket.device_type} ${ticket.device_model}`.trim(),
          ticketId: id,
        });

        if (smsMessage) {
          const smsResult = await sendSms(customerPhone, smsMessage);

          await supabase.from("sms_log").insert({
            ticket_id: id,
            customer_id: ticket.customer_id ?? null,
            phone: customerPhone,
            message: smsMessage,
            provider_message_id: smsResult.messageId,
            status: smsResult.success ? "sent" : "failed",
          });
        }
      } catch (smsErr) {
        console.error("SMS send error:", smsErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Status update error:", err);
    return NextResponse.json(
      { error: "Noget gik galt. Proev igen senere." },
      { status: 500 },
    );
  }
}
