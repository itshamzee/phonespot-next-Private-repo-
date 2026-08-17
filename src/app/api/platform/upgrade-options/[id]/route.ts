// PATCH /api/platform/upgrade-options/[id] — update fields on an upgrade option
// DELETE /api/platform/upgrade-options/[id] — delete an option (join-table rows cascade)
//
// Auth: handled by middleware (admin session cookie) — no auth checks here.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const EDITABLE_FIELDS = ["label", "target_spec", "price", "sort_order", "active"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field];
  }
  if ("label" in updates && !String(updates.label).trim()) {
    return NextResponse.json({ error: "Label må ikke være tom" }, { status: 400 });
  }
  if ("price" in updates && (!Number.isInteger(updates.price) || (updates.price as number) <= 0)) {
    return NextResponse.json({ error: "Pris skal være et positivt heltal (øre)" }, { status: 400 });
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Ingen felter at opdatere" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("laptop_upgrade_options")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("laptop_upgrade_options").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
