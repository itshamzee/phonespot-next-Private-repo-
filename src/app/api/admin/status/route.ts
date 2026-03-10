import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    gatewayApi: !!process.env.GATEWAY_API_TOKEN,
    resend: !!process.env.RESEND_API_KEY,
    supabase:
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
