import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PUBLIC_ACCESSORY_COLUMNS, toPublicAccessory } from "@/lib/product/model-accessories";
import { TILBEHOER_DEVICES, type TilbehoerDevice } from "@/lib/tilbehoer-config";
import { AccessoryCard } from "@/components/tilbehoer/accessory-card";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumb } from "@/components/tilbehoer/breadcrumb";

/**
 * Covers-udsalg: lagerrydning af covers markeret med attributten udsalg = "Ja"
 * (sættes af /admin/produkter/hurtig-cover). Faste lave priser uden førpris,
 * så siden ikke lover en rabat, der ikke er dokumenteret (30-dages-reglen).
 * /covers-udsalg viser alt; /covers-udsalg/[model] er en side pr. telefon.
 */

export const SALE_URL = "https://phonespot.dk/covers-udsalg";
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
    return (data as unknown as Row[]).filter(
      (r) => r.store_stock + r.online_stock > 0 || r.always_in_stock,
    );
  } catch {
    return [];
  }
}

function modelSlugs(row: Row): string[] {
  return Array.isArray(row.compatible_models)
    ? row.compatible_models.filter((m): m is string => typeof m === "string")
    : [];
}

export function lowestKr(rows: Row[]): number | null {
  return rows.length ? Math.min(...rows.map((r) => r.sale_price ?? r.selling_price)) / 100 : null;
}

export function coversForModel(rows: Row[], slug: string): Row[] {
  return rows.filter((r) => modelSlugs(r).includes(slug));
}

function chipClass(active: boolean): string {
  return `rounded-full border px-4 py-2 text-sm font-medium ${
    active ? "border-[#1A3D2E] bg-[#1A3D2E] text-white" : "border-sand bg-white text-charcoal hover:border-charcoal/30"
  }`;
}

export async function CoversSaleView({ selected }: { selected: TilbehoerDevice | null }) {
  const rows = await getSaleCovers();

  const counts = new Map<string, number>();
  for (const row of rows) for (const slug of modelSlugs(row)) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  const models = TILBEHOER_DEVICES.filter((d) => counts.has(d.slug));
  const shown = selected ? coversForModel(rows, selected.slug) : rows;
  const products = shown.map(toPublicAccessory);
  const min = lowestKr(shown.length ? shown : rows);
  const pageUrl = selected ? `${SALE_URL}/${selected.slug}` : SALE_URL;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
            { "@type": "ListItem", position: 2, name: "Tilbehør", item: "https://phonespot.dk/tilbehoer" },
            { "@type": "ListItem", position: 3, name: "Covers-udsalg", item: SALE_URL },
            ...(selected
              ? [{ "@type": "ListItem", position: 4, name: `Covers til ${selected.label}`, item: pageUrl }]
              : []),
          ],
        }}
      />
      {products.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: products.slice(0, 50).map((p, i) => ({
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
            selected ? { label: "Covers-udsalg", href: "/covers-udsalg" } : { label: "Covers-udsalg" },
            ...(selected ? [{ label: selected.label }] : []),
          ]}
        />
      </div>

      <section className="mx-auto max-w-[1280px] px-5 pb-6 pt-8 sm:px-9 md:pt-12">
        <p className="text-sm font-semibold text-[#1A3D2E]">Lagerrydning</p>
        <h1 className="mt-2 max-w-3xl font-display text-4xl font-bold tracking-tight text-charcoal md:text-6xl">
          {selected ? `Covers til ${selected.label}` : "Covers-udsalg"}
          {min ? <span className="block text-charcoal/55">fra {min} kr.</span> : null}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-charcoal/75 md:text-lg">
          {selected
            ? `Vi rydder lageret i Vejle. Covers til ${selected.label} til faste lave priser, så længe lager haves. Coverne er lavet til ${selected.label}, så knapper, kamera og stik sidder, hvor de skal.`
            : "Vi rydder lageret i Vejle. Faste lave priser på covers til iPhone og Samsung, så længe lager haves."}
        </p>
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-charcoal/75">
          <li>Gratis levering til pakkeshop</li>
          <li>Hent gratis i Vejle eller Slagelse</li>
          <li>14 dages fortrydelsesret</li>
          <li>2 års reklamationsret</li>
        </ul>
      </section>

      {models.length > 0 && (
        <nav aria-label="Vælg model" className="mx-auto max-w-[1280px] px-5 pb-6 sm:px-9">
          <h2 className="mb-3 text-sm font-semibold text-charcoal">Vælg din telefon</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/covers-udsalg" aria-current={!selected ? "page" : undefined} className={chipClass(!selected)}>
              Alle ({rows.length})
            </Link>
            {models.map((d) => (
              <Link
                key={d.slug}
                href={`/covers-udsalg/${d.slug}`}
                aria-current={selected?.slug === d.slug ? "page" : undefined}
                className={chipClass(selected?.slug === d.slug)}
              >
                {d.label} ({counts.get(d.slug)})
              </Link>
            ))}
          </div>
        </nav>
      )}

      <section className="mx-auto max-w-[1280px] px-5 pb-16 sm:px-9">
        {products.length > 0 ? (
          <>
            <h2 className="sr-only">{selected ? `Covers til ${selected.label}` : "Alle covers på udsalg"}</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <AccessoryCard key={p.id} {...p} />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-sand bg-white p-8 text-center">
            <p className="text-lg font-semibold text-charcoal">
              {selected ? `Ingen covers til ${selected.label} på udsalg lige nu` : "Udsalget fyldes op lige nu"}
            </p>
            <p className="mt-2 text-charcoal/70">
              {selected ? "Se de andre modeller ovenfor, eller se " : "Vi lægger covers ind fra lageret i løbet af dagen. Se imens "}
              <Link href="/tilbehoer/covers" className="underline underline-offset-4">alle covers</Link>.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
