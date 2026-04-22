import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TILBEHOER_DEVICES, SPOT_HUB_TILES } from "@/lib/tilbehoer-config";
import { fetchActiveSpotSkus } from "@/lib/spot/queries";

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> {
  const { brand } = await params;
  const tile = SPOT_HUB_TILES.find(t => t.id === brand);
  if (!tile) return {};
  return {
    title: `${tile.label} beskyttelsesglas · alle modeller · PhoneSpot`,
    description: `Hærdet beskyttelsesglas til alle ${tile.label}-modeller. Perfekt pasform, 9H hårdhed, gratis montering i Vejle og Slagelse.`,
    alternates: { canonical: `/beskyttelsesglas/${brand}` },
  };
}

export async function generateStaticParams() {
  return SPOT_HUB_TILES.map(t => ({ brand: t.id }));
}

export default async function BrandPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand } = await params;
  const tile = SPOT_HUB_TILES.find(t => t.id === brand);
  if (!tile) notFound();

  const skus = await fetchActiveSpotSkus();
  const coveredModels = new Set(skus.flatMap(s => s.compatible_models));

  const brandModels = TILBEHOER_DEVICES.filter(d =>
    d.brand === tile.brand &&
    (tile.modelPrefix ? d.slug.startsWith(tile.modelPrefix) : true) &&
    coveredModels.has(d.slug)
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/beskyttelsesglas" className="hover:underline">Beskyttelsesglas</Link>
        <span className="mx-2">→</span>
        <span>{tile.label}</span>
      </nav>
      <h1 className="text-4xl md:text-5xl font-semibold">{tile.label} beskyttelsesglas</h1>
      <p className="mt-4 text-gray-600 max-w-2xl">
        Hærdet 9H glas til alle {tile.label}-modeller. Perfekt pasform, HD-klarhed og gratis montering i Vejle og Slagelse.
      </p>

      {brandModels.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-gray-500">Ingen modeller tilgængelige endnu — kig forbi igen snart.</p>
          <Link href="/beskyttelsesglas" className="mt-4 inline-block underline">Tilbage til beskyttelsesglas</Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {brandModels.map(m => (
            <Link key={m.slug} href={`/beskyttelsesglas/${brand}/${m.slug}`}
                  className="group rounded-2xl border border-gray-200 p-5 hover:border-black hover:-translate-y-1 transition">
              <div className="aspect-square bg-gray-50 rounded-xl mb-3" />
              <div className="font-medium">{m.label}</div>
              <div className="text-sm text-gray-500 group-hover:text-black">Fra 199 kr →</div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
