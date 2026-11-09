"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button, Input, Select } from "@/components/admin/ui";
import { staffFetch } from "@/lib/buyback/admin-fetch";
import type { ConditionLabel } from "@/lib/opkoeb/rules";
import { CONDITIONS, formatKr, formatKrInput, imeiError, parseKr, type ItemForm } from "./receipt-form";

type Template = {
  id: string;
  brand: string | null;
  model: string | null;
  display_name: string | null;
  storage_options?: string[] | null;
};

type Suggestion = {
  status: "ok" | "manual";
  aim_oere: number;
  floor_oere: number;
  manual_reason?: string;
  note?: string;
  green_url: string;
};

const SEARCH_DEBOUNCE_MS = 250;
const MAX_RESULTS = 8;

const labelClass = "text-[13px] font-medium text-charcoal";

/**
 * Én enhed på opkøbet: IMEI (scanneren skriver her), model, lager, stand,
 * batteri, prisforslag og endelig pris. Enter flytter videre til næste felt.
 */
export function ItemRow({
  item,
  index,
  autoFocus,
  removable,
  disabled,
  onChange,
  onRemove,
}: {
  item: ItemForm;
  index: number;
  autoFocus: boolean;
  removable: boolean;
  disabled: boolean;
  onChange: (patch: Partial<ItemForm>) => void;
  onRemove: () => void;
}) {
  const n = index + 1;
  const imeiRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);
  const conditionRef = useRef<HTMLSelectElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) imeiRef.current?.focus();
    // Kun ved første visning; ellers ville fokus hoppe tilbage ved hver ændring.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Modelsøgning ---- */
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Template[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await staffFetch(`/api/platform/templates?search=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error(String(res.status));
        const list = (await res.json()) as Template[];
        if (!cancelled) {
          setResults(list.slice(0, MAX_RESULTS));
          setSearchError(null);
          setSearchOpen(true);
        }
      } catch {
        if (!cancelled) setSearchError("Modelsøgningen fejlede. Prøv igen.");
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  function pickTemplate(t: Template) {
    const options = t.storage_options ?? [];
    onChange({
      template_id: t.id,
      brand: t.brand ?? "",
      model: t.model ?? "",
      storage_options: options,
      storage: options.includes(item.storage) ? item.storage : options.length === 1 ? options[0] : "",
    });
    setQuery("");
    setResults([]);
    setSearchOpen(false);
    requestAnimationFrame(() => conditionRef.current?.focus());
  }

  function clearTemplate() {
    onChange({ template_id: null, storage_options: [], suggested: null });
    requestAnimationFrame(() => modelRef.current?.focus());
  }

  /* ---- Prisforslag ---- */
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const latest = useRef({ item, onChange });
  latest.current = { item, onChange };

  const battery = /^\d{1,3}$/.test(item.battery.trim()) ? Number(item.battery.trim()) : undefined;
  useEffect(() => {
    if (!item.template_id || !item.condition) {
      setSuggestion(null);
      return;
    }
    let cancelled = false;
    setLoadingSuggestion(true);
    setSuggestionError(null);
    (async () => {
      try {
        const res = await staffFetch("/api/trade-in/price-suggestion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template_id: item.template_id,
            storage: item.storage || undefined,
            condition: item.condition,
            battery_health: battery !== undefined && battery <= 100 ? battery : undefined,
            // Opkøbet kan ikke bekræftes, før Find My er tjekket slået fra; forslaget regner med det.
            find_my_off: true,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as Suggestion & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setSuggestion(null);
          setSuggestionError(data.error ?? "Kunne ikke hente prisforslag");
          return;
        }
        setSuggestion(data);
        const { item: cur, onChange: change } = latest.current;
        const aim = data.status === "ok" && data.aim_oere > 0 ? data.aim_oere : null;
        // Prisen følger forslaget, indtil personalet selv har rettet den.
        const current = parseKr(cur.priceKr);
        const untouched = current === null || (cur.suggested !== null && current === cur.suggested);
        change({ suggested: aim, ...(untouched ? { priceKr: aim ? formatKrInput(aim) : "" } : {}) });
      } catch {
        if (!cancelled) setSuggestionError("Kunne ikke hente prisforslag");
      } finally {
        if (!cancelled) setLoadingSuggestion(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item.template_id, item.condition, item.storage, battery]);

  const enterTo = (next: () => void) => (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      next();
    }
  };

  const imeiMsg = imeiError(item.imei);
  const modelLabel = [item.brand, item.model].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-4 border-t border-sand py-5 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-semibold text-charcoal">Enhed {n}</p>
        {removable && (
          <Button size="sm" variant="quiet" onClick={onRemove} disabled={disabled}>
            Fjern enhed {n}
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`imei-${item.key}`} className={labelClass}>
            IMEI eller serienummer
          </label>
          <Input
            ref={imeiRef}
            id={`imei-${item.key}`}
            aria-label={`IMEI eller serienummer, vare ${n}`}
            value={item.imei}
            invalid={!!imeiMsg}
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            className="font-mono tabular-nums"
            onChange={(e) => onChange({ imei: e.target.value })}
            onKeyDown={enterTo(() => (item.template_id ? conditionRef.current : modelRef.current)?.focus())}
          />
          {imeiMsg && (
            <p role="alert" className="text-[13px] text-[#B42318]">
              {imeiMsg}
            </p>
          )}
        </div>

        <div className="relative flex flex-col gap-1.5">
          <label htmlFor={`model-${item.key}`} className={labelClass}>
            Model
          </label>
          {item.template_id ? (
            <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-sand bg-cream px-3">
              <span className="truncate text-[14px] text-charcoal">{modelLabel}</span>
              <Button size="sm" variant="quiet" onClick={clearTemplate} disabled={disabled}>
                Skift model
              </Button>
            </div>
          ) : (
            <>
              <Input
                ref={modelRef}
                id={`model-${item.key}`}
                aria-label={`Model, vare ${n}`}
                role="combobox"
                aria-expanded={searchOpen && results.length > 0}
                aria-controls={`model-results-${item.key}`}
                placeholder={item.model ? `${modelLabel} (vælg i listen)` : "Søg, fx iPhone 13"}
                value={query}
                disabled={disabled}
                autoComplete="off"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results[0]) {
                    e.preventDefault();
                    pickTemplate(results[0]);
                  } else if (e.key === "Escape") {
                    setSearchOpen(false);
                  }
                }}
              />
              {searchOpen && results.length > 0 && (
                <ul
                  id={`model-results-${item.key}`}
                  role="listbox"
                  aria-label={`Modeller, vare ${n}`}
                  className="absolute left-0 right-0 top-full z-10 mt-1 max-h-72 overflow-auto rounded-lg border border-sand bg-white py-1"
                >
                  {results.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => pickTemplate(t)}
                        className="w-full px-3 py-2 text-left text-[14px] text-charcoal hover:bg-cream focus:bg-cream focus:outline-none"
                      >
                        {[t.brand, t.display_name ?? t.model].filter(Boolean).join(" ")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {searchOpen && query.trim().length >= 2 && results.length === 0 && !searchError && (
                <p className="text-[13px] text-gray">Ingen modeller matcher &quot;{query.trim()}&quot;.</p>
              )}
              {searchError && (
                <p role="alert" className="text-[13px] text-[#B42318]">
                  {searchError}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`storage-${item.key}`} className={labelClass}>
            Lager
          </label>
          {item.storage_options.length > 0 ? (
            <Select
              id={`storage-${item.key}`}
              aria-label={`Lager, vare ${n}`}
              value={item.storage}
              disabled={disabled}
              onChange={(e) => onChange({ storage: e.target.value })}
            >
              <option value="">Vælg</option>
              {item.storage_options.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              id={`storage-${item.key}`}
              aria-label={`Lager, vare ${n}`}
              value={item.storage}
              disabled={disabled}
              placeholder="Fx 128GB"
              onChange={(e) => onChange({ storage: e.target.value })}
            />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`condition-${item.key}`} className={labelClass}>
            Stand
          </label>
          <Select
            ref={conditionRef}
            id={`condition-${item.key}`}
            aria-label={`Stand, vare ${n}`}
            value={item.condition}
            disabled={disabled}
            onChange={(e) => onChange({ condition: e.target.value as ConditionLabel | "" })}
            onKeyDown={enterTo(() => priceRef.current?.focus())}
          >
            <option value="">Vælg</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`battery-${item.key}`} className={labelClass}>
            Batteri
          </label>
          <Input
            id={`battery-${item.key}`}
            aria-label={`Batteri, vare ${n}`}
            value={item.battery}
            disabled={disabled}
            inputMode="numeric"
            suffix="%"
            onChange={(e) => onChange({ battery: e.target.value.replace(/\D/g, "").slice(0, 3) })}
            onKeyDown={enterTo(() => priceRef.current?.focus())}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <p className={labelClass}>Prisforslag</p>
          <div className="flex min-h-10 flex-col justify-center text-[14px]">
            {!item.template_id || !item.condition ? (
              <span className="text-gray">Vælg model og stand</span>
            ) : loadingSuggestion ? (
              <span className="text-gray">Henter forslag …</span>
            ) : suggestionError ? (
              <span className="text-[#B42318]">{suggestionError}</span>
            ) : suggestion?.status === "ok" ? (
              <span className="tabular-nums text-charcoal">
                {formatKr(suggestion.aim_oere)}
                <span className="text-gray"> · bund {formatKr(suggestion.floor_oere)}</span>
              </span>
            ) : suggestion ? (
              <span className="text-[#8A4B08]">{suggestion.manual_reason ?? "Prissættes manuelt"}</span>
            ) : null}
            {suggestion?.note && <span className="text-[13px] text-[#8A4B08]">{suggestion.note}</span>}
            {suggestion && (
              <a
                href={suggestion.green_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-green-eco underline underline-offset-2 hover:text-green-light"
              >
                Se Green.dk&apos;s pris
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`price-${item.key}`} className={labelClass}>
            Pris
          </label>
          <Input
            ref={priceRef}
            id={`price-${item.key}`}
            aria-label={`Pris, vare ${n}`}
            value={item.priceKr}
            disabled={disabled}
            inputMode="decimal"
            suffix="kr."
            className="tabular-nums"
            invalid={item.priceKr.trim() !== "" && parseKr(item.priceKr) === null}
            onChange={(e) => onChange({ priceKr: e.target.value })}
          />
          {item.priceKr.trim() !== "" && parseKr(item.priceKr) === null && (
            <p role="alert" className="text-[13px] text-[#B42318]">
              Skriv prisen i kroner, fx 2.400 eller 2.400,50
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`note-${item.key}`} className={labelClass}>
          Note
        </label>
        <Input
          id={`note-${item.key}`}
          aria-label={`Note, vare ${n}`}
          value={item.note}
          disabled={disabled}
          placeholder="Fx ridse i skærmen, mangler oplader"
          onChange={(e) => onChange({ note: e.target.value })}
        />
      </div>
    </div>
  );
}
