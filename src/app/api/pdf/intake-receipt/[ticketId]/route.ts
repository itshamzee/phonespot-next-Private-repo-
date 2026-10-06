import { requireTicketAccess } from "@/lib/repairs/ticket-access";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { IntakeReceiptDocument } from "@/lib/pdf/intake-receipt";
import type { ChecklistItem } from "@/lib/supabase/types";
import type { IntakeReceiptDevice } from "@/lib/pdf/intake-receipt";
import type { SupabaseClient } from "@supabase/supabase-js";

type ChecklistRows = { label: string; status: "ok" | "fejl" | "ikke_relevant"; note: string; photo_url: string | null }[];

/** Alle sager fra samme indlevering (inkl. denne), som enheder på ét samlet bevis. */
async function loadGroupDevices(
  supabase: SupabaseClient,
  groupId: string,
): Promise<IntakeReceiptDevice[]> {
  const { data: rows } = await supabase
    .from("repair_tickets")
    .select("id, ticket_number, device_model, device_type, device_id, intake_checklist, services")
    .eq("intake_group_id", groupId)
    .order("ticket_number", { ascending: true });
  const tickets = (rows ?? []) as {
    id: string;
    ticket_number: string | null;
    device_model: string;
    device_type: string;
    device_id: string | null;
    intake_checklist: ChecklistRows | null;
    services: { name: string; price_dkk: number }[] | null;
  }[];
  const ids = tickets.map((t) => t.device_id).filter((v): v is string => Boolean(v));
  const { data: devs } = ids.length
    ? await supabase.from("customer_devices").select("id, brand, model, serial_number, color").in("id", ids)
    : { data: [] };
  const byId = new Map(((devs ?? []) as { id: string; brand: string; model: string; serial_number: string | null; color: string | null }[]).map((d) => [d.id, d]));
  return tickets.map((t) => {
    const d = t.device_id ? byId.get(t.device_id) : undefined;
    return {
      ticketId: t.id,
      ticketNumber: t.ticket_number ?? undefined,
      deviceBrand: d?.brand ?? "",
      deviceModel: d?.model ?? t.device_model,
      serialNumber: d?.serial_number ?? undefined,
      deviceColor: d?.color ?? undefined,
      checklist: (t.intake_checklist ?? []) as ChecklistItem[],
      services: t.services ?? [],
    };
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const { ticketId } = await params;
  const access = await requireTicketAccess(request, ticketId);
  if (!access.ok) return access.response;
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

  // ?group=1: ét samlet bevis for hele indleveringen (kun hvis sagen er del af en).
  const wantsGroup = new URL(request.url).searchParams.get("group") === "1";
  const groupDevices =
    wantsGroup && ticket.intake_group_id ? await loadGroupDevices(supabase, ticket.intake_group_id as string) : null;
  const devices = groupDevices && groupDevices.length > 1 ? groupDevices : undefined;

  const services = (ticket.services ?? []) as { name: string; price_dkk: number }[];
  const totalPrice = devices
    ? devices.reduce((sum, d) => sum + d.services.reduce((x, s) => x + s.price_dkk, 0), 0)
    :  services.reduce((sum: number, s: { price_dkk: number }) => sum + s.price_dkk, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(
    React.createElement(IntakeReceiptDocument, {
      data: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number ?? undefined,
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
        devices,
      },
    }) as any,
  );

  return new Response(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="indleveringsbevis-${ticketId.slice(0, 8)}.pdf"`,
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const { ticketId } = await params;

  let body: {
    ticketNumber?: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    companyName?: string;
    cvr?: string;
    deviceBrand: string;
    deviceModel: string;
    serialNumber?: string;
    deviceColor?: string;
    services: { name: string; price: number }[];
    internalNotes?: string;
    checklist?: { label: string; status: string }[];
    /** Indlevering med flere enheder: alle enheder (én sag hver). */
    devices?: {
      ticketId: string;
      ticketNumber?: string;
      deviceBrand: string;
      deviceModel: string;
      serialNumber?: string;
      deviceColor?: string;
      services: { name: string; price: number }[];
      checklist?: { label: string; status: string }[];
    }[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const services = (body.services ?? []).map((s) => ({
    name: s.name,
    price_dkk: s.price,
  }));
  const groupDevices: IntakeReceiptDevice[] | undefined =
    Array.isArray(body.devices) && body.devices.length > 1
      ? body.devices.slice(0, 10).map((d) => ({
          ticketId: d.ticketId,
          ticketNumber: d.ticketNumber || undefined,
          deviceBrand: d.deviceBrand,
          deviceModel: d.deviceModel,
          serialNumber: d.serialNumber || undefined,
          deviceColor: d.deviceColor || undefined,
          checklist: (d.checklist ?? []) as ChecklistItem[],
          services: (d.services ?? []).map((s) => ({ name: s.name, price_dkk: s.price })),
        }))
      : undefined;
  const totalPrice = groupDevices
    ? groupDevices.reduce((sum, d) => sum + d.services.reduce((x, s) => x + s.price_dkk, 0), 0)
    : services.reduce((sum, s) => sum + s.price_dkk, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(
    React.createElement(IntakeReceiptDocument, {
      data: {
        ticketId,
        ticketNumber: body.ticketNumber || undefined,
        createdAt: new Date().toISOString(),
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail,
        customerType: body.companyName ? "erhverv" : "privat",
        companyName: body.companyName,
        cvr: body.cvr,
        deviceBrand: body.deviceBrand,
        deviceModel: body.deviceModel,
        serialNumber: body.serialNumber,
        deviceColor: body.deviceColor,
        checklist: (body.checklist ?? []) as ChecklistItem[],
        services,
        totalPrice,
        devices: groupDevices,
      },
    }) as any,
  );

  return new Response(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="indleveringsbevis-${ticketId.slice(0, 8)}.pdf"`,
    },
  });
}
