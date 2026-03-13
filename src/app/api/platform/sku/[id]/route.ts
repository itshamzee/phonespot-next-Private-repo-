// GET /api/platform/sku/[id] — single SKU product with stock levels
// PATCH /api/platform/sku/[id] — partial update fields
// PUT /api/platform/sku/[id] — full update (admin)
// DELETE /api/platform/sku/[id] — soft delete (set is_active = false)

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/platform/activity-log";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("sku_products")
    .select(`
      *,
      supplier:suppliers(id, name),
      stock:sku_stock(location_id, quantity, min_level, max_level, location:locations(id, name))
    `)
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("sku_products")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { _actorId, ...updates } = body;

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("sku_products")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    supabase,
    actorId: _actorId ?? "system",
    action: "sku_update",
    entityType: "sku_product",
    entityId: id,
    details: updates,
  });

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  // Soft delete
  const { error } = await supabase
    .from("sku_products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  await logActivity({
    supabase,
    actorId: body._actorId ?? "system",
    action: "sku_delete",
    entityType: "sku_product",
    entityId: id,
    details: {},
  });

  return NextResponse.json({ success: true });
}
