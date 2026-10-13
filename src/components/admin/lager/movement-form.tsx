"use client";

import { useState, type FormEvent } from "react";
import type { PhoneSpotLocationCode } from "@/lib/lagersystem/locations";

export type AdminMovementType = "RECEIVE" | "COUNT" | "WRITE_OFF" | "TAKE";

const TYPE_LABELS: Record<AdminMovementType, string> = {
  RECEIVE: "Modtag varer",
  COUNT: "Optælling",
  WRITE_OFF: "Nedskriv",
  TAKE: "Udtag",
};
const QTY_LABELS: Record<AdminMovementType, string> = {
  RECEIVE: "Antal modtaget",
  COUNT: "Optalt antal",
  WRITE_OFF: "Antal nedskrevet",
  TAKE: "Antal udtaget",
};
const NOTE_LABELS: Partial<Record<AdminMovementType, string>> = { TAKE: "Formål", WRITE_OFF: "Årsag" };

const input = "w-full rounded-lg border border-soft-grey px-3 py-2 text-sm text-charcoal focus:border-green-eco focus:outline-none";
const label = "mb-1 block text-xs font-semibold text-charcoal";

export function MovementForm({
  location,
  part,
  onDone,
  onCancel,
}: {
  location: PhoneSpotLocationCode;
  part: { shared_sku: string; name: string | null };
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<AdminMovementType>("RECEIVE");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [supplier, setSupplier] = useState("");
  const [costKr, setCostKr] = useState("");
  // Uændret genforsøg efter en fejl genbruger nøglen (ingen dobbelt bogføring);
  // enhver ændring i formularen giver en ny nøgle (ellers 409 idempotency_conflict).
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const edit = <T,>(set: (v: T) => void) => (v: T) => { set(v); setKey(crypto.randomUUID()); };
  const noteLabel = NOTE_LABELS[type];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(qty);
    const min = type === "COUNT" ? 0 : 1;
    if (!Number.isInteger(n) || n < min || n > 10000) {
      setError(type === "COUNT" ? "Angiv det optalte antal (0 eller mere)" : "Antal skal være mindst 1");
      return;
    }
    if (noteLabel && !note.trim()) { setError(`Udfyld ${noteLabel.toLowerCase()}`); return; }
    const cost = type === "RECEIVE" && costKr.trim() ? Math.round(Number(costKr.trim().replace(",", ".")) * 100) : undefined;
    if (cost !== undefined && (!Number.isFinite(cost) || cost < 0)) { setError("Kostprisen er ugyldig"); return; }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/lager/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotency_key: key,
          type,
          location,
          shared_sku: part.shared_sku,
          qty: n,
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(reference.trim() ? { reference: reference.trim() } : {}),
          ...(type === "RECEIVE" && supplier.trim() ? { supplier: supplier.trim() } : {}),
          ...(cost !== undefined ? { cost_price_ore: cost } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError((body as { error?: string }).error ?? "Bogføringen fejlede"); return; }
      setKey(crypto.randomUUID());
      onDone(`${TYPE_LABELS[type]} bogført. Ny saldo: ${(body as { movement: { balance_after: number } }).movement.balance_after}`);
    } catch {
      setError("Lagersystemet svarer ikke lige nu. Prøv igen om lidt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl bg-cream p-4 sm:grid-cols-2">
      <p className="text-sm font-semibold text-charcoal sm:col-span-2">{part.name ?? part.shared_sku}</p>
      <div>
        <label htmlFor="mv-type" className={label}>Handling</label>
        <select id="mv-type" value={type} onChange={(e) => edit(setType)(e.target.value as AdminMovementType)} className={input}>
          {(Object.keys(TYPE_LABELS) as AdminMovementType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="mv-qty" className={label}>{QTY_LABELS[type]}</label>
        <input id="mv-qty" type="number" min={type === "COUNT" ? 0 : 1} max={10000} value={qty} onChange={(e) => edit(setQty)(e.target.value)} className={input} />
      </div>
      {noteLabel && (
        <div>
          <label htmlFor="mv-note" className={label}>{noteLabel}</label>
          <input id="mv-note" value={note} onChange={(e) => edit(setNote)(e.target.value)} maxLength={200} className={input} />
        </div>
      )}
      <div>
        <label htmlFor="mv-ref" className={label}>Reference (valgfri)</label>
        <input id="mv-ref" value={reference} onChange={(e) => edit(setReference)(e.target.value)} maxLength={200} placeholder="Faktura, sag eller note" className={input} />
      </div>
      {type === "RECEIVE" && (
        <>
          <div>
            <label htmlFor="mv-supplier" className={label}>Leverandør (valgfri)</label>
            <input id="mv-supplier" value={supplier} onChange={(e) => edit(setSupplier)(e.target.value)} maxLength={100} className={input} />
          </div>
          <div>
            <label htmlFor="mv-cost" className={label}>Kostpris pr. stk. i kr. (valgfri)</label>
            <input id="mv-cost" inputMode="decimal" value={costKr} onChange={(e) => edit(setCostKr)(e.target.value)} className={input} />
          </div>
        </>
      )}
      {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className="rounded-full bg-green-eco px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
          {busy ? "Bogfører..." : "Bogfør"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm text-gray hover:text-charcoal">Annuller</button>
      </div>
    </form>
  );
}
