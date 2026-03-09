import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("repair_services")
    .select("id, name, description, includes, estimated_time_label, warranty_info, estimated_minutes, price_dkk")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
