import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-staff";
import { getLagersystemClient } from "@/lib/lagersystem/client";
import { forbiddenLocation, lagersystemErrorResponse, NOT_ENABLED } from "@/lib/lagersystem/http";
import { actorLabel, canManageStock, canUseLocation, PHONESPOT_LOCATION_CODES } from "@/lib/lagersystem/locations";
import { OPEN_RMA_STATUSES, RMA_INVALID_STATE_TEXT } from "@/lib/lagersystem/rma";
import { rmaForStaff } from "@/lib/lagersystem/rma-server";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string; action: string }> };

const Send = z.object({ location: z.enum(PHONESPOT_LOCATION_CODES), supplier_ref: z.string().trim().max(100).optional() });
const Resolve = z.object({
  location: z.enum(PHONESPOT_LOCATION_CODES),
  outcome: z.enum(["CREDITED", "REPLACED", "REJECTED"]),
  credit_ore: z.number().int().min(0).max(10_000_000).optional(),
  note: z.string().trim().max(500).optional(),
});

/**
 * POST /rma/:id/(send|resolve) — synkront (spec §4.3b). Bilag A har ingen
 * GET /rma/:id, så rækken slås op i den åbne liste for lokationen: det
 * beviser, at den hører til en lokation, medarbejderen må bruge.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = getLagersystemClient();
  if (!client) return NextResponse.json(NOT_ENABLED, { status: 404 });
  const { id, action } = await params;
  if (action !== "send" && action !== "resolve") return NextResponse.json({ error: "Ukendt handling" }, { status: 404 });
  if (!id || id.length > 100) return NextResponse.json({ error: "Reklamationen findes ikke" }, { status: 404 });

  const raw = await req.json().catch(() => null);
  const parsed = action === "send" ? Send.safeParse(raw) : Resolve.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ugyldige data" }, { status: 400 });
  if (!canUseLocation(staff, parsed.data.location)) return forbiddenLocation();
  if (action === "resolve") {
    // Erstatning skriver RMA_IN på lageret, og et kreditbeløb er penge: kun ejer/leder (som WRITE_OFF).
    const b = parsed.data as z.infer<typeof Resolve>;
    const touchesMoneyOrStock = b.outcome === "REPLACED" || (b.outcome === "CREDITED" && b.credit_ore !== undefined);
    if (touchesMoneyOrStock && !canManageStock(staff)) {
      return NextResponse.json({ error: "Kun ejer eller leder kan afslutte som erstattet eller angive et krediteret beløb." }, { status: 403 });
    }
  }

  const overrides = { invalid_state: RMA_INVALID_STATE_TEXT };
  try {
    const open = await client.listRma({ location: parsed.data.location, status: OPEN_RMA_STATUSES });
    if (!open.some((i) => i.id === id)) return NextResponse.json({ error: "Reklamationen findes ikke eller er afsluttet" }, { status: 404 });
    const actor_label = actorLabel(staff);
    let item;
    if (action === "send") {
      const b = parsed.data as z.infer<typeof Send>;
      item = await client.sendRma(id, { actor_label, ...(b.supplier_ref ? { supplier_ref: b.supplier_ref } : {}) });
    } else {
      const b = parsed.data as z.infer<typeof Resolve>;
      item = await client.resolveRma(id, {
        actor_label,
        outcome: b.outcome,
        ...(b.outcome === "CREDITED" && b.credit_ore !== undefined ? { credit_ore: b.credit_ore } : {}),
        ...(b.note ? { note: b.note } : {}),
      });
    }
    return NextResponse.json({ item: rmaForStaff(staff, item) });
  } catch (err) {
    return lagersystemErrorResponse(err, overrides);
  }
}
