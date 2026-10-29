import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PUBLIC_ACCESSORY_COLUMNS, toPublicAccessory } from "@/lib/product/model-accessories";
import { TILBEHOER_DEVICES, type TilbehoerDevice } from "@/lib/tilbehoer-config";
import { parseListPriceKr } from "@/lib/product/list-price";
import { JsonLd } from "@/components/seo/json-ld";
import { OutletShop } from "./outlet-shop";
import { caseTypeLabel, type OutletItem } from "./outlet-filter";

/**
 * Lagersalg: covers fra lageret i Vejle, markeret med attributten udsalg = "Ja"
 * (sættes af hurtig tilbehørsoptagelsen). Faste lave priser uden førpris; ægte
 * mærkevarer kan vise en dokumenteret vejledende pris (attribut vejl_pris).
 * /lagersalg viser modeloversigten og alle covers; /lagersalg/[model] én telefon.
 */

export const SALE_URL = "https://phonespot.dk/lagersalg";
/** A model page needs this many covers before it is indexed (no thin pages). */
export const MIN_INDEXABLE = 3;

type Row = Parameters<typeof toPublicAccessory>[0] & { attributes: Record<string, string> | null; always_in_stock: boolean | null };

export async function getSaleCovers(): Promise<Row[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("checkout_sku_inventory")
      .select(PUBLIC_ACCESSORY_COLUMNS)
      .eq("status", "published")
      .eq("is_active", true)
      .eq("category", "accessory")
      .eq("subcategory", "cover")
      .eq("attributes->>udsalg", "Ja")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error || !data) return [];
    return (data as unknown as Row[]).filter((r) => r.store_stock + r.online_stock > 0 || r.always_in_stock);
  } catch {
    return [];
  }
}

function modelSlugs(row: Row): string[] {
  return Array.isArray(row.compatible_models)
    ? row.compatible_models.filter((m): m is string => typeof m === "string")
    : [];
}

const priceOf = (r: Row) => r.sale_price ?? r.selling_price;

export function lowestKr(rows: Row[]): number | null {
  return rows.length ? Math.min(...rows.map(priceOf)) / 100 : null;
}

export function coversForModel(rows: Row[], slug: string): Row[] {
  return rows.filter((r) => modelSlugs(r).includes(slug));
}

/** Rækkerne som de sendes til browseren: kun det kortene og filtrene bruger. */
function toOutletItems(rows: Row[]): OutletItem[] {
  return rows.map((row) => {
    const pub = toPublicAccessory(row);
    return {
      id: pub.id,
      name: pub.name,
      slug: pub.slug,
      category: pub.category,
      brand: pub.brand,
      priceOre: priceOf(row),
      imageUrl: pub.image_url,
      stock: Math.max(0, (row.store_stock ?? 0) + (row.online_stock ?? 0)),
      orderable: Boolean(row.always_in_stock),
      models: modelSlugs(row)
        .map((slug) => DEVICE_BY_SLUG.get(slug))
        .filter((d): d is TilbehoerDevice => Boolean(d))
        .map((d) => ({ slug: d.slug, label: d.label, brand: d.brand })),
      color: row.attributes?.color?.trim() || null,
      type: caseTypeLabel(row.attributes?.case_type),
      listPriceKr: parseListPriceKr(row.attributes),
      createdAt: pub.created_at,
    };
  });
}

const DEVICE_BY_SLUG = new Map(TILBEHOER_DEVICES.map((d) => [d.slug, d]));

export async function CoversSaleView({ selected }: { selected: TilbehoerDevice | null }) {
  const rows = await getSaleCovers();
  const items = toOutletItems(rows);
  const shown = selected ? coversForModel(rows, selected.slug) : rows;
  const pageUrl = selected ? `${SALE_URL}/${selected.slug}` : SALE_URL;
  const listed = toOutletItems(shown);

  // Modelsider med et reelt udvalg linkes med almindelige links, så de kan findes og indekseres.
  const counts = new Map<string, number>();
  for (const row of rows) for (const slug of modelSlugs(row)) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  const modelLinks = TILBEHOER_DEVICES.filter((d) => (counts.get(d.slug) ?? 0) >= MIN_INDEXABLE);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
            { "@type": "ListItem", position: 2, name: "Tilbehør", item: "https://phonespot.dk/tilbehoer" },
            { "@type": "ListItem", position: 3, name: "Lagersalg", item: SALE_URL },
            ...(selected ? [{ "@type": "ListItem", position: 4, name: `Covers til ${selected.label}`, item: pageUrl }] : []),
          ],
        }}
      />
      {listed.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: listed.slice(0, 50).map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: p.slug ? `https://phonespot.dk/tilbehoer/${p.category}/${p.slug}` : pageUrl,
              name: p.name,
            })),
          }}
        />
      )}

      {items.length > 0 ? (
        <OutletShop items={items} initialModel={selected && counts.has(selected.slug) ? selected.slug : null} />
      ) : (
        <section className="mx-auto max-w-[1280px] px-4 py-16 sm:px-9">
          <h1 className="font-display text-[40px] font-bold leading-none tracking-tight text-charcoal">Lagersalget fyldes op</h1>
          <p className="mt-3 max-w-md text-charcoal/70">
            Vi lægger covers ind fra lageret løbende. Se imens{" "}
            <Link href="/tilbehoer/covers" className="underline underline-offset-4">
              alle covers
            </Link>
            .
          </p>
        </section>
      )}

      {modelLinks.length > 0 && (
        <nav aria-label="Lagersalg efter model" className="border-t border-sand bg-[#F7F7F8]">
          <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-9">
            <h2 className="text-[14px] font-semibold text-charcoal">Covers på lagersalg efter model</h2>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-charcoal/70">
              {modelLinks.map((d) => (
                <li key={d.slug}>
                  <Link href={`/lagersalg/${d.slug}`} className="underline-offset-4 hover:text-charcoal hover:underline">
                    Covers til {d.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}
    </>
  );
}
