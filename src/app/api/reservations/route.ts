import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createReservation } from "@/lib/supabase/accessories";
import type { Reservation } from "@/lib/supabase/platform-types";
import { normalizeStoreId, storeLabel } from "@/lib/stores";
import { getStaffRecipients } from "@/lib/email/staff-routing";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Tell the store a customer is coming to collect something. The reservation
    // is already saved, so a mail problem must not turn into a failed request —
    // log it and hand the customer their reservation anyway.
    try {
      const storeId = normalizeStoreId(store_id);
      await resend.emails.send({
        from: "PhoneSpot System <noreply@phonespot.dk>",
        ...getStaffRecipients(storeId),
        subject: `Ny reservation${storeId ? ` (${storeLabel(storeId)})` : ""}: ${String(product_name)}`,
        text: [
          "Ny reservation til afhentning:",
          "",
          `Produkt: ${String(product_name)} (${String(product_type)})`,
          `Butik: ${storeLabel(storeId)}`,
          "",
          `Kunde: ${String(customer_name)}`,
          `Telefon: ${String(customer_phone)}`,
          ...(customer_email ? [`Email: ${String(customer_email)}`] : []),
          "",
          `Reservations-ID: ${reservation.id}`,
          `Udløber: ${new Date(expiresAt).toLocaleString("da-DK")}`,
        ].join("\n"),
      });
    } catch (mailErr) {
      console.error("Reservation staff mail failed:", mailErr);
    }

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
