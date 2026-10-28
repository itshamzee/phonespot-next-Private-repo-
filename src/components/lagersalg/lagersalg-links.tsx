import Link from "next/link";
import { coversForModel, getSaleCovers, lowestKr } from "@/app/lagersalg/sale-view";
import { accessoryModelSlug } from "@/lib/product/accessory-models";
import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import { StorefrontIcon } from "@/components/ui/storefront-icon";

/** Forsiden viser først båndet, når lagersalget har et reelt udvalg. */
export const HOME_STRIP_MIN = 20;

type Covers = Awaited<ReturnType<typeof getSaleCovers>>;

function photos(rows: Covers, n: number): { src: string; alt: string }[] {
  const out: { src: string; alt: string }[] = [];
  for (const r of rows) {
    const src = Array.isArray(r.images) ? (r.images[0] as string | undefined) : undefined;
    if (src && out.length < n) out.push({ src, alt: r.title });
  }
  return out;
}

/** Tre covers fra lageret, lagt let forskudt som på et bord. */
function CoverStack({ items, small = false }: { items: { src: string; alt: string }[]; small?: boolean }) {
  const tilt = ["-rotate-6 translate-y-2", "z-10", "rotate-6 translate-y-2"];
  return (
    <div aria-hidden className={`flex items-end justify-center ${small ? "gap-0" : "-space-x-6"}`}>
      {items.map((p, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={p.src}
          src={p.src}
          alt=""
          loading="lazy"
          className={`${small ? "h-[84px] w-[60px]" : "h-[176px] w-[124px]"} rounded-[8px] border border-[#e2e7de] bg-white object-cover shadow-[0_10px_24px_-14px_rgba(26,61,46,0.45)] ${tilt[i] ?? ""}`}
        />
      ))}
    </div>
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
        className="group flex items-center justify-between gap-5 rounded-[10px] border border-[#e2e7de] bg-[#eef0eb] px-5 py-4 text-[#1a3d2e] md:px-7"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-[12px] font-[550]">
            <StorefrontIcon kind="bag" className="h-[17px] w-[17px]" />
            Lagersalg
          </span>
          <span className="mt-1.5 block text-[22px] font-[550] leading-tight tracking-[-0.03em] md:text-[26px]">
            Covers til din {device.label} fra {min} kr.
          </span>
          <span className="mt-1 block text-[13px] text-[#576354]">
            {rows.length} {rows.length === 1 ? "nyt cover" : "nye covers"} fra vores lager i Vejle.{" "}
            <span className="font-semibold text-[#1a3d2e] underline-offset-4 group-hover:underline">Se covers</span>
          </span>
        </span>
        <span className="hidden shrink-0 sm:block">
          <CoverStack items={photos(rows, 2)} small />
        </span>
      </Link>
    </section>
  );
}

/** Kort på forsiden i samme opbygning som Reparation og Sælg din enhed, når der er nok covers. */
export async function LagersalgHomeStrip() {
  const rows = await getSaleCovers();
  const min = lowestKr(rows);
  if (rows.length < HOME_STRIP_MIN || !min) return null;
  const models = new Set(rows.flatMap((r) => (Array.isArray(r.compatible_models) ? r.compatible_models : []))).size;

  return (
    <section aria-label="Lagersalg" className="my-4">
      <article className="relative grid overflow-hidden rounded-[10px] border border-[#e2e7de] bg-[#eef0eb] text-[#1a3d2e] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="px-6 pb-10 pt-6 md:px-[30px] md:pb-[42px] md:pt-[26px]">
          <div className="mb-[13px] flex items-center gap-2 text-[12px] font-[550]">
            <StorefrontIcon kind="bag" className="h-[17px] w-[17px]" />
            Lagersalg
          </div>
          <h2 className="mb-[13px] text-[29px] font-[550] leading-[1.08] tracking-[-1.25px] md:text-[32px]">
            Covers fra {min} kr.
            <br />
            Direkte fra lageret.
          </h2>
          <p className="mb-5 max-w-[360px] text-[13px] leading-[1.65] text-[#576354]">
            {rows.length} nye covers til {models} modeller.
            <br />
            Find et, der passer til din telefon.
          </p>
          <Link
            href="/lagersalg"
            className="inline-flex min-h-[43px] items-center justify-between gap-[18px] rounded-[5px] bg-[#1a3d2e] px-[19px] py-3 text-[12px] font-semibold !text-white transition-colors hover:bg-[#294d39]"
          >
            Find dit cover
            <StorefrontIcon kind="arrow" className="h-5 w-5" />
          </Link>
        </div>
        <div className="hidden px-12 pb-8 pt-10 md:block">
          <CoverStack items={photos(rows, 3)} />
        </div>
        <span className="absolute bottom-[14px] left-6 text-[10px] opacity-70 md:left-[30px]">Hent i Vejle eller Slagelse, eller få dem sendt</span>
      </article>
    </section>
  );
}
