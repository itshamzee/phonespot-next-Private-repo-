"use client";

import { useEffect, useRef, useState } from "react";
import { Btn } from "@/components/admin/repairs/ui";
import { formatKrShort } from "@/lib/repairs/case-money";
import type { UpsellDevice, UpsellProduct } from "@/lib/repairs/new-case-types";
import { fetchUpsell, searchDevices } from "./api";
import { stockInfo, type AddonLine, type LocationSlug } from "./logic";
import { focusRing } from "./section-card";

type Props = {
  modelId: string | null;
  modelName: string | null;
  location: LocationSlug;
  addons: AddonLine[];
  onAdd: (line: AddonLine) => void;
  onRemove: (key: string) => void;
  onQty: (key: string, qty: number) => void;
  onDone: () => void;
};

const toneClass = { ok: "text-[#5E6A63]", warn: "text-[#9A5B0A]", muted: "text-[#5E6A63]" } as const;

export function productLine(p: UpsellProduct): AddonLine {
  return { key: `p:${p.sku_product_id}`, kind: "product", sku_product_id: p.sku_product_id, title: p.title, price_oere: p.price_oere, qty: 1 };
}

export function deviceLine(d: UpsellDevice): AddonLine {
  return {
    key: `d:${d.device_id}`,
    kind: "device",
    device_id: d.device_id,
    title: [d.name, d.storage, d.grade ? `grade ${d.grade}` : null].filter(Boolean).join(" · "),
    price_oere: d.price_oere,
    qty: 1,
  };
}

