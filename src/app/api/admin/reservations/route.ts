import { NextResponse } from "next/server";
import { getReservations } from "@/lib/supabase/accessories";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const status = searchParams.get("status") ?? undefined;
  const store_id = searchParams.get("store_id") ?? undefined;
  const product_type = searchParams.get("product_type") ?? undefined;
  const product_id = searchParams.get("product_id") ?? undefined;

  try {
    const reservations = await getReservations({
      status,
      store_id,
      product_type,
      product_id,
    });
    return NextResponse.json(reservations);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
