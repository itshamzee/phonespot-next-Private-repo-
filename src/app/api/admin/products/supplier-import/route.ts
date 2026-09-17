import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeFetchPublic } from "@/lib/admin/products/safe-fetch";
import { buildAccessoryRows, uniqueSlugs } from "@/lib/admin/products/create";
import { planTemplateLinks } from "@/lib/admin/products/update";
import { danishCopy, isEmcProductUrl, isEmcUrl, listingPageUrl, parseEmcListing, parseEmcProduct, suggestedPriceOere, type EmcProduct } from "@/lib/admin/products/emc";
import { IMAGE_CACHE_SECONDS, optimizeProductImage } from "@/lib/images/optimize";

/**
 * POST /api/admin/products/supplier-import — henter varer fra Euro Mobile
 * Companys offentlige produktsider og opretter dem som kladder.
 *
 *   { action: "list",    url }          → produktlinks fra en kategori-/filterside (eller ét produktlink)
 *   { action: "preview", url }          → det vi kan læse af én produktside + dansk tekst og prisforslag
 *   { action: "create",  url, price? }  → opretter kladden med billeder, modeller og tekst
 *
 * Klienten kalder preview/create én vare ad gangen, så hvert kald er kort og
 * leverandørens side ikke får mange samtidige forespørgsler. Bag middleware.
 */
export const maxDuration = 60;

const MAX_LISTING_PAGES = 10; // 150 varer pr. import
const BROWSER_HEADERS = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36",
  accept: "text/html,application/xhtml+xml",
  "accept-language": "en",
};

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list"), url: z.string().url() }),
  z.object({ action: z.literal("preview"), url: z.string().url() }),
  z.object({ action: z.literal("create"), url: z.string().url(), price: z.number().int().positive().nullable().optional() }),
]);

