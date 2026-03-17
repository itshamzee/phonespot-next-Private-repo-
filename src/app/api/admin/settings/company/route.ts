// src/app/api/admin/settings/company/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

async function requireAuth(req: Request) {
  const supabase = createServerClient();
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

export async function GET(req: Request) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function PUT(req: Request) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const body = await req.json();
  const { company_name, logo_url, address, postal_city, phone, email, website } = body;

  const { data, error } = await supabase
    .from("company_settings")
    .update({ company_name, logo_url, address, postal_city, phone, email, website })
    .eq("id", true)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
