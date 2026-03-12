// POST /api/platform/devices/import
// Accepts multipart form data with a CSV file
// Parses, validates, and bulk-inserts devices
// Returns { imported: number, errors: [...] }

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { parseDeviceCSV } from "@/lib/platform/csv-parser";
import { logActivity } from "@/lib/platform/activity-log";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const actorId = (formData.get("_actorId") as string) ?? "system";

  if (!file) {
    return NextResponse.json({ error: "No CSV file provided" }, { status: 400 });
  }

  const csvText = await file.text();
  const { valid, errors, totalRows } = parseDeviceCSV(csvText);

  if (valid.length === 0) {
    return NextResponse.json(
      { imported: 0, totalRows, errors, message: "No valid rows found" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  const devicesWithBarcodes = valid.map((row) => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return {
      ...row,
      barcode: `PS-${dateStr}-${rand}`,
      purchased_at: new Date().toISOString(),
    };
  });

  const { data: inserted, error } = await supabase
    .from("devices")
    .insert(devicesWithBarcodes)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message, validCount: valid.length }, { status: 500 });
  }

  await logActivity({
    supabase,
    actorId,
    action: "device_import",
    entityType: "device",
    entityId: "bulk",
    details: { imported: inserted.length, totalRows, errorCount: errors.length },
  });

  return NextResponse.json({
    imported: inserted.length,
    totalRows,
    errors,
  });
}
