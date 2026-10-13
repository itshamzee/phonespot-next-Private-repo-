"use client";

import { Fragment, useEffect, useState } from "react";
import type { PhoneSpotLocationCode } from "@/lib/lagersystem/locations";
import type { StockRow, StockView } from "@/lib/lagersystem/stock-view";
import { MovementForm } from "./movement-form";

type Loc = { code: PhoneSpotLocationCode; name: string };

export function SparePartsStock() {
  const [locations, setLocations] = useState<Loc[] | null>(null);
  const [location, setLocation] = useState<PhoneSpotLocationCode | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<StockView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<StockRow | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/lager/locations", { cache: "no-store" });
        const body = await res.json();
        if (!res.ok) { setError(body.error ?? "Kunne ikke hente lokationer"); return; }
        setLocations(body.locations);
        setLocation(body.locations[0]?.code ?? null);
      } catch {
        setError("Kunne ikke hente lokationer");
      }
    })();
  }, []);

  useEffect(() => {
    if (!location) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/lager/balances?location=${location}&q=${encodeURIComponent(query.trim())}`, { signal: ctrl.signal, cache: "no-store" });
        const body = await res.json();
        if (!res.ok) { setError(body.error ?? "Kunne ikke hente saldi"); setView(null); return; }
        setView(body as StockView);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Kunne ikke hente saldi");
      } finally {
        setLoading(false);
      }
    }, query ? 250 : 0);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [location, query, reloadKey]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-charcoal">Reservedele på lager</h1>
        <p className="mt-1 text-sm text-gray">Saldi kommer direkte fra det fælles lagersystem. Alt, du bogfører her, gælder med det samme for alle tre firmaer.</p>
      </header>

      {locations && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lokation">
          {locations.map((l) => (
            <button
              key={l.code}
              type="button"
              aria-pressed={l.code === location}
              onClick={() => { setLocation(l.code); setOpen(null); }}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${l.code === location ? "bg-charcoal text-white" : "bg-stone-200 text-stone-700 hover:bg-stone-300"}`}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}

      <div>
        <label htmlFor="lager-soeg" className="mb-1 block text-xs font-semibold text-charcoal">Søg efter del</label>
        <input
          id="lager-soeg"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Model, del eller varenummer"
          className="w-full max-w-md rounded-lg border border-soft-grey px-3 py-2 text-sm focus:border-green-eco focus:outline-none"
        />
      </div>

      {notice && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {view && location && (
        <div className="overflow-x-auto rounded-2xl border border-soft-grey bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-soft-grey text-xs text-gray">
              <tr><th className="px-4 py-3 font-semibold">Del</th><th className="px-4 py-3 font-semibold">Varenummer</th><th className="px-4 py-3 text-right font-semibold">Saldo</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-soft-grey">
              {view.rows.map((r) => (
                <Fragment key={r.shared_sku}>
                  <tr>
                    <td className="px-4 py-3 text-charcoal">{r.name ?? <span className="text-gray">Ukendt del</span>}</td>
                    <td className="px-4 py-3 text-xs text-gray">{r.shared_sku}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${r.qty < 0 ? "text-red-700" : "text-charcoal"}`}>
                      <span>{r.qty}</span>{r.qty < 0 && <span className="sr-only">(negativ saldo)</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        aria-label={`Bogfør på ${r.name ?? r.shared_sku}`}
                        onClick={() => { setOpen(open?.shared_sku === r.shared_sku ? null : r); setNotice(null); }}
                        className="rounded-full border border-soft-grey px-3 py-1 text-xs font-semibold text-charcoal hover:bg-cream"
                      >
                        Bogfør
                      </button>
                    </td>
                  </tr>
                  {open?.shared_sku === r.shared_sku && (
                    <tr>
                      <td colSpan={4} className="px-4 pb-4">
                        <MovementForm
                          location={location}
                          part={r}
                          onCancel={() => setOpen(null)}
                          onDone={(message) => { setNotice(message); setOpen(null); setReloadKey((k) => k + 1); }}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          {view.rows.length === 0 && <p className="px-4 py-6 text-sm text-gray">{query ? "Ingen dele matcher søgningen." : "Ingen saldi på denne lokation endnu."}</p>}
          {!query && view.total > view.rows.length && (
            <p className="border-t border-soft-grey px-4 py-3 text-xs text-gray">Viser {view.rows.length} af {view.total} dele. Søg for at finde en bestemt del.</p>
          )}
          {loading && <p className="sr-only">Henter saldi</p>}
        </div>
      )}
    </div>
  );
}
