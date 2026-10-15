import Link from "next/link";
import { formatOere } from "@/lib/cart/utils";
import { PAYMENT_LABELS, PAYMENT_TYPES } from "@/lib/pos/constants";
import {
  PERIOD_LABELS,
  PERIOD_PRESETS,
  REFUND_LABELS,
  buildQuery,
  type SaleListRow,
  type SalesFilters,
  type SalesTotals,
} from "@/lib/pos/sales-history";

const card = "rounded-2xl border border-black/[0.04] bg-white shadow-sm";
const input =
  "rounded-xl border border-black/[0.08] bg-[#f4f3f0] px-3 py-2.5 text-sm text-charcoal focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10";

export function formatSaleDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("da-DK", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Copenhagen" }),
    time: d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" }),
  };
}

function periodTitle(f: SalesFilters, fromDate: string, toDate: string) {
  if (f.period !== "periode" && f.period !== "uge") return PERIOD_LABELS[f.period];
  return fromDate === toDate ? fromDate : `${fromDate} til ${toDate}`;
}

export function SalesFilterBar({ filters }: { filters: SalesFilters }) {
  return (
    <div className="space-y-3">
      <nav aria-label="Periode" className="flex flex-wrap gap-1.5">
        {PERIOD_PRESETS.map((p) => {
          const active = filters.period === p;
          return (
            <Link
              key={p}
              href={`/admin/kasse/salg${buildQuery(filters, { period: p, page: 1 })}`}
              aria-current={active ? "page" : undefined}
              className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                active ? "bg-[#1A3D2E] text-white" : "bg-white text-charcoal/70 hover:bg-black/[0.04]"
              }`}
            >
              {PERIOD_LABELS[p]}
            </Link>
          );
        })}
      </nav>
      <form method="get" action="/admin/kasse/salg" className="flex flex-wrap items-end gap-3">
        {filters.period !== "i-dag" && <input type="hidden" name="periode" value={filters.period} />}
        {filters.period === "periode" && (
          <>
            <label className="text-xs text-charcoal/50">
              Fra
              <input type="date" name="fra" defaultValue={filters.from} className={`${input} mt-1 block`} />
            </label>
            <label className="text-xs text-charcoal/50">
              Til
              <input type="date" name="til" defaultValue={filters.to} className={`${input} mt-1 block`} />
            </label>
          </>
        )}
        <label className="text-xs text-charcoal/50">
          Betaling
          <select name="betaling" defaultValue={filters.payment} className={`${input} mt-1 block`}>
            <option value="">Alle betalingsmåder</option>
            {PAYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {PAYMENT_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[14rem] flex-1 text-xs text-charcoal/50">
          Søg
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="Bonnr., kundenavn, telefon eller sagsnr."
            className={`${input} mt-1 block w-full`}
          />
        </label>
        <button type="submit" className="rounded-xl bg-[#1A3D2E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2D6B45]">
          Vis
        </button>
        {(filters.q || filters.payment) && (
          <Link href={`/admin/kasse/salg${buildQuery(filters, { q: "", payment: "", page: 1 })}`} className="py-2.5 text-sm text-charcoal/50 hover:text-charcoal">
            Nulstil
          </Link>
        )}
      </form>
    </div>
  );
}

export function SalesTotalsCard({
  totals,
  title,
}: {
  totals: SalesTotals;
  title: string;
}) {
  return (
    <section aria-label="Total for perioden" className={`${card} p-5`}>
      <p className="text-xs font-medium text-charcoal/50">{title}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-8 gap-y-2">
        <p className="text-3xl font-bold tabular-nums text-[#1A3D2E]">{formatOere(totals.total)}</p>
        <p className="text-sm text-charcoal/60">
          {totals.count} salg
          {totals.returned > 0 ? ` · retur ${formatOere(totals.returned)}` : ""}
        </p>
      </div>
      {totals.byPayment.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-charcoal/60">
          {totals.byPayment.map((p) => (
            <li key={p.label}>
              {p.label} <span className="font-medium tabular-nums text-charcoal">{formatOere(p.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SalesTable({ rows, empty }: { rows: SaleListRow[]; empty: string }) {
  if (rows.length === 0) {
    return (
      <div className={`${card} py-16 text-center`}>
        <p className="text-sm font-medium text-charcoal/40">{empty}</p>
      </div>
    );
  }
  return (
    <div className={`${card} overflow-x-auto`}>
      <table className="w-full min-w-[56rem] text-left text-sm">
        <thead>
          <tr className="border-b border-black/[0.06] text-xs text-charcoal/50">
            <th className="px-4 py-3 font-medium">Bonnr.</th>
            <th className="px-4 py-3 font-medium">Tidspunkt</th>
            <th className="px-4 py-3 font-medium">Kunde</th>
            <th className="px-4 py-3 font-medium">Solgt</th>
            <th className="px-4 py-3 font-medium">Betaling</th>
            <th className="px-4 py-3 font-medium">Ekspedient</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const { date, time } = formatSaleDate(r.createdAt);
            return (
              <tr key={r.id} className="border-b border-black/[0.04] last:border-0 hover:bg-[#faf9f7]">
                <td className="px-4 py-3 font-semibold">
                  <Link href={`/admin/kasse/salg/${r.id}`} className="text-[#1A3D2E] hover:underline">
                    {r.orderNumber}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-charcoal/70">
                  {date} <span className="text-charcoal/40">{time}</span>
                </td>
                <td className="px-4 py-3">
                  {r.customerName ?? <span className="text-charcoal/40">Kunde uden navn</span>}
                  {r.customerPhone && <span className="block text-xs text-charcoal/40">{r.customerPhone}</span>}
                </td>
                <td className="max-w-[18rem] px-4 py-3 text-charcoal/70">
                  <span className="block truncate" title={r.summary}>
                    {r.summary}
                  </span>
                  {r.caseNumbers.length > 0 && <span className="block text-xs text-charcoal/40">Sag {r.caseNumbers.join(", ")}</span>}
                </td>
                <td className="px-4 py-3 text-charcoal/70">{r.payments}</td>
                <td className="px-4 py-3 text-charcoal/70">{r.staffName ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  <span className="font-semibold">{formatOere(r.total)}</span>
                  {r.refundState !== "ingen" && (
                    <span className="block text-xs font-medium text-amber-700">{REFUND_LABELS[r.refundState]}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function SalesPager({ filters, page, pages, matching }: { filters: SalesFilters; page: number; pages: number; matching: number }) {
  if (pages <= 1) return null;
  const link = (p: number) => `/admin/kasse/salg${buildQuery(filters, { page: p })}`;
  return (
    <nav aria-label="Sider" className="flex items-center justify-between text-sm text-charcoal/60">
      <span>
        Side {page} af {pages} · {matching} salg
      </span>
      <span className="flex gap-2">
        {page > 1 && (
          <Link href={link(page - 1)} className="rounded-xl bg-white px-3.5 py-2 font-medium hover:bg-black/[0.04]">
            Forrige
          </Link>
        )}
        {page < pages && (
          <Link href={link(page + 1)} className="rounded-xl bg-white px-3.5 py-2 font-medium hover:bg-black/[0.04]">
            Næste
          </Link>
        )}
      </span>
    </nav>
  );
}

export { periodTitle };
