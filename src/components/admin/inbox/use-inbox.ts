"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isInboxView, matchesView, type InboxRow, type InboxView } from "@/lib/inquiries/inbox";
import { useStoreScope } from "@/components/admin/shell/store-scope-context";
import { getJson, postAction, type ApiResult, type InboxActionBody } from "./inbox-api";
import { READ_KEY, addReadId, parseReadIds, type CustomerInfo, type InboxDetail } from "./inbox-helpers";

/**
 * Data til Kundecenteret: listen (med polling hvert 30. sekund og ved fokus),
 * den valgte samtale, kundekortet, lokal ulæst-markering og handlinger med
 * optimistisk opdatering af rækken og tilbageførsel ved fejl.
 * Polling rører aldrig den valgte sag eller teksten i svarfeltet.
 */

const POLL_MS = 30_000;
const VIEW_KEY = "kundecenter.view";
const EMPTY_COUNTS = { mine: 0, unassigned: 0, need: 0 };

export type StoreFilter = "alle" | "vejle" | "slagelse";
export type Counts = typeof EMPTY_COUNTS;
type ListResponse = { rows?: InboxRow[]; counts?: Counts; me?: { id: string; name: string }; truncated?: boolean };
type ServerInquiry = { status?: InboxRow["status"]; assigned_to?: string | null; assigned_name?: string | null; snoozed_until?: string | null };

function readStorage(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Privat vindue eller fuld lagerplads: det er kun en bekvemmelighed.
  }
}

/** Serverens række (snake_case) som felter på en InboxRow. */
function rowPatch(inq: ServerInquiry): Partial<InboxRow> {
  const out: Partial<InboxRow> = {};
  if (inq.status) out.status = inq.status;
  if ("assigned_to" in inq) out.assignedTo = inq.assigned_to ?? null;
  if ("assigned_name" in inq) out.assignedName = inq.assigned_name ?? null;
  if ("snoozed_until" in inq) out.snoozedUntil = inq.snoozed_until ?? null;
  return out;
}

function isDetail(d: unknown): d is InboxDetail {
  const x = d as InboxDetail | null;
  return !!x && typeof x.inquiry === "object" && !!x.inquiry && Array.isArray(x.messages) && Array.isArray(x.drafts);
}

