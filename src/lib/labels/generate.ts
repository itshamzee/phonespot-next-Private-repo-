import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createServerClient } from "@/lib/supabase/client";
import { DeviceLabelPDF } from "./device-label";
import { SkuLabelPDF } from "./sku-label";

/**
 * Generate a PDF with price labels for the given device IDs.
 */
export async function generateDeviceLabels(deviceIds: string[]): Promise<Buffer> {
  const supabase = createServerClient();

  const { data: devices, error } = await supabase
    .from("devices")
    .select(`
      id, barcode, grade, storage, color, selling_price,
      product_templates ( display_name )
    `)
    .in("id", deviceIds);

  if (error || !devices || devices.length === 0) {
    throw new Error("No devices found for the given IDs");
  }

  const labels = devices.map((d) => ({
    model: (d.product_templates as { display_name: string } | null)?.display_name || "Enhed",
    grade: d.grade,
    storage: d.storage,
    color: d.color,
    price: d.selling_price || 0,
    barcode: d.barcode,
  }));

  return renderToBuffer(createElement(DeviceLabelPDF, { labels }));
}

/**
 * Generate a PDF with price labels for the given SKU product IDs.
 */
export async function generateSkuLabels(productIds: string[]): Promise<Buffer> {
  const supabase = createServerClient();

  const { data: products, error } = await supabase
    .from("sku_products")
    .select("id, title, category, selling_price, sale_price, ean")
    .in("id", productIds);

  if (error || !products || products.length === 0) {
    throw new Error("No SKU products found for the given IDs");
  }

  const labels = products.map((p) => ({
    title: p.title,
    category: p.category,
    price: p.selling_price,
    salePrice: p.sale_price,
    ean: p.ean,
  }));

  return renderToBuffer(createElement(SkuLabelPDF, { labels }));
}
