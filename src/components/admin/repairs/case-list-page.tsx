"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStoreScope } from "@/components/admin/shell/store-scope-context";
import {
  CASE_TABS,
  dateKey,
  formatPhone,
  groupRows,
  isClosed,
  pickupCell,
  type CaseCounts,
  type CaseRow,
  type CaseTab,
} from "@/lib/repairs/case-list";
import { STATUS_LABELS } from "@/lib/repairs/status-labels";
import type { RepairStatus } from "@/lib/supabase/types";
import { focusWithoutScroll } from "@/lib/reveal";
import { Btn, BtnLink, Pill, apiError } from "@/components/admin/repairs/ui";
import { useCaseListKeys, type ListKeyAction } from "@/components/admin/repairs/list-keys";
import { MeldKlarDialog } from "@/components/admin/repairs/meld-klar-dialog";
import { SidePanel } from "@/components/admin/repairs/side-panel";

type ListResponse = {
  rows: CaseRow[];
  counts: CaseCounts;
  total: number;
  page: number;
  pageSize: number;
};

const COLS = "grid grid-cols-[120px_minmax(0,1fr)_220px_110px_120px] gap-3";
const EMPTY_COUNTS: CaseCounts = { igang: 0, klar: 0, afventer: 0, web: 0, alle: 0 };

