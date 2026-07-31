import { NextRequest, NextResponse } from "next/server";
import { getPickupPoints } from "@/lib/shipmondo/client";
import { PICKUP_CARRIERS } from "@/lib/shipping";

/**
 * GET /api/shipping/pickup-points?zipcode=8381[&carrier=pdk]
 *
 * Without a carrier, every carrier we offer is queried and the shops come back
 * as one list — the customer picks a shop, not a carrier, and which company
 * carries the parcel is our problem, not theirs.
 *
 * PostNord's carrier code is `pdk`. This route used to accept "postnord" and
 * "dao", neither of which Shipmondo knows, so every call it let through would
 * have failed at the API.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zipcode = searchParams.get("zipcode");
  const carrier = searchParams.get("carrier");

  if (!zipcode || !/^\d{4}$/.test(zipcode)) {
    return NextResponse.json({ error: "Ugyldigt postnummer" }, { status: 400 });
  }

  if (carrier && !(PICKUP_CARRIERS as readonly string[]).includes(carrier)) {
    return NextResponse.json(
      { error: `Ukendt fragtfirma. Gyldige: ${PICKUP_CARRIERS.join(", ")}` },
      { status: 400 },
    );
  }

  const carriers = carrier ? [carrier] : [...PICKUP_CARRIERS];

  try {
    const results = await Promise.all(
      // One carrier being down should not empty the whole list.
      carriers.map((code) => getPickupPoints(code, zipcode).catch(() => [])),
    );

    const points = results.flat().map((p) => ({
      id: String(p.id ?? p.number ?? ""),
      name: p.name || p.company_name || "Pakkeshop",
      address: p.address ?? "",
      zipcode: p.zipcode ?? "",
      city: p.city ?? "",
      carrier_code: p.carrier_code ?? p.agent ?? "",
      opening_hours: p.opening_hours ?? [],
    }));

    // Same postcode first: those are the ones a customer can walk to. The API
    // returns distance: null, so there is nothing better to sort on.
    points.sort((a, b) => {
      const aLocal = a.zipcode === zipcode ? 0 : 1;
      const bLocal = b.zipcode === zipcode ? 0 : 1;
      return aLocal - bLocal || a.name.localeCompare(b.name, "da-DK");
    });

    return NextResponse.json({ points });
  } catch (error) {
    console.error("Failed to fetch pickup points:", error);
    return NextResponse.json(
      { error: "Kunne ikke hente pakkeshops. Prøv igen." },
      { status: 502 },
    );
  }
}
