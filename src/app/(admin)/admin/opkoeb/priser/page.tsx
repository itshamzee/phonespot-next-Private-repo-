"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { parsePriceCsv, type ParsedPriceRow } from "@/lib/buyback/price-csv";

/**
 * Fallback base prices — the table that only gets consulted when we do not sell
 * the model ourselves. Kept fillable by pasting from a spreadsheet, because
 * typing a hundred models by hand is how a table like this dies.
 */

interface PriceRow {
  id: string;
  device_type: string;
  brand: string;
  model: string;
  storage: string | null;
  ram: string | null;
  base_price: number;
  active: boolean;
  note: string | null;
}

export default function BuybackPricesPage() {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [paste, setPaste] = useState("");
  const [preview, setPreview] = useState<ParsedPriceRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data, error: err } = await supabase
      .from("buyback_prices")
      .select("id, device_type, brand, model, storage, ram, base_price, active, note")
      .order("brand", { ascending: true })
      .order("model", { ascending: true });

    if (err) {
      setError("Tabellen findes ikke endnu — kør migrationen i Supabase først.");
      setRows([]);
    } else {
      setRows((data ?? []) as PriceRow[]);
      setError("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  function onPaste(text: string) {
    setPaste(text);
    const { rows: parsed, errors } = parsePriceCsv(text);
    setPreview(parsed);
    setParseErrors(errors);
  }

  async function saveParsed() {
    if (preview.length === 0) return;
    setSaving(true);
    setError("");
    const supabase = createBrowserClient();

    // The unique index is a functional one (lower(trim(...))), which PostgREST's
    // onConflict cannot target by column name — so existing variants are matched
    // here and updated, and only genuinely new ones are inserted.
    const key = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
    const existingByKey = new Map(
      rows.map((r) => [
        [r.device_type, r.brand, r.model, r.storage, r.ram].map(key).join("|"),
        r,
      ]),
    );

    const toInsert: Record<string, unknown>[] = [];
    const updates: PromiseLike<unknown>[] = [];
    const now = new Date().toISOString();

    for (const r of preview) {
      const k = [r.deviceType, r.brand, r.model, r.storage, r.ram].map(key).join("|");
      const existing = existingByKey.get(k);
      if (existing) {
        updates.push(
          supabase
            .from("buyback_prices")
            .update({ base_price: r.basePriceOre, active: true, updated_at: now })
            .eq("id", existing.id),
        );
      } else {
        toInsert.push({
          device_type: r.deviceType,
          brand: r.brand,
          model: r.model,
          storage: r.storage || null,
          ram: r.ram || null,
          base_price: r.basePriceOre,
          active: true,
          updated_at: now,
        });
      }
    }

    await Promise.all(updates);
    const { error: err } = toInsert.length
      ? await supabase.from("buyback_prices").insert(toInsert)
      : { error: null };

    if (err) setError(err.message);
    else {
      setPaste("");
      setPreview([]);
      setParseErrors([]);
      await load();
    }
    setSaving(false);
  }

  async function updateRow(id: string, patch: Partial<PriceRow>) {
    const supabase = createBrowserClient();
    await supabase
      .from("buyback_prices")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    await load();
  }

  async function deleteRow(id: string, label: string) {
    if (!window.confirm(`Slet basisprisen for ${label}?`)) return;
    const supabase = createBrowserClient();
    await supabase.from("buyback_prices").delete().eq("id", id);
    await load();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-charcoal">
            Basispriser
          </h2>
          <p className="mt-0.5 text-sm text-charcoal/35">{rows.length} modeller</p>
        </div>
        <Link href="/admin/opkoeb/indstillinger" className="text-[13px] text-charcoal/40 underline">
          Indstillinger
        </Link>
      </div>

      <p className="mb-5 rounded-2xl bg-stone-50 px-4 py-3 text-[13px] leading-relaxed text-charcoal/55">
        Basispriserne bruges kun når vi ikke selv har modellen til salg. Har vi den, vinder
        vores egen salgspris. Priserne er for en enhed i perfekt stand — fradrag for stand
        trækkes automatisk.
      </p>

      {error && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          {error}
        </p>
      )}

      {/* Paste from a spreadsheet */}
      <section className="mb-6 rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-charcoal">Indsæt fra regneark</h3>
        <p className="mb-3 text-[12px] text-charcoal/40">
          Én række per linje: type, mærke, model, lager, pris i kroner (RAM valgfri til sidst).
        </p>
        <textarea
          rows={5}
          value={paste}
          onChange={(e) => onPaste(e.target.value)}
          placeholder={"Telefon, Apple, iPhone 11, 64GB, 1200\nTelefon, Apple, iPhone 11, 128GB, 1400"}
          className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 font-mono text-[12px] text-charcoal placeholder:text-stone-400 focus:border-emerald-500/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
        />

        {parseErrors.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-xl bg-rose-50 px-4 py-3">
            {parseErrors.map((e) => (
              <li key={e} className="text-[12px] text-rose-700">
                {e}
              </li>
            ))}
          </ul>
        )}

        {preview.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-[12px] font-medium text-charcoal/60">
              {preview.length} {preview.length === 1 ? "række" : "rækker"} klar:
            </p>
            <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded-xl bg-stone-50 px-4 py-3">
              {preview.map((r, i) => (
                <li key={i} className="text-[12px] text-charcoal/60">
                  {r.brand} {r.model} {r.storage} — {(r.basePriceOre / 100).toLocaleString("da-DK")} kr
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveParsed()}
              className="mt-3 rounded-full bg-green-eco px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Gemmer..." : `Gem ${preview.length} ${preview.length === 1 ? "række" : "rækker"}`}
            </button>
          </div>
        )}
      </section>

      {/* The table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-black/[0.04] bg-white px-5 py-10 text-center text-sm text-charcoal/30 shadow-sm">
          Ingen basispriser endnu.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/[0.04] bg-white shadow-sm">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-black/[0.04]">
                {["Type", "Mærke", "Model", "Lager", "RAM", "Basispris", "Aktiv", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-charcoal/30"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03]">
              {rows.map((r) => (
                <tr key={r.id} className={r.active ? "" : "opacity-40"}>
                  <td className="px-4 py-2.5 text-[13px] text-charcoal/60">{r.device_type}</td>
                  <td className="px-4 py-2.5 text-[13px] text-charcoal/60">{r.brand}</td>
                  <td className="px-4 py-2.5 text-[13px] font-medium text-charcoal">{r.model}</td>
                  <td className="px-4 py-2.5 text-[13px] text-charcoal/60">{r.storage ?? "—"}</td>
                  <td className="px-4 py-2.5 text-[13px] text-charcoal/60">{r.ram ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      min={0}
                      step={50}
                      defaultValue={Math.round(r.base_price / 100)}
                      onBlur={(e) => {
                        const kr = Number(e.target.value);
                        if (kr * 100 !== r.base_price) {
                          void updateRow(r.id, { base_price: Math.round(kr * 100) });
                        }
                      }}
                      className="w-24 rounded-lg border border-stone-200 px-2 py-1 text-[13px] text-charcoal focus:border-emerald-500/40 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => void updateRow(r.id, { active: !r.active })}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        r.active ? "bg-emerald-500/10 text-emerald-600" : "bg-stone-100 text-stone-400"
                      }`}
                    >
                      {r.active ? "Aktiv" : "Slået fra"}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => void deleteRow(r.id, `${r.brand} ${r.model} ${r.storage ?? ""}`.trim())}
                      className="text-[12px] text-charcoal/25 underline hover:text-rose-600"
                    >
                      Slet
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