export function AddonsSection({ modelId, modelName, location, addons, onAdd, onRemove, onQty, onDone }: Props) {
  const [suggestions, setSuggestions] = useState<UpsellProduct[]>([]);
  const [suggestError, setSuggestError] = useState("");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<UpsellProduct[]>([]);
  const [devices, setDevices] = useState<UpsellDevice[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const seq = useRef(0);

  useEffect(() => {
    if (!modelId) return;
    const ctrl = new AbortController();
    fetchUpsell(modelId, location, "", ctrl.signal)
      .then((r) => {
        setSuggestions(r.items);
        setSuggestError("");
      })
      .catch((err) => {
        if ((err as { name?: string })?.name !== "AbortError") setSuggestError(err instanceof Error ? err.message : "Forslag kunne ikke hentes.");
      });
    return () => ctrl.abort();
  }, [modelId, location]);

  useEffect(() => {
    const q = query.trim();
    const mine = ++seq.current;
    if (q.length < 2) {
      setProducts([]);
      setDevices([]);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const [prod, dev] = await Promise.all([
          modelId ? fetchUpsell(modelId, location, q, ctrl.signal) : Promise.resolve({ items: [] as UpsellProduct[] }),
          searchDevices(q, location, ctrl.signal),
        ]);
        if (mine === seq.current) {
          setProducts(prod.items);
          setDevices(dev.devices);
          setSearchError("");
        }
      } catch (err) {
        if ((err as { name?: string })?.name !== "AbortError" && mine === seq.current) {
          setSearchError(err instanceof Error ? err.message : "Søgningen fejlede.");
        }
      } finally {
        if (mine === seq.current) setSearching(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, modelId, location]);

  const has = (key: string) => addons.some((a) => a.key === key);

  function toggle(line: AddonLine) {
    if (has(line.key)) onRemove(line.key);
    else onAdd(line);
  }

  function productCard(p: UpsellProduct) {
    const line = productLine(p);
    const added = has(line.key);
    const stock = stockInfo(p, location);
    return (
      <button
        key={p.sku_product_id}
        type="button"
        aria-pressed={added}
        onClick={() => toggle(line)}
        className={`flex items-center justify-between gap-2 rounded-xl px-3.5 py-3 text-left text-sm ${focusRing} ${
          added ? "border-2 border-[#1A3D2E]" : "border border-[#E2E5E0] hover:bg-[#F5F6F4]"
        }`}
      >
        <span>
          <b>{p.title}</b>
          <br />
          <span className={`text-[13px] ${toneClass[stock.tone]}`}>{stock.text}</span>
        </span>
        <span className="shrink-0 font-semibold">{added ? `${formatKrShort(p.price_oere)} · Tilføjet` : `+ ${formatKrShort(p.price_oere)}`}</span>
      </button>
    );
  }

  function deviceCard(d: UpsellDevice) {
    const line = deviceLine(d);
    const added = has(line.key);
    return (
      <button
        key={d.device_id}
        type="button"
        aria-pressed={added}
        onClick={() => toggle(line)}
        className={`flex items-center justify-between gap-2 rounded-xl px-3.5 py-3 text-left text-sm ${focusRing} ${
          added ? "border-2 border-[#1A3D2E]" : "border border-[#E2E5E0] hover:bg-[#F5F6F4]"
        }`}
      >
        <span>
          <b>{d.name}</b>
          <br />
          <span className="text-[13px] text-[#5E6A63]">{[d.storage, d.grade ? `Grade ${d.grade}` : null, d.barcode].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="shrink-0 font-semibold">{added ? `${formatKrShort(d.price_oere)} · Tilføjet` : `+ ${formatKrShort(d.price_oere)}`}</span>
      </button>
    );
  }

  const searchingNow = query.trim().length >= 2;

  return (
    <>
      <div className="-mt-1 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-[#5E6A63]">{modelName ? `Forslag til ${modelName}` : "Vælg en enhed for at få forslag"}</span>
        <label className="flex h-10 flex-[0_1_340px] items-center rounded-lg border border-[#C9D0C7] px-3 focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-[#2F8F55]">
          <input
            data-autofocus
            aria-label="Tilføj enhed eller produkt"
            placeholder="Tilføj enhed, tilbehør eller produkt"
            value={query}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.preventDefault();
                setQuery("");
              }
            }}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      {suggestError && (
        <p role="alert" className="m-0 text-sm text-[#8A4B08]">
          {suggestError}
        </p>
      )}

      {searchingNow ? (
        <>
          {searchError && (
            <p role="alert" className="m-0 text-sm text-[#B42318]">
              {searchError}
            </p>
          )}
          {searching && <p className="m-0 text-sm text-[#5E6A63]">Søger...</p>}
          <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]" aria-label="Søgeresultater">
            {devices.map(deviceCard)}
            {products.map(productCard)}
          </div>
          {!searching && !searchError && products.length === 0 && devices.length === 0 && (
            <p className="m-0 text-sm text-[#5E6A63]">Ingen varer matcher &quot;{query.trim()}&quot;.</p>
          )}
        </>
      ) : (
        suggestions.length > 0 && <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">{suggestions.map(productCard)}</div>
      )}

      {addons.length > 0 && (
        <ul aria-label="Tilkøb på sagen" className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
          {addons.map((a) => (
            <li key={a.key} className="flex items-center justify-between gap-3 rounded-lg bg-[#F5F6F4] px-3 py-2">
              <span>{a.title}</span>
              <span className="flex items-center gap-3">
                {a.kind === "product" && (
                  <span className="flex items-center gap-1">
                    <button type="button" aria-label={`Færre ${a.title}`} disabled={a.qty <= 1} onClick={() => onQty(a.key, a.qty - 1)} className={`h-7 w-7 rounded-md border border-[#C9D0C7] bg-white disabled:opacity-40 ${focusRing}`}>
                      -
                    </button>
                    <span className="w-6 text-center tabular-nums" aria-label={`Antal ${a.title}`}>
                      {a.qty}
                    </span>
                    <button type="button" aria-label={`Flere ${a.title}`} onClick={() => onQty(a.key, a.qty + 1)} className={`h-7 w-7 rounded-md border border-[#C9D0C7] bg-white ${focusRing}`}>
                      +
                    </button>
                  </span>
                )}
                <span className="tabular-nums">{formatKrShort(a.price_oere * a.qty)}</span>
                <button type="button" onClick={() => onRemove(a.key)} aria-label={`Fjern ${a.title}`} className={`text-[#B42318] underline ${focusRing}`}>
                  Fjern
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end">
        <Btn variant="primary" onClick={onDone}>
          Videre til detaljer
        </Btn>
      </div>
    </>
  );
}
