import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("repair_comments")
    .select("*")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();
  const { author, message, visibility } = await req.json();

  if (!author || !message) {
    return NextResponse.json(
      { error: "author and message required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("repair_comments")
    .insert({
      ticket_id: id,
      author,
      message,
      visibility: visibility || "intern",
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
