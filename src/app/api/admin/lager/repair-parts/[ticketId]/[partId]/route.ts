import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLagersystemClient } from "@/lib/lagersystem/client";
import { NOT_ENABLED } from "@/lib/lagersystem/http";
import { removePart, retryPart } from "@/lib/lagersystem/repair-parts";
import { scheduleSend } from "@/lib/lagersystem/send-after";
import { createSupabaseRepairPartsRepo } from "@/lib/lagersystem/supabase-repo";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ ticketId: string; partId: string }> };
const Ids = z.object({ ticketId: z.string().uuid(), partId: z.string().uuid() });

async function setup(req: NextRequest, ctx: Ctx) {
  const staff = await requireStaff(req);
  if (!staff) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!getLagersystemClient()) return { error: NextResponse.json(NOT_ENABLED, { status: 404 }) };
  const ids = Ids.safeParse(await ctx.params);
  if (!ids.success) return { error: NextResponse.json({ error: "Delen findes ikke på sagen" }, { status: 404 }) };
  return { error: null, staff, ...ids.data, repo: createSupabaseRepairPartsRepo(createAdminClient()) };
}

/** DELETE — fjern en del: bogfører RETURN med ny idempotency-nøgle. */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const s = await setup(req, ctx);
  if (s.error) return s.error;
  const result = await removePart(s.repo, { ticketId: s.ticketId, partId: s.partId, staff: s.staff });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  scheduleSend(result.value, s.repo);
  return NextResponse.json({ part: result.value });
}

/** PATCH { action: "retry" } — send en fejlet række igen. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const s = await setup(req, ctx);
  if (s.error) return s.error;
  const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
  if (body?.action !== "retry") return NextResponse.json({ error: "Ukendt handling" }, { status: 400 });
  const result = await retryPart(s.repo, { ticketId: s.ticketId, partId: s.partId });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  scheduleSend(result.value, s.repo);
  return NextResponse.json({ part: result.value });
}
