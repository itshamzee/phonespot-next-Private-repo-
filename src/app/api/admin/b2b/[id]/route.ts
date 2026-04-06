import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface PatchBody {
  approved?: boolean;
  rejected?: boolean;
  rejected_reason?: string;
  discount_percentage?: number;
  price_group?: string;
  payment_terms?: string;
  notes?: string;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: PatchBody;
  try {
    body = await request.json() as PatchBody;
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const allowed: Array<keyof PatchBody> = [
    "approved",
    "rejected",
    "rejected_reason",
    "discount_percentage",
    "price_group",
    "payment_terms",
    "notes",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Ingen felter at opdatere" }, { status: 400 });
  }

  /* When approving: set approved=true, rejected=false, approved_at=now() */
  if (updates.approved === true) {
    updates.rejected = false;
    updates.rejected_reason = null;
    updates.approved_at = new Date().toISOString();
  }

  /* When rejecting: clear approval */
  if (updates.rejected === true) {
    updates.approved = false;
    updates.approved_at = null;
  }

  const { data, error } = await supabase
    .from("b2b_customers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
