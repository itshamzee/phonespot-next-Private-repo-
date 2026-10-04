"use client";

import { useEffect, useState } from "react";
import { Btn, Pill, apiError } from "@/components/admin/repairs/ui";
import { fetchModelServices, fetchUpsell, searchDevices } from "@/components/admin/repairs/new-case/api";
import { stockInfo, type LocationSlug } from "@/components/admin/repairs/new-case/logic";
import { TierCard } from "@/components/admin/repairs/new-case/repair-section";
import { formatKr, formatKrShort, type CaseLine } from "@/lib/repairs/case-money";
import {
  REPAIR_QUALITY_LABELS,
  type CaseItemView,
  type ItemStockStatus,
  type NewCaseItemInput,
  type RepairServiceCategory,
  type RepairServiceOption,
  type UpsellDevice,
  type UpsellProduct,
} from "@/lib/repairs/new-case-types";

type Props = {
  ticketId: string;
  store: LocationSlug | null;
  modelId: string | null;
  deviceModel: string | null;
  closed: boolean;
  lines: CaseLine[];
  /** Linjer med lagerstatus (repair_ticket_items). Mangler på ældre sager. */
  items: CaseItemView[] | undefined;
  onChanged: () => Promise<void> | void;
  onNotice: (message: string | null) => void;
};

const STATUS_LABEL: Record<ItemStockStatus, { text: string; tone: "grey" | "green" | "amber" | "red" } | null> = {
  none: null,
  planned: { text: "Planlagt", tone: "grey" },
  reserved: { text: "Reserveret", tone: "green" },
  backorder: { text: "Skal bestilles", tone: "amber" },
  consumed: { text: "Brugt", tone: "grey" },
  released: { text: "Frigivet", tone: "grey" },
  sold: { text: "Solgt", tone: "green" },
};

const LOCKED: ItemStockStatus[] = ["consumed", "sold", "released"];

export function stockStatusLabel(status: ItemStockStatus) {
  return STATUS_LABEL[status];
}

/** Kan linjen ændres? Brugte, solgte og frigivne linjer er låst. */
export function itemEditable(item: CaseItemView): boolean {
  return !LOCKED.includes(item.stock_status);
}

type Mode = "repair" | "item" | "free";