export function useInbox(initialId: string | null) {
  const { me: scopeMe, scope, isOwner } = useStoreScope();
  // Uden gemt visning: start i Mine, og skift én gang til Ikke tildelt, hvis Mine er tom.
  const [initialView] = useState<InboxView | null>(() => {
    const saved = readStorage(VIEW_KEY);
    return isInboxView(saved) ? saved : null;
  });
  const [view, setViewState] = useState<InboxView>(initialView ?? "mine");
  const viewSettled = useRef(initialView !== null);
  const [truncated, setTruncated] = useState(false);
  const [store, setStoreState] = useState<StoreFilter>("alle");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);
  const [apiMe, setApiMe] = useState<{ id: string; name: string } | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listLoaded, setListLoaded] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [listTick, setListTick] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [detail, setDetail] = useState<InboxDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailTick, setDetailTick] = useState(0);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<string[]>(() => parseReadIds(readStorage(READ_KEY)));

  const meId = apiMe?.id ?? scopeMe?.id ?? null;
  const meName = apiMe?.name ?? scopeMe?.name ?? null;
  const showStoreFilter = isOwner && scope === "alle";
  const effectiveStore: StoreFilter = showStoreFilter ? store : "alle";

  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  const busy = useRef(0);
  const listCtrl = useRef<AbortController | null>(null);
  const lastFetch = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const listUrl = useMemo(() => {
    const p = new URLSearchParams({ view });
    if (debounced) p.set("q", debounced);
    if (effectiveStore !== "alle") p.set("store", effectiveStore);
    return `/api/admin/inbox?${p}`;
  }, [view, debounced, effectiveStore]);

  const fetchList = useCallback(
    async (mode: "load" | "poll") => {
      // En poll venter, mens en handling er i gang eller en hentning allerede kører.
      if (mode === "poll" && (busy.current > 0 || listCtrl.current)) return;
      listCtrl.current?.abort();
      const ctrl = new AbortController();
      listCtrl.current = ctrl;
      lastFetch.current = Date.now();
      if (mode === "load") setListLoading(true);
      try {
        const r = await getJson<ListResponse>(listUrl, ctrl.signal, "Kunne ikke hente indbakken.");
        if (ctrl.signal.aborted || (mode === "poll" && busy.current > 0)) return;
        if (r.ok) {
          const nextCounts = { ...EMPTY_COUNTS, ...(r.data.counts ?? {}) };
          if (!viewSettled.current) {
            viewSettled.current = true;
            if (nextCounts.mine === 0 && view === "mine") {
              // Skift visning; den nye hentning afløser denne.
              setCounts(nextCounts);
              setViewState("unassigned");
              return;
            }
          }
          setRows(Array.isArray(r.data.rows) ? r.data.rows : []);
          setCounts(nextCounts);
          setTruncated(r.data.truncated === true);
          if (r.data.me?.id) setApiMe(r.data.me);
          setListError(null);
          setListLoaded(true);
        } else if (mode === "load") {
          setListError(r.error);
        }
        // En mislykket poll er stille: den sidste liste bliver stående.
      } catch {
        // Afbrudt af en nyere hentning.
      } finally {
        if (listCtrl.current === ctrl) {
          listCtrl.current = null;
          setListLoading(false);
        }
      }
    },
    [listUrl, view],
  );

  useEffect(() => {
    void fetchList("load");
  }, [fetchList, listTick]);

  useEffect(() => () => listCtrl.current?.abort(), []);

  // Polling: hvert 30. sekund mens fanen er synlig, og når vinduet får fokus igen.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void fetchList("poll");
      setDetailTick((n) => n + 1);
    };
    const interval = setInterval(tick, POLL_MS);
    const onFocus = () => {
      if (Date.now() - lastFetch.current > 5_000) tick();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [fetchList]);

  // Den valgte samtale. Samme sag hentes stille igen (ingen tom tilstand), en ny sag nulstiller.
  const detailFor = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId) {
      detailFor.current = null;
      setDetail(null);
      setDetailError(null);
      return;
    }
    if (detailFor.current !== selectedId) {
      detailFor.current = selectedId;
      setDetail(null);
      setDetailError(null);
    }
    const ctrl = new AbortController();
    getJson<InboxDetail>(`/api/admin/inbox/${encodeURIComponent(selectedId)}`, ctrl.signal, "Kunne ikke hente samtalen.")
      .then((r) => {
        if (ctrl.signal.aborted) return;
        if (r.ok && isDetail(r.data)) {
          setDetail(r.data);
          setDetailError(null);
        } else if (!r.ok) {
          setDetailError(r.error);
        } else {
          setDetailError("Samtalen kunne ikke læses. Prøv igen.");
        }
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [selectedId, detailTick]);

  // Kundekortet hentes kun, når en ny sag vælges.
  useEffect(() => {
    setCustomer(null);
    setCustomerError(null);
    if (!selectedId) return;
    const ctrl = new AbortController();
    getJson<CustomerInfo>(`/api/admin/inbox/${encodeURIComponent(selectedId)}/customer`, ctrl.signal, "Kunne ikke hente kundens historik.")
      .then((r) => {
        if (ctrl.signal.aborted) return;
        if (r.ok) {
          const d = r.data;
          const list = <T,>(v: T[] | undefined) => (Array.isArray(v) ? v : []);
          setCustomer({ ...d, repairs: list(d.repairs), orders: list(d.orders), buyback: list(d.buyback), previous: list(d.previous) });
        } else setCustomerError(r.error);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [selectedId]);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (!id) return;
    setReadIds((prev) => {
      const next = addReadId(prev, id);
      writeStorage(READ_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setView = useCallback((next: InboxView) => {
    viewSettled.current = true;
    writeStorage(VIEW_KEY, next);
    setViewState(next);
    setRows([]);
    setListLoaded(false);
  }, []);

  const setStore = useCallback((next: StoreFilter) => {
    setStoreState(next);
    setRows([]);
    setListLoaded(false);
  }, []);

  /** Lægger felter på en række og fjerner den, hvis den ikke længere hører til visningen. */
  const patchRow = useCallback(
    (id: string, patch: Partial<InboxRow>) => {
      const now = new Date();
      setRows((prev) =>
        prev
          .map((r) => (r.id === id ? { ...r, ...patch } : r))
          .filter((r) => r.id !== id || !meId || matchesView(view, r, meId, now)),
      );
      setDetail((d) => {
        if (!d || d.inquiry.id !== id) return d;
        const inq = { ...d.inquiry };
        if (patch.status) inq.status = patch.status;
        if ("assignedTo" in patch) inq.assigned_to = patch.assignedTo ?? null;
        if ("assignedName" in patch) inq.assigned_name = patch.assignedName ?? null;
        if ("snoozedUntil" in patch) inq.snoozed_until = patch.snoozedUntil ?? null;
        return { ...d, inquiry: inq };
      });
    },
    [meId, view],
  );

  const reloadList = useCallback(() => setListTick((n) => n + 1), []);
  const reloadDetail = useCallback(() => setDetailTick((n) => n + 1), []);

  /**
   * Kører en handling. Med `optimistic` opdateres rækken med det samme; fejler
   * kaldet, lægges listen tilbage og hentes igen.
   */
  const runAction = useCallback(
    async (id: string, body: InboxActionBody, optimistic?: Partial<InboxRow>): Promise<ApiResult> => {
      const before = rowsRef.current;
      busy.current += 1;
      if (optimistic) patchRow(id, optimistic);
      try {
        const r = await postAction(id, body);
        if (r.ok) {
          const inq = (r.data as { inquiry?: ServerInquiry }).inquiry;
          if (inq) patchRow(id, rowPatch(inq));
        } else {
          // Serveren sagde nej: læg listen tilbage og hent både liste og tråd igen,
          // så den åbne samtale aldrig står i en tilstand, serveren har afvist.
          if (optimistic) setRows(before);
          setDetailTick((n) => n + 1);
        }
        return r;
      } finally {
        busy.current -= 1;
        if (busy.current === 0) setListTick((n) => n + 1);
      }
    },
    [patchRow],
  );

  /** Til afsendelse og andre forløb uden for runAction: pausér polling imens. */
  const withBusy = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    busy.current += 1;
    try {
      return await fn();
    } finally {
      busy.current -= 1;
    }
  }, []);

  const readSet = useMemo(() => new Set(readIds), [readIds]);

  return {
    view,
    setView,
    store,
    setStore,
    showStoreFilter,
    query,
    setQuery,
    searching: debounced.length > 0,
    rows,
    counts,
    truncated,
    meId,
    meName,
    listLoading,
    listLoaded,
    listError,
    reloadList,
    selectedId,
    select,
    detail,
    detailError,
    reloadDetail,
    customer,
    customerError,
    readSet,
    patchRow,
    runAction,
    withBusy,
  };
}

export type Inbox = ReturnType<typeof useInbox>;
