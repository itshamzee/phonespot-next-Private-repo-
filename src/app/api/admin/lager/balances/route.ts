import { NextResponse, type NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { getLagersystemClient } from "@/lib/lagersystem/client";
import { forbiddenLocation, lagersystemErrorResponse, NOT_ENABLED } from "@/lib/lagersystem/http";
import { canUseLocation, isPhoneSpotLocation } from "@/lib/lagersystem/locations";
import { buildStockView } from "@/lib/lagersystem/stock-view";

export const runtime = "nodejs";

/** GET ?location=&q= — saldi direkte fra lagersystemet (intet gemmes lokalt). */
export async function GET(req: NextRequest) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = getLagersystemClient();
  if (!client) return NextResponse.json(NOT_ENABLED, { status: 404 });
  const location = req.nextUrl.searchParams.get("location");
  if (!isPhoneSpotLocation(location)) return NextResponse.json({ error: "Ukendt lokation" }, { status: 400 });
  if (!canUseLocation(staff, location)) return forbiddenLocation();
  try {
    return NextResponse.json(await buildStockView(client, location, (req.nextUrl.searchParams.get("q") ?? "").slice(0, 100)));
  } catch (err) {
    return lagersystemErrorResponse(err);
  }
}
