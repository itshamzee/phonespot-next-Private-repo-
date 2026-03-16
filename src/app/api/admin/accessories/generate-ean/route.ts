import { NextResponse } from "next/server";
import { generateInternalEan } from "@/lib/supabase/accessories";

export async function POST() {
  const ean = generateInternalEan();
  return NextResponse.json({ ean });
}
