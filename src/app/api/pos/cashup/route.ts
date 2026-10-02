import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { loadDailySummary } from "@/lib/pos/daily-summary-data";
import { copenhagenDateString, isValidDateString } from "@/lib/pos/copenhagen";
import { UNAUTHORIZED, posErrorResponse } from "@/lib/pos/route-helpers";
import { uuidSchema } from "@/lib/pos/schemas";

/**
 * GET /api/pos/cashup?location_id=<id>&date=<YYYY-MM-DD>[&register_id=<id>]
 * Daily summary for a location (all its registers) or one register.
 * "Day" is the Europe/Copenhagen calendar day, not the UTC day.
 * Staff only.
 */
export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaff(request);
    if (!staff) return UNAUTHORIZED();

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("location_id");
    const registerId = searchParams.get("register_id");
    const date = searchParams.get("date") ?? copenhagenDateString();

    if (!locationId && !registerId) {
      return NextResponse.json({ error: "location_id påkrævet" }, { status: 400 });
    }
    if (locationId && !uuidSchema.safeParse(locationId).success) {
      return NextResponse.json({ error: "Ugyldigt location_id" }, { status: 400 });
    }
    if (registerId && !uuidSchema.safeParse(registerId).success) {
      return NextResponse.json({ error: "Ugyldigt register_id" }, { status: 400 });
    }
    if (!isValidDateString(date)) {
      return NextResponse.json({ error: "Ugyldig dato" }, { status: 400 });
    }

    const summary = await loadDailySummary({ date, locationId, registerId });
    return NextResponse.json({ date, locationId, registerId, summary });
  } catch (err) {
    return posErrorResponse(err, "Fejl ved hentning af dagsoversigt");
  }
}
