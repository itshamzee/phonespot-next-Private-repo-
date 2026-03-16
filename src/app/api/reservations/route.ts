import { NextResponse } from "next/server";
import { createReservation } from "@/lib/supabase/accessories";
import type { Reservation } from "@/lib/supabase/platform-types";

// PUBLIC route — no admin auth required
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const {
    product_type,
    product_id,
    product_name,
    customer_name,
    customer_phone,
    customer_email,
    store_id,
    expires_at,
  } = body;

  if (
    !product_type ||
    !product_id ||
    !product_name ||
    !customer_name ||
    !customer_phone ||
    !store_id
  ) {
    return NextResponse.json(
      {
        error:
          "product_type, product_id, product_name, customer_name, customer_phone og store_id er påkrævet",
      },
      { status: 400 }
    );
  }

  if (product_type !== "accessory" && product_type !== "device") {
    return NextResponse.json(
      { error: "product_type skal være 'accessory' eller 'device'" },
      { status: 400 }
    );
  }

  // Default expiry: 48 hours from now
  const expiresAt =
    expires_at
      ? String(expires_at)
      : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  try {
    const reservation = await createReservation({
      product_type: product_type as Reservation["product_type"],
      product_id: String(product_id),
      product_name: String(product_name),
      customer_name: String(customer_name),
      customer_phone: String(customer_phone),
      customer_email: customer_email ? String(customer_email) : null,
      store_id: String(store_id),
      status: "pending",
      expires_at: expiresAt,
      ready_at: null,
      collected_at: null,
    });
    return NextResponse.json(reservation, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    // Stock errors are 409 Conflict
    if (message === "Ikke på lager i butik") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
