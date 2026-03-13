import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createServerClient } from "@/lib/supabase/client";
import { generateWarrantyQR } from "./qr";
import { WarrantyPDF } from "./pdf";

type GenerateWarrantyInput = {
  orderId: string;
  deviceId: string;
  customerId: string | null;
  customerName: string;
  deviceModel: string;
  serialNumber: string | null;
  imei: string | null;
  grade: string;
  storage: string | null;
  color: string | null;
  purchaseDate: string;
};

type GenerateWarrantyResult = {
  guaranteeNumber: string;
  pdfUrl: string;
  verificationCode: string;
};

async function generateGuaranteeNumber(): Promise<string> {
  const supabase = createServerClient();
  const year = new Date().getFullYear();
  const prefix = `PSP-GAR-${year}-`;

  const { data } = await supabase
    .from("warranties")
    .select("guarantee_number")
    .like("guarantee_number", `${prefix}%`)
    .order("guarantee_number", { ascending: false })
    .limit(1);

  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastNumber = parseInt(data[0].guarantee_number.split("-").pop() || "0", 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(5, "0")}`;
}

function generateVerificationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 12; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function generateWarranty(
  input: GenerateWarrantyInput
): Promise<GenerateWarrantyResult> {
  const supabase = createServerClient();

  const guaranteeNumber = await generateGuaranteeNumber();
  const verificationCode = generateVerificationCode();

  const expiryDate = new Date(input.purchaseDate);
  expiryDate.setMonth(expiryDate.getMonth() + 36);

  const qrBuffer = await generateWarrantyQR(verificationCode);
  const qrDataUrl = `data:image/png;base64,${qrBuffer.toString("base64")}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(
    createElement(WarrantyPDF, {
      guaranteeNumber,
      deviceModel: input.deviceModel,
      serialNumber: input.serialNumber,
      imei: input.imei,
      grade: input.grade,
      storage: input.storage,
      color: input.color,
      customerName: input.customerName,
      purchaseDate: input.purchaseDate,
      expiryDate: expiryDate.toISOString(),
      qrCodeDataUrl: qrDataUrl,
    }) as any
  );

  const storagePath = `warranties/${guaranteeNumber}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload warranty PDF: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("documents")
    .getPublicUrl(storagePath);

  const pdfUrl = urlData.publicUrl;

  const { error: insertError } = await supabase.from("warranties").insert({
    order_id: input.orderId,
    device_id: input.deviceId,
    customer_id: input.customerId,
    guarantee_number: guaranteeNumber,
    issued_at: new Date().toISOString(),
    expires_at: expiryDate.toISOString(),
    pdf_url: pdfUrl,
    qr_verification_code: verificationCode,
    status: "active",
  });

  if (insertError) {
    throw new Error(`Failed to create warranty record: ${insertError.message}`);
  }

  return { guaranteeNumber, pdfUrl, verificationCode };
}

export async function generateWarrantiesForOrder(orderId: string): Promise<GenerateWarrantyResult[]> {
  const supabase = createServerClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(`
      id,
      customer_id,
      created_at,
      customers ( name ),
      order_items (
        item_type,
        device_id,
        devices (
          id,
          serial_number,
          imei,
          grade,
          storage,
          color,
          product_templates ( display_name )
        )
      )
    `)
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const customerName = (order.customers as unknown as { name: string } | null)?.name || "Kunde";
  const results: GenerateWarrantyResult[] = [];

  for (const item of order.order_items as unknown as Array<{
    item_type: string;
    device_id: string | null;
    devices: {
      id: string;
      serial_number: string | null;
      imei: string | null;
      grade: string;
      storage: string | null;
      color: string | null;
      product_templates: { display_name: string } | null;
    } | null;
  }>) {
    if (item.item_type !== "device" || !item.device_id || !item.devices) continue;

    const { data: existing } = await supabase
      .from("warranties")
      .select("id")
      .eq("order_id", orderId)
      .eq("device_id", item.device_id)
      .limit(1);

    if (existing && existing.length > 0) continue;

    const result = await generateWarranty({
      orderId,
      deviceId: item.device_id,
      customerId: order.customer_id,
      customerName,
      deviceModel: item.devices.product_templates?.display_name || "Ukendt enhed",
      serialNumber: item.devices.serial_number,
      imei: item.devices.imei,
      grade: item.devices.grade,
      storage: item.devices.storage,
      color: item.devices.color,
      purchaseDate: order.created_at,
    });

    results.push(result);
  }

  return results;
}
