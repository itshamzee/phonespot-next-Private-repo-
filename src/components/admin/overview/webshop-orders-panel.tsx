import Link from "next/link";
import { formatKr } from "@/lib/admin/overview/format";
import type { WebshopOrders } from "@/lib/admin/overview/webshop-orders";
import { linkClass } from "./parts";

/**
 * "Nye webshop-ordrer" øverst på Overblik for Webshop: betalte online-ordrer, der venter
 * på at blive pakket eller afhentet, ældste først. Samme opbygning som WebBookingsPanel.
 */
export function WebshopOrdersPanel({ data }: { data: WebshopOrders }) {
  const { items, total } = data;

  return (
    <section aria-labelledby="webshop-ordrer" className="min-w-0 overflow-hidden rounded-xl border border-[#E2E5E0] bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-4">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 id="webshop-ordrer" className="m-0 text-[17px] font-bold">
            Nye webshop-ordrer
          </h2>
          <span className="text-[14px] text-[#5E6A63]">
            {total === 0 ? "Ingen venter" : total === 1 ? "1 venter på at blive pakket" : `${total} venter på at blive pakket`}
          </span>
        </div>
        <Link href="/admin/platform/orders" className={`text-[14px] ${linkClass}`}>
          Alle webshop-ordrer
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="m-0 border-t border-[#EEF0EC] px-5 py-3 text-[14px] text-[#5E6A63]">
          Ingen ordrer venter. Nye betalte ordrer vises her.
        </p>
      ) : (
        items.map((o) => (
          <div
            key={o.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-t border-[#EEF0EC] px-5 py-3 text-[14px] md:grid-cols-[110px_minmax(0,1fr)_130px_90px_120px]"
          >
            <div className="order-1 font-semibold tabular-nums md:order-none">
              <Link href={`/admin/platform/orders/${o.id}`} className="text-inherit no-underline hover:underline">
                {o.number}
              </Link>
            </div>
            <div className="order-3 col-span-2 min-w-0 md:order-none md:col-span-1">
              <div className="truncate font-semibold">{o.customer}</div>
              <div className="truncate text-[#5E6A63]">
                {o.items === 1 ? "1 vare" : `${o.items} varer`} · {formatKr(o.total)}
              </div>
            </div>
            <div className={`order-4 md:order-none ${o.pickup ? "font-semibold text-[#15211B]" : "text-[#5E6A63]"}`}>
              {o.shipping}
            </div>
            <div className={`order-5 md:order-none ${o.overdue ? "font-semibold text-[#9A5B0A]" : "text-[#5E6A63]"}`}>
              {o.age}
            </div>
            <div className="order-2 flex justify-end md:order-none">
              <Link
                href={`/admin/platform/orders/${o.id}`}
                className="inline-flex min-h-[44px] items-center rounded-lg bg-[#1A3D2E] px-4 py-2 text-[13px] font-semibold text-white no-underline hover:bg-[#2D6B45] md:min-h-0"
              >
                Pak ordre
              </Link>
            </div>
          </div>
        ))
      )}

      {total > items.length ? (
        <p className="m-0 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-[#EEF0EC] px-5 py-3 text-[14px] text-[#5E6A63]">
          <span>
            Viser de {items.length} ældste af {total}.
          </span>
          <Link href="/admin/platform/orders" className={linkClass}>
            Se resten
          </Link>
        </p>
      ) : null}
    </section>
  );
}
