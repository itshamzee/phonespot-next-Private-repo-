import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { sendTransfer } from "@/lib/transfers/service";
import { badRequest, readJson, sendSchema, transferErrorResponse } from "@/lib/transfers/route-helpers";

/**
 * POST /api/admin/transfers/[id]/send — "Pak og send". Kun afsenderbutikken (eller ejeren).
 * Body (valgfri): { lines: [{ lineId, qty?, deviceIds? }] } for at sende mindre eller vælge enheder.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return badRequest("Ugyldigt id");
  const parsed = sendSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest("Ugyldig forespørgsel", parsed.error.issues);
  try {
    const result = await sendTransfer(ctx.staff, id, parsed.data.lines ?? null);
    return NextResponse.json(result);
  } catch (err) {
    return transferErrorResponse(err, "Overførslen kunne ikke sendes");
  }
}
