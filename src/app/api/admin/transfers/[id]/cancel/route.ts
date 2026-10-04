import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffScope, unauthorizedResponse } from "@/lib/auth/store-scope-server";
import { cancelTransfer } from "@/lib/transfers/service";
import { badRequest, cancelSchema, readJson, transferErrorResponse } from "@/lib/transfers/route-helpers";

/**
 * POST /api/admin/transfers/[id]/cancel — annullér. Anmodet: begge butikker; sendt: kun afsenderen,
 * og varen går tilbage til afsenderens lager.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaffScope(request);
  if (!ctx) return unauthorizedResponse();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return badRequest("Ugyldigt id");
  const parsed = cancelSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest("Ugyldig forespørgsel", parsed.error.issues);
  try {
    const result = await cancelTransfer(ctx.staff, id, parsed.data.reason ?? null);
    return NextResponse.json(result);
  } catch (err) {
    return transferErrorResponse(err, "Overførslen kunne ikke annulleres");
  }
}
