import Link from "next/link";
import { fetchAllSpotSkus, groupByVariantGroup } from "@/lib/spot/queries";

export const dynamic = "force-dynamic";

export default async function SpotOverviewPage() {
  const skus = await fetchAllSpotSkus();
  const total = skus.length;
  const active = skus.filter(s => s.is_active).length;
  const groups = groupByVariantGroup(skus).size;

  return (
    <div className="p-8 space-y-6">
      <Link href="/admin/tilbehoer" className="text-sm text-gray-500 hover:text-gray-700">
        ← Tilbage til Tilbehør
      </Link>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Beskyttelsesglas (Spot)</h1>
          <p className="text-gray-500">Tempered glass, privacy, linse- og plateaubeskyttere med 3-for-2 og Lens-combo bundles.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/spot/opret" className="px-4 py-2 rounded-lg bg-black text-white">
            Opret nyt Spot-produkt
          </Link>
          <Link href="/admin/spot/bulk-edit" className="px-4 py-2 rounded-lg border">
            Rediger lager
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total SKUs"     value={total} />
        <Stat label="Aktive"         value={active} />
        <Stat label="Produktgrupper" value={groups} />
        <Stat label="Inaktive"       value={total - active} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Produktgrupper</h2>
        <GroupsTable skus={skus} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function GroupsTable({ skus }: { skus: Awaited<ReturnType<typeof fetchAllSpotSkus>> }) {
  const groups = groupByVariantGroup(skus);
  const rows = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  if (rows.length === 0) {
    return <p className="text-gray-500 text-sm">Ingen Spot-produkter oprettet endnu. <Link href="/admin/spot/opret" className="underline">Opret det første</Link>.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500 border-b">
          <th className="py-2">Gruppe</th>
          <th>Varianter</th>
          <th>Modeller</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([group, list]) => (
          <tr key={group} className="border-b">
            <td className="py-2 font-mono text-xs">{group}</td>
            <td>{list.map(r => r.variant_label).filter(Boolean).join(", ")}</td>
            <td>{list[0].compatible_models.length} modeller</td>
            <td className="text-right">
              <Link href={`/admin/spot/bulk-edit?group=${encodeURIComponent(group)}`} className="text-blue-600">Rediger</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
