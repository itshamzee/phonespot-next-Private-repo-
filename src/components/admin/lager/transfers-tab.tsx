"use client";

import { useEffect, useRef, useState } from "react";
import type { Transfer } from "@/lib/lagersystem/api-types";
import type { PhoneSpotLocationCode } from "@/lib/lagersystem/locations";
import { locationLabel, outstanding, settlement, TRANSFER_STATUS_LABELS } from "@/lib/lagersystem/transfers";
import { TransferRequestForm } from "./transfer-request-form";

type Loc = { code: PhoneSpotLocationCode; name: string };
type Open = { id: string; kind: "send" | "reject" | "receive" } | null;
const btn = "rounded-full border border-soft-grey px-3 py-1 text-xs font-semibold text-charcoal hover:bg-cream disabled:opacity-60";
const primary = "rounded-full bg-green-eco px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60";
const num = "w-16 rounded-lg border border-soft-grey px-2 py-1 text-sm text-charcoal";

async function postAction(id: string, action: string, body: unknown): Promise<string | null> {
  const res = await fetch(`/api/admin/lager/transfers/${encodeURIComponent(id)}/${action}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (res.ok) return null;
  const b = await res.json().catch(() => ({}));
  return (b as { error?: string }).error ?? "Handlingen fejlede";
}

function SendForm({ t, onDone }: { t: Transfer; onDone: (err: string | null) => void }) {
  const [qty, setQty] = useState<Record<string, string>>(Object.fromEntries(t.lines.map((l) => [l.shared_sku, String(l.qty_requested)])));
  const [stock, setStock] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    for (const l of t.lines) {
      fetch(`/api/admin/lager/availability?sku=${encodeURIComponent(l.shared_sku)}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((b) => setStock((s) => ({ ...s, [l.shared_sku]: (b.availability ?? []).find((a: { location: string }) => a.location === t.from)?.qty ?? 0 })))
        .catch(() => {});
    }
  }, [t]);
  const negative = t.lines.some((l) => stock[l.shared_sku] !== undefined && Number(qty[l.shared_sku]) > stock[l.shared_sku]);
  async function submit() {
    const lines = t.lines.map((l) => ({ shared_sku: l.shared_sku, qty_sent: Number(qty[l.shared_sku]) }));
    const bad = t.lines.find((l, i) => !Number.isInteger(lines[i].qty_sent) || lines[i].qty_sent < 0 || lines[i].qty_sent > l.qty_requested);
    if (bad) { setError(`${bad.part_name}: 0 til ${bad.qty_requested}`); return; }
    setBusy(true);
    const err = await postAction(t.id, "send", { lines });
    setBusy(false);
    if (err) setError(err); else onDone(null);
  }
  return (
    <div className="mt-3 space-y-2 rounded-xl bg-cream p-3">
      {t.lines.map((l) => (
        <label key={l.shared_sku} className="flex items-center justify-between gap-3 text-sm">
          <span>{l.part_name} (anmodet {l.qty_requested})</span>
          <input aria-label={`Sendes af ${l.part_name}`} type="number" min={0} max={l.qty_requested} value={qty[l.shared_sku]} onChange={(e) => setQty({ ...qty, [l.shared_sku]: e.target.value })} className={num} />
        </label>
      ))}
      {negative && <p className="text-xs text-orange-700">Saldoen på {locationLabel(t.from)} bliver negativ</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="button" disabled={busy} onClick={submit} className={primary}>Send</button>
    </div>
  );
}

