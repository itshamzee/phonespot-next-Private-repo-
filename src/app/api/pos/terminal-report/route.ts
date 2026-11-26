import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertLocationAccess } from "@/lib/pos/pos-context";
import { UNAUTHORIZED, parseBody, posErrorResponse, requirePosStaff } from "@/lib/pos/route-helpers";
import { uuidSchema } from "@/lib/pos/schemas";
import { fetchTerminalReport, locationSlugFor } from "@/lib/pos/terminal-report";

export const maxDuration = 60;

const bodySchema = z.object({ locationId: uuidSchema });

/**
 * POST /api/pos/terminal-report  { locationId }
 * X-rapport fra butikkens terminal: kortsalg siden sidste dagsafslutning.
 * Aflæser kun; terminalen nulstilles først, når kassen lukkes.
 */
export async function POST(request: NextRequest) {
  try {
    const pos = await requirePosStaff(request);
    if (!pos) return UNAUTHORIZED();

    const parsed = await parseBody(request, bodySchema);
    if (!parsed.ok) return parsed.response;
    await assertLocationAccess(pos.actor, parsed.data.locationId);

    const report = await fetchTerminalReport(await locationSlugFor(parsed.data.locationId), "x");
    return NextResponse.json({
      netAmount: report.netAmount,
      saleCount: report.saleCount,
      saleAmount: report.saleAmount,
      refundCount: report.refundCount,
      refundAmount: report.refundAmount,
    });
  } catch (err) {
    return posErrorResponse(err, "Fejl ved hentning af terminalens total");
  }
}
