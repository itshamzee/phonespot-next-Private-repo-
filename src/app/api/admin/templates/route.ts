import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(req: Request) {
  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel");

  let query = supabase
    .from("reply_templates")
    .select("*")
    .order("sort_order", { ascending: true });

  if (channel) {
    query = query.eq("channel", channel);
  }

  const { data, error } = await query;

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = createServerClient();
  const { channel, name, subject, body, variables, sort_order } =
    await req.json();

  if (!channel || !name || !body) {
    return NextResponse.json(
      { error: "channel, name and body required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("reply_templates")
    .insert({
      channel,
      name,
      subject: subject || null,
      body,
      variables: variables || [],
      sort_order: sort_order ?? 0,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
