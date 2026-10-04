import { requireTicketAccess } from "@/lib/repairs/ticket-access";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/client";
import { storeForId, type StoreLocationConfig } from "@/lib/store-config";
import { sendSms } from "@/lib/gateway-api/client";
import { getSmsTemplate } from "@/lib/gateway-api/templates";
import { ticketLabel } from "@/lib/repairs/ticket-label";
import type { RepairStatus } from "@/lib/supabase/types";
import { consumeRepairParts } from "@/lib/repairs/case-create";

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
  faerdig: "Din reparation er færdig",
};

function getStatusEmailBody(
  status: RepairStatus,
  customerName: string,
  deviceType: string,
  deviceModel: string,
  store: StoreLocationConfig,
  caseNumber: string,
): string | null {
  switch (status) {
    case "godkendt":
      return [
        `Hej ${customerName},`,
        "",
        `Tak! Dit tilbud på reparation af din ${deviceType} ${deviceModel} er blevet godkendt.`,
        "",
        "Vi går i gang med reparationen hurtigst muligt og holder dig opdateret.",
        "",
        `Sagsnummer: ${caseNumber}`,
        "",
        "Med venlig hilsen,",
        store.name,
        store.email,
      ].join("\n");
    case "i_gang":
      return [
        `Hej ${customerName},`,
        "",
        `Vi er nu i gang med at reparere din ${deviceType} ${deviceModel}.`,
        "",
        "Vi giver dig besked, så snart reparationen er færdig.",
        "",
        `Sagsnummer: ${caseNumber}`,
        "",
        "Med venlig hilsen,",
        store.name,
        store.email,
      ].join("\n");
    case "faerdig":
      return [
        `Hej ${customerName},`,
        "",
        `Din ${deviceType} ${deviceModel} er nu færdigrepareret og klar til afhentning/forsendelse.`,
        "",
        "Kontakt os for at aftale afhentning eller returnering.",
        "",
        `Sagsnummer: ${caseNumber}`,
        "",
        "Med venlig hilsen,",
        store.name,
        `${store.street}, ${store.zip} ${store.city}`,
        store.email,
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
  const access = await requireTicketAccess(request, id);
  if (!access.ok) return access.response;
  const body = await request.json();
  const { status, note } = body;
  // "Meld klar" kan vælge ikke at sende SMS (kunden er fx ved skranken).
  const skipSms = body.skip_sms === true;

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
    // En annulleret sag er lukket: delene er frigivet og kan ikke genoptages her.
    if (oldStatus === "annulleret") {
      return NextResponse.json({ error: "Sagen er annulleret og kan ikke ændres" }, { status: 409 });
    }

    // Update ticket status
    const { error: updateError } = await supabase
      .from("repair_tickets")
      // Enhedens adgangskode ryddes når enheden er afhentet.
      .update({ status, updated_at: new Date().toISOString(), ...(status === "afhentet" ? { device_passcode: null } : {}) })
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
      note: note ?? (skipSms && status === "faerdig" ? "Uden SMS til kunden" : null),
    });

    // Statusændringen er gemt. Beskeder til kunden er en bivirkning: fejler de,
    // skal personalet have besked, men ændringen står ved magt.
    const warnings: string[] = [];

    // Færdig: træk reservede dele fra lager (idempotent). En fejl her ændrer ikke statussen.
    let partsConsumed: number | undefined;
    if (status === "faerdig") {
      try {
        const r = await consumeRepairParts(id, access.staff.id);
        if (r.consumed > 0) partsConsumed = r.consumed;
        if (r.shortfall > 0) {
          warnings.push("En del var ikke på lager, så lageret er ikke trukket for den. Tjek lagertallet.");
        }
      } catch (consumeErr) {
        console.error("Consume parts error:", id, consumeErr);
        warnings.push("Statussen er ændret, men delene kunne ikke trækkes fra lager.");
      }
    }
    const store = storeForId(ticket.store_id);
    const caseNumber = ticketLabel(ticket);

    const emailSubject = STATUS_EMAIL_SUBJECTS[status as RepairStatus];
    const emailBody = getStatusEmailBody(
      status as RepairStatus,
      ticket.customer_name,
      ticket.device_type,
      ticket.device_model,
      // The ticket's own store, so a Vejle customer is not told to come to Slagelse.
      store,
      caseNumber,
    );

    // Walk-ins har ofte ingen e-mail (indlevering gemmer tom streng).
    if (emailSubject && emailBody && ticket.customer_email?.trim()) {
      try {
        const { error: emailError } = await resend.emails.send({
          from: "PhoneSpot Reparation <noreply@phonespot.dk>",
          to: ticket.customer_email,
          subject: `${emailSubject}: ${ticket.device_type} ${ticket.device_model}`,
          text: emailBody,
        });
        if (emailError) throw new Error(emailError.message);
      } catch (emailErr) {
        console.error("Status email error:", id, emailErr);
        warnings.push("Statussen er ændret, men e-mailen til kunden kunne ikke sendes.");
      }
    }

    // Send SMS notification
    const customerPhone = ticket.customer_phone;
    if (customerPhone && !skipSms) {
      try {
        const smsMessage = getSmsTemplate(status, {
          customerName: ticket.customer_name,
          deviceName: `${ticket.device_type} ${ticket.device_model}`.trim(),
          ticketId: id,
          ticketNumber: ticket.ticket_number,
          storeId: ticket.store_id,
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
          if (!smsResult.success) {
            warnings.push("Statussen er ændret, men SMS'en til kunden kunne ikke sendes.");
          }
        }
      } catch (smsErr) {
        console.error("SMS send error:", smsErr);
        warnings.push("Statussen er ændret, men SMS'en til kunden kunne ikke sendes.");
      }
    }

    const extras = partsConsumed ? { parts_consumed: partsConsumed } : {};
    if (warnings.length > 0) {
      return NextResponse.json({ success: true, warning: warnings.join(" "), ...extras });
    }
    return NextResponse.json({ success: true, ...extras });
  } catch (err) {
    console.error("Status update error:", err);
    return NextResponse.json(
      { error: "Noget gik galt. Prøv igen senere." },
      { status: 500 },
    );
  }
}
