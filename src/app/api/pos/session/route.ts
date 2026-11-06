import { NextRequest, NextResponse } from "next/server";
import {
  addSessionAdjustment,
  closeCashSession,
  listRegisters,
  openCashSession,
  recentSessions,
} from "@/lib/pos/sessions";
import { hasPermission } from "@/lib/auth/permissions";
import { sessionActionSchema, uuidSchema } from "@/lib/pos/schemas";
import { validateCashClose } from "@/lib/pos/cash-session";
import { FORBIDDEN, UNAUTHORIZED, parseBody, posErrorResponse, requirePosStaff } from "@/lib/pos/route-helpers";

/**
 * GET /api/pos/session?location_id=<id>[&register_id=<id>]
 * Registers of the location with their open cash session (and live expected
 * cash). With register_id also the recent session history incl. adjustments.
 */
export async function GET(request: NextRequest) {
  try {
    const pos = await requirePosStaff(request);
    if (!pos) return UNAUTHORIZED();

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("location_id");
    const registerId = searchParams.get("register_id");
    if (!locationId || !uuidSchema.safeParse(locationId).success) {
      return NextResponse.json({ error: "location_id påkrævet" }, { status: 400 });
    }
    if (registerId && !uuidSchema.safeParse(registerId).success) {
      return NextResponse.json({ error: "Ugyldigt register_id" }, { status: 400 });
    }

    const registers = await listRegisters(locationId);
    const history = registerId ? await recentSessions(registerId) : [];
    return NextResponse.json({ registers, history });
  } catch (err) {
    return posErrorResponse(err, "Fejl ved hentning af kassestatus");
  }
}

/**
 * POST /api/pos/session
 *   { action: "open",   registerId, openingFloat }
 *   { action: "close",  sessionId, countedCash, cashToBank, expenses[], notes?, countedCard, cardNote? }  -> locks the session
 *   { action: "adjust", sessionId, amountOere, reason }   (locked sessions only; manager/owner)
 */
export async function POST(request: NextRequest) {
  try {
    const pos = await requirePosStaff(request);
    if (!pos) return UNAUTHORIZED();
    const { actor } = pos;

    const parsed = await parseBody(request, sessionActionSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    if (body.action === "open") {
      const res = await openCashSession({
        registerId: body.registerId,
        staffId: actor.id,
        openingFloat: body.openingFloat,
      });
      return NextResponse.json({ sessionId: res.session_id });
    }

    if (body.action === "close") {
      if (!hasPermission(actor, "lukke_dagen")) return FORBIDDEN("Du har ikke tilladelse til at lukke dagen");
      const check = validateCashClose({
        countedCash: body.countedCash,
        cashToBank: body.cashToBank,
        expenses: body.expenses,
      });
      if (!check.ok) return NextResponse.json({ error: check.message, code: check.code }, { status: 400 });

      const res = await closeCashSession({
        sessionId: body.sessionId,
        staffId: actor.id,
        countedCash: body.countedCash,
        cashToBank: body.cashToBank,
        expenses: body.expenses,
        notes: body.notes ?? null,
        countedCard: body.countedCard,
        cardNote: body.cardNote ?? null,
      });
      return NextResponse.json({
        sessionId: res.session_id,
        expectedCash: res.expected_cash,
        countedCash: res.counted_cash,
        difference: res.difference,
        expectedCard: res.expected_card,
        countedCard: res.counted_card,
        cardDifference: res.card_difference,
        locked: true,
      });
    }

    if (!["manager", "owner"].includes(actor.role)) {
      return FORBIDDEN("Kun managere og ejere kan justere en lukket kassesession");
    }
    const res = await addSessionAdjustment({
      sessionId: body.sessionId,
      staffId: actor.id,
      amountOere: body.amountOere,
      reason: body.reason,
    });
    return NextResponse.json({ adjustmentId: res.adjustment_id });
  } catch (err) {
    return posErrorResponse(err, "Fejl ved kassesession");
  }
}
