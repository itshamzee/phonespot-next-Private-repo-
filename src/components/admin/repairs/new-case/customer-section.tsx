"use client";

import { useEffect, useRef, useState } from "react";
import { Btn } from "@/components/admin/repairs/ui";
import { lookupCvr, searchCustomers } from "./api";
import {
  EMPTY_CUSTOMER,
  customerValid,
  formatPhoneDk,
  type CustomerDraft,
  type ExistingCustomer,
} from "./logic";
import { focusRing, inputClass, labelClass } from "./section-card";

type Props = {
  customerType: "privat" | "erhverv";
  onTypeChange: (t: "privat" | "erhverv") => void;
  existing: ExistingCustomer | null;
  draft: CustomerDraft;
  onDraftChange: (d: CustomerDraft) => void;
  /** Ny kunde bekræftet (navn og telefon udfyldt). */
  confirmed: boolean;
  /** Eksisterende kunde valgt: sektionen kan foldes sammen. */
  onPick: (c: ExistingCustomer) => void;
  onConfirmDraft: () => void;
  onClear: () => void;
};

export function CustomerTypeToggle({
  value,
  onChange,
}: {
  value: "privat" | "erhverv";
  onChange: (t: "privat" | "erhverv") => void;
}) {
  return (
    <div
      role="group"
      aria-label="Kundetype"
      className="flex gap-1 rounded-[10px] bg-[#E9ECE7] p-1"
    >
      {(["privat", "erhverv"] as const).map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={value === t}
          onClick={() => onChange(t)}
          className={`h-9 rounded-lg px-[18px] text-sm ${focusRing} ${
            value === t
              ? "bg-white font-semibold text-[#15211B]"
              : "bg-transparent text-[#3D4842] hover:bg-white/60"
          }`}
        >
          {t === "privat" ? "Privat" : "Erhverv"}
        </button>
      ))}
    </div>
  );
}

function deviceSummary(c: ExistingCustomer): string {
  const d = c.customer_devices?.[0];
  return d ? `${d.brand} ${d.model}`.trim() : "";
}

