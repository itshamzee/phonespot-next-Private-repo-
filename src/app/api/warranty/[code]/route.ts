import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

type RouteParams = {
  params: Promise<{ code: string }>;
};

/**
 * GET /api/warranty/[code]
 * Download warranty PDF by guarantee number or verification code.
 * Public endpoint (needed for QR code scanning).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { code } = await params;
  const supabase = createServerClient();

  const { data: warranty } = await supabase
    .from("warranties")
    .select("guarantee_number, pdf_url, status")
    .or(`guarantee_number.eq.${code},qr_verification_code.eq.${code}`)
    .single();

  if (!warranty || !warranty.pdf_url) {
    return NextResponse.json({ error: "Garantibevis ikke fundet" }, { status: 404 });
  }

  return NextResponse.redirect(warranty.pdf_url);
}
