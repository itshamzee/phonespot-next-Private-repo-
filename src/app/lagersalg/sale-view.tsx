import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PUBLIC_ACCESSORY_COLUMNS, toPublicAccessory } from "@/lib/product/model-accessories";
import { DEVICE_BRANDS, TILBEHOER_DEVICES, type TilbehoerDevice } from "@/lib/tilbehoer-config";
import { parseListPriceKr } from "@/lib/product/list-price";
import { AccessoryCard } from "@/components/tilbehoer/accessory-card";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumb } from "@/components/tilbehoer/breadcrumb";
import { LagersalgFinder, type FinderModel } from "./lagersalg-finder";

/**
 * Lagersalg: covers fra lageret i Vejle, markeret med attributten udsalg = "Ja"
 * (sættes af hurtig tilbehørsoptagelsen). Faste lave priser uden førpris; ægte
 * mærkevarer kan vise en dokumenteret vejledende pris (attribut vejl_pris).
 * /lagersalg viser modeloversigten og alle covers; /lagersalg/[model] én telefon.
 */

export const SALE_URL = "https://phonespot.dk/lagersalg";
/** A model page needs this many covers before it is indexed (no thin pages). */
export const MIN_INDEXABLE = 3;

type Row = Parameters<typeof toPublicAccessory>[0] & { attributes: Record<string, string> | null };

export async function getSaleCovers(): Promise<Row[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("checkout_sku_inventory")
      .select(`${PUBLIC_ACCESSORY_COLUMNS}, attributes`)
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

/** Modeller med covers på lager i listens rækkefølge (nyeste først) til modelvælgeren. */
function finderModels(rows: Row[]): FinderModel[] {
  const counts = new Map<string, number>();
  for (const row of rows) for (const slug of modelSlugs(row)) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  const brandLabel = new Map(DEVICE_BRANDS.map((b) => [b.slug as string, b.label]));
  return TILBEHOER_DEVICES.filter((d) => counts.has(d.slug)).map((d) => ({
    slug: d.slug,
    label: d.label,
    brand: d.brand,
    brandLabel: brandLabel.get(d.brand) ?? d.brand,
    count: counts.get(d.slug)!,
  }));
}

export async function CoversSaleView({ selected }: { selected: TilbehoerDevice | null }) {
  const rows = await getSaleCovers();
  const models = finderModels(rows);
  const shown = selected ? coversForModel(rows, selected.slug) : rows;
  const min = lowestKr(shown.length ? shown : rows);
  const pageUrl = selected ? `${SALE_URL}/${selected.slug}` : SALE_URL;
  const cards = shown.map((r) => ({ ...toPublicAccessory(r), listPriceKr: parseListPriceKr(r.attributes) }));

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
      {cards.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: cards.slice(0, 50).map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: p.slug ? `https://phonespot.dk/tilbehoer/${p.category}/${p.slug}` : pageUrl,
              name: p.name,
            })),
          }}
        />
      )}

      <div className="mx-auto max-w-[1280px] px-5 pt-4 sm:px-9">
        <Breadcrumb
          items={[
            { label: "Tilbehør", href: "/tilbehoer" },
            selected ? { label: "Lagersalg", href: "/lagersalg" } : { label: "Lagersalg" },
            ...(selected ? [{ label: selected.label }] : []),
          ]}
        />
      </div>

      <section className="mx-auto max-w-[1280px] px-5 pb-5 pt-3 sm:px-9 md:pb-8 md:pt-10">
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-12">
          <div>
            <h1 className="font-display text-[40px] font-bold leading-[0.95] tracking-tight text-charcoal sm:text-[56px] md:text-[64px]">
              {selected ? `Covers til ${selected.label}` : "Lagersalg"}
            </h1>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-charcoal/70 md:text-base">
              {selected
                ? `Nye covers lavet til ${selected.label}${min ? ` fra ${min} kr.` : "."} Fra vores lager i Vejle, så længe lageret rækker.`
                : `Nye covers til iPhone og Samsung${min ? ` fra ${min} kr.` : ""}, direkte fra vores lager i Vejle. Så længe lageret rækker.`}
            </p>
          </div>
          {models.length > 0 && <LagersalgFinder models={models} selected={selected?.slug ?? null} />}
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 pb-16 pt-2 sm:px-9 md:pt-4">
        {cards.length > 0 ? (
          <>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-sand pb-3">
              <h2 className="text-[15px] font-semibold text-charcoal">
                {cards.length} {cards.length === 1 ? "cover" : "covers"}{selected ? ` til ${selected.label}` : " på lagersalg"}
              </h2>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-charcoal/60 md:text-sm">
                <li>Gratis levering til pakkeshop</li>
                <li>Hent i Vejle eller Slagelse</li>
                <li>2 års reklamationsret</li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {cards.map((p) => (
                <AccessoryCard key={p.id} {...p} />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-sand bg-white p-8 text-center">
            <p className="text-lg font-semibold text-charcoal">
              {selected ? `Ingen covers til ${selected.label} på lagersalg lige nu` : "Lagersalget fyldes op lige nu"}
            </p>
            <p className="mt-2 text-charcoal/70">
              {selected ? "Se de andre modeller, eller se " : "Vi lægger covers ind fra lageret i løbet af dagen. Se imens "}
              <Link href={selected ? "/lagersalg" : "/tilbehoer/covers"} className="underline underline-offset-4">
                {selected ? "lagersalget" : "alle covers"}
              </Link>
              .
            </p>
          </div>
        )}
      </section>
    </>
  );
}
