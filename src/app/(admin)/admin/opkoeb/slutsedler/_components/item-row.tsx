"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button, Input } from "@/components/admin/ui";
import { staffFetch } from "@/lib/buyback/admin-fetch";
import type { ConditionLabel } from "@/lib/opkoeb/rules";
import {
  groupsWithModels,
  isOther,
  loadCatalog,
  modelsIn,
  otherTemplate,
  searchCatalog,
  shortLabel,
  storageChoices,
  templateLabel,
  type GroupKey,
  type Template,
} from "./model-catalog";
import { batteryError, CONDITIONS, formatKr, formatKrInput, imeiError, parseKr, type ItemForm } from "./receipt-form";

export { templateLabel };

type Suggestion = {
  status: "ok" | "manual";
  aim_oere: number;
  floor_oere: number;
  manual_reason?: string;
  note?: string;
  green_url: string;
};

const labelClass = "text-[13px] font-medium text-charcoal";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-light";

const CONDITION_HINTS: Record<ConditionLabel, string> = {
  Perfekt: "Ingen synlige brugsspor",
  God: "Lette brugsspor",
  Acceptabel: "Tydelige ridser eller slid",
  Defekt: "Fejl eller skade, prissættes manuelt",
};

/** Ét valg blandt få, som knapper man kan ramme med en finger. */
function Choices<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  groupRef,
  render,
}: {
  label: string;
  value: T | "";
  options: readonly T[];
  onChange: (v: T) => void;
  disabled?: boolean;
  groupRef?: React.RefObject<HTMLDivElement | null>;
  render?: (v: T) => ReactNode;
}) {
  return (
    <div ref={groupRef} role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o === value;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o)}
            className={`min-h-10 rounded-lg px-3.5 text-[14px] disabled:opacity-60 ${focusRing} ${
              on ? "border-2 border-[#1A3D2E] bg-[#E7EFE9] font-semibold text-charcoal" : "border border-sand bg-white text-charcoal hover:bg-cream"
            }`}
          >
            {render ? render(o) : o}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Én enhed på opkøbet. Model, lager og stand vælges med knapper; modellen kan
 * også søges frem eller skrives som fritekst, når den ikke står på listen.
 * Scanneren skriver i IMEI-feltet, og Enter flytter videre.
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
  const storageRef = useRef<HTMLDivElement>(null);
  const conditionRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) imeiRef.current?.focus();
    // Kun ved første visning; ellers ville fokus hoppe tilbage ved hver ændring.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Katalog ---- */
  const [catalog, setCatalog] = useState<Template[] | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setCatalogError(false);
    loadCatalog().then(
      (list) => {
        if (!cancelled) setCatalog(list);
      },
      () => {
        if (!cancelled) setCatalogError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const groups = useMemo(() => (catalog ? groupsWithModels(catalog) : []), [catalog]);
  const [groupKey, setGroupKey] = useState<GroupKey | null>(null);
  const group: GroupKey | null = groupKey ?? groups[0]?.key ?? null;
  const models = useMemo(() => (catalog && group ? modelsIn(catalog, group) : []), [catalog, group]);

  /* ---- Søgning og fritekst ---- */
  const [query, setQuery] = useState("");
  const [freeOpen, setFreeOpen] = useState(false);
  const [freeText, setFreeText] = useState("");
  const results = useMemo(() => (catalog ? searchCatalog(catalog, query) : []), [catalog, query]);
  const searching = query.trim().length >= 2;
  const other = catalog && group ? otherTemplate(catalog, group) : null;

  const focusFirst = (ref: React.RefObject<HTMLDivElement | null>) => ref.current?.querySelector<HTMLButtonElement>("button")?.focus();

  function pickTemplate(t: Template) {
    const options = (t.storage_options ?? []).filter(Boolean);
    const storage = options.includes(item.storage) ? item.storage : options.length === 1 ? options[0] : "";
    onChange({
      template_id: t.id,
      brand: t.brand ?? "",
      model: t.model ?? "",
      storage_options: options,
      storage,
    });
    setQuery("");
    setFreeOpen(false);
    // Lager først, når det mangler: prisforslaget afhænger af det.
    requestAnimationFrame(() => focusFirst(storage ? conditionRef : storageRef));
  }

  function pickFreeText() {
    const name = freeText.trim();
    if (!other || name.length < 2) return;
    onChange({ template_id: other.id, brand: "", model: name, storage_options: [], storage: "", suggested: null });
    setFreeText("");
    setFreeOpen(false);
    setQuery("");
    requestAnimationFrame(() => focusFirst(storageRef));
  }

  function clearTemplate() {
    onChange({ template_id: null, storage_options: [], suggested: null });
    requestAnimationFrame(() => modelRef.current?.focus());
  }

  /* ---- Valgt model ---- */
  const picked = item.template_id && catalog ? (catalog.find((t) => t.id === item.template_id) ?? null) : null;
  const pickedIsOther = picked ? isOther(picked) : false;
  const storageOptions = useMemo(() => {
    const list = storageChoices(picked, item.storage_options);
    // En gemt værdi uden for listen (fx fra en ældre kladde) skal stadig kunne ses som valgt.
    return item.storage && !list.includes(item.storage) ? [...list, item.storage] : list;
  }, [picked, item.storage_options, item.storage]);
  const ownStorage = (picked?.storage_options ?? item.storage_options ?? []).filter(Boolean);

  /* ---- Prisforslag ---- */
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const latest = useRef({ item, onChange });
  latest.current = { item, onChange };

  const battery = /^\d{1,3}$/.test(item.battery.trim()) ? Number(item.battery.trim()) : undefined;
  // Et forslag uden lager ville være prisen på en anden variant.
  const needsStorage = ownStorage.length > 0 && !item.storage;
  useEffect(() => {
    if (!item.template_id || !item.condition || needsStorage) {
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
  }, [item.template_id, item.condition, item.storage, battery, needsStorage]);

  const enterTo = (next: () => void) => (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      next();
    }
  };

  const imeiMsg = imeiError(item.imei);
  const modelLabel = picked && !pickedIsOther ? templateLabel(picked) : [item.brand, item.model].filter(Boolean).join(" ");
  const hasModel = !!item.template_id;

  return (
    <div className="flex flex-col gap-5 border-t border-sand py-5 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-semibold text-charcoal">Enhed {n}</p>
        {removable && (
          <Button size="sm" variant="quiet" onClick={onRemove} disabled={disabled}>
            Fjern enhed {n}
          </Button>
        )}
      </div>

      <div className="flex max-w-[380px] flex-col gap-1.5">
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
          placeholder="Scan eller skriv"
          className="font-mono tabular-nums"
          onChange={(e) => onChange({ imei: e.target.value })}
          onKeyDown={enterTo(() => (hasModel ? focusFirst(item.storage ? conditionRef : storageRef) : modelRef.current?.focus()))}
        />
        {imeiMsg && (
          <p role="alert" className="text-[13px] text-[#B42318]">
            {imeiMsg}
          </p>
        )}
      </div>

      {/* ---- Model ---- */}
      <div className="flex flex-col gap-3">
        <p className={labelClass}>Model</p>
        {hasModel ? (
          <div className="flex min-h-11 max-w-[520px] items-center justify-between gap-2 rounded-lg border-2 border-[#1A3D2E] bg-[#E7EFE9] px-3.5">
            <span className="truncate text-[15px] font-semibold text-charcoal">{modelLabel || "Model valgt"}</span>
            <Button size="sm" variant="quiet" onClick={clearTemplate} disabled={disabled}>
              Skift model
            </Button>
          </div>
        ) : (
          <>
            {item.model && (
              <p className="text-[13px] text-[#8A4B08]">
                Fra henvendelsen: {[item.brand, item.model].filter(Boolean).join(" ")}. Vælg den i listen.
              </p>
            )}
            <div className="relative max-w-[380px]">
              <Input
                ref={modelRef}
                id={`model-${item.key}`}
                aria-label={`Model, vare ${n}`}
                role="combobox"
                aria-expanded={searching && results.length > 0}
                aria-controls={`model-results-${item.key}`}
                placeholder="Søg, fx iph 13 pro"
                value={query}
                disabled={disabled}
                autoComplete="off"
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (results[0]) pickTemplate(results[0]);
                  } else if (e.key === "Escape") {
                    setQuery("");
                  }
                }}
              />
              {searching && results.length > 0 && (
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
                        {templateLabel(t)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {searching && catalog && results.length === 0 && (
              <p className="text-[13px] text-gray">Ingen modeller matcher &quot;{query.trim()}&quot;. Skriv den som fritekst nedenfor.</p>
            )}

            {catalogError && (
              <p role="alert" className="flex items-center gap-3 text-[13px] text-[#B42318]">
                Modellerne kunne ikke hentes.
                <Button size="sm" onClick={() => setAttempt((a) => a + 1)}>
                  Prøv igen
                </Button>
              </p>
            )}
            {!catalog && !catalogError && <p className="text-[13px] text-gray">Henter modeller …</p>}

            {catalog && group && (
              <>
                <Choices<GroupKey>
                  label={`Type, vare ${n}`}
                  value={group}
                  options={groups.map((g) => g.key)}
                  onChange={(g) => {
                    setGroupKey(g);
                    setFreeOpen(false);
                  }}
                  disabled={disabled}
                  render={(g) => groups.find((x) => x.key === g)?.label ?? g}
                />
                <div
                  role="group"
                  aria-label={`Vælg model, vare ${n}`}
                  className="grid max-h-[264px] gap-2 overflow-auto [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]"
                >
                  {models.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => pickTemplate(t)}
                      className={`min-h-10 rounded-lg border border-sand bg-white px-3 py-2 text-left text-[14px] leading-tight text-charcoal hover:bg-cream disabled:opacity-60 ${focusRing}`}
                    >
                      {shortLabel(t, group)}
                    </button>
                  ))}
                </div>
              </>
            )}

            {catalog && other && (
              <div className="flex flex-col gap-2">
                {!freeOpen ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setFreeText(query.trim());
                      setFreeOpen(true);
                    }}
                    className={`self-start rounded text-[13px] text-green-eco underline underline-offset-2 hover:text-charcoal ${focusRing}`}
                  >
                    Modellen står ikke på listen
                  </button>
                ) : (
                  <div className="flex max-w-[520px] items-end gap-2">
                    <div className="flex flex-1 flex-col gap-1.5">
                      <label htmlFor={`free-${item.key}`} className={labelClass}>
                        Skriv mærke og model
                      </label>
                      <Input
                        id={`free-${item.key}`}
                        aria-label={`Model som fritekst, vare ${n}`}
                        autoFocus
                        value={freeText}
                        disabled={disabled}
                        autoComplete="off"
                        placeholder="Fx Nothing Phone 2"
                        onChange={(e) => setFreeText(e.target.value)}
                        onKeyDown={enterTo(pickFreeText)}
                      />
                    </div>
                    <Button onClick={pickFreeText} disabled={disabled || freeText.trim().length < 2}>
                      Brug
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ---- Lager og stand: først når modellen er valgt ---- */}
      {hasModel && (
        <>
          <div className="flex flex-col gap-2">
            <p className={labelClass}>Lager</p>
            <div className="flex flex-wrap items-center gap-2">
              {storageOptions.length > 0 && (
                <Choices
                  label={`Lager, vare ${n}`}
                  value={item.storage}
                  options={storageOptions}
                  onChange={(v) => {
                    onChange({ storage: v });
                    requestAnimationFrame(() => focusFirst(conditionRef));
                  }}
                  disabled={disabled}
                  groupRef={storageRef}
                />
              )}
              {ownStorage.length === 0 && (
                <div className="w-[150px]">
                  <Input
                    id={`storage-${item.key}`}
                    aria-label={`Andet lager, vare ${n}`}
                    value={storageOptions.includes(item.storage) ? "" : item.storage}
                    disabled={disabled}
                    placeholder={storageOptions.length > 0 ? "Andet" : "Fx 128GB"}
                    onChange={(e) => onChange({ storage: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className={labelClass}>Stand</p>
            <Choices<ConditionLabel>
              label={`Stand, vare ${n}`}
              value={item.condition}
              options={CONDITIONS}
              onChange={(v) => onChange({ condition: v })}
              disabled={disabled}
              groupRef={conditionRef}
            />
            {item.condition && <p className="text-[13px] text-gray">{CONDITION_HINTS[item.condition]}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
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
                invalid={!!batteryError(item.battery)}
                onChange={(e) => onChange({ battery: e.target.value })}
                onKeyDown={enterTo(() => priceRef.current?.focus())}
              />
              {batteryError(item.battery) && (
                <p role="alert" className="text-[13px] text-[#B42318]">
                  {batteryError(item.battery)}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <p className={labelClass}>Prisforslag</p>
              <div className="flex min-h-10 flex-col justify-center text-[14px]">
                {!item.condition || needsStorage ? (
                  <span className="text-gray">{needsStorage ? "Vælg lager og stand" : "Vælg stand"}</span>
                ) : loadingSuggestion ? (
                  <span className="text-gray">Henter forslag …</span>
                ) : suggestionError ? (
                  <span className="text-[#B42318]">{suggestionError}</span>
                ) : suggestion?.status === "ok" ? (
                  <span className="tabular-nums text-charcoal">
                    {formatKr(suggestion.aim_oere)}
                    <span className="text-gray"> · giv højst {formatKr(suggestion.floor_oere)}</span>
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
        </>
      )}
    </div>
  );
}
