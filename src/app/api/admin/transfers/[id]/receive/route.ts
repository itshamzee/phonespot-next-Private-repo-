import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { receiveTransfer } from "@/lib/transfers/service";
import { badRequest, readJson, receiveSchema, transferErrorResponse } from "@/lib/transfers/route-helpers";

/**
 * POST /api/admin/transfers/[id]/receive — "Scan og modtag". Kun modtagerbutikken (eller ejeren).
 * Body: { lines: [{ lineId, qty }], closeShort? } — delmodtagelse er tilladt; closeShort lukker
 * med mangler og sender resten tilbage til afsenderen. Lager flytter først her.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return badRequest("Ugyldigt id");
  const parsed = receiveSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest("Ugyldig modtagelse", parsed.error.issues);
  try {
    const result = await receiveTransfer(ctx.staff, id, parsed.data.lines, parsed.data.closeShort);
    return NextResponse.json(result);
  } catch (err) {
    return transferErrorResponse(err, "Modtagelsen kunne ikke gemmes");
  }
}