export function CustomerSection({
  customerType,
  existing,
  draft,
  onDraftChange,
  confirmed,
  onPick,
  onConfirmDraft,
  onClear,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ExistingCustomer[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [creating, setCreating] = useState(false);
  const [cvrBusy, setCvrBusy] = useState(false);
  const [cvrNote, setCvrNote] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  const seq = useRef(0);
  const erhverv = customerType === "erhverv";

  useEffect(() => {
    const q = query.trim();
    const mine = ++seq.current;
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchCustomers(q, customerType, ctrl.signal);
        if (mine === seq.current) {
          setResults(data);
          setSearchError("");
        }
      } catch (err) {
        if (
          (err as { name?: string })?.name !== "AbortError" &&
          mine === seq.current
        ) {
          setSearchError(
            err instanceof Error ? err.message : "Kundesøgning fejlede.",
          );
          setResults([]);
        }
      } finally {
        if (mine === seq.current) setSearching(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, customerType]);

  function startCreate() {
    const q = query.trim();
    const isPhone = /^[\d\s+]+$/.test(q) && q.replace(/\D/g, "").length >= 3;
    onDraftChange({
      ...EMPTY_CUSTOMER,
      ...draft,
      phone: draft.phone || (isPhone ? q : ""),
      name: draft.name || (!isPhone && !q.includes("@") ? q : ""),
      email: draft.email || (q.includes("@") ? q : ""),
      cvr: draft.cvr || (erhverv && /^\d{8}$/.test(q) ? q : ""),
    });
    setCreating(true);
  }

  function focusRow(delta: number, from: number) {
    const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-row]");
    if (!rows || rows.length === 0) return;
    const next = Math.max(0, Math.min(rows.length - 1, from + delta));
    rows[next].focus();
  }

  async function fetchCvr() {
    const cvr = draft.cvr.replace(/\D/g, "");
    if (cvr.length !== 8) {
      setCvrNote("Et CVR-nummer har 8 cifre.");
      return;
    }
    setCvrBusy(true);
    setCvrNote("");
    try {
      const r = await lookupCvr(cvr);
      onDraftChange({
        ...draft,
        company_name: r.company_name || draft.company_name,
      });
      setCvrNote(
        r.company_name
          ? `Fundet: ${r.company_name}`
          : "Ingen oplysninger fundet.",
      );
    } catch (err) {
      setCvrNote(err instanceof Error ? err.message : "CVR-opslaget fejlede.");
    }
    setCvrBusy(false);
  }

  const set =
    (k: keyof CustomerDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
      onDraftChange({ ...draft, [k]: e.target.value });

  const chosen =
    existing ??
    (confirmed
      ? {
          name: draft.name,
          phone: draft.phone,
          company_name: draft.company_name,
        }
      : null);
  if (chosen && !creating) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[10px] bg-[#E7EFE9] px-3.5 py-3 text-sm">
        <span>
          <b>{chosen.name}</b> · {formatPhoneDk(chosen.phone)}
          {chosen.company_name ? ` · ${chosen.company_name}` : ""}
          {!existing && " · ny kunde"}
        </span>
        <Btn size="sm" data-autofocus onClick={onClear}>
          Skift kunde
        </Btn>
      </div>
    );
  }

  return (
    <>
      <label className="flex h-12 items-center gap-2.5 rounded-[10px] border-2 border-[#1A3D2E] px-3.5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#2F8F55]">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1A3D2E"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          data-autofocus
          autoFocus
          aria-label="Søg kunde"
          placeholder={
            erhverv
              ? "Firma, CVR, telefon, navn eller e-mail"
              : "Telefon, navn eller e-mail"
          }
          value={query}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (results[0]) onPick(results[0]);
              else if (query.trim().length >= 2) startCreate();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              focusRow(1, -1);
            } else if (e.key === "Escape" && query) {
              e.preventDefault();
              setQuery("");
            }
          }}
          className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none"
        />
        {searching && <span className="text-xs text-[#5E6A63]">Søger...</span>}
      </label>

      {searchError && (
        <p role="alert" className="m-0 text-sm text-[#B42318]">
          {searchError}
        </p>
      )}

      {query.trim().length >= 2 && !creating && (
        <ul
          ref={listRef}
          aria-label="Søgeresultater"
          className="m-0 flex list-none flex-col overflow-hidden rounded-[10px] border border-[#E2E5E0] p-0 text-sm"
        >
          {results.map((c, i) => {
            const dev = deviceSummary(c);
            const count = c.ticket_count ?? null;
            return (
              <li key={c.id} className="contents">
                <button
                  type="button"
                  data-row
                  onClick={() => onPick(c)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      focusRow(1, i);
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      if (i === 0)
                        (
                          e.currentTarget
                            .closest("section")
                            ?.querySelector(
                              "[data-autofocus]",
                            ) as HTMLElement | null
                        )?.focus();
                      else focusRow(-1, i);
                    }
                  }}
                  className={`flex items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-[#E7EFE9] ${i === 0 ? "bg-[#E7EFE9]" : ""} ${i > 0 ? "border-t border-[#EEF0EC]" : ""} ${focusRing}`}
                >
                  <span>
                    <b>{c.name}</b> · {formatPhoneDk(c.phone)}
                    {c.company_name ? ` · ${c.company_name}` : ""}
                    {c.cvr ? ` · CVR ${c.cvr}` : ""}
                  </span>
                  <span className="shrink-0 text-[#5E6A63]">
                    {[
                      count === null
                        ? null
                        : count === 0
                          ? "ingen tidligere sager"
                          : `${count} ${count === 1 ? "tidligere sag" : "tidligere sager"}`,
                      dev,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
              </li>
            );
          })}
          <li className="contents">
            <button
              type="button"
              data-row
              onClick={startCreate}
              className={`flex items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-[#F5F6F4] ${results.length > 0 ? "border-t border-[#EEF0EC]" : ""} ${focusRing}`}
            >
              <span>
                + Opret ny kunde med <b>{query.trim()}</b>
              </span>
              <span className="text-[#5E6A63]">
                Kun navn og telefon er påkrævet
              </span>
            </button>
          </li>
        </ul>
      )}

      {creating && (
        <form
          aria-label="Ny kunde"
          className="flex flex-col gap-3 rounded-[10px] border border-[#E2E5E0] bg-[#FAFBF9] p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (customerValid(draft)) {
              setCreating(false);
              onConfirmDraft();
            }
          }}
        >
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
            <label className={labelClass}>
              Navn *
              <input
                required
                data-new-name
                className={inputClass}
                value={draft.name}
                onChange={set("name")}
                autoComplete="off"
              />
            </label>
            <label className={labelClass}>
              Telefon *
              <input
                required
                type="tel"
                inputMode="tel"
                className={inputClass}
                value={draft.phone}
                onChange={set("phone")}
                autoComplete="off"
              />
            </label>
            <label className={labelClass}>
              E-mail
              <input
                type="email"
                className={inputClass}
                value={draft.email}
                onChange={set("email")}
                autoComplete="off"
              />
            </label>
          </div>
          {erhverv && (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
              <div className={labelClass}>
                <label htmlFor="nc-cvr">CVR</label>
                <div className="flex gap-2">
                  <input
                    id="nc-cvr"
                    inputMode="numeric"
                    className={inputClass}
                    value={draft.cvr}
                    onChange={set("cvr")}
                    autoComplete="off"
                  />
                  <Btn
                    onClick={fetchCvr}
                    disabled={cvrBusy}
                    className="shrink-0"
                  >
                    {cvrBusy ? "Henter..." : "Hent fra CVR"}
                  </Btn>
                </div>
                {cvrNote && (
                  <span role="status" className="text-xs text-[#5E6A63]">
                    {cvrNote}
                  </span>
                )}
              </div>
              <label className={labelClass}>
                Firma
                <input
                  className={inputClass}
                  value={draft.company_name}
                  onChange={set("company_name")}
                  autoComplete="off"
                />
              </label>
              <label className={labelClass}>
                EAN
                <input
                  inputMode="numeric"
                  maxLength={13}
                  className={inputClass}
                  value={draft.ean}
                  onChange={set("ean")}
                  autoComplete="off"
                />
              </label>
              <label className={labelClass}>
                Faktura-e-mail
                <input
                  type="email"
                  className={inputClass}
                  value={draft.invoice_email}
                  onChange={set("invoice_email")}
                  autoComplete="off"
                />
              </label>
              <label className={labelClass}>
                Kontaktperson
                <input
                  className={inputClass}
                  value={draft.contact_person}
                  onChange={set("contact_person")}
                  autoComplete="off"
                />
              </label>
            </div>
          )}
          <div className="flex gap-2">
            <Btn
              type="submit"
              variant="primary"
              disabled={!customerValid(draft)}
            >
              Brug denne kunde
            </Btn>
            <Btn onClick={() => setCreating(false)}>Annuller</Btn>
          </div>
        </form>
      )}
    </>
  );
}
