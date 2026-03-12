// src/app/api/platform/afregningsbilag/route.ts
// POST /api/platform/afregningsbilag
// Generates an afregningsbilag PDF for a device purchase, uploads it to
// Supabase Storage, and creates a purchase_documents record.
// Body: { device_id, seller_name, seller_address, _actorId? }

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { AfregningsbilagDocument } from "@/lib/platform/afregningsbilag-pdf";
import { logActivity } from "@/lib/platform/activity-log";
import { formatDocumentDate } from "@/lib/platform/format";

export async function POST(request: Request) {
  const body = await request.json();
  const { device_id, seller_name, seller_address, _actorId } = body as {
    device_id?: string;
    seller_name?: string;
    seller_address?: string;
    _actorId?: string;
  };

  if (!device_id || !seller_name || !seller_address) {
    return NextResponse.json(
      { error: "device_id, seller_name, and seller_address are required" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // ── Fetch device with its product template ──────────────────────────────────
  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select(
      `
      id, serial_number, imei, purchase_price,
      template:product_templates(brand, model, display_name)
    `,
    )
    .eq("id", device_id)
    .single();

  if (deviceError || !device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  const template = device.template as {
    brand: string;
    model: string;
    display_name: string;
  };

  const identifiers = [device.serial_number, device.imei]
    .filter(Boolean)
    .join(" / ");
  const itemDescription = `${template.brand} ${template.model}${identifiers ? ` (${identifiers})` : ""}`;

  const documentDate = new Date();
  const docNumber = `PSP-AB-${documentDate.getFullYear()}-${Date.now().toString().slice(-6)}`;

  // ── Generate PDF buffer ─────────────────────────────────────────────────────
  const pdfBuffer = await renderToBuffer(
    AfregningsbilagDocument({
      sellerName: seller_name,
      sellerAddress: seller_address,
      documentDate: formatDocumentDate(documentDate),
      itemDescription,
      purchasePrice: device.purchase_price,
      documentNumber: docNumber,
    }),
  );

  // ── Upload to Supabase Storage ──────────────────────────────────────────────
  const fileName = `${docNumber}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("purchase-documents")
    .upload(fileName, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "PDF upload failed: " + uploadError.message },
      { status: 500 },
    );
  }

  const { data: urlData } = supabase.storage
    .from("purchase-documents")
    .getPublicUrl(fileName);

  // ── Create purchase_documents record ────────────────────────────────────────
  const { data: doc, error: docError } = await supabase
    .from("purchase_documents")
    .insert({
      device_id,
      seller_name,
      seller_address,
      document_date: documentDate.toISOString().slice(0, 10),
      item_description: itemDescription,
      purchase_price: device.purchase_price,
      pdf_url: urlData.publicUrl,
    })
    .select()
    .single();

  if (docError) {
    return NextResponse.json({ error: docError.message }, { status: 500 });
  }

  // ── Activity log ────────────────────────────────────────────────────────────
  await logActivity({
    supabase,
    actorId: _actorId ?? "system",
    action: "afregningsbilag_generated",
    entityType: "purchase_document",
    entityId: doc.id,
    details: { device_id, seller_name, document_number: docNumber },
  });

  return NextResponse.json(doc, { status: 201 });
}
