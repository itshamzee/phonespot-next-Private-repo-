"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Part } from "@/lib/lagersystem/api-types";
import type { PhoneSpotLocationCode } from "@/lib/lagersystem/locations";

type Avail = { location: string; label: string; qty: number };
const input = "w-full rounded-lg border border-soft-grey px-3 py-2 text-sm text-charcoal focus:border-green-eco focus:outline-none";
const label = "mb-1 block text-xs font-semibold text-charcoal";

/** "Anmod" fra lagersiden (spec §4.3a): vælg del, fra-lokation og antal. */
export function TransferRequestForm({ to, onDone, onCancel }: { to: PhoneSpotLocationCode; onDone: (message: string) => void; onCancel: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Part[]>([]);
  const [part, setPart] = useState<Part | null>(null);
  const [avail, setAvail] = useState<Avail[] | null>(null);
  const [from, setFrom] = useState("");
  const [qty, setQty] = useState("1");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (part || term.length < 2) { setResults([]); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/lager/parts?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const body = await res.json();
        if (res.ok) setResults(body.parts); else setError(body.error ?? "Søgningen fejlede");
      } catch (e) { if ((e as Error).name !== "AbortError") setError("Søgningen fejlede"); }
    }, 250);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query, part]);

  async function choose(p: Part) {
    setPart(p);
    setResults([]);
    setAvail(null);
    const res = await fetch(`/api/admin/lager/availability?sku=${encodeURIComponent(p.shared_sku)}&exclude=${to}`, { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) { setError(body.error ?? "Kunne ikke hente tilgængelighed"); return; }
    setAvail(body.availability);
    setFrom(body.availability[0]?.location ?? "");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(qty);
    if (!part || !from) { setError("Vælg del og lokation"); return; }
    if (!Number.isInteger(n) || n < 1 || n > 1000) { setError("Antal skal være mindst 1"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/lager/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotency_key: key, from, to, shared_sku: part.shared_sku, qty: n, ...(reference.trim() ? { reference: reference.trim() } : {}), ...(note.trim() ? { note: note.trim() } : {}) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError((body as { error?: string }).error ?? "Anmodningen fejlede"); return; }
      onDone(`Anmodning sendt til ${avail?.find((a) => a.location === from)?.label ?? from}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl bg-cream p-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="tr-part" className={label}>Del</label>
        <input id="tr-part" type="search" value={part ? part.name : query} onChange={(e) => { setPart(null); setAvail(null); setQuery(e.target.value); }} placeholder="Model, del eller varenummer" className={input} />
        {results.length > 0 && (
          <ul className="mt-2 max-h-56 overflow-auto rounded-lg border border-soft-grey bg-white">
            {results.map((p) => (
              <li key={p.shared_sku}>
                <button type="button" onClick={() => choose(p)} className="w-full px-3 py-2 text-left text-sm hover:bg-cream">
                  {p.name} <span className="text-xs text-gray">{p.shared_sku}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {avail && avail.length === 0 && (
        <p className="text-sm text-gray sm:col-span-2">Ingen andre lokationer har delen. Den skal bestilles hos leverandøren.</p>
      )}
      {avail && avail.length > 0 && (
        <>
          <div>
            <label htmlFor="tr-from" className={label}>Fra</label>
            <select id="tr-from" value={from} onChange={(e) => setFrom(e.target.value)} className={input}>
              {avail.map((a) => <option key={a.location} value={a.location}>{a.label} ({a.qty} på lager)</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="tr-qty" className={label}>Antal</label>
            <input id="tr-qty" type="number" min={1} max={1000} value={qty} onChange={(e) => setQty(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="tr-ref" className={label}>Reference (valgfri)</label>
            <input id="tr-ref" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} placeholder="Fx sagsnummer" className={input} />
          </div>
          <div>
            <label htmlFor="tr-note" className={label}>Note (valgfri)</label>
            <input id="tr-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className={input} />
          </div>
        </>
      )}
      {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy || !avail?.length} className="rounded-full bg-green-eco px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
          {busy ? "Sender..." : "Send anmodning"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm text-gray hover:text-charcoal">Annuller</button>
      </div>
    </form>
  );
}
