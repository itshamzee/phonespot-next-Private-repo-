"use client";

import { useEffect, useRef, useState } from "react";
import { Btn } from "@/components/admin/repairs/ui";
import type { RmaItem } from "@/lib/lagersystem/api-types";
import { LOCATION_LABELS, type PhoneSpotLocationCode } from "@/lib/lagersystem/locations";
import { foundByText, rmaActions, RMA_STATUS_LABELS } from "@/lib/lagersystem/rma";
import { RmaRegisterForm } from "./rma-register-form";

type Loc = { code: PhoneSpotLocationCode; name: string };
type Item = Omit<RmaItem, "unit_cost_ore" | "credit_ore"> & { unit_cost_ore?: number | null; credit_ore?: number | null };
type Open = { id: string; kind: "send" | "resolve" } | null;
type Outcome = "CREDITED" | "REPLACED" | "REJECTED";
const input = "h-10 w-full rounded-lg border border-[#C9D0C7] bg-white px-3 text-sm text-[#15211B]";

async function postAction(id: string, action: "send" | "resolve", body: unknown): Promise<string | null> {
  try {
    const res = await fetch(`/api/admin/lager/rma/${encodeURIComponent(id)}/${action}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const b = await res.json().catch(() => ({}));
    return (b as { error?: string }).error ?? "Handlingen fejlede";
  } catch {
    return "Lagersystemet svarer ikke lige nu. Prøv igen om lidt.";
  }
}

/** Busy-vagt: knappen er låst, mens kaldet kører, og en ref stopper dobbeltklik før næste render. */
function useBusy() {
  const ref = useRef(false);
  const [busy, setBusy] = useState(false);
  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (ref.current) return undefined;
    ref.current = true;
    setBusy(true);
    try {
      return await fn();
    } finally {
      ref.current = false;
      setBusy(false);
    }
  }
  return { busy, run };
}

function SendForm({ item, location, onDone }: { item: Item; location: PhoneSpotLocationCode; onDone: () => void }) {
  const [ref, setRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { busy, run } = useBusy();
  async function submit() {
    await run(async () => {
      setError(null);
      const err = await postAction(item.id, "send", { location, ...(ref.trim() ? { supplier_ref: ref.trim() } : {}) });
      if (err) setError(err); else onDone();
    });
  }
  return (
    <div className="mt-3 space-y-2 rounded-[10px] bg-[#F5F6F4] p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 text-xs font-semibold text-[#15211B]">
          Leverandørens RMA-nummer (valgfri)
          <input value={ref} onChange={(e) => setRef(e.target.value)} maxLength={100} className={`${input} mt-1`} />
        </label>
        <Btn variant="primary" disabled={busy} onClick={submit}>{busy ? "Gemmer..." : "Gem som sendt"}</Btn>
      </div>
      {error && <p role="alert" className="m-0 text-sm text-[#B42318]">{error}</p>}
    </div>
  );
}

function ResolveForm({ item, location, canManage, onDone }: { item: Item; location: PhoneSpotLocationCode; canManage: boolean; onDone: () => void }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [kr, setKr] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { busy, run } = useBusy();
  async function submit() {
    setError(null);
    if (!outcome) { setError("Vælg udfald"); return; }
    const credit = canManage && outcome === "CREDITED" && kr.trim() ? Math.round(Number(kr.trim().replace(",", ".")) * 100) : undefined;
    if (credit !== undefined && (!Number.isFinite(credit) || credit < 0)) { setError("Beløbet er ugyldigt"); return; }
    await run(async () => {
      const err = await postAction(item.id, "resolve", { location, outcome, ...(credit !== undefined ? { credit_ore: credit } : {}), ...(note.trim() ? { note: note.trim() } : {}) });
      if (err) setError(err); else onDone();
    });
  }
  // Erstattet lægger en del på lager, og et kreditbeløb er penge: kun ejer/leder (håndhæves også på serveren).
  const options: [Outcome, string][] = canManage
    ? [["REPLACED", "Erstattet"], ["CREDITED", "Krediteret"], ["REJECTED", "Afvist"]]
    : [["CREDITED", "Krediteret"], ["REJECTED", "Afvist"]];
  return (
    <div className="mt-3 space-y-2 rounded-[10px] bg-[#F5F6F4] p-3">
      <fieldset className="m-0 flex flex-wrap gap-4 border-0 p-0 text-sm">
        <legend className="mb-1 text-xs font-semibold text-[#15211B]">Udfald</legend>
        {options.map(([value, text]) => (
          <label key={value} className="flex items-center gap-1.5">
            <input type="radio" name={`outcome-${item.id}`} checked={outcome === value} onChange={() => setOutcome(value)} />
            {text}
          </label>
        ))}
      </fieldset>
      {!canManage && <p className="m-0 text-xs text-[#5E6A63]">Erstattet og krediteret beløb registreres af ejer eller leder.</p>}
      {outcome === "REPLACED" && <p className="m-0 text-xs text-[#5E6A63]">Den nye del lægges på lager på {LOCATION_LABELS[location]}.</p>}
      {outcome === "CREDITED" && canManage && (
        <label className="block text-xs font-semibold text-[#15211B]">
          Krediteret beløb i kr. (valgfri)
          <input inputMode="decimal" value={kr} onChange={(e) => setKr(e.target.value)} className={`${input} mt-1`} />
        </label>
      )}
      <label className="block text-xs font-semibold text-[#15211B]">
        Note (valgfri)
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className={`${input} mt-1`} />
      </label>
      {error && <p role="alert" className="m-0 text-sm text-[#B42318]">{error}</p>}
      <Btn variant="primary" disabled={busy} onClick={submit}>{busy ? "Gemmer..." : "Gem afslutning"}</Btn>
    </div>
  );
}

/** Fanen Reklamationer (spec §3.6/§4.3b). Alle kald er synkrone mod lagersystemet. */
export function RmaTab({ locations, canManage = false }: { locations: Loc[]; canManage?: boolean }) {
  const [location, setLocation] = useState<PhoneSpotLocationCode | null>(locations[0]?.code ?? null);
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState<Open>(null);
  const [registering, setRegistering] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!location) return;
    const ctrl = new AbortController();
    (async () => {
      setError(null);
      try {
        const res = await fetch(`/api/admin/lager/rma?location=${location}&status=${onlyOpen ? "REGISTERED,SENT" : ""}`, { signal: ctrl.signal, cache: "no-store" });
        const body = await res.json();
        if (!res.ok) { setError(body.error ?? "Kunne ikke hente reklamationer"); return; }
        setItems(body.items ?? []);
      } catch (e) { if ((e as Error).name !== "AbortError") setError("Kunne ikke hente reklamationer"); }
    })();
    return () => ctrl.abort();
  }, [location, onlyOpen, reloadKey]);

  const done = (message: string) => () => {
    setOpen(null);
    setNotice(message);
    setReloadKey((k) => k + 1);
  };
  const toggle = (next: NonNullable<Open>) => {
    setNotice(null);
    setOpen(open?.id === next.id && open.kind === next.kind ? null : next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {locations.map((l) => (
          <Btn key={l.code} size="sm" variant={l.code === location ? "primary" : "secondary"} aria-pressed={l.code === location}
            onClick={() => { setLocation(l.code); setOpen(null); }}>
            {l.name}
          </Btn>
        ))}
        <label className="ml-2 flex items-center gap-1.5 text-sm text-[#15211B]">
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> Kun åbne
        </label>
        <Btn variant="ready" className="ml-auto" onClick={() => { setNotice(null); setRegistering(!registering); }}>Registrér defekt del</Btn>
      </div>

      {registering && (
        <RmaRegisterForm locations={locations} onCancel={() => setRegistering(false)} onDone={(m) => { setRegistering(false); setNotice(m); setReloadKey((k) => k + 1); }} />
      )}
      {notice && <p role="status" className="m-0 rounded-[10px] bg-[#EEF7F1] px-4 py-3 text-sm text-[#1A3D2E]">{notice}</p>}
      {error && <p role="alert" className="m-0 rounded-[10px] bg-[#FDF1F0] px-4 py-3 text-sm text-[#B42318]">{error}</p>}
      {items && items.length === 0 && <p className="m-0 text-sm text-[#5E6A63]">Ingen {onlyOpen ? "åbne " : ""}reklamationer.</p>}

      {items?.map((i) => {
        const actions = rmaActions(i.status);
        return (
          <article key={i.id} className="rounded-xl border border-[#E2E5E0] bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="m-0 text-[15px] font-semibold text-[#15211B]">{i.qty} × {i.part_name}</h3>
              <span className="text-xs font-semibold text-[#5E6A63]">{RMA_STATUS_LABELS[i.status]}</span>
            </div>
            <p className="m-0 mt-1 text-sm font-semibold text-[#15211B]">{foundByText(i)}</p>
            <p className="m-0 mt-1 text-sm text-[#15211B]">{i.reason}</p>
            <p className="m-0 mt-1 text-xs text-[#5E6A63]">
              {[i.supplier, i.reference && `Ref. ${i.reference}`, i.supplier_ref && `Leverandør-RMA ${i.supplier_ref}`, new Date(i.created_at).toLocaleDateString("da-DK")].filter(Boolean).join(" · ")}
            </p>
            {i.resolution_note && <p className="m-0 mt-1 text-xs text-[#5E6A63]">Note: {i.resolution_note}</p>}
            {(actions.send || actions.resolve) && location && (
              <div className="mt-3 flex flex-wrap gap-2">
                {actions.send && <Btn size="sm" onClick={() => toggle({ id: i.id, kind: "send" })}>Sendt til leverandør</Btn>}
                {actions.resolve && <Btn size="sm" onClick={() => toggle({ id: i.id, kind: "resolve" })}>Afslut</Btn>}
              </div>
            )}
            {open?.id === i.id && open.kind === "send" && location && <SendForm item={i} location={location} onDone={done("Reklamationen er markeret som sendt")} />}
            {open?.id === i.id && open.kind === "resolve" && location && (
              <ResolveForm item={i} location={location} canManage={canManage} onDone={done("Reklamationen er afsluttet")} />
            )}
          </article>
        );
      })}
    </div>
  );
}
