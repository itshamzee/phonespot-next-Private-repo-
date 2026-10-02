import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { adjustStock } from "@/lib/pos/sessions";
import { stockAdjustSchema } from "@/lib/pos/schemas";
import { FORBIDDEN, UNAUTHORIZED, parseBody, posErrorResponse } from "@/lib/pos/route-helpers";

/**
 * POST /api/pos/stock-adjust
 * Manual stock correction ("adjust", note required) or goods receipt ("receive")
 * for an accessory at a location. Writes the append-only stock_movements ledger.
 * Manager/owner only.
 *
 * Body: { productId, locationId, delta (non-zero integer), reason: "adjust"|"receive", note? }
 */
export async function POST(request: NextRequest) {
  try {
    const staff = await requireStaff(request);
    if (!staff) return UNAUTHORIZED();
    if (!["manager", "owner"].includes(staff.role)) {
      return FORBIDDEN("Kun managere og ejere kan regulere lager");
    }

    const parsed = await parseBody(request, stockAdjustSchema);
    if (!parsed.ok) return parsed.response;
    const b = parsed.data;

    const res = await adjustStock({
      productId: b.productId,
      locationId: b.locationId,
      delta: b.delta,
      reason: b.reason,
      note: b.note ?? null,
      staffId: staff.id,
    });
    return NextResponse.json({ quantity: res.quantity });
  } catch (err) {
    return posErrorResponse(err, "Fejl ved lagerregulering");
  }
}
