import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { terminalCancelSchema } from "@/lib/pos/schemas";
import { UNAUTHORIZED, parseBody, posErrorResponse } from "@/lib/pos/route-helpers";
import { terminalForLocation } from "@/lib/pos/terminal-flow";

export const dynamic = "force-dynamic";

/**
 * POST /api/pos/terminal/cancel
 * Body: { reference, locationId }  (reference = the terminalReference sent with /api/pos/sale)
 *
 * Asks the store's integrated card terminal to abort a payment that is still
 * waiting for the customer. The pending /api/pos/sale request then answers
 * "annulleret" and no sale is created (or, if the card was approved first, the
 * sale completes normally). With the manual terminal there is nothing to cancel.
 */
export async function POST(request: NextRequest) {
  try {
    const staff = await requireStaff(request);
    if (!staff) return UNAUTHORIZED();

    const parsed = await parseBody(request, terminalCancelSchema);
    if (!parsed.ok) return parsed.response;

    const { terminal, locationSlug } = await terminalForLocation(parsed.data.locationId);
    if (terminal.kind === "manual" || !terminal.cancel) {
      return NextResponse.json({ status: "cancelled" });
    }
    const result = await terminal.cancel({ reference: parsed.data.reference, locationSlug });
    return NextResponse.json({ status: result.status, message: result.message ?? null });
  } catch (err) {
    return posErrorResponse(err, "Betalingen kunne ikke annulleres");
  }
}
