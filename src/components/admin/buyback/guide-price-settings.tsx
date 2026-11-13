"use client";

import { useCallback, useEffect, useState } from "react";
import { staffFetch } from "@/lib/buyback/admin-fetch";
import type { BuybackSettings } from "@/lib/buyback/types";
import type { GuideTableRow } from "@/lib/buyback/guide-price-server";

type Props = {
  settings: BuybackSettings;
  saving: boolean;
  patch: (changes: Partial<BuybackSettings>) => Promise<void>;
};

const SOURCE_NOTE: Record<GuideTableRow["source"], string> = {
  exact: "",
  "smaller-storage": "Regnet fra mindre lagerstørrelse",
  "larger-storage": "Regnet fra større lagerstørrelse",
};

const storageLabel = (gb: number) => (gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`);
const kr = (value: number | null) => (value == null ? "–" : `${value.toLocaleString("da-DK")} kr.`);

/**
 * Vejledende pris i sælg-formularen: tænd/sluk, faktoren og de priser, kunden
 * ser lige nu. Priserne regnes på de aktuelle salgspriser, hver gang siden åbnes.
 */
export function GuidePriceSettings({ settings, saving, patch }: Props) {
  const [rows, setRows] = useState<GuideTableRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await staffFetch("/api/admin/buyback/guide-prices");
      if (!res.ok) throw new Error("fejl");
      const data = (await res.json()) as { rows: GuideTableRow[] };
      setRows(data.rows);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load, settings.guidePriceFactor]);

  return (
    <section className="mb-5 rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-charcoal">Vejledende pris i sælg-formularen</h3>
          <p className="mt-1 text-[13px] text-charcoal/50">
            {settings.publicPriceEnabled
              ? "Kunden ser prisen, når standen er udfyldt. Gælder iPhone 12 til 17."
              : "Kunden ser ingen pris. Tilbud sendes på mail som hidtil."}
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void patch({ publicPriceEnabled: !settings.publicPriceEnabled })}
          className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
            settings.publicPriceEnabled ? "bg-emerald-600 text-white" : "border border-stone-300 text-stone-600"
          }`}
        >
          {settings.publicPriceEnabled ? "Slået til" : "Slået fra"}
        </button>
      </div>

      <label className="mt-5 block max-w-xs">
        <span className="text-[13px] font-medium text-charcoal">Faktor (%)</span>
        <input
          type="number"
          min={40}
          max={90}
          step={5}
          defaultValue={Math.round(settings.guidePriceFactor * 100)}
          onBlur={(e) => {
            const value = Number(e.target.value);
            if (value >= 40 && value <= 90) void patch({ guidePriceFactor: value / 100 });
          }}
          className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-charcoal"
        />
        <span className="mt-1 block text-[12px] text-charcoal/50">
          Hvor stor en del af det bud, hvor vi tjener 0 kr., kunden får. 70 er godkendt. Modeller under et år gamle får højst 65.
        </span>
      </label>

      <div className="mt-5">
        <p className="text-[13px] font-medium text-charcoal">Priserne lige nu, fin stand</p>
        <p className="mt-1 text-[12px] text-charcoal/50">
          Regnet på vores listede salgspriser i stand A og B. Modeller med færre end 3 listede enheder får ingen pris.
        </p>
        {loadError && <p className="mt-3 text-[13px] text-red-700">Kunne ikke hente priserne.</p>}
        {!loadError && rows === null && <p className="mt-3 text-[13px] text-charcoal/50">Henter priser…</p>}
        {rows && rows.length === 0 && <p className="mt-3 text-[13px] text-charcoal/50">Ingen modeller har data nok til en pris.</p>}
        {rows && rows.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead className="text-charcoal/50">
                <tr>
                  <th className="py-2 pr-3 font-medium">Model</th>
                  <th className="py-2 pr-3 font-medium">Lager</th>
                  <th className="py-2 pr-3 text-right font-medium">Vores salgspris</th>
                  <th className="py-2 pr-3 text-right font-medium">Kunden ser</th>
                  <th className="py-2 pr-3 text-right font-medium">Fortjeneste</th>
                  <th className="py-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.model}-${row.storageGb}`} className="border-t border-stone-100 text-charcoal">
                    <td className="py-2 pr-3">{row.model}</td>
                    <td className="py-2 pr-3">{storageLabel(row.storageGb)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{kr(row.baseDkk)}</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums">{row.priced ? kr(row.amountDkk) : "Ingen pris"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{kr(row.marginDkk)}</td>
                    <td className="py-2 text-charcoal/50">{row.reason ?? SOURCE_NOTE[row.source]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
