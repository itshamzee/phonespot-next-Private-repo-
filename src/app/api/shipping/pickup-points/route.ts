import { NextRequest, NextResponse } from "next/server";
import { getPickupPoints } from "@/lib/shipmondo/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const carrier = searchParams.get("carrier");
  const zipcode = searchParams.get("zipcode");

  if (!carrier || !zipcode) {
    return NextResponse.json(
      { error: "carrier and zipcode are required" },
      { status: 400 }
    );
  }

  const validCarriers = ["gls", "postnord", "dao"];
  if (!validCarriers.includes(carrier)) {
    return NextResponse.json(
      { error: `Invalid carrier. Must be one of: ${validCarriers.join(", ")}` },
      { status: 400 }
    );
  }

  if (!/^\d{4}$/.test(zipcode)) {
    return NextResponse.json(
      { error: "Invalid Danish zipcode (must be 4 digits)" },
      { status: 400 }
    );
  }

  try {
    const points = await getPickupPoints(carrier, zipcode);
    return NextResponse.json({ points });
  } catch (error) {
    console.error("Failed to fetch pickup points:", error);
    return NextResponse.json(
      { error: "Kunne ikke hente pakkeshops. Prøv igen." },
      { status: 502 }
    );
  }
}
