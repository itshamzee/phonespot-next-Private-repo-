import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PUBLIC_ACCESSORY_COLUMNS, toPublicAccessory } from "@/lib/product/model-accessories";
import { DEVICE_BRANDS, TILBEHOER_DEVICES, type TilbehoerDevice } from "@/lib/tilbehoer-config";
import { parseListPriceKr } from "@/lib/product/list-price";
import { AccessoryCard } from "@/components/tilbehoer/accessory-card";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumb } from "@/components/tilbehoer/breadcrumb";

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

type ModelEntry = { device: TilbehoerDevice; count: number; fromKr: number };

/** Modeller med covers på lager, grupperet pr. mærke i listens rækkefølge (nyeste først). */
function modelIndex(rows: Row[]): { brand: string; models: ModelEntry[] }[] {
  const stats = new Map<string, { count: number; min: number }>();
  for (const row of rows) {
    for (const slug of modelSlugs(row)) {
      const s = stats.get(slug) ?? { count: 0, min: Infinity };
      stats.set(slug, { count: s.count + 1, min: Math.min(s.min, priceOf(row)) });
    }
  }
  return DEVICE_BRANDS.map((b) => ({
    brand: b.label,
    models: TILBEHOER_DEVICES.filter((d) => d.brand === b.slug && stats.has(d.slug)).map((device) => {
      const s = stats.get(device.slug)!;
      return { device, count: s.count, fromKr: s.min / 100 };
    }),
  })).filter((g) => g.models.length > 0);
}

/** Gul hyldeetiket med pris: sidens eneste accentfarve, kun brugt til lagersalgspriser. */
function PriceTag({ kr }: { kr: number }) {
  return (
    <span className="relative inline-flex items-baseline gap-1.5 rounded-md bg-[#FFE27A] py-2 pl-7 pr-4 text-charcoal shadow-[0_1px_0_rgba(17,17,17,0.08)]">
      <span aria-hidden className="absolute left-2.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white ring-1 ring-charcoal/15" />
      <span className="text-sm font-medium">fra</span>
      <span className="font-display text-3xl font-bold leading-none tracking-tight md:text-4xl">{kr} kr.</span>
    </span>
  );
}

export async function CoversSaleView({ selected }: { selected: TilbehoerDevice | null }) {
  const rows = await getSaleCovers();
  const index = modelIndex(rows);
  const modelCount = index.reduce((n, g) => n + g.models.length, 0);
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

      <section className="mx-auto max-w-[1280px] px-5 pb-10 pt-8 sm:px-9 md:pb-14 md:pt-14">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-[15px] font-medium text-[#1A3D2E]">
              {selected ? (
                <Link href="/lagersalg" className="underline-offset-4 hover:underline">Lagersalg</Link>
              ) : (
                "Direkte fra vores lager i Vejle"
              )}
            </p>
            <h1 className="mt-3 font-display text-[44px] font-bold leading-[0.95] tracking-tight text-charcoal sm:text-6xl md:text-[84px]">
              {selected ? `Covers til ${selected.label}` : "Covers på lagersalg"}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-charcoal/70 md:text-lg">
              {selected
                ? `Nye covers lavet til ${selected.label}, så knapper, kamera og stik sidder, hvor de skal. Faste lave priser, så længe lageret rækker.`
                : `Nye covers til iPhone og Samsung, som vi rydder ud af lageret. ${rows.length > 0 ? `${rows.length} covers til ${modelCount} modeller` : "Udvalget fyldes op i løbet af dagen"}, faste lave priser, så længe lageret rækker.`}
            </p>
          </div>
          {min ? <PriceTag kr={min} /> : null}
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-2 border-t border-sand pt-5 text-sm text-charcoal/70">
          <li>Gratis levering til pakkeshop</li>
          <li>Hent gratis i Vejle eller Slagelse</li>
          <li>14 dages fortrydelsesret</li>
          <li>2 års reklamationsret</li>
        </ul>
      </section>

      {!selected && index.length > 0 && (
        <nav aria-labelledby="find-model" className="bg-[#F7F7F8]">
          <div className="mx-auto max-w-[1280px] px-5 py-10 sm:px-9 md:py-14">
            <h2 id="find-model" className="text-xl font-semibold text-charcoal md:text-2xl">Find din telefon</h2>
            <div className={`mt-6 grid gap-10 ${index.length > 1 ? "lg:grid-cols-2" : ""}`}>
              {index.map((group) => (
                <div key={group.brand}>
                  <h3 className="text-sm font-medium text-charcoal/55">{group.brand}</h3>
                  {/* Ét mærke: listen løber i to kolonner, så den ikke fylder en halv side. */}
                  <ul className={`mt-2 grid border-t border-sand ${index.length === 1 ? "md:grid-cols-2 md:gap-x-12" : ""}`}>
                    {group.models.map(({ device, count, fromKr }) => (
                      <li key={device.slug} className="border-b border-sand">
                        <Link
                          href={`/lagersalg/${device.slug}`}
                          className="group flex items-baseline justify-between gap-4 py-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A3D2E]"
                        >
                          <span className="font-display text-2xl font-semibold leading-tight tracking-tight text-charcoal group-hover:text-[#1A3D2E] md:text-[28px]">
                            {device.label}
                          </span>
                          <span className="shrink-0 text-right text-sm text-charcoal/65">
                            {count} {count === 1 ? "cover" : "covers"}
                            <span className="ml-3 font-semibold text-charcoal">fra {fromKr} kr.</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </nav>
      )}

      <section className="mx-auto max-w-[1280px] px-5 pb-16 pt-10 sm:px-9 md:pt-14">
        {cards.length > 0 ? (
          <>
            <div className="mb-6 flex items-baseline justify-between gap-4">
              <h2 className="text-xl font-semibold text-charcoal md:text-2xl">
                {selected ? `${cards.length} ${cards.length === 1 ? "cover" : "covers"} til ${selected.label}` : "Alle covers på lagersalg"}
              </h2>
              {selected && (
                <Link href="/lagersalg" className="shrink-0 text-sm text-charcoal/70 underline underline-offset-4">
                  Andre modeller
                </Link>
              )}
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
