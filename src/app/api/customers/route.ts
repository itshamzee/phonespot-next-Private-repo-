import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*, customer_devices(*)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { type, name, email, phone, company_name, cvr } = body;

  if (!type || !name || !phone) {
    return NextResponse.json(
      { error: "Type, navn og telefon er paakraevet" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      type,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone.trim(),
      company_name: type === "erhverv" ? company_name?.trim() || null : null,
      cvr: type === "erhverv" ? cvr?.trim() || null : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
