import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canSee } from "@/lib/auth/store-scope-server";
import { requireStaff } from "@/lib/auth/require-staff";
import { isOwner } from "@/lib/auth/store-scope";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLagersystemClient, LagersystemError } from "@/lib/lagersystem/client";
import { lagersystemErrorResponse, NOT_ENABLED } from "@/lib/lagersystem/http";
import { locationForStore } from "@/lib/lagersystem/locations";
import { createSupabasePartsCheckRepo } from "@/lib/lagersystem/parts-check-repo";
import { clearShortageForPart } from "@/lib/lagersystem/parts-status";
import { addPart } from "@/lib/lagersystem/repair-parts";
import { scheduleSend } from "@/lib/lagersystem/send-after";
import { createSupabaseRepairPartsRepo } from "@/lib/lagersystem/supabase-repo";

export const runtime = "nodejs";


/** Kostpris er kun for ejeren. */
function forStaff<T extends { cost_at_time_ore?: unknown }>(staff: Parameters<typeof isOwner>[0], part: T): T | Omit<T, "cost_at_time_ore"> {
  if (isOwner(staff)) return part;
  const { cost_at_time_ore: _cost, ...rest } = part;
  return rest;
}

type Ctx = { params: Promise<{ ticketId: string }> };
const TicketId = z.string().uuid();
const AddBody = z.object({
  shared_sku: z.string().trim().min(1).max(100),
  qty: z.number().int().min(1).max(100),
});

/** GET — dele på sagen + hvilken lokation sagen trækker fra. */
export async function GET(req: NextRequest, { params }: Ctx) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getLagersystemClient()) return NextResponse.json({ enabled: false });

  const { ticketId } = await params;
  if (!TicketId.safeParse(ticketId).success) return NextResponse.json({ error: "Sagen findes ikke" }, { status: 404 });
  const repo = createSupabaseRepairPartsRepo(createAdminClient());
  const ticket = await repo.getTicket(ticketId);
  if (!ticket) return NextResponse.json({ error: "Sagen findes ikke" }, { status: 404 });
  if (!canSee(staff, ticket.store_id)) return NextResponse.json({ error: "Sagen findes ikke" }, { status: 404 });
  const parts = await repo.listForTicket(ticketId);
  const check = await createSupabasePartsCheckRepo(createAdminClient()).getTicket(ticketId).catch(() => null);
  return NextResponse.json({
    enabled: true,
    location: locationForStore(ticket.store_id),
    parts: parts.map((p) => forStaff(staff, p)),
    parts_status: check?.parts_status ?? null,
    parts_shortage: check?.parts_shortage ?? null,
  });
}

/** POST — registrér en brugt del (TAKE). Gemmes lokalt først, sendes via after(). */
export async function POST(req: NextRequest, { params }: Ctx) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = getLagersystemClient();
  if (!client) return NextResponse.json(NOT_ENABLED, { status: 404 });

  const { ticketId } = await params;
  if (!TicketId.safeParse(ticketId).success) return NextResponse.json({ error: "Sagen findes ikke" }, { status: 404 });
  const parsed = AddBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ugyldige data" }, { status: 400 });

  const repo = createSupabaseRepairPartsRepo(createAdminClient());
  const ticket = await repo.getTicket(ticketId);
  if (!ticket) return NextResponse.json({ error: "Sagen findes ikke" }, { status: 404 });
  if (!canSee(staff, ticket.store_id)) return NextResponse.json({ error: "Sagen findes ikke" }, { status: 404 });
  // Navn og kostpris kommer fra lagersystemet, aldrig fra klienten.
  let part;
  try {
    part = await client.getPart(parsed.data.shared_sku);
  } catch (err) {
    if (err instanceof LagersystemError && err.status === 404) {
      return NextResponse.json({ error: "Delen findes ikke i lagersystemet" }, { status: 404 });
    }
    return lagersystemErrorResponse(err);
  }
  const result = await addPart(repo, {
    ticketId,
    sharedSku: parsed.data.shared_sku,
    partName: part.name,
    qty: parsed.data.qty,
    costPriceOre: part.cost_price_ore ?? null,
    staff,
  });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  scheduleSend(result.value, repo);
  try {
    await clearShortageForPart(createSupabasePartsCheckRepo(createAdminClient()), ticketId, result.value.shared_sku);
  } catch (err) {
    console.error("[lagertjek] kunne ikke rydde Skal bestilles", ticketId, err);
  }
  return NextResponse.json({ part: forStaff(staff, result.value) }, { status: 201 });
}
