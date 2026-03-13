import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "product-images";

type RouteParams = { params: Promise<{ key: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { key } = await params;
  const path = decodeURIComponent(key);

  const supabase = createAdminClient();

  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
