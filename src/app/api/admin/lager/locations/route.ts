import { NextResponse, type NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { getLagersystemClient } from "@/lib/lagersystem/client";
import { lagersystemErrorResponse, NOT_ENABLED } from "@/lib/lagersystem/http";
import { canUseLocation, isPhoneSpotLocation, LOCATION_LABELS, PHONESPOT_LOCATION_CODES } from "@/lib/lagersystem/locations";

export const runtime = "nodejs";

/** GET — hovedlageret + PhoneSpot-butikkerne, kun aktive (Esbjerg fra nov 2026), afgrænset til medarbejderens butik. */
export async function GET(req: NextRequest) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = getLagersystemClient();
  if (!client) return NextResponse.json(NOT_ENABLED, { status: 404 });
  try {
    const all = await client.listLocations();
    const locations = all
      .map((l) => l.code)
      .filter(isPhoneSpotLocation)
      .filter((code) => canUseLocation(staff, code))
      .sort((a, b) => PHONESPOT_LOCATION_CODES.indexOf(a) - PHONESPOT_LOCATION_CODES.indexOf(b))
      // Navngivningsreglen (spec 2): vejle-hub vises altid som "Hovedlager Vejle".
      .map((code) => ({ code, name: LOCATION_LABELS[code] }));
    return NextResponse.json({ locations });
  } catch (err) {
    return lagersystemErrorResponse(err);
  }
}
