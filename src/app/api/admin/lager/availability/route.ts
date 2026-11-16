import { NextResponse, type NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { getLagersystemClient } from "@/lib/lagersystem/client";
import { forbiddenLocation, lagersystemErrorResponse, NOT_ENABLED } from "@/lib/lagersystem/http";
import { hasLagerAccess } from "@/lib/lagersystem/locations";
import { availabilityElsewhere } from "@/lib/lagersystem/transfers";

export const runtime = "nodejs";

/** GET ?sku=&exclude= — hvor findes delen ellers (spec §4.4 "Findes andre steder"). */
export async function GET(req: NextRequest) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = getLagersystemClient();
  if (!client) return NextResponse.json(NOT_ENABLED, { status: 404 });
  if (!hasLagerAccess(staff)) return forbiddenLocation();
  const sku = req.nextUrl.searchParams.get("sku")?.trim();
  if (!sku || sku.length > 100) return NextResponse.json({ error: "sku mangler" }, { status: 400 });
  try {
    const availability = availabilityElsewhere(await client.getAvailability(sku), req.nextUrl.searchParams.get("exclude") ?? "");
    return NextResponse.json({ shared_sku: sku, availability });
  } catch (err) {
    return lagersystemErrorResponse(err);
  }
}