export default function CaseListPage() {
  const router = useRouter();
  const { scope } = useStoreScope();
  const [tab, setTab] = useState<CaseTab>("igang");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [meldKlarId, setMeldKlarId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams({ tab, page: String(page) });
    if (debounced.trim()) params.set("q", debounced.trim());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/admin/repairs?${params}`, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(await apiError(res, "Kunne ikke hente sagerne."));
        return (await res.json()) as ListResponse;
      })
      .then((json) => {
        setData(json);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Kunne ikke hente sagerne.");
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [tab, debounced, page, reload, scope]);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const todayKey = dateKey(new Date());
  const groups = useMemo(() => groupRows(rows, todayKey), [rows, todayKey]);
  const ids = useMemo(() => rows.map((r) => r.id), [rows]);
  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const meldKlarRow = rows.find((r) => r.id === meldKlarId) ?? null;
  const counts = data?.counts ?? EMPTY_COUNTS;

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (!id) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-row-id="${id}"]`);
    if (el) {
      focusWithoutScroll(el);
      el.scrollIntoView({ block: "nearest" });
    }
  }, []);

  const onKey = useCallback(
    (action: ListKeyAction) => {
      if (action.type === "select") select(action.id);
      else if (action.type === "open") router.push(`/admin/reparationer/${action.id}`);
      else if (action.type === "close") setSelectedId(null);
      else if (action.type === "ready") {
        const row = rows.find((r) => r.id === action.id);
        if (row && !isClosed(row.status) && !row.is_web_booking) setMeldKlarId(action.id);
      }
    },
    [router, rows, select],
  );

  useCaseListKeys({ enabled: !meldKlarId, ids, selectedId, onAction: onKey });

  function changeTab(next: CaseTab) {
    setTab(next);
    setPage(1);
    setSelectedId(null);
  }

  function onTabKey(e: React.KeyboardEvent) {
    const i = CASE_TABS.findIndex((t) => t.id === tab);
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = CASE_TABS[(i + dir + CASE_TABS.length) % CASE_TABS.length];
    changeTab(next.id);
    focusWithoutScroll(document.getElementById(`tab-${next.id}`));
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-5 px-4 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="m-0 text-[32px] font-bold tracking-[-0.02em] text-[#15211B]">Sagsstyring</h1>
          <div className="flex gap-2.5">
            <BtnLink href="/admin/reparationer/ny" variant="primary" className="!h-[42px] !px-[18px] !text-[15px]">
              Ny sag
            </BtnLink>
            <BtnLink href="/admin/kasse" className="!h-[42px] !px-[18px] !text-[15px]">
              Nyt salg
            </BtnLink>
          </div>
        </div>

        {notice && (
          <div role="status" className="flex items-start justify-between gap-3 rounded-lg border border-[#F5D9B0] bg-[#FFF4E5] px-4 py-3 text-sm text-[#8A4B08]">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} className="font-semibold underline">
              Luk
            </button>
          </div>
        )}

        <section className="flex flex-col gap-4 rounded-xl border border-[#E2E5E0] bg-white px-5 py-[18px]">
          <label className="flex h-10 items-center rounded-lg border border-[#C9D0C7] px-3 focus-within:border-[#2F8F55]">
            <input
              type="search"
              aria-label="Søg i sager"
              placeholder="Søg på navn, telefon, sagsnummer, beskrivelse, IMEI"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent text-sm outline-none"
            />
          </label>

          <div role="tablist" aria-label="Sagsfaner" onKeyDown={onTabKey} className="flex flex-wrap gap-1.5 border-b border-[#E2E5E0]">
            {CASE_TABS.map((t) => {
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  id={`tab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="sager-panel"
                  tabIndex={active ? 0 : -1}
                  onClick={() => changeTab(t.id)}
                  className={`h-10 border-b-2 bg-transparent px-3.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2F8F55] ${
                    active ? "border-[#1A3D2E] font-semibold text-[#1A3D2E]" : "border-transparent text-[#3D4842] hover:text-[#1A3D2E]"
                  }`}
                >
                  {t.label} ({counts[t.id]})
                </button>
              );
            })}
          </div>

          <div id="sager-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} aria-busy={loading} className="overflow-x-auto">
            {error ? (
              <div role="alert" className="flex items-center justify-between gap-3 rounded-lg bg-[#FDECEC] p-3 text-sm text-[#B42318]">
                <span>{error}</span>
                <Btn size="sm" onClick={() => setReload((n) => n + 1)}>
                  Prøv igen
                </Btn>
              </div>
            ) : !data ? (
              <p className="m-0 py-6 text-sm text-[#5E6A63]">Henter sager...</p>
            ) : rows.length === 0 ? (
              <p className="m-0 py-6 text-sm text-[#5E6A63]">
                {debounced.trim() ? `Ingen sager matcher "${debounced.trim()}" i denne fane.` : "Ingen sager i denne fane."}
              </p>
            ) : (
              <div ref={listRef} role="grid" aria-label="Sager" className="min-w-[780px] text-sm">
                <div role="row" className={`${COLS} px-2 pb-2 text-[13px] font-semibold text-[#5E6A63]`}>
                  <span role="columnheader">#</span>
                  <span role="columnheader">Opgave</span>
                  <span role="columnheader">Kunde</span>
                  <span role="columnheader">Afhentes</span>
                  <span role="columnheader" aria-label="Handling" />
                </div>
                {groups.map((group) => (
                  <div key={group.key} role="rowgroup">
                    <div role="row">
                      <div role="columnheader" className="bg-[#F5F6F4] p-2 text-[13px] font-semibold">
                        {group.label}
                      </div>
                    </div>
                    {group.rows.map((row) => {
                      const isSel = row.id === selectedId;
                      const closed = isClosed(row.status);
                      return (
                        <div
                          key={row.id}
                          role="row"
                          data-row-id={row.id}
                          aria-selected={isSel}
                          tabIndex={isSel || (!selectedId && row.id === ids[0]) ? 0 : -1}
                          onClick={() => select(row.id)}
                          className={`${COLS} cursor-pointer items-center border-b border-[#EEF0EC] px-2 py-3 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#2F8F55] ${
                            isSel ? "bg-[#F1F8F3]" : "hover:bg-[#FAFBF9]"
                          }`}
                        >
                          <span role="gridcell">
                            <Link
                              href={`/admin/reparationer/${row.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-bold tabular-nums text-[#1A3D2E] hover:text-[#2D6B45]"
                            >
                              {row.label}
                            </Link>
                          </span>
                          <span role="gridcell" className="min-w-0">
                            {row.title}
                            {row.is_urgent && (
                              <span className="ml-1.5 inline-block rounded-md bg-[#FBEFD9] px-1.5 py-0.5 text-xs text-[#7A4A06]">Hastesag</span>
                            )}
                            {row.on_hold_reason && (
                              <span className="ml-1.5">
                                <Pill>På hold: {row.on_hold_reason.toLowerCase()}</Pill>
                              </span>
                            )}
                            {row.is_web_booking && (
                              <span className="ml-1.5">
                                <Pill tone="green">Web-booking</Pill>
                              </span>
                            )}
                            {tab === "alle" && (
                              <span className="ml-1.5">
                                <Pill>{STATUS_LABELS[row.status as RepairStatus] ?? row.status}</Pill>
                              </span>
                            )}
                          </span>
                          <span role="gridcell" className="min-w-0 truncate">
                            {row.customer_name}
                            {row.customer_phone && ` · ${formatPhone(row.customer_phone)}`}
                          </span>
                          <span role="gridcell" className="tabular-nums">
                            {pickupCell(row, group.key)}
                          </span>
                          <span role="gridcell">
                            {closed ? null : row.is_web_booking ? (
                              <BtnLink href={`/admin/reparationer/${row.id}`} size="sm" className="w-full" onClick={(e) => e.stopPropagation()}>
                                Åbn
                              </BtnLink>
                            ) : (
                              <Btn
                                variant="ready"
                                size="sm"
                                className="w-full"
                                aria-label={`Meld klar ${row.label}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedId(row.id);
                                  setMeldKlarId(row.id);
                                }}
                              >
                                Meld klar
                              </Btn>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {data && data.total > data.pageSize && (
            <nav aria-label="Sider" className="flex items-center justify-between text-sm text-[#5E6A63]">
              <span>
                Viser {(data.page - 1) * data.pageSize + 1}-{Math.min(data.page * data.pageSize, data.total)} af {data.total}
              </span>
              <span className="flex gap-2">
                <Btn size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Forrige
                </Btn>
                <Btn size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  Næste
                </Btn>
              </span>
            </nav>
          )}
        </section>
      </div>

      {selected ? (
        <>
          <button
            type="button"
            aria-label="Luk sidepanel"
            tabIndex={-1}
            onClick={() => setSelectedId(null)}
            className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          />
          <div className="fixed inset-y-0 right-0 z-40 w-full max-w-[420px] overflow-y-auto border-l border-[#E2E5E0] shadow-xl lg:static lg:z-auto lg:w-[400px] lg:max-w-none lg:shrink-0 lg:shadow-none">
            <SidePanel row={selected} refreshKey={reload} onClose={() => setSelectedId(null)} onMeldKlar={(r) => setMeldKlarId(r.id)} />
          </div>
        </>
      ) : (
        <aside
          aria-label="Sag i sidepanel"
          className="hidden w-[400px] shrink-0 border-l border-[#E2E5E0] bg-white p-5 text-sm text-[#5E6A63] lg:block"
        >
          Vælg en sag for at se den her. Tip: piletaster skifter sag, Enter åbner, K melder klar.
        </aside>
      )}

      {meldKlarRow && (
        <MeldKlarDialog
          target={meldKlarRow}
          onClose={() => setMeldKlarId(null)}
          onDone={({ warning }) => {
            setMeldKlarId(null);
            setNotice(warning ?? null);
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
