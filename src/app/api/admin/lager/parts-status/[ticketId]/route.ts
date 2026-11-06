import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-staff";
import { canSee } from "@/lib/auth/store-scope-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLagersystemClient } from "@/lib/lagersystem/client";
import { NOT_ENABLED } from "@/lib/lagersystem/http";
import { createSupabasePartsCheckRepo } from "@/lib/lagersystem/parts-check-repo";
import { markOrdered } from "@/lib/lagersystem/parts-status";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ ticketId: string }> };

/** PATCH { action: "ordered" } — "Markér som bestilt" (spec §4.4). Afgrænset til personalets butik. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getLagersystemClient()) return NextResponse.json(NOT_ENABLED, { status: 404 });
  const { ticketId } = await params;
  if (!z.string().uuid().safeParse(ticketId).success) return NextResponse.json({ error: "Sagen findes ikke" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
  if (body?.action !== "ordered") return NextResponse.json({ error: "Ukendt handling" }, { status: 400 });
  const repo = createSupabasePartsCheckRepo(createAdminClient());
  const ticket = await repo.getTicket(ticketId);
  if (!ticket || !canSee(staff, ticket.store_id)) return NextResponse.json({ error: "Sagen findes ikke" }, { status: 404 });
  const ok = await markOrdered(repo, ticketId);
  if (!ok) return NextResponse.json({ error: "Sagen mangler ikke dele" }, { status: 409 });
  return NextResponse.json({ parts_status: "ordered" });
}
