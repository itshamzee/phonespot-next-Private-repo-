import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-staff";
import type { MovementInput } from "@/lib/lagersystem/api-types";
import { getLagersystemClient } from "@/lib/lagersystem/client";
import { forbiddenLocation, lagersystemErrorResponse, NOT_ENABLED } from "@/lib/lagersystem/http";
import { actorLabel, canManageStock, canUseLocation, PHONESPOT_LOCATION_CODES } from "@/lib/lagersystem/locations";

export const runtime = "nodejs";

const Body = z
  .object({
    idempotency_key: z.string().uuid(),
    type: z.enum(["RECEIVE", "COUNT", "WRITE_OFF", "TAKE"]),
    location: z.enum(PHONESPOT_LOCATION_CODES),
    shared_sku: z.string().trim().min(1).max(100),
    qty: z.number().int().min(0).max(10000),
    note: z.string().trim().max(200).optional(),
    reference: z.string().trim().max(200).optional(),
    supplier: z.string().trim().max(100).optional(),
    cost_price_ore: z.number().int().min(0).max(10_000_000).optional(),
  })
  .superRefine((b, ctx) => {
    if (b.type !== "COUNT" && b.qty < 1) ctx.addIssue({ code: "custom", path: ["qty"], message: "Antal skal være mindst 1" });
    if ((b.type === "TAKE" || b.type === "WRITE_OFF") && !b.note) {
      ctx.addIssue({ code: "custom", path: ["note"], message: b.type === "TAKE" ? "Angiv formål med udtaget" : "Angiv årsag til nedskrivningen" });
    }
  });

/**
 * POST — synkron bogføring fra lagersiden (spec 4.3). Fejler kaldet, vises
 * fejlen, og intet gemmes lokalt. Nøglen kommer fra formularen, så et
 * gentaget klik efter en timeout ikke bogfører to gange.
 */
export async function POST(req: NextRequest) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = getLagersystemClient();
  if (!client) return NextResponse.json(NOT_ENABLED, { status: 404 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ugyldige data" }, { status: 400 });
  }
  const b = parsed.data;
  // Lagerredigering er for ejer/leder (som sku_stock RLS); alle ansatte må kun udtage.
  const canManage = canManageStock(staff);
  if (b.type !== "TAKE" && !canManage) {
    return NextResponse.json({ error: "Kun ejer eller leder kan modtage, tælle og nedskrive varer." }, { status: 403 });
  }
  if (!canUseLocation(staff, b.location)) return forbiddenLocation();
  const reference = [b.note, b.reference].filter(Boolean).join(" · ") || null;
  const input: MovementInput = {
    idempotency_key: `admin:${b.idempotency_key}`,
    location: b.location,
    shared_sku: b.shared_sku,
    type: b.type,
    qty: b.qty,
    actor_label: actorLabel(staff),
    reference,
    ...(b.type === "RECEIVE" && b.supplier ? { supplier: b.supplier } : {}),
    ...(b.type === "RECEIVE" && canManage && b.cost_price_ore !== undefined ? { cost_price_ore: b.cost_price_ore } : {}),
  };

  try {
    const result = await client.postMovement(input);
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (err) {
    return lagersystemErrorResponse(err);
  }
}
