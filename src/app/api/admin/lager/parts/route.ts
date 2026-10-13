import { NextResponse, type NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { getLagersystemClient } from "@/lib/lagersystem/client";
import { isOwner } from "@/lib/auth/store-scope";
import { lagersystemErrorResponse, NOT_ENABLED } from "@/lib/lagersystem/http";

export const runtime = "nodejs";

/** GET ?q= — søg i lagersystemets katalog (kun aktive dele). */
export async function GET(req: NextRequest) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = getLagersystemClient();
  if (!client) return NextResponse.json(NOT_ENABLED, { status: 404 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ parts: [] });
  try {
    const parts = await client.searchParts(q, 20);
    // Kostpris er kun for ejeren.
    if (isOwner(staff)) return NextResponse.json({ parts });
    return NextResponse.json({ parts: parts.map(({ cost_price_ore: _cost, ...rest }) => rest) });
  } catch (err) {
    return lagersystemErrorResponse(err);
  }
}
