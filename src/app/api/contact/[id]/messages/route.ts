import { requireInquiryAccess } from "@/lib/inquiries/inquiry-access";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireInquiryAccess(req, id);
  if (!access.ok) return access.response;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("inquiry_messages")
    .select("*")
    .eq("inquiry_id", id)
    .order("created_at", { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
