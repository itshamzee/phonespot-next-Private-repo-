import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/client";
import { loadLocationIndex } from "@/lib/auth/store-scope-server";
import { adjustStock } from "@/lib/pos/sessions";
import { posErrorResponse } from "@/lib/pos/route-helpers";
import { requireCatalogEditor } from "@/lib/repairs/catalog-manage";
import { firstIssue } from "@/lib/repairs/catalog-manage-rules";
import { uuidParam } from "@/lib/repairs/case-schemas";
import { CASE_STORES } from "@/lib/repairs/availability";
import type { PartStockResponse } from "@/lib/repairs/catalog-manage-types";
import { canActFor } from "@/lib/transfers/rules";

const NOT_FOUND = () => NextResponse.json({ error: "Delen findes ikke" }, { status: 404 });

/** Er varen koblet til en reparation? Kun reservedele må optælles herfra. */
async function loadPart(db: ReturnType<typeof createServerClient>, id: string) {
  const { data: link } = await db.from("repair_service_parts").select("sku_product_id").eq("sku_product_id", id).limit(1);
  if (!((link ?? []) as unknown[]).length) return null;
  const { data } = await db.from("sku_products").select("id, title, always_in_stock, cost_price").eq("id", id).maybeSingle();
  return (data as { id: string; title: string | null; always_in_stock: boolean | null; cost_price: number | null } | null) ?? null;
}

/** GET /api/admin/repair-catalog/manage/parts/:id/stock : antal og reserveret pr. butik, til optællingen. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCatalogEditor(request);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) return NOT_FOUND();
  try {
    const db = createServerClient();
    const part = await loadPart(db, id);
    if (!part) return NOT_FOUND();
    const index = await loadLocationIndex();
    const { data, error } = await db.from("sku_stock").select("location_id, quantity, reserved_qty").eq("product_id", id);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{ location_id: string; quantity: number | null; reserved_qty: number | null }>;
    const body: PartStockResponse = {
      sku_product_id: part.id,
      title: part.title,
      tracked: !part.always_in_stock,
      cost_oere: part.cost_price,
      stores: CASE_STORES.map((slug) => {
        const locId = index.idBySlug[slug];
        const row = rows.find((r) => r.location_id === locId);
        return {
          slug,
          name: slug === "vejle" ? "Vejle" : "Slagelse",
          quantity: row?.quantity ?? 0,
          reserved: row?.reserved_qty ?? 0,
          can_edit: canActFor(auth.ctx.staff, slug),
        };
      }),
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[repair-catalog/manage] part stock failed:", id, err);
    return NextResponse.json({ error: "Kunne ikke hente lageret" }, { status: 500 });
  }
}

const countSchema = z.object({
  counts: z
    .object({
      vejle: z.number().int("Antal skal være et helt tal").min(0, "Antal kan ikke være negativt").max(100000).optional(),
      slagelse: z.number().int("Antal skal være et helt tal").min(0, "Antal kan ikke være negativt").max(100000).optional(),
    })
    .strict(),
});

/**
 * POST /api/admin/repair-catalog/manage/parts/:id/stock { counts: { vejle?, slagelse? } }
 * Optalt antal pr. butik. Regnes om til en regulering (pos_adjust_stock, årsag "adjust", note "Optælling"), så
 * lagerbevægelsen står i loggen, og delen skifter fra "altid på lager" til lagerstyret (det gør funktionen selv).
 * Ejer må begge butikker, manager kun egen. Varemodtagelse bruger /api/admin/stock/receive.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCatalogEditor(request);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) return NOT_FOUND();
  const parsed = countSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const wanted = CASE_STORES.flatMap((slug) => {
    const n = parsed.data.counts[slug];
    return n === undefined ? [] : [{ slug, counted: n }];
  });
  if (wanted.length === 0) return NextResponse.json({ error: "Indtast et optalt antal" }, { status: 400 });
  const forbidden = wanted.find((w) => !canActFor(auth.ctx.staff, w.slug));
  if (forbidden) return NextResponse.json({ error: "Du kan kun tælle op i din egen butik" }, { status: 403 });

  try {
    const db = createServerClient();
    const part = await loadPart(db, id);
    if (!part) return NOT_FOUND();
    const index = await loadLocationIndex();
    const { data, error } = await db.from("sku_stock").select("location_id, quantity").eq("product_id", id);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{ location_id: string; quantity: number | null }>;

    const changes = wanted.flatMap((w) => {
      const locationId = index.idBySlug[w.slug];
      if (!locationId) return [];
      const current = rows.find((r) => r.location_id === locationId)?.quantity ?? 0;
      const delta = w.counted - current;
      return delta === 0 ? [] : [{ slug: w.slug, locationId, delta }];
    });

    if (changes.length === 0) {
      if (part.always_in_stock) {
        return NextResponse.json(
          { error: "Indtast mindst ét antal over 0 for at starte lagerstyring af delen", code: "nothing_to_count" },
          { status: 422 },
        );
      }
      return NextResponse.json({ results: [], tracking_started: false });
    }

    const results: Array<{ slug: string; quantity: number }> = [];
    let trackingStarted = false;
    for (const c of changes) {
      const res = await adjustStock({
        productId: id,
        locationId: c.locationId,
        delta: c.delta,
        reason: "adjust",
        note: "Optælling",
        staffId: auth.ctx.staff.id,
      });
      results.push({ slug: c.slug, quantity: res.quantity });
      if (res.tracking_started) trackingStarted = true;
    }
    return NextResponse.json({ results, tracking_started: trackingStarted });
  } catch (err) {
    return posErrorResponse(err, "Lagerreguleringen kunne ikke gemmes");
  }
}
