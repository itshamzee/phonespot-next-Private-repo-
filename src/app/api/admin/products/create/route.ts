import { NextResponse } from "next/server";
import {
  createProduct,
  getCollectionByHandle,
  addProductToCollection,
} from "@/lib/shopify/admin-client";

// Map product types to their Shopify collection handles
const COLLECTION_MAP: Record<string, string> = {
  Cover: "covers-1",
  Skærmbeskyttelse: "tilbehor",
  Høretelefoner: "lyd",
  Oplader: "opladere",
  Kabel: "opladere",
  Tilbehør: "tilbehor",
  Outlet: "restsalg",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, price, imageUrls, models, productType, brand } = body as {
      title: string;
      price: string;
      imageUrls?: string[];
      models: string[];
      productType?: string;
      brand?: string;
    };

    if (!title || !price) {
      return NextResponse.json(
        { error: "Titel og pris er påkrævet" },
        { status: 400 },
      );
    }

    // Build tags from compatible models
    const tags = [...models];
    if (productType) tags.push(productType);
    if (brand) tags.push(brand);
    tags.push("tilbehoer");

    // Build body HTML
    const bodyParts: string[] = [];
    if (models.length > 0) bodyParts.push(`<p>Kompatibel med: ${models.join(", ")}</p>`);
    if (brand) bodyParts.push(`<p>Mærke: ${brand}</p>`);

    // 1. Create the product on Shopify
    const product = await createProduct({
      title,
      bodyHtml: bodyParts.join("\n") || "",
      productType: productType || "Tilbehør",
      tags,
      price,
      imageUrls: imageUrls && imageUrls.length > 0 ? imageUrls : undefined,
    });

    // 2. Add to appropriate collection based on product type
    const collectionHandle = COLLECTION_MAP[productType || ""] || "tilbehor";
    try {
      const collectionId = await getCollectionByHandle(collectionHandle);
      if (collectionId) {
        await addProductToCollection(collectionId, product.id);
      }
    } catch (err) {
      // Non-fatal — product is created, just not in collection
      console.error("Failed to add to collection:", err);
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        handle: product.handle,
        title: product.title,
      },
    });
  } catch (err) {
    console.error("Product creation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ukendt fejl" },
      { status: 500 },
    );
  }
}
