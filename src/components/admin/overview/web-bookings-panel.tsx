import Link from "next/link";
import { countWebBookings, STALE_AFTER_DAYS, type WebBookings } from "@/lib/admin/overview/web-bookings";
import { linkClass } from "./parts";

/**
 * "Nye reparationsanmodninger" øverst på Overblik: alle web-bookinger, ingen har
 * modtaget endnu, grupperet efter den dag kunden kommer. Erstatter "Kommer i dag",
 * som kun viste dagens og derfor skjulte en booking til i morgen eller senere.
 */
export function WebBookingsPanel({ data }: { data: WebBookings }) {
  const { groups, stale } = data;
  const total = countWebBookings(groups);

  return (
    <section aria-labelledby="web-bookinger" className="min-w-0 overflow-hidden rounded-xl border border-[#E2E5E0] bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-4">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 id="web-bookinger" className="m-0 text-[17px] font-bold">
            Nye reparationsanmodninger
          </h2>
          <span className="text-[14px] text-[#5E6A63]">
            {total === 0 ? "Ingen venter" : total === 1 ? "1 er ikke modtaget endnu" : `${total} er ikke modtaget endnu`}
          </span>
        </div>
        <Link href="/admin/reparationer?fane=web" className={`text-[14px] ${linkClass}`}>
          Se alle i Sagsstyring
        </Link>
      </div>

      {total === 0 ? (
        <p className="m-0 border-t border-[#EEF0EC] px-5 py-3 text-[14px] text-[#5E6A63]">
          Nye bookinger fra hjemmesiden vises her, så snart de kommer ind.
        </p>
      ) : (
        groups.map((g) => (
          <div key={g.key}>
            <div
              className={`border-t border-[#EEF0EC] px-5 pb-1.5 pt-2.5 text-[13px] font-semibold ${
                g.kind === "overskredet" ? "bg-[#FDECEC] text-[#B42318]" : "text-[#5E6A63]"
              }`}
            >
              {g.label}
            </div>
            {g.items.map((b) => (
              <div
                key={b.id}
                className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-t border-[#EEF0EC] px-5 py-3 text-[14px] md:grid-cols-[150px_minmax(0,1fr)_130px_100px_120px] ${
                  g.kind === "idag" ? "bg-[#FFFBF2]" : ""
                }`}
              >
                <div className="order-1 font-semibold tabular-nums md:order-none">
                  {b.time ?? "Ingen tid valgt"}
                </div>
                <div className="order-3 col-span-2 min-w-0 md:order-none md:col-span-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/reparationer/${b.id}`} className="font-semibold text-inherit no-underline hover:underline">
                      {b.customer}
                    </Link>
                    {b.isNew ? (
                      <span className="rounded-full bg-[#EAF2ED] px-2 py-px text-[12px] font-semibold text-[#1A3D2E]">Ny</span>
                    ) : null}
                  </div>
                  <div className="truncate text-[#5E6A63]">
                    {b.title}
                    {b.price ? ` · ${b.price}` : ""}
                  </div>
                </div>
                <div className="order-4 text-[#5E6A63] md:order-none">{b.label}</div>
                <div className="order-5 md:order-none">{b.store}</div>
                <div className="order-2 flex justify-end md:order-none">
                  <Link
                    href={`/admin/reparationer/${b.id}`}
                    className={
                      g.kind === "idag"
                        ? "rounded-lg bg-[#1A3D2E] px-4 py-2 text-[13px] font-semibold text-white no-underline hover:bg-[#2D6B45]"
                        : "rounded-lg border border-[#E2E5E0] px-3 py-2 text-[13px] text-[#15211B] no-underline hover:bg-[#F5F6F4]"
                    }
                  >
                    {g.kind === "idag" ? "Modtag" : "Åbn sag"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {stale > 0 ? (
        <p className="m-0 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-[#EEF0EC] px-5 py-3 text-[14px] text-[#5E6A63]">
          <span>
            {stale === 1 ? "1 ældre booking" : `${stale} ældre bookinger`} (over {STALE_AFTER_DAYS} dage) er aldrig modtaget eller
            afsluttet.
          </span>
          <Link href="/admin/reparationer?fane=web" className={linkClass}>
            Ryd op i Sagsstyring
          </Link>
        </p>
      ) : null}
    </section>
  );
}