export default function CaseItemsEditor({ ticketId, store, modelId, deviceModel, closed, lines, items, onChanged, onNotice }: Props) {
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<Mode>("repair");
  const [busy, setBusy] = useState<string | null>(null);
  const [swapFor, setSwapFor] = useState<string | null>(null);

  const editable = !closed && Boolean(items);

  async function call(url: string, method: string, body: unknown, failMessage: string, key: string): Promise<boolean> {
    setBusy(key);
    onNotice(null);
    let ok = false;
    try {
      const res = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!res.ok) onNotice(await apiError(res, failMessage));
      else {
        ok = true;
        await onChanged();
      }
    } catch {
      onNotice(`${failMessage} Forbindelsen fejlede.`);
    }
    setBusy(null);
    return ok;
  }

  const addItem = (item: NewCaseItemInput, key: string) =>
    call(`/api/admin/repairs/${ticketId}/items`, "POST", { item }, "Linjen blev ikke tilføjet. Prøv igen.", key);

  async function removeItem(item: CaseItemView) {
    if (!window.confirm(`Fjern "${item.description}" fra sagen? ${item.stock_status === "reserved" ? "Den reserverede del frigives." : ""}`.trim())) return;
    await call(`/api/admin/repairs/${ticketId}/items/${item.id}`, "DELETE", undefined, "Linjen blev ikke fjernet. Prøv igen.", `rm-${item.id}`);
  }

  async function swapPart(item: CaseItemView, skuId: string) {
    const ok = await call(`/api/admin/repairs/${ticketId}/items/${item.id}/swap-part`, "POST", { sku_product_id: skuId }, "Delen blev ikke skiftet. Prøv igen.", `swap-${item.id}`);
    if (ok) setSwapFor(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {lines.length === 0 && (!items || items.length === 0) ? (
        <p className="m-0 text-sm text-[#5E6A63]">Ingen opgaver eller varer på sagen endnu. Send et tilbud, eller læg varer på sagen i kassen.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E2E5E0] text-left text-[13px] font-semibold text-[#5E6A63]">
                <th className="py-2 font-semibold">Vare</th>
                {items && <th className="w-44 py-2 font-semibold">Lager</th>}
                <th className="w-16 py-2 font-semibold">Antal</th>
                <th className="w-32 py-2 text-right font-semibold">Pris</th>
                {editable && (
                  <th className="w-40 py-2 text-right font-semibold">
                    <span className="sr-only">Handlinger</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {items
                ? items.map((it) => {
                    const st = STATUS_LABEL[it.stock_status];
                    const canEdit = editable && itemEditable(it);
                    const canSwap = canEdit && (it.kind === "repair" || it.kind === "part") && Boolean(modelId);
                    return (
                      <tr key={it.id} className={`border-b border-[#EEF0EC] align-top ${it.stock_status === "released" ? "text-[#8A948E] line-through" : ""}`}>
                        <td className="py-3">
                          {[it.kind === "repair" ? deviceModel : null, it.description].filter(Boolean).join(" · ")}
                          {it.quality_label && <span className="text-[#5E6A63]"> ({it.quality_label})</span>}
                          {it.price_reason && <span className="block text-xs text-[#5E6A63]">Afvigende pris: {it.price_reason}</span>}
                          {swapFor === it.id && (
                            <SwapPicker
                              modelId={modelId}
                              store={store}
                              current={it}
                              busy={busy === `swap-${it.id}`}
                              onPick={(sku) => swapPart(it, sku)}
                              onClose={() => setSwapFor(null)}
                            />
                          )}
                        </td>
                        <td className="py-3">{st ? <Pill tone={st.tone}>{st.text}</Pill> : <span className="text-[#5E6A63]">Ikke optalt</span>}</td>
                        <td className="py-3">{it.qty}</td>
                        <td className="py-3 text-right tabular-nums">{formatKr(it.total_oere)}</td>
                        {editable && (
                          <td className="py-3 text-right">
                            <span className="inline-flex gap-1.5">
                              {canSwap && (
                                <Btn size="sm" aria-label={`Skift del: ${it.description}`} onClick={() => setSwapFor(swapFor === it.id ? null : it.id)}>
                                  Skift del
                                </Btn>
                              )}
                              {canEdit && (
                                <Btn size="sm" aria-label={`Fjern ${it.description}`} disabled={busy === `rm-${it.id}`} onClick={() => removeItem(it)}>
                                  Fjern
                                </Btn>
                              )}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })
                : lines.map((l) => (
                    <tr key={l.id} className="border-b border-[#EEF0EC]">
                      <td className="py-3">{[deviceModel, l.name].filter(Boolean).join(" · ")}</td>
                      <td className="py-3">{l.qty}</td>
                      <td className="py-3 text-right tabular-nums">{formatKr(l.total_oere)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {editable && (
        <div>
          {!adding ? (
            <Btn size="sm" onClick={() => setAdding(true)}>
              Tilføj linje
            </Btn>
          ) : (
            <AddPanel
              mode={mode}
              onMode={setMode}
              modelId={modelId}
              store={store}
              busy={busy}
              onAdd={addItem}
              onClose={() => setAdding(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Skift del ------------------------------ */

function SwapPicker({
  modelId,
  store,
  current,
  busy,
  onPick,
  onClose,
}: {
  modelId: string | null;
  store: LocationSlug | null;
  current: CaseItemView;
  busy: boolean;
  onPick: (skuId: string) => void;
  onClose: () => void;
}) {
  const [options, setOptions] = useState<RepairServiceOption[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!modelId) return;
    const ctrl = new AbortController();
    fetchModelServices(modelId, store, ctrl.signal)
      .then((r) => {
        const cat = r.categories.find((c) => c.services.some((s) => s.id === current.repair_service_id));
        setOptions((cat?.services ?? []).filter((s) => s.part));
      })
      .catch((err) => {
        if ((err as { name?: string })?.name !== "AbortError") setError(err instanceof Error ? err.message : "Dele kunne ikke hentes.");
      });
    return () => ctrl.abort();
  }, [modelId, store, current.repair_service_id]);

  return (
    <div role="group" aria-label="Skift del" className="mt-2 flex flex-col gap-2 rounded-lg border border-[#E2E5E0] bg-[#FAFBF9] p-3 no-underline">
      {error && <p role="alert" className="m-0 text-sm text-[#B42318]">{error}</p>}
      {!options && !error && <p className="m-0 text-sm text-[#5E6A63]">Henter dele...</p>}
      {options && options.length === 0 && <p className="m-0 text-sm text-[#5E6A63]">Ingen andre dele er koblet til reparationen.</p>}
      {options?.map((o) => {
        const st = stockInfo(o.part, store ?? "vejle");
        const isCurrent = o.part?.sku_product_id === current.sku_product_id;
        return (
          <button
            key={o.id}
            type="button"
            disabled={busy || isCurrent || !o.part}
            onClick={() => o.part && onPick(o.part.sku_product_id)}
            className="flex items-center justify-between gap-3 rounded-lg border border-[#E2E5E0] bg-white px-3 py-2 text-left text-sm hover:bg-[#F5F6F4] disabled:opacity-60"
          >
            <span>
              <b>{o.quality_tier ? REPAIR_QUALITY_LABELS[o.quality_tier] : o.name}</b>
              {isCurrent && " (nuværende)"}
              <span className="block text-[13px] text-[#5E6A63]">{st.text}</span>
            </span>
          </button>
        );
      })}
      <div>
        <Btn size="sm" onClick={onClose}>
          Luk
        </Btn>
      </div>
    </div>
  );
}

/* ------------------------------ Tilføj ------------------------------- */

function AddPanel({
  mode,
  onMode,
  modelId,
  store,
  busy,
  onAdd,
  onClose,
}: {
  mode: Mode;
  onMode: (m: Mode) => void;
  modelId: string | null;
  store: LocationSlug | null;
  busy: string | null;
  onAdd: (item: NewCaseItemInput, key: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [categories, setCategories] = useState<RepairServiceCategory[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [products, setProducts] = useState<UpsellProduct[]>([]);
  const [devices, setDevices] = useState<UpsellDevice[]>([]);
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (mode !== "repair" || !modelId || categories) return;
    const ctrl = new AbortController();
    fetchModelServices(modelId, store, ctrl.signal)
      .then((r) => setCategories(r.categories))
      .catch((err) => {
        if ((err as { name?: string })?.name !== "AbortError") setError(err instanceof Error ? err.message : "Reparationer kunne ikke hentes.");
      });
    return () => ctrl.abort();
  }, [mode, modelId, store, categories]);

  useEffect(() => {
    const term = q.trim();
    if (mode !== "item" || term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      Promise.all([modelId ? fetchUpsell(modelId, store, term, ctrl.signal) : Promise.resolve({ items: [] as UpsellProduct[] }), searchDevices(term, store, ctrl.signal)])
        .then(([p, d]) => {
          setProducts(p.items);
          setDevices(d.devices);
          setError("");
        })
        .catch((err) => {
          if ((err as { name?: string })?.name !== "AbortError") setError(err instanceof Error ? err.message : "Søgningen fejlede.");
        });
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [mode, q, modelId, store]);

  const priceNum = Number(price.replace(",", "."));
  const freeValid = desc.trim().length > 1 && price.trim() !== "" && Number.isFinite(priceNum) && priceNum >= 0;
  const term = q.trim();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#E2E5E0] bg-[#FAFBF9] p-4" role="group" aria-label="Tilføj linje">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Type" className="flex gap-1 rounded-[10px] bg-[#E9ECE7] p-1">
          {(
            [
              ["repair", "Reparation"],
              ["item", "Vare eller enhed"],
              ["free", "Anden opgave"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => onMode(m)}
              className={`h-8 rounded-lg px-3 text-sm ${mode === m ? "bg-white font-semibold" : "text-[#3D4842]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <Btn size="sm" onClick={onClose}>
          Luk
        </Btn>
      </div>

      {error && (
        <p role="alert" className="m-0 text-sm text-[#B42318]">
          {error}
        </p>
      )}

      {mode === "repair" &&
        (!modelId ? (
          <p className="m-0 text-sm text-[#5E6A63]">Sagen har ingen model i kataloget. Brug &quot;Anden opgave&quot;.</p>
        ) : !categories ? (
          <p className="m-0 text-sm text-[#5E6A63]">Henter reparationer...</p>
        ) : (
          categories.map((c) => (
            <div key={c.name} className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-[#5E6A63]">{c.name}</span>
              <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                {c.services.map((s) => (
                  <TierCard key={s.id} service={s} location={store ?? "vejle"} on={false} onClick={() => !busy && onAdd({ kind: "repair", repair_service_id: s.id }, `add-${s.id}`)} />
                ))}
              </div>
            </div>
          ))
        ))}

      {mode === "item" && (
        <>
          <input
            aria-label="Søg vare eller enhed"
            placeholder="Søg tilbehør, produkt eller enhed"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-10 rounded-lg border border-[#C9D0C7] bg-white px-3 text-sm"
          />
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {term.length >= 2 &&
              devices.map((d) => (
                <button
                  key={d.device_id}
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => onAdd({ kind: "device", device_id: d.device_id }, `add-${d.device_id}`)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#E2E5E0] bg-white px-3 py-2 text-left text-sm hover:bg-[#F5F6F4]"
                >
                  <span>
                    <b>{d.name}</b>
                    <span className="block text-[13px] text-[#5E6A63]">{[d.storage, d.grade ? `Grade ${d.grade}` : null].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="font-semibold">+ {formatKrShort(d.price_oere)}</span>
                </button>
              ))}
            {term.length >= 2 &&
              products.map((p) => (
                <button
                  key={p.sku_product_id}
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => onAdd({ kind: "product", sku_product_id: p.sku_product_id, qty: 1 }, `add-${p.sku_product_id}`)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#E2E5E0] bg-white px-3 py-2 text-left text-sm hover:bg-[#F5F6F4]"
                >
                  <span>
                    <b>{p.title}</b>
                    <span className="block text-[13px] text-[#5E6A63]">{stockInfo(p, store ?? "vejle").text}</span>
                  </span>
                  <span className="font-semibold">+ {formatKrShort(p.price_oere)}</span>
                </button>
              ))}
          </div>
        </>
      )}

      {mode === "free" && (
        <form
          className="grid items-end gap-3 [grid-template-columns:2fr_1fr_auto]"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!freeValid) return;
            const ok = await onAdd({ kind: "free_text", description: desc.trim(), unit_price_oere: Math.round(priceNum * 100), qty: 1 }, "add-free");
            if (ok) {
              setDesc("");
              setPrice("");
            }
          }}
        >
          <label className="flex flex-col gap-1 text-[13px] text-[#5E6A63]">
            Beskrivelse
            <input className="h-10 rounded-lg border border-[#C9D0C7] bg-white px-3 text-sm text-[#15211B]" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] text-[#5E6A63]">
            Pris (kr.)
            <input inputMode="decimal" className="h-10 rounded-lg border border-[#C9D0C7] bg-white px-3 text-sm text-[#15211B]" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <Btn type="submit" variant="primary" disabled={!freeValid || Boolean(busy)}>
            Tilføj
          </Btn>
        </form>
      )}
    </div>
  );
}