async function fetchPage(url: string): Promise<string> {
  const res = await safeFetchPublic(url, { headers: BROWSER_HEADERS, timeoutMs: 20000 });
  if (!res.ok) throw new Error(res.status === 403 ? "blocked" : `http-${res.status}`);
  return res.text();
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Supabase = ReturnType<typeof createAdminClient>;

async function findExisting(supabase: Supabase, articleNumber: string | null): Promise<{ id: string; title: string; status: string } | null> {
  if (!articleNumber) return null;
  const safe = articleNumber.replace(/[^A-Za-z0-9._-]/g, "");
  if (!safe) return null;
  const { data } = await supabase
    .from("sku_products")
    .select("id, title, status")
    .or(`product_number.eq.${safe},barcode.eq.${safe},ean.eq.${safe}`)
    .limit(1);
  return data?.[0] ?? null;
}

function previewOf(product: EmcProduct, existing: Awaited<ReturnType<typeof findExisting>>) {
  const copy = danishCopy(product);
  return {
    url: product.sourceUrl,
    articleNumber: product.articleNumber,
    supplierTitle: product.title,
    title: copy.title,
    brand: product.brand,
    subcategory: product.guess.subcategory,
    models: product.modelSlugs,
    unknownModels: product.unknownModels,
    image: product.imageUrls[0] ?? null,
    imageCount: product.imageUrls.length,
    advisedPriceEur: product.advisedPriceEur,
    suggestedPrice: suggestedPriceOere(product.advisedPriceEur),
    existing,
  };
}

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  const input = parsed.data;
  if (!isEmcUrl(input.url)) {
    return NextResponse.json({ error: "Linket skal være fra euromobilecompany.com" }, { status: 400 });
  }

  try {
    if (input.action === "list") {
      if (isEmcProductUrl(input.url)) return NextResponse.json({ productUrls: [input.url.split(/[?#]/)[0]], total: 1, truncated: false });
      const first = parseEmcListing(await fetchPage(listingPageUrl(input.url, 1)));
      const urls = [...first.productUrls];
      const pages = Math.min(first.pages, MAX_LISTING_PAGES);
      for (let page = 2; page <= pages; page++) {
        await pause(400);
        for (const u of parseEmcListing(await fetchPage(listingPageUrl(input.url, page))).productUrls) if (!urls.includes(u)) urls.push(u);
      }
      return NextResponse.json({ productUrls: urls, total: first.total, truncated: first.pages > MAX_LISTING_PAGES });
    }

    if (!isEmcProductUrl(input.url)) return NextResponse.json({ error: "Det er ikke et produktlink" }, { status: 400 });
    const supabase = createAdminClient();
    const product = parseEmcProduct(await fetchPage(input.url), input.url.split(/[?#]/)[0]);
    if (!product.title) return NextResponse.json({ error: "Siden kunne ikke læses som et produkt" }, { status: 422 });
    const existing = await findExisting(supabase, product.articleNumber);

    if (input.action === "preview") return NextResponse.json(previewOf(product, existing));

    // ---- create -----------------------------------------------------------
    if (existing) return NextResponse.json({ error: `Findes allerede: ${existing.title}`, existing }, { status: 409 });
    const price = input.price ?? suggestedPriceOere(product.advisedPriceEur);
    if (!price) return NextResponse.json({ error: "Varen har ingen vejledende pris. Angiv en pris." }, { status: 400 });

    const copy = danishCopy(product);
    const [row] = buildAccessoryRows({
      title: copy.title,
      subcategory: product.guess.subcategory,
      brand: product.brand,
      models: product.modelSlugs,
      mode: "universal",
      sellingPrice: price,
      images: [],
      description: copy.description,
      shortDescription: copy.shortDescription,
      highlights: copy.highlights,
      attributes: product.guess.attributes,
      alwaysInStock: true,
      status: "draft",
    });

    // Billeder hentes hjem, gøres små og lægges i vores eget lager
    const images: string[] = [];
    for (const source of product.imageUrls.slice(0, 6)) {
      try {
        const res = await safeFetchPublic(source, { headers: { "user-agent": BROWSER_HEADERS["user-agent"], accept: "image/*" }, timeoutMs: 20000 });
        const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
        if (!res.ok || !type.startsWith("image/")) continue;
        const image = await optimizeProductImage(Buffer.from(await res.arrayBuffer()), type);
        const name = `accessories/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${image.ext}`;
        const { error } = await supabase.storage.from("product-images").upload(name, image.data, { contentType: image.contentType, cacheControl: IMAGE_CACHE_SECONDS, upsert: false });
        if (!error) images.push(supabase.storage.from("product-images").getPublicUrl(name).data.publicUrl);
      } catch {
        // ét manglende billede stopper ikke importen
      }
    }

    const { data: taken } = await supabase.from("sku_products").select("slug").like("slug", `${row.slug}%`);
    const [slug] = uniqueSlugs([row.slug], new Set((taken ?? []).map((r) => r.slug as string).filter(Boolean)));

    const { data: created, error: insertError } = await supabase
      .from("sku_products")
      .insert({
        ...row,
        slug,
        images,
        attributes: { ...row.attributes, ...copy.attributes },
        product_number: product.articleNumber,
        barcode: product.articleNumber,
        specifications: { ...(row.specifications as Record<string, unknown>), source_url: product.sourceUrl, supplier_title: product.title },
      })
      .select("id, title, slug")
      .single();
    if (insertError || !created) {
      return NextResponse.json({ error: insertError?.code === "23505" ? "Varenummeret findes allerede" : "Kladden kunne ikke oprettes" }, { status: insertError?.code === "23505" ? 409 : 500 });
    }

    // Samme modelkobling som redigér-siden laver, så krydssalg og "Passer til" virker med det samme
    const { data: templates } = await supabase.from("product_templates").select("id, display_name");
    const plan = planTemplateLinks([], product.modelSlugs, (templates ?? []) as { id: string; display_name: string | null }[]);
    if (plan.add.length) await supabase.from("sku_product_templates").insert(plan.add.map((template_id) => ({ sku_product_id: created.id, template_id })));

    revalidatePath("/tilbehoer", "layout");
    return NextResponse.json({ ...created, images: images.length, price }, { status: 201 });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "blocked") return NextResponse.json({ error: "Leverandørens side afviste forespørgslen. Prøv igen om lidt." }, { status: 502 });
    if (code.startsWith("http-")) return NextResponse.json({ error: `Leverandørens side svarede ${code.slice(5)}` }, { status: 502 });
    return NextResponse.json({ error: err instanceof Error && /Ukendt|gyldig|Titel|Salgspris/.test(err.message) ? err.message : "Importen fejlede. Prøv igen." }, { status: 500 });
  }
}
