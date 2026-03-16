import { NextResponse } from "next/server";
import { updateAccessory, deleteAccessory } from "@/lib/supabase/accessories";
import type { Accessory } from "@/lib/supabase/platform-types";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const allowed: Array<keyof Omit<Accessory, "id" | "created_at">> = [
    "name",
    "slug",
    "category",
    "brand",
    "compatible_models",
    "price",
    "cost_price",
    "sku",
    "ean",
    "image_url",
    "description",
    "online_stock",
    "store_stock",
    "store_id",
    "status",
    "updated_at",
  ];

  const updates: Partial<Omit<Accessory, "id" | "created_at">> = {};
  for (const key of allowed) {
    if (key in body) {
      (updates as Record<string, unknown>)[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Ingen felter at opdatere" }, { status: 400 });
  }

  try {
    const accessory = await updateAccessory(id, updates);
    return NextResponse.json(accessory);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await deleteAccessory(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
