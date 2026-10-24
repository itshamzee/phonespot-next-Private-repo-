import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLagersystemEnabled } from "@/lib/lagersystem/config";
import { requireCatalogEditor } from "@/lib/repairs/catalog-manage";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

const Add = z.object({
  shared_sku: z.string().trim().min(1).max(100),
  part_name: z.string().trim().min(1).max(300),
  qty: z.number().int().min(1).max(20),
});
const off = () => NextResponse.json({ error: "Lagersystemet er ikke slået til" }, { status: 404 });

/** Kobling reparationsydelse -> del (spec §4.4). Kun ejer og manager, som resten af reparationskataloget. */
export async function GET(req: NextRequest, { params }: Ctx) {
  const auth = await requireCatalogEditor(req);
  if ("response" in auth) return auth.response;
  if (!isLagersystemEnabled()) return NextResponse.json({ enabled: false });
  const { id } = await params;
  const { data, error } = await createAdminClient()
    .from("repair_service_shared_parts")
    .select("shared_sku, qty, part_name")
    .eq("service_id", id)
    .order("shared_sku");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ enabled: true, parts: data ?? [] });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await requireCatalogEditor(req);
  if ("response" in auth) return auth.response;
  if (!isLagersystemEnabled()) return off();
  const { id } = await params;
  const parsed = Add.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ugyldige data" }, { status: 400 });
  const { data, error } = await createAdminClient()
    .from("repair_service_shared_parts")
    .upsert({ service_id: id, ...parsed.data }, { onConflict: "service_id,shared_sku" })
    .select("shared_sku, qty, part_name")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ part: data }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requireCatalogEditor(req);
  if ("response" in auth) return auth.response;
  if (!isLagersystemEnabled()) return off();
  const { id } = await params;
  const sku = req.nextUrl.searchParams.get("sku");
  if (!sku) return NextResponse.json({ error: "sku mangler" }, { status: 400 });
  const { error } = await createAdminClient().from("repair_service_shared_parts").delete().eq("service_id", id).eq("shared_sku", sku);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
