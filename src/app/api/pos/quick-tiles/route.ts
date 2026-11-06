import { NextRequest, NextResponse } from "next/server";
import { categoryTiles, listedDeviceTiles, stockedCategories, topSellingTiles } from "@/lib/pos/quick-tiles";
import { UNAUTHORIZED, posErrorResponse, requirePosStaff } from "@/lib/pos/route-helpers";
import { uuidSchema } from "@/lib/pos/schemas";

/**
 * GET /api/pos/quick-tiles?location_id=<id>[&category=<name> | &kind=devices]
 * Without category: best-selling accessories of the last 30 days at the location
 * plus the category chips. With category: the stocked products of that category.
 * With kind=devices: the devices for sale at the location.
 */
export async function GET(request: NextRequest) {
  try {
    const pos = await requirePosStaff(request);
    if (!pos) return UNAUTHORIZED();

    const sp = new URL(request.url).searchParams;
    const locationId = sp.get("location_id");
    if (!locationId || !uuidSchema.safeParse(locationId).success) {
      return NextResponse.json({ error: "location_id påkrævet" }, { status: 400 });
    }
    if (sp.get("kind") === "devices") {
      return NextResponse.json({ devices: await listedDeviceTiles(locationId) });
    }
    const category = sp.get("category")?.trim();
    if (category) {
      return NextResponse.json({ tiles: await categoryTiles(locationId, category) });
    }
    const [tiles, categories] = await Promise.all([topSellingTiles(locationId), stockedCategories(locationId)]);
    return NextResponse.json({ tiles, categories }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return posErrorResponse(err, "Fejl ved hentning af hurtigvalg");
  }
}