function RejectForm({ t, onDone }: { t: Transfer; onDone: (err: string | null) => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  async function submit() {
    if (!reason.trim()) { setError("Angiv en begrundelse"); return; }
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const err = await postAction(t.id, "reject", { reason: reason.trim() });
      if (err) setError(err); else onDone(null);
    } catch {
      setError("Lagersystemet svarer ikke lige nu. Prøv igen om lidt.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="mt-3 space-y-2 rounded-xl bg-cream p-3">
      <label className="block text-xs font-semibold text-charcoal">
        Begrundelse
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className="mt-1 w-full rounded-lg border border-soft-grey px-3 py-2 text-sm" />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="button" disabled={busy} onClick={submit} className={primary}>Afvis anmodning</button>
    </div>
  );
}

function ReceiveForm({ t, canManage, onDone }: { t: Transfer; canManage: boolean; onDone: (err: string | null) => void }) {
  const open = t.lines.filter((l) => outstanding(l) > 0);
  const [rows, setRows] = useState<Record<string, { rec: string; off: string; reason: string }>>(
    Object.fromEntries(open.map((l) => [l.shared_sku, { rec: String(outstanding(l)), off: "0", reason: "" }])),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Samme indhold giver samme nøgle, så dobbeltklik og gentagne forsøg ikke modtager to gange.
  const keyRef = useRef<{ sig: string; key: string } | null>(null);
  const set = (sku: string, patch: Partial<{ rec: string; off: string; reason: string }>) => setRows({ ...rows, [sku]: { ...rows[sku], ...patch } });
  async function submit() {
    for (const l of open) {
      const r = rows[l.shared_sku];
      const rec = Number(r.rec), off = canManage ? Number(r.off) : 0;
      if (!Number.isInteger(rec) || !Number.isInteger(off) || rec < 0 || off < 0) { setError(`${l.part_name}: ugyldigt antal`); return; }
      if (rec + off > outstanding(l)) { setError(`${l.part_name}: højst ${outstanding(l)} i alt (undervejs)`); return; }
      if (off > 0 && !r.reason.trim()) { setError(`${l.part_name}: afskrivning kræver en begrundelse`); return; }
    }
    const lines = open
      .map((l) => ({ l, r: rows[l.shared_sku] }))
      .map(({ l, r }) => ({ l, r, off: canManage ? Number(r.off) : 0 }))
      .filter(({ r, off }) => Number(r.rec) + off > 0)
      .map(({ l, r, off }) => ({ shared_sku: l.shared_sku, qty_received: Number(r.rec), ...(off > 0 ? { qty_written_off: off, write_off_reason: r.reason.trim() } : {}) }));
    if (lines.length === 0) { setError("Angiv mindst ét modtaget eller afskrevet antal"); return; }
    if (busy) return;
    const sig = JSON.stringify(lines);
    if (keyRef.current?.sig !== sig) keyRef.current = { sig, key: crypto.randomUUID() };
    setBusy(true);
    const err = await postAction(t.id, "receive", { idempotency_key: keyRef.current.key, lines });
    setBusy(false);
    if (err) setError(err); else onDone(null);
  }
  return (
    <div className="mt-3 space-y-3 rounded-xl bg-cream p-3">
      {open.map((l) => (
        <div key={l.shared_sku} className="flex flex-wrap items-end gap-3 text-sm">
          <span className="min-w-[10rem] flex-1">{l.part_name} (undervejs {outstanding(l)})</span>
          <input aria-label={`Modtaget af ${l.part_name}`} type="number" min={0} value={rows[l.shared_sku].rec} onChange={(e) => set(l.shared_sku, { rec: e.target.value })} className={num} />
          {canManage && <input aria-label={`Afskrevet af ${l.part_name}`} type="number" min={0} value={rows[l.shared_sku].off} onChange={(e) => set(l.shared_sku, { off: e.target.value })} className={num} />}
          {canManage && Number(rows[l.shared_sku].off) > 0 && (
            <input aria-label={`Begrundelse for afskrivning af ${l.part_name}`} value={rows[l.shared_sku].reason} onChange={(e) => set(l.shared_sku, { reason: e.target.value })} placeholder="Fx knækket i transport" className="rounded-lg border border-soft-grey px-2 py-1 text-sm" />
          )}
        </div>
      ))}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="button" disabled={busy} onClick={submit} className={primary}>Registrér modtagelse</button>
    </div>
  );
}

/** Fanen Flytninger (spec §4.3a). Alle handlinger er synkrone mod lagersystemet. */
export function TransfersTab({ locations, canManage = false }: { locations: Loc[]; canManage?: boolean }) {
  const [location, setLocation] = useState<PhoneSpotLocationCode | null>(locations[0]?.code ?? null);
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [transfers, setTransfers] = useState<Transfer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState<Open>(null);
  const [requesting, setRequesting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const cancelInFlight = useRef(false);

  // Skift af lokation/retning: tøm listen straks, så ingen handler på rækker fra den forrige visning.
  function show(next: { location?: PhoneSpotLocationCode; direction?: "in" | "out" }) {
    if ((next.location && next.location !== location) || (next.direction && next.direction !== direction)) {
      setTransfers(null);
      setOpen(null);
    }
    if (next.location) setLocation(next.location);
    if (next.direction) setDirection(next.direction);
  }

  async function cancel(id: string) {
    if (cancelInFlight.current) return;
    cancelInFlight.current = true;
    setCancelling(id);
    try {
      done("Anmodningen er annulleret")(await postAction(id, "cancel", {}));
    } catch {
      setError("Lagersystemet svarer ikke lige nu. Prøv igen om lidt.");
    } finally {
      cancelInFlight.current = false;
      setCancelling(null);
    }
  }

  useEffect(() => {
    if (!location) return;
    const ctrl = new AbortController();
    (async () => {
      setError(null);
      try {
        const res = await fetch(`/api/admin/lager/transfers?location=${location}&direction=${direction}`, { signal: ctrl.signal, cache: "no-store" });
        const body = await res.json();
        if (!res.ok) { setError(body.error ?? "Kunne ikke hente flytninger"); return; }
        setTransfers(body.transfers ?? []);
      } catch (e) { if ((e as Error).name !== "AbortError") setError("Kunne ikke hente flytninger"); }
    })();
    return () => ctrl.abort();
  }, [location, direction, reloadKey]);

  const done = (message: string | null) => (err: string | null) => {
    if (err) { setError(err); return; }
    setOpen(null);
    setNotice(message);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {locations.map((l) => (
          <button key={l.code} type="button" aria-pressed={l.code === location} onClick={() => show({ location: l.code })}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${l.code === location ? "bg-charcoal text-white" : "bg-stone-200 text-stone-700 hover:bg-stone-300"}`}>
            {l.name}
          </button>
        ))}
        <span className="mx-2 h-5 w-px bg-soft-grey" aria-hidden="true" />
        {(["in", "out"] as const).map((d) => (
          <button key={d} type="button" aria-pressed={direction === d} onClick={() => show({ direction: d })}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${direction === d ? "bg-charcoal text-white" : "bg-stone-200 text-stone-700 hover:bg-stone-300"}`}>
            {d === "in" ? "Indgående" : "Udgående"}
          </button>
        ))}
        <button type="button" onClick={() => setRequesting(!requesting)} className="ml-auto rounded-full bg-green-eco px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90">
          Anmod om dele
        </button>
      </div>

      {requesting && location && (
        <TransferRequestForm to={location} onCancel={() => setRequesting(false)} onDone={(m) => { setRequesting(false); setNotice(m); show({ direction: "in" }); setReloadKey((k) => k + 1); }} />
      )}
      {notice && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {transfers && transfers.length === 0 && <p className="text-sm text-gray">Ingen {direction === "in" ? "indgående" : "udgående"} flytninger.</p>}
      {transfers?.map((t) => {
        const s = settlement(t);
        return (
          <article key={t.id} className="rounded-2xl border border-soft-grey bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold text-charcoal">{locationLabel(t.from)} → {locationLabel(t.to)}</h3>
              <span className="text-xs font-semibold text-gray">{TRANSFER_STATUS_LABELS[t.status]}</span>
            </div>
            <p className="mt-1 text-xs text-gray">
              {t.reference ? `${t.reference} · ` : ""}Anmodet af {t.requested_by_label} · {new Date(t.created_at).toLocaleDateString("da-DK")}
            </p>
            <ul className="mt-2 space-y-0.5 text-sm text-charcoal">
              {t.lines.map((l) => (
                <li key={l.shared_sku}>
                  {l.qty_requested} × {l.part_name}
                  {l.qty_sent !== null && <span className="text-gray"> · sendt {l.qty_sent}, modtaget {l.qty_received}{l.qty_written_off ? `, afskrevet ${l.qty_written_off}` : ""}</span>}
                </li>
              ))}
            </ul>
            {t.reject_reason && <p className="mt-1 text-sm text-gray">Afvist: {t.reject_reason}</p>}
            {s.kind !== "none" && <p className="mt-2 text-sm font-semibold text-charcoal">{s.text}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {direction === "out" && t.status === "REQUESTED" && (
                <>
                  <button type="button" className={btn} onClick={() => setOpen({ id: t.id, kind: "send" })}>Accepter og send</button>
                  <button type="button" className={btn} onClick={() => setOpen({ id: t.id, kind: "reject" })}>Afvis</button>
                </>
              )}
              {direction === "in" && (t.status === "SENT" || t.status === "PARTIALLY_RECEIVED") && (
                <button type="button" className={btn} onClick={() => setOpen({ id: t.id, kind: "receive" })}>Modtaget</button>
              )}
              {t.status === "REQUESTED" && t.requested_by_company === "phonespot" && (
                <button type="button" className={btn} disabled={cancelling !== null} onClick={() => cancel(t.id)}>Annullér</button>
              )}
            </div>
            {open?.id === t.id && open.kind === "send" && <SendForm t={t} onDone={done("Flytningen er sendt")} />}
            {open?.id === t.id && open.kind === "reject" && <RejectForm t={t} onDone={done("Anmodningen er afvist")} />}
            {open?.id === t.id && open.kind === "receive" && <ReceiveForm t={t} canManage={canManage} onDone={done("Modtagelsen er registreret")} />}
          </article>
        );
      })}
    </div>
  );
}
