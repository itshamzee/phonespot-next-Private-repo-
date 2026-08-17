// GET /api/platform/upgrade-options — list all laptop upgrade options
// POST /api/platform/upgrade-options — create a new option
//
// Auth: handled by middleware (admin session cookie) — no auth checks here.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("laptop_upgrade_options")
    .select("*")
    .order("kind")
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (body.kind !== "ram" && body.kind !== "ssd") {
    return NextResponse.json({ error: "Ugyldig type" }, { status: 400 });
  }
  if (!body.label?.trim() || !Number.isInteger(body.price) || body.price <= 0) {
    return NextResponse.json({ error: "Label og pris (øre, > 0) er påkrævet" }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("laptop_upgrade_options")
    .insert({
      kind: body.kind,
      label: body.label.trim(),
      target_spec: body.target_spec?.trim() ?? "",
      price: body.price,
      sort_order: body.sort_order ?? 0,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
