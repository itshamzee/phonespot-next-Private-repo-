import Link from "next/link";
import { coversForModel, getSaleCovers, lowestKr } from "@/app/lagersalg/sale-view";
import { accessoryModelSlug } from "@/lib/product/accessory-models";
import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";

/** Forsiden viser først båndet, når lagersalget har et reelt udvalg. */
export const HOME_STRIP_MIN = 20;

/** Gul pris som på lagersalgssiden (sidens eneste accent til lagersalgspriser). */
function Price({ kr }: { kr: number }) {
  return (
    <span className="shrink-0 rounded-md bg-[#FFE27A] px-3 py-1.5 font-display text-xl font-bold leading-none text-charcoal">
      fra {kr} kr.
    </span>
  );
}

/** Under telefonens produktside: covers til netop den model på lagersalg. Skjules uden lager. */
export async function LagersalgModelLink({ model }: { model: string | null | undefined }) {
  if (!model) return null;
  const slug = accessoryModelSlug(model);
  const device = TILBEHOER_DEVICES.find((d) => d.slug === slug);
  if (!device) return null;
  const rows = coversForModel(await getSaleCovers(), slug);
  const min = lowestKr(rows);
  if (!rows.length || !min) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-8">
      <Link
        href={`/lagersalg/${slug}`}
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-sand bg-white px-5 py-4 transition-colors hover:border-charcoal/25 md:px-7"
      >
        <span>
          <span className="block font-display text-2xl font-bold leading-tight tracking-tight text-charcoal">
            Covers til din {device.label}
          </span>
          <span className="mt-0.5 block text-sm text-charcoal/65">
            {rows.length} {rows.length === 1 ? "nyt cover" : "nye covers"} på lagersalg fra vores lager i Vejle
          </span>
        </span>
        <Price kr={min} />
      </Link>
    </section>
  );
}

/** Bånd på forsiden, når der er nok covers på lagersalg. */
export async function LagersalgHomeStrip() {
  const rows = await getSaleCovers();
  const min = lowestKr(rows);
  if (rows.length < HOME_STRIP_MIN || !min) return null;
  const models = new Set(rows.flatMap((r) => (Array.isArray(r.compatible_models) ? r.compatible_models : []))).size;

  return (
    <Link
      href="/lagersalg"
      className="my-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl bg-[#1A3D2E] px-5 py-5 text-white transition-colors hover:bg-[#244f3c] md:px-8 md:py-6"
    >
      <span>
        <span className="block font-display text-3xl font-bold leading-none tracking-tight md:text-4xl">Covers på lagersalg</span>
        <span className="mt-2 block text-sm text-white/75">
          {rows.length} nye covers til {models} modeller. Find covers til din telefon.
        </span>
      </span>
      <Price kr={min} />
    </Link>
  );
}
