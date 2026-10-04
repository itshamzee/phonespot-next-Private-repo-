"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SCOPE_LABELS, SCOPE_SLUGS, type ScopeSlug } from "@/lib/auth/store-scope";
import { canRequestRow, isLow, type OverviewRow } from "@/lib/stock/rules";
import { formatKr } from "@/lib/transfers/format";
import { RequestDialog } from "./request-dialog";

const TYPE_LABEL = { serievare: "Serievare", reservedel: "Reservedel", tilbehoer: "Tilbehør" } as const;

function priceLabel(row: OverviewRow): string {
  if (!row.price || row.price <= 0) return "–";
  if (row.priceMax && row.priceMax > row.price) return `fra ${formatKr(row.price)}`;
  return formatKr(row.price);
}

function subtitle(row: OverviewRow, mine: ScopeSlug | null): string {
  const parts: string[] = [TYPE_LABEL[row.itemType]];
  parts.push(row.vatScheme === "brugtmoms" ? "brugtmoms" : "25 % moms");
  const min = mine ? row.min[mine] : null;
  if (min && min > 0) parts.push(`min. ${min}`);
  if (row.inTransit > 0) parts.push(`${row.inTransit} på vej`);
  return parts.join(" · ");
}

/** Vareliste med søgning, butiksfilter, kostpris-toggle og Anmod. Data kommer server-side paginerede. */
export function VarerList({
  rows,
  total,
  page,
  perPage,
  q,
  kun,
  mine,
  canSeeCost,
}: {
  rows: OverviewRow[];
  total: number;
  page: number;
  perPage: number;
  q: string;
  kun: boolean;
  mine: ScopeSlug | null;
  canSeeCost: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(q);
  const [showCost, setShowCost] = useState(true);
  const [requesting, setRequesting] = useState<OverviewRow | null>(null);
  const first = useRef(true);

  function go(next: { q?: string; kun?: boolean; page?: number }) {
    const params = new URLSearchParams();
    const nq = next.q ?? q;
    const nk = next.kun ?? kun;
    if (nq) params.set("q", nq);
    if (nk) params.set("kun", "1");
    if ((next.page ?? 1) > 1) params.set("side", String(next.page));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (search === q) return;
    const t = setTimeout(() => go({ q: search, page: 1 }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const cost = canSeeCost && showCost;
  const columns = `minmax(0,1fr) ${cost ? "100px " : ""}100px 80px 80px 80px 110px`;
  const pages = Math.max(1, Math.ceil(total / perPage));

  return (
    <section className="flex flex-col gap-3.5 rounded-xl border border-[#E2E5E0] bg-white px-5 py-[18px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 min-w-[260px] flex-[1_1_300px] items-center rounded-lg border border-[#C9D0C7] px-3">
          <input
            type="search"
            aria-label="Søg i varer"
            placeholder="Søg på navn, EAN, IMEI"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border-0 bg-transparent text-[14px] outline-none"
          />
        </label>
        {mine && (
          <div role="group" aria-label="Vis lager" className="flex gap-1 rounded-[10px] bg-[#E9ECE7] p-1">
            {[
              { id: true, label: `Kun ${SCOPE_LABELS[mine]}` },
              { id: false, label: "Alle butikker" },
            ].map((o) => (
              <button
                key={String(o.id)}
                type="button"
                aria-pressed={kun === o.id}
                onClick={() => go({ kun: o.id, page: 1 })}
                className={`h-8 rounded-lg px-3 text-[14px] ${kun === o.id ? "bg-white font-semibold" : "text-[#3D4842]"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
        {canSeeCost && (
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={showCost} onChange={(e) => setShowCost(e.target.checked)} />
            Vis kostpris
          </label>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[860px] text-[14px]">
          <div
            className="grid gap-3 border-b border-[#E2E5E0] p-2 text-[13px] font-semibold text-[#5E6A63]"
            style={{ gridTemplateColumns: columns }}
          >
            <span>Vare</span>
            {cost && <span className="text-right">Kostpris</span>}
            <span className="text-right">Pris</span>
            {SCOPE_SLUGS.map((s) => (
              <span key={s} className="text-center">
                {SCOPE_LABELS[s]}
              </span>
            ))}
            <span />
          </div>

          {rows.length === 0 && (
            <p className="px-2 py-10 text-center text-[#5E6A63]">
              {q ? "Ingen varer matcher søgningen." : kun ? "Ingen varer på lager i din butik endnu." : "Ingen varer endnu."}
            </p>
          )}

          {rows.map((row) => {
            const requestable = canRequestRow(row, mine);
            return (
              <div
                key={row.rowKey}
                className="grid items-center gap-3 border-b border-[#EEF0EC] px-2 py-3"
                style={{ gridTemplateColumns: columns }}
              >
                <span className="min-w-0">
                  <b className="block truncate font-bold" title={row.name}>
                    {row.name}
                  </b>
                  <span className="text-[13px] text-[#5E6A63]">{subtitle(row, mine)}</span>
                </span>
                {cost && <span className="text-right tabular-nums">{formatKr(row.costPrice)}</span>}
                <span className="text-right tabular-nums">{priceLabel(row)}</span>
                {SCOPE_SLUGS.map((s) => {
                  const low = isLow(row, s) || (s === mine && requestable);
                  const empty = row.kind === "sku" && row.qty[s] === 0 && row.min[s] === null;
                  return (
                    <span
                      key={s}
                      className={`text-center tabular-nums ${low ? "font-semibold text-[#9A5B0A]" : s === mine ? "font-semibold" : ""}`}
                      title={low ? "Under minimum" : undefined}
                    >
                      {row.alwaysInStock ? "Altid" : empty ? "–" : row.qty[s]}
                    </span>
                  );
                })}
                {requestable ? (
                  <button
                    type="button"
                    onClick={() => setRequesting(row)}
                    className="flex h-[34px] items-center justify-center rounded-lg border border-[#1A3D2E] font-semibold text-[#1A3D2E] hover:bg-[#E7EFE9]"
                  >
                    Anmod
                  </button>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-[13px] text-[#5E6A63]">
        <span>
          {total === 0 ? "Ingen varer" : `${(page - 1) * perPage + 1}–${Math.min(total, page * perPage)} af ${total}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => go({ page: page - 1 })}
            className="h-8 rounded-lg border border-[#C9D0C7] px-3 text-[#15211B] disabled:opacity-40"
          >
            Forrige
          </button>
          <span className="px-2 tabular-nums">
            {page} / {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => go({ page: page + 1 })}
            className="h-8 rounded-lg border border-[#C9D0C7] px-3 text-[#15211B] disabled:opacity-40"
          >
            Næste
          </button>
        </div>
      </div>

      {mine && requesting && <RequestDialog row={requesting} mine={mine} onClose={() => setRequesting(null)} />}
    </section>
  );
}
