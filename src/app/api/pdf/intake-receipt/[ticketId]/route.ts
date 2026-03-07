import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { IntakeReceiptDocument } from "@/lib/pdf/intake-receipt";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const { ticketId } = await params;
  const supabase = createServerClient();

  // Fetch ticket
  const { data: ticket, error } = await supabase
    .from("repair_tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (error || !ticket) {
    return NextResponse.json({ error: "Sag ikke fundet" }, { status: 404 });
  }

  // Fetch customer if linked
  let customer = null;
  if (ticket.customer_id) {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("id", ticket.customer_id)
      .single();
    customer = data;
  }

  // Fetch device if linked
  let device = null;
  if (ticket.device_id) {
    const { data } = await supabase
      .from("customer_devices")
      .select("*")
      .eq("id", ticket.device_id)
      .single();
    device = data;
  }

  const services = (ticket.services ?? []) as { name: string; price_dkk: number }[];
  const totalPrice = services.reduce((sum: number, s: { price_dkk: number }) => sum + s.price_dkk, 0);

  const pdfBuffer = await renderToBuffer(
    React.createElement(IntakeReceiptDocument, {
      data: {
        ticketId: ticket.id,
        createdAt: ticket.created_at,
        customerName: customer?.name ?? ticket.customer_name,
        customerPhone: customer?.phone ?? ticket.customer_phone,
        customerEmail: customer?.email ?? ticket.customer_email,
        customerType: customer?.type ?? "privat",
        companyName: customer?.company_name ?? undefined,
        cvr: customer?.cvr ?? undefined,
        deviceBrand: device?.brand ?? "",
        deviceModel: device?.model ?? ticket.device_model,
        serialNumber: device?.serial_number ?? undefined,
        deviceColor: device?.color ?? undefined,
        checklist: (ticket.intake_checklist ?? []) as { label: string; status: "ok" | "fejl" | "ikke_relevant"; note: string; photo_url: string | null }[],
        services,
        totalPrice,
      },
    }),
  );

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="indleveringsbevis-${ticketId.slice(0, 8)}.pdf"`,
    },
  });
}
