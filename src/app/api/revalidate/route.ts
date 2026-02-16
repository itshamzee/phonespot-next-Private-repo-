import crypto from "node:crypto";

import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { COLLECTION_MAP } from "@/lib/collections";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Verify the Shopify HMAC signature on the incoming webhook request. */
function verifyWebhookSignature(body: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET ?? "";
  const digest = crypto
    .createHmac("sha256", secret)
    .update(body, "utf-8")
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(digest, "utf-8"),
    Buffer.from(hmacHeader, "utf-8"),
  );
}

/**
 * Given a Shopify product handle, find which collection slug(s) it belongs to.
 * Because Shopify webhooks don't include collection info in product payloads,
 * we revalidate all collection pages as a safe default.
 */
function getCollectionSlugs(): string[] {
  return Object.keys(COLLECTION_MAP);
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const hmacHeader = request.headers.get("x-shopify-hmac-sha256") ?? "";

    // ---- Verify signature --------------------------------------------------

    if (!verifyWebhookSignature(body, hmacHeader)) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }

    // ---- Determine webhook topic -------------------------------------------

    const topic = request.headers.get("x-shopify-topic") ?? "";
    const payload = JSON.parse(body) as Record<string, unknown>;

    // ---- Revalidate affected paths -----------------------------------------

    if (topic.startsWith("products/")) {
      // Product create / update / delete
      const productHandle = (payload.handle as string) ?? "";

      // Always revalidate the homepage (it shows featured products)
      revalidatePath("/");

      // Revalidate every collection page (product may appear in any)
      for (const slug of getCollectionSlugs()) {
        revalidatePath(`/${slug}`);
      }

      // Revalidate the specific product page across all collections
      if (productHandle) {
        for (const slug of getCollectionSlugs()) {
          revalidatePath(`/${slug}/${productHandle}`);
        }
      }

      return NextResponse.json({
        revalidated: true,
        topic,
        handle: productHandle,
      });
    }

    if (topic.startsWith("collections/")) {
      // Collection update
      const collectionHandle = (payload.handle as string) ?? "";

      // Revalidate the homepage
      revalidatePath("/");

      // Revalidate the matching collection page
      const matchingSlug = Object.entries(COLLECTION_MAP).find(
        ([, config]) => config.shopifyHandle === collectionHandle,
      )?.[0];

      if (matchingSlug) {
        revalidatePath(`/${matchingSlug}`);
      }

      return NextResponse.json({
        revalidated: true,
        topic,
        handle: collectionHandle,
      });
    }

    // Unknown topic -- still respond 200 so Shopify doesn't retry
    return NextResponse.json({ revalidated: false, topic });
  } catch (error) {
    console.error("Webhook revalidation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
