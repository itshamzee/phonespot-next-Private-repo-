"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Btn } from "@/components/admin/repairs/ui";
import type { Part } from "@/lib/lagersystem/api-types";
import { LOCATION_LABELS, type PhoneSpotLocationCode } from "@/lib/lagersystem/locations";

type Loc = { code: PhoneSpotLocationCode; name: string };
export type RmaFixed = {
  ticketId: string; partId: string; reference: string | null; location: PhoneSpotLocationCode;
  shared_sku: string; part_name: string; maxQty: number;
};
const input = "h-10 w-full rounded-lg border border-[#C9D0C7] bg-white px-3 text-sm text-[#15211B] focus:border-[#2F8F55] focus:outline-none";
const label = "mb-1 block text-xs font-semibold text-[#15211B]";

/** "Registrér defekt del" (spec §4.3b). Med `fixed` kommer del, lokation og sagsnummer fra en "Dele brugt"-række. */
export function RmaRegisterForm({ locations, fixed, onDone, onCancel }: { locations: Loc[]; fixed?: RmaFixed; onDone: (message: string, warning?: boolean) => void; onCancel: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Part[]>([]);
  const [part, setPart] = useState<{ shared_sku: string; name: string } | null>(fixed ? { shared_sku: fixed.shared_sku, name: fixed.part_name } : null);
  const [location, setLocation] = useState<PhoneSpotLocationCode | "">(fixed?.location ?? locations[0]?.code ?? "");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("");
  const [supplier, setSupplier] = useState("");
  const [reference, setReference] = useState("");
  // Én nøgle pr. indsendelse: genbruges ved retry af samme indhold, ny nøgle hvis indholdet ændres
  // (ellers ville lagersystemet svare idempotency_conflict).
  const keyRef = useRef<{ key: string; sig: string } | null>(null);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (fixed || part || term.length < 2) { setResults([]); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/lager/parts?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const body = await res.json();
        if (res.ok) setResults(body.parts); else setError(body.error ?? "Søgningen fejlede");
      } catch (e) { if ((e as Error).name !== "AbortError") setError("Søgningen fejlede"); }
    }, 250);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query, part, fixed]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(qty);
    const max = fixed?.maxQty ?? 100;
    if (!part) { setError("Vælg en del"); return; }
    if (!location) { setError("Vælg lokation"); return; }
    if (!Number.isInteger(n) || n < 1 || n > max) { setError(`Antal skal være 1 til ${max}`); return; }
    if (!reason.trim()) { setError("Beskriv fejlen"); return; }
    if (inFlight.current) return;
    const payload = {
      location,
      shared_sku: part.shared_sku,
      qty: n,
      reason: reason.trim(),
      ...(supplier.trim() ? { supplier: supplier.trim() } : {}),
      ...(fixed ? { ticket_id: fixed.ticketId, part_id: fixed.partId } : reference.trim() ? { reference: reference.trim() } : {}),
    };
    const sig = JSON.stringify(payload);
    if (!keyRef.current || keyRef.current.sig !== sig) keyRef.current = { key: crypto.randomUUID(), sig };
    inFlight.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/lager/rma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotency_key: keyRef.current.key, ...payload }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError((body as { error?: string }).error ?? "Registreringen fejlede"); return; }
      const r = body as { part_removed?: boolean; readded_qty?: number; warning?: string | null };
      if (r.warning) onDone(r.warning, true);
      else if (r.part_removed && r.readded_qty) onDone(`Defekt del registreret. ${r.readded_qty} stk. står stadig på sagen. Tilføj den nye del herunder.`);
      else if (r.part_removed) onDone("Defekt del registreret og fjernet fra sagen. Tilføj den nye del herunder.");
      else onDone("Defekt del registreret");
    } catch {
      setError("Lagersystemet svarer ikke lige nu. Prøv igen om lidt.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-[10px] bg-[#F5F6F4] p-3.5 sm:grid-cols-2">
      {fixed ? (
        <div className="text-sm text-[#15211B] sm:col-span-2">
          <p className="m-0 font-semibold">{fixed.part_name}</p>
          <p className="m-0 text-xs text-[#5E6A63]">Lokation: {LOCATION_LABELS[fixed.location]}</p>
          {fixed.reference && <p className="m-0 text-xs text-[#5E6A63]">Sagsnummer: {fixed.reference}</p>}
        </div>
      ) : (
        <>
          <div className="sm:col-span-2">
            <label htmlFor="rma-part" className={label}>Del</label>
            <input id="rma-part" type="search" value={part ? part.name : query} onChange={(e) => { setPart(null); setQuery(e.target.value); }} placeholder="Model, del eller varenummer" className={input} />
            {results.length > 0 && (
              <ul className="m-0 mt-2 max-h-56 list-none overflow-auto rounded-lg border border-[#E2E5E0] bg-white p-0">
                {results.map((p) => (
                  <li key={p.shared_sku}>
                    <button type="button" onClick={() => { setPart({ shared_sku: p.shared_sku, name: p.name }); setResults([]); }} className="w-full px-3 py-2 text-left text-sm hover:bg-[#F5F6F4]">
                      {p.name} <span className="text-xs text-[#5E6A63]">{p.shared_sku}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="rma-loc" className={label}>Lokation</label>
            <select id="rma-loc" value={location} onChange={(e) => setLocation(e.target.value as PhoneSpotLocationCode)} className={input}>
              {locations.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
        </>
      )}
      <div>
        <label htmlFor="rma-qty" className={label}>Antal</label>
        <input id="rma-qty" type="number" min={1} max={fixed?.maxQty ?? 100} value={qty} onChange={(e) => setQty(e.target.value)} className={input} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="rma-reason" className={label}>Fejlbeskrivelse</label>
        <input id="rma-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Fx touch virker ikke i øverste kant" className={input} />
      </div>
      <div>
        <label htmlFor="rma-supplier" className={label}>Leverandør (valgfri)</label>
        <input id="rma-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} maxLength={100} placeholder="Fx Foneday" className={input} />
      </div>
      {!fixed && (
        <div>
          <label htmlFor="rma-ref" className={label}>Sagsnummer (valgfri)</label>
          <input id="rma-ref" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} className={input} />
        </div>
      )}
      {error && <p role="alert" className="m-0 text-sm text-[#B42318] sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <Btn type="submit" variant="primary" disabled={busy}>{busy ? "Registrerer..." : "Registrér"}</Btn>
        <Btn onClick={onCancel} disabled={busy}>Annuller</Btn>
      </div>
    </form>
  );
}
