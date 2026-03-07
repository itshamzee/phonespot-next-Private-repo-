import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { sendSms } from "@/lib/gateway-api/client";
import { getSmsTemplate } from "@/lib/gateway-api/templates";
import { createDraftOrder } from "@/lib/shopify/admin-client";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const body = await request.json();
  const {
    customer,
    device,
    isNewDevice,
    newDevice,
    checklist,
    intakePhotos,
    selectedServices,
    customServices,
    internalNotes,
    createShopifyPayment,
    sendSms: shouldSendSms,
    sendEmail,
  } = body;

  if (!customer?.id) {
    return NextResponse.json({ error: "Kunde mangler" }, { status: 400 });
  }

  const supabase = createServerClient();

  try {
    // 1. Create device if new
    let deviceId = device?.id ?? null;
    if (isNewDevice && newDevice?.brand && newDevice?.model) {
      const { data: newDev, error: devErr } = await supabase
        .from("customer_devices")
        .insert({
          customer_id: customer.id,
          brand: newDevice.brand.trim(),
          model: newDevice.model.trim(),
          serial_number: newDevice.serial_number?.trim() || null,
          color: newDevice.color?.trim() || null,
          photos: intakePhotos ?? [],
        })
        .select()
        .single();

      if (devErr) {
        return NextResponse.json({ error: devErr.message }, { status: 500 });
      }
      deviceId = newDev.id;
    }

    // 2. Build services array
    const allServices = [
      ...selectedServices.map((s: { id: string; name: string; price_dkk: number }) => ({
        id: s.id,
        name: s.name,
        price_dkk: s.price_dkk,
      })),
      ...customServices.map((s: { name: string; price_dkk: number }) => ({
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: s.name,
        price_dkk: s.price_dkk,
      })),
    ];

    const totalPrice = allServices.reduce(
      (sum: number, s: { price_dkk: number }) => sum + s.price_dkk,
      0,
    );

    // 3. Build internal notes
    const notes = internalNotes
      ? [
          {
            text: internalNotes,
            author: "Indlevering",
            timestamp: new Date().toISOString(),
          },
        ]
      : [];

    const deviceBrand = device?.brand || newDevice?.brand || "";
    const deviceModel = device?.model || newDevice?.model || "";
    const deviceName = `${deviceBrand} ${deviceModel}`.trim();

    // 4. Create repair ticket
    const { data: ticket, error: ticketErr } = await supabase
      .from("repair_tickets")
      .insert({
        customer_name: customer.name,
        customer_email: customer.email || "",
        customer_phone: customer.phone,
        device_type: deviceBrand.toLowerCase().includes("apple") ? "smartphone" : "smartphone",
        device_model: deviceName,
        issue_description: allServices.map((s: { name: string }) => s.name).join(", "),
        service_type: "repair",
        status: "modtaget",
        customer_id: customer.id,
        device_id: deviceId,
        services: allServices,
        internal_notes: notes,
        intake_checklist: checklist,
        intake_photos: intakePhotos ?? [],
        checkout_photos: [],
        paid: false,
      })
      .select()
      .single();

    if (ticketErr) {
      return NextResponse.json({ error: ticketErr.message }, { status: 500 });
    }

    // 5. Log initial status
    await supabase.from("repair_status_log").insert({
      ticket_id: ticket.id,
      old_status: null,
      new_status: "modtaget",
      note: "Sag oprettet via indlevering",
    });

    // 6. Create Shopify Draft Order (if enabled)
    if (createShopifyPayment && allServices.length > 0) {
      try {
        const draftOrder = await createDraftOrder({
          customerEmail: customer.email || undefined,
          customerPhone: customer.phone,
          lineItems: allServices.map((s: { name: string; price_dkk: number }) => ({
            title: s.name,
            quantity: 1,
            originalUnitPrice: String(s.price_dkk.toFixed(2)),
          })),
          note: `PhoneSpot reparation - ${deviceName} - Sag: ${ticket.id.slice(0, 8)}`,
          tags: ["reparation", `sag-${ticket.id.slice(0, 8)}`],
        });

        await supabase
          .from("repair_tickets")
          .update({
            shopify_draft_order_id: draftOrder.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ticket.id);
      } catch (err) {
        console.error("Shopify Draft Order error:", err);
        // Don't fail the whole intake for this
      }
    }

    // 7. Send SMS (if enabled)
    if (shouldSendSms && customer.phone) {
      try {
        const smsMessage = getSmsTemplate("modtaget", {
          customerName: customer.name,
          deviceName,
          ticketId: ticket.id,
        });

        if (smsMessage) {
          const smsResult = await sendSms(customer.phone, smsMessage);

          await supabase.from("sms_log").insert({
            ticket_id: ticket.id,
            customer_id: customer.id,
            phone: customer.phone,
            message: smsMessage,
            provider_message_id: smsResult.messageId,
            status: smsResult.success ? "sent" : "failed",
          });
        }
      } catch (err) {
        console.error("SMS error:", err);
      }
    }

    // 8. Send email (if enabled)
    if (sendEmail && customer.email) {
      try {
        await resend.emails.send({
          from: "PhoneSpot <noreply@phonespot.dk>",
          to: customer.email,
          subject: `Reparation modtaget - ${deviceName}`,
          text: [
            `Hej ${customer.name},`,
            "",
            `Vi har modtaget din ${deviceName} til reparation.`,
            `Sags-ID: ${ticket.id.slice(0, 8)}`,
            "",
            "Reparationer:",
            ...allServices.map((s: { name: string; price_dkk: number }) => `- ${s.name}: ${s.price_dkk} DKK`),
            "",
            `Estimeret total: ${totalPrice} DKK`,
            "",
            "Vi kontakter dig, naar din enhed er klar til afhentning.",
            "",
            "Med venlig hilsen,",
            "PhoneSpot",
          ].join("\n"),
        });
      } catch (err) {
        console.error("Email error:", err);
      }
    }

    return NextResponse.json({ ticketId: ticket.id }, { status: 201 });
  } catch (err) {
    console.error("Intake error:", err);
    return NextResponse.json(
      { error: "Der opstod en fejl ved oprettelse af sagen" },
      { status: 500 },
    );
  }
}
