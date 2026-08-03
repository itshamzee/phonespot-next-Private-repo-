import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth/require-staff";
import { parsePostalCity, lookupCity } from "@/lib/buyback/seller-address";

/**
 * POST /api/trade-in/[id]/seller-address — correct the address on an offer.
 *
 * The acceptance form let a customer through with "213123" as a postcode, and
 * a parcel cannot be booked to that. Somebody has to be able to fix it after a
 * phone call, without editing the database by hand.
 *
 * [id] is the offer id.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: offerId } = await params;
  const body = await req.json().catch(() => ({}));

  const name = typeof body.seller_name === "string" ? body.seller_name.trim() : "";
  const address = typeof body.seller_address === "string" ? body.seller_address.trim() : "";
  const zipcode = typeof body.zipcode === "string" ? body.zipcode.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";

  if (!address) {
    return NextResponse.json({ error: "Adresse mangler" }, { status: 400 });
  }

  const parsed = parsePostalCity(`${zipcode} ${city}`.trim());
  if (!parsed) {
    return NextResponse.json(
      { error: "Postnummeret skal være fire cifre, f.eks. 4200" },
      { status: 400 },
    );
  }

  // Fill the city in from the register if it was left blank, so the label has
  // something to print.
  const resolvedCity = parsed.city || (await lookupCity(parsed.zipcode));
  if (!resolvedCity) {
    return NextResponse.json(
      { error: `Postnummer ${parsed.zipcode} findes ikke` },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const update: Record<string, unknown> = {
    seller_address: address,
    seller_postal_city: `${parsed.zipcode} ${resolvedCity}`,
    updated_at: new Date().toISOString(),
  };
  if (name) update.seller_name = name;

  const { error } = await supabase.from("trade_in_offers").update(update).eq("id", offerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    seller_address: address,
    seller_postal_city: update.seller_postal_city,
  });
}
