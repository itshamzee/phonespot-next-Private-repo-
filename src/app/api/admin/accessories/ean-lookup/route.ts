import { NextResponse } from "next/server";

interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  categories?: string;
  image_url?: string;
  [key: string]: unknown;
}

interface OpenFoodFactsResponse {
  status: number;
  product?: OpenFoodFactsProduct;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ean = searchParams.get("ean");

  if (!ean) {
    return NextResponse.json({ error: "ean parameter er påkrævet" }, { status: 400 });
  }

  const sanitized = ean.replace(/\D/g, "");
  if (sanitized.length < 8 || sanitized.length > 14) {
    return NextResponse.json({ error: "Ugyldigt EAN format" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${sanitized}.json`,
      {
        headers: { "User-Agent": "PhoneSpot/1.0 (admin@phonespot.dk)" },
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "EAN lookup fejlede", ean: sanitized, found: false },
        { status: 200 }
      );
    }

    const json = (await response.json()) as OpenFoodFactsResponse;

    if (json.status === 0 || !json.product) {
      return NextResponse.json({ ean: sanitized, found: false });
    }

    const { product_name, brands, categories, image_url } = json.product;

    return NextResponse.json({
      ean: sanitized,
      found: true,
      product_name: product_name ?? null,
      brand: brands ?? null,
      categories: categories ?? null,
      image_url: image_url ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
