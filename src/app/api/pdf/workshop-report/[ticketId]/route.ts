import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { WorkshopReportDocument } from "@/lib/pdf/workshop-report";

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
  const internalNotes = ((ticket.internal_notes ?? []) as { text: string }[])
    .map((n) => n.text)
    .join("\n");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(
    React.createElement(WorkshopReportDocument, {
      data: {
        ticketId: ticket.id,
        createdAt: ticket.created_at,
        customerName: customer?.name ?? ticket.customer_name,
        customerPhone: customer?.phone ?? ticket.customer_phone,
        deviceBrand: device?.brand ?? "",
        deviceModel: device?.model ?? ticket.device_model,
        serialNumber: device?.serial_number ?? undefined,
        deviceColor: device?.color ?? undefined,
        checklist: (ticket.intake_checklist ?? []) as { label: string; status: "ok" | "fejl" | "ikke_relevant"; note: string; photo_url: string | null }[],
        services,
        internalNotes,
      },
    }) as any,
  );

  return new Response(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="vaerkstedsrapport-${ticketId.slice(0, 8)}.pdf"`,
    },
  });
}
