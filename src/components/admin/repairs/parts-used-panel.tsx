"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Part } from "@/lib/lagersystem/api-types";
import { locationLabel, TRANSFER_STATUS_LABELS } from "@/lib/lagersystem/transfers";
import type { TicketTransferLink } from "@/lib/lagersystem/ticket-transfers";
import { isPhoneSpotLocation, LOCATION_LABELS, type PhoneSpotLocationCode } from "@/lib/lagersystem/locations";
import type { PartsStatus, RepairPartRow, ShortageLine } from "@/lib/lagersystem/types";
import { Btn, Card } from "@/components/admin/repairs/ui";
import { RmaRegisterForm } from "@/components/admin/lager/rma-register-form";

type PanelState =
  | { enabled: false }
  | {
      enabled: true;
      location: PhoneSpotLocationCode | null;
      reference?: string | null;
      parts: RepairPartRow[];
      parts_status?: PartsStatus | null;
      parts_shortage?: ShortageLine[] | null;
      transfers?: TicketTransferLink[];
    };

const STATUS_LABEL: Record<RepairPartRow["status"], string> = {
  pending: "Afventer lager",
  synced: "Trukket fra lager",
  failed: "Ikke bogført",
};

export function PartsUsedPanel({
  ticketId,
  storeId,
  onPartsStatusChange,
}: {
  ticketId: string;
  storeId: string | null;
  onPartsStatusChange?: (status: PartsStatus | null) => void;
}) {
  const onStatusRef = useRef(onPartsStatusChange);
  onStatusRef.current = onPartsStatusChange;
  const base = `/api/admin/lager/repair-parts/${ticketId}`;
  const [state, setState] = useState<PanelState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Part[]>([]);
  const [selected, setSelected] = useState<Part | null>(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [defectFor, setDefectFor] = useState<RepairPartRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [elsewhere, setElsewhere] = useState<Record<string, { location: string; label: string; qty: number }[]>>({});
  useEffect(() => {
    if (!state || !state.enabled || state.parts_status !== "needs_order" || !state.location) return;
    const ctrl = new AbortController();
    for (const line of state.parts_shortage ?? []) {
      fetch(`/api/admin/lager/availability?sku=${encodeURIComponent(line.shared_sku)}&exclude=${state.location}`, { signal: ctrl.signal, cache: "no-store" })
        .then((r) => r.json())
        .then((b) => setElsewhere((cur) => ({ ...cur, [line.shared_sku]: b.availability ?? [] })))
        .catch(() => {});
    }
    return () => ctrl.abort();
  }, [state]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(base, { cache: "no-store" });
      if (!res.ok) { setError("Kunne ikke hente dele på sagen"); return; }
      const body = (await res.json()) as PanelState;
      setState(body);
      if (body.enabled) onStatusRef.current?.(body.parts_status ?? null);
    } catch {
      setError("Kunne ikke hente dele på sagen");
    }
  }, [base]);

  // storeId i afhængighederne: skifter butik på sagen, skifter lokationen også.
  useEffect(() => { void load(); }, [load, storeId]);

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

  async function mutate(url: string, init: RequestInit): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Handlingen fejlede");
        // 409: sagens tilstand er ændret siden panelet blev hentet — vis den aktuelle.
        if (res.status === 409) await load();
        return false;
      }
      await load();
      return true;
    } catch {
      setError("Handlingen fejlede. Prøv igen.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    if (!selected) return;
    const ok = await mutate(base, {
      method: "POST",
      body: JSON.stringify({ shared_sku: selected.shared_sku, qty }),
    });
    if (ok) { setSelected(null); setQuery(""); setResults([]); setQty(1); }
  }

  if (!state || !state.enabled) return null;

  const active = state.parts.filter((p) => p.movement_type === "TAKE" && !p.voided_at);
  const failed = state.parts.filter((p) => p.status === "failed" && !(p.movement_type === "TAKE" && p.voided_at));
  const searchId = `dele-soeg-${ticketId}`;

  return (
    <Card
      title="Dele brugt"
      aside={state.location ? <p className="m-0 text-xs text-[#5E6A63]">Trækkes fra: {LOCATION_LABELS[state.location]}</p> : undefined}
    >
      {failed.length > 0 && (
        <div role="alert" className="mb-4 rounded-[10px] border border-[#F2C9C4] bg-[#FDF1F0] p-3.5 text-sm text-[#B42318]">
          <p className="m-0 font-semibold">
            {failed.length === 1 ? "1 bevægelse" : `${failed.length} bevægelser`} blev ikke bogført i lagersystemet
          </p>
          <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
            {failed.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{p.movement_type === "RETURN" ? "Retur" : "Udtag"}: {p.qty} × {p.part_name}</span>
                <Btn
                  size="sm"
                  disabled={busy}
                  onClick={() => mutate(`${base}/${p.id}`, { method: "PATCH", body: JSON.stringify({ action: "retry" }) })}
                >
                  Prøv igen
                </Btn>
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.parts_status === "needs_order" && (
        <div className="mb-4 rounded-[10px] border border-[#F5D9B0] bg-[#FFF4E5] p-3.5 text-sm text-[#7A4A06]">
          <p className="m-0 font-semibold">Skal bestilles</p>
          <ul className="m-0 mt-1 list-none space-y-2 p-0">
            {(state.parts_shortage ?? []).map((l) => {
              const av = elsewhere[l.shared_sku];
              return (
                <li key={l.shared_sku}>
                  <p>{l.name}: skal bruge {l.needed}, ledigt {Math.max(0, l.available)}</p>
                  {av && av.length === 0 && <p className="text-xs text-[#7A4A06]">Findes ikke andre steder. Bestil hos leverandøren.</p>}
                  {av && av.length > 0 && (
                    <>
                      <p className="text-xs text-[#7A4A06]">Findes andre steder: {av.map((a) => `${a.label}: ${a.qty}`).join(", ")}</p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {av.map((a) => (
                          <Btn
                            key={a.location}
                            size="sm"
                            disabled={busy}
                            onClick={() => mutate(`/api/admin/lager/repair-transfers/${ticketId}`, { method: "POST", body: JSON.stringify({ shared_sku: l.shared_sku, from: a.location }) })}
                          >
                            Anmod fra {a.label}
                          </Btn>
                        ))}
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <Btn
            size="sm"
            className="mt-3"
            disabled={busy}
            onClick={() => mutate(`/api/admin/lager/parts-status/${ticketId}`, { method: "PATCH", body: JSON.stringify({ action: "ordered" }) })}
          >
            Markér som bestilt
          </Btn>
        </div>
      )}
      {state.parts_status === "ordered" && (
        <p className="m-0 mb-4 text-sm text-[#5E6A63]">Delen er bestilt hjem. Mærket forsvinder, når delen registreres her.</p>
      )}
      {(state.parts_status === "requested" || state.parts_status === "in_transit") && (
        <div className="mb-4 rounded-[10px] border border-[#E2E5E0] bg-[#F5F6F4] p-3.5 text-sm text-[#15211B]">
          <p className="m-0 font-semibold">{state.parts_status === "requested" ? "Anmodet" : "Undervejs"}</p>
          <ul className="m-0 mt-1 list-none space-y-0.5 p-0">
            {(state.transfers ?? []).map((tr) => {
              const name = (state.parts_shortage ?? []).find((l) => l.shared_sku === tr.shared_sku)?.name ?? tr.shared_sku;
              return <li key={tr.transfer_id}>{tr.qty} × {name} fra {locationLabel(tr.from_location)}: {TRANSFER_STATUS_LABELS[tr.status]}</li>;
            })}
          </ul>
          <p className="m-0 mt-2 text-xs text-[#5E6A63]">Mærket forsvinder, når delen registreres under Dele brugt.</p>
        </div>
      )}

      {active.length === 0 ? (
        <p className="m-0 mb-4 text-sm text-[#5E6A63]">Ingen dele registreret.</p>
      ) : (
        <ul className="m-0 mb-4 list-none divide-y divide-[#E2E5E0] p-0">
          {active.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <p className="m-0 font-semibold text-[#15211B]">{p.qty} × {p.part_name}</p>
                <p className="m-0 text-xs text-[#5E6A63]">{p.shared_sku} · {STATUS_LABEL[p.status]}</p>
              </div>
              <div className="flex gap-2">
                <Btn size="sm" disabled={busy || defectFor !== null} aria-label={`Markér ${p.part_name} som defekt`} onClick={() => { setNotice(null); setDefectFor(p); }}>
                  Markér som defekt
                </Btn>
                <Btn size="sm" disabled={busy || defectFor !== null} aria-label={`Fjern ${p.part_name}`} onClick={() => mutate(`${base}/${p.id}`, { method: "DELETE" })}>
                  Fjern
                </Btn>
              </div>
            </li>
          ))}
        </ul>
      )}

      {defectFor && isPhoneSpotLocation(defectFor.location_code) && (
        <div className="mb-4">
          <RmaRegisterForm
            locations={[]}
            fixed={{
              ticketId,
              partId: defectFor.id,
              reference: state.reference ?? null,
              location: defectFor.location_code,
              shared_sku: defectFor.shared_sku,
              part_name: defectFor.part_name,
              maxQty: defectFor.qty,
            }}
            onCancel={() => setDefectFor(null)}
            onDone={async (message) => { setDefectFor(null); setNotice(message); await load(); }}
          />
        </div>
      )}
      {notice && <p role="status" className="m-0 mb-3 text-sm text-[#1A3D2E]">{notice}</p>}

      {!state.location ? (
        <p className="m-0 text-sm text-[#7A4A06]">Vælg butik på sagen, før du registrerer dele.</p>
      ) : selected ? (
        <div className="flex flex-wrap items-end gap-3">
          <p className="m-0 text-sm font-semibold text-[#15211B]">{selected.name}</p>
          <label className="flex items-center gap-2 text-xs text-[#5E6A63]">
            Antal
            <input
              type="number"
              min={1}
              max={100}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="h-10 w-20 rounded-lg border border-[#C9D0C7] px-2 text-sm text-[#15211B]"
            />
          </label>
          <Btn variant="primary" onClick={add} disabled={busy || !Number.isInteger(qty) || qty < 1 || qty > 100}>
            Tilføj
          </Btn>
          <Btn onClick={() => setSelected(null)}>Annuller</Btn>
        </div>
      ) : (
        <div>
          <label htmlFor={searchId} className="mb-1 block text-xs font-semibold text-[#15211B]">Søg i reservedelskataloget</label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Model, del eller varenummer"
            className="h-10 w-full rounded-lg border border-[#C9D0C7] bg-white px-3 text-sm focus:border-[#2F8F55] focus:outline-none"
          />
          {results.length > 0 && (
            <ul className="m-0 mt-2 max-h-64 list-none overflow-auto rounded-lg border border-[#E2E5E0] p-0">
              {results.map((p) => (
                <li key={p.shared_sku}>
                  <button type="button" onClick={() => setSelected(p)} className="w-full px-3 py-2.5 text-left text-sm hover:bg-[#F5F6F4]">
                    <span className="font-semibold text-[#15211B]">{p.name}</span>{" "}
                    <span className="text-xs text-[#5E6A63]">{p.shared_sku}{p.quality ? ` · ${p.quality}` : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="m-0 mt-3 text-sm text-[#B42318]">{error}</p>}
    </Card>
  );
}
