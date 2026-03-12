// GET /api/platform/suppliers — list all suppliers
// POST /api/platform/suppliers — create a new supplier

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, type, is_vat_registered, contact_info")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, type, is_vat_registered, contact_info, notes } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      name: name.trim(),
      type,
      is_vat_registered: is_vat_registered ?? false,
      contact_info: contact_info ?? {},
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
