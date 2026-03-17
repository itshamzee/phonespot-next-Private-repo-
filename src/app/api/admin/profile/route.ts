// src/app/api/admin/profile/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(req: Request) {
  const supabase = createServerClient();
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  return NextResponse.json({ profile: profile || null });
}

export async function PUT(req: Request) {
  const supabase = createServerClient();
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { display_name, title, phone, avatar_url } = body;

  if (!display_name) {
    return NextResponse.json({ error: "display_name is required" }, { status: 400 });
  }

  // Upsert: create if not exists, update if exists
  const { data: existing } = await supabase
    .from("staff_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from("staff_profiles")
      .update({ display_name, title: title || "", phone, avatar_url })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ profile: data });
  }

  const { data, error } = await supabase
    .from("staff_profiles")
    .insert({ user_id: user.id, display_name, title: title || "", phone, avatar_url })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
