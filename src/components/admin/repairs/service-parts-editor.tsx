"use client";

import { useCallback, useEffect, useState } from "react";
import type { Part } from "@/lib/lagersystem/api-types";

type Linked = { shared_sku: string; qty: number; part_name: string | null };
type State = { enabled: false } | { enabled: true; parts: Linked[] };

export function ServicePartsEditor({ serviceId }: { serviceId: string }) {
  const base = `/api/admin/services/${serviceId}/parts`;
  const [state, setState] = useState<State | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Part[]>([]);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(base, { cache: "no-store" });
    if (!res.ok) { setError("Kunne ikke hente koblede dele"); return; }
    setState((await res.json()) as State);
  }, [base]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setResults([]); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/lager/parts?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const body = await res.json();
        if (!res.ok) { setError(body.error ?? "Søgningen fejlede"); return; }
        setResults(body.parts as Part[]);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Søgningen fejlede");
      }
    }, 250);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query]);

  async function send(url: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      if (!res.ok) { const b = await res.json().catch(() => ({})); setError((b as { error?: string }).error ?? "Handlingen fejlede"); return; }
      setQuery(""); setResults([]); setQty(1);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!state) return null;
  if (!state.enabled) return <p className="text-sm text-gray">Lagersystemet er ikke forbundet, så dele kan ikke kobles endnu.</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-charcoal">Dele til denne reparation</p>
      {state.parts.length === 0 ? (
        <p className="text-sm text-gray">Ingen dele koblet. Reparationen tjekkes ikke mod lageret.</p>
      ) : (
        <ul className="space-y-1">
          {state.parts.map((p) => (
            <li key={p.shared_sku} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-charcoal">{p.qty} × {p.part_name ?? p.shared_sku} <span className="text-xs text-gray">{p.shared_sku}</span></span>
              <button
                type="button"
                disabled={busy}
                aria-label={`Fjern ${p.part_name ?? p.shared_sku}`}
                onClick={() => send(`${base}?sku=${encodeURIComponent(p.shared_sku)}`, { method: "DELETE" })}
                className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Fjern
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1">
          <label htmlFor={`svc-parts-${serviceId}`} className="mb-1 block text-xs font-semibold text-charcoal">Søg del i kataloget</label>
          <input
            id={`svc-parts-${serviceId}`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Model, del eller varenummer"
            className="w-full rounded-lg border border-soft-grey px-3 py-2 text-sm focus:border-green-eco focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-gray">
          Antal pr. reparation
          <input type="number" min={1} max={20} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-16 rounded-lg border border-soft-grey px-2 py-1 text-sm text-charcoal" />
        </label>
      </div>
      {results.length > 0 && (
        <ul className="max-h-56 overflow-auto rounded-lg border border-soft-grey">
          {results.map((p) => (
            <li key={p.shared_sku}>
              <button
                type="button"
                disabled={busy || !Number.isInteger(qty) || qty < 1 || qty > 20}
                onClick={() => send(base, { method: "POST", body: JSON.stringify({ shared_sku: p.shared_sku, part_name: p.name, qty }) })}
                className="w-full px-3 py-2 text-left text-sm hover:bg-cream disabled:opacity-60"
              >
                Kobl {p.name} <span className="text-xs text-gray">{p.shared_sku}{p.quality ? ` · ${p.quality}` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
