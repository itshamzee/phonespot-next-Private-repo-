// GET /api/platform/valuation — inventory valuation per location
// Returns purchase price totals and device counts grouped by location

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET() {
  const supabase = createServerClient();

  const { data: devices, error: devError } = await supabase
    .from("devices")
    .select("location_id, purchase_price, selling_price, grade, status")
    .in("status", ["intake", "graded", "listed", "reserved"]);

  if (devError) {
    return NextResponse.json({ error: devError.message }, { status: 500 });
  }

  const { data: locations, error: locError } = await supabase
    .from("locations")
    .select("id, name, type");

  if (locError) {
    return NextResponse.json({ error: locError.message }, { status: 500 });
  }

  const valuation = locations!.map((loc) => {
    const locDevices = devices!.filter((d) => d.location_id === loc.id);
    const totalPurchaseValue = locDevices.reduce((sum, d) => sum + d.purchase_price, 0);
    const totalSellingValue = locDevices.reduce((sum, d) => sum + (d.selling_price ?? 0), 0);
    const deviceCount = locDevices.length;

    const byGrade = { A: 0, B: 0, C: 0 };
    locDevices.forEach((d) => {
      if (d.grade in byGrade) byGrade[d.grade as "A" | "B" | "C"]++;
    });

    return {
      location: loc,
      deviceCount,
      totalPurchaseValue,
      totalSellingValue,
      potentialMargin: totalSellingValue - totalPurchaseValue,
      byGrade,
    };
  });

  const totals = {
    deviceCount: valuation.reduce((s, v) => s + v.deviceCount, 0),
    totalPurchaseValue: valuation.reduce((s, v) => s + v.totalPurchaseValue, 0),
    totalSellingValue: valuation.reduce((s, v) => s + v.totalSellingValue, 0),
    potentialMargin: valuation.reduce((s, v) => s + v.potentialMargin, 0),
  };

  return NextResponse.json({ locations: valuation, totals });
}
