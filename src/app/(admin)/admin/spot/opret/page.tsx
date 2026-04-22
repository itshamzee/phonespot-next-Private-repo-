"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TILBEHOER_DEVICES } from "@/lib/tilbehoer-config";
import { SPOT_VARIANT_DEFAULTS, PLATEAU_LAUNCH_COLORS, type SpotVariantKind } from "@/lib/spot/types";
import { computeRows } from "@/lib/spot/create-form";

export default function SpotOpretPage() {
  const router = useRouter();
  const [variant, setVariant] = useState<SpotVariantKind>("glass");
  const [colors, setColors] = useState<string[]>([...PLATEAU_LAUNCH_COLORS]);
  const [models, setModels] = useState<string[]>([]);
  const [mode, setMode] = useState<"universal"|"per-model">("universal");
  const [priceKr, setPriceKr] = useState<number>(SPOT_VARIANT_DEFAULTS.glass.priceOere / 100);
  const [imagesText, setImagesText] = useState("");
  const [stock, setStock] = useState({ vejle: 0, slagelse: 0, online: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeVariant(v: SpotVariantKind) {
    setVariant(v);
    setPriceKr(SPOT_VARIANT_DEFAULTS[v].priceOere / 100);
    setMode(v === "lens" ? "per-model" : "universal");
  }

  const groups = useMemo(() => computeRows({
    variant,
    colors: variant === "plateau" ? colors : [],
    models,
    mode: variant === "plateau" ? "per-model" : mode,
    priceOere: Math.round(priceKr * 100),
    images: imagesText.split("\n").map(s => s.trim()).filter(Boolean),
  }), [variant, colors, models, mode, priceKr, imagesText]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      for (const g of groups) {
        const res = await fetch("/api/admin/spot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variant_group: g.variant_group,
            rows: g.rows,
            initialStock: stock,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? `Create failed for ${g.variant_group}`);
        }
      }
      router.push(`/admin/spot/bulk-edit?group=${encodeURIComponent(groups[0].variant_group)}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const submitDisabled = busy
    || models.length === 0
    || (variant === "plateau" && colors.length === 0);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-semibold">Opret Spot-produkt</h1>

      <section className="space-y-3">
        <h2 className="font-semibold">1. Variant</h2>
        <div className="flex gap-2 flex-wrap">
          {(["glass","privacy","lens","plateau"] as SpotVariantKind[]).map(v => (
            <button key={v} type="button"
              onClick={() => changeVariant(v)}
              className={`px-4 py-2 rounded-lg border capitalize ${variant===v ? "bg-black text-white" : ""}`}>
              {v}
            </button>
          ))}
        </div>
      </section>

      {variant === "plateau" && (
        <section className="space-y-3">
          <h2 className="font-semibold">2. Farver</h2>
          <div className="flex gap-2 flex-wrap">
            {PLATEAU_LAUNCH_COLORS.map(c => {
              const active = colors.includes(c);
              return (
                <button key={c} type="button"
                  onClick={() => setColors(cs => active ? cs.filter(x => x!==c) : [...cs, c])}
                  className={`px-3 py-1 rounded-full border ${active ? "bg-black text-white" : ""}`}>
                  {c}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">3. Modeller</h2>
        <div className="max-h-72 overflow-y-auto border rounded-xl p-3 grid grid-cols-2 md:grid-cols-3 gap-1">
          {TILBEHOER_DEVICES.map(d => {
            const active = models.includes(d.slug);
            return (
              <label key={d.slug} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${active ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                <input type="checkbox" checked={active}
                  onChange={() => setModels(ms => active ? ms.filter(x => x!==d.slug) : [...ms, d.slug])} />
                <span className="text-sm">{d.label}</span>
              </label>
            );
          })}
        </div>
        {variant !== "plateau" && (
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode==="universal"} onChange={() => setMode("universal")} />
              Universelt glas (deler lager)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode==="per-model"} onChange={() => setMode("per-model")} />
              Separat SKU per model
            </label>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">4. Pris</h2>
        <div className="flex items-center gap-2">
          <input type="number" value={priceKr} onChange={e => setPriceKr(Number(e.target.value))}
                 className="border rounded px-3 py-2 w-32" />
          <span>kr</span>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">5. Billeder (URL per linje)</h2>
        <textarea value={imagesText} onChange={e => setImagesText(e.target.value)}
                  rows={4} className="w-full border rounded-xl p-3 font-mono text-sm"
                  placeholder="/spot/models/iphone-15-pro-hero.webp" />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">6. Start-lager</h2>
        <div className="flex gap-4">
          {(["vejle","slagelse","online"] as const).map(loc => (
            <label key={loc} className="flex items-center gap-2">
              <span className="w-20 capitalize">{loc}</span>
              <input type="number" value={stock[loc]}
                onChange={e => setStock(s => ({ ...s, [loc]: Number(e.target.value) }))}
                className="border rounded px-3 py-2 w-24" />
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Forhåndsvisning</h2>
        <p className="text-sm text-gray-600">Opretter {groups.length} gruppe(r) med {groups.reduce((n,g)=>n+g.rows.length,0)} række(r).</p>
        <ul className="text-sm list-disc pl-6 space-y-1">
          {groups.slice(0,5).map(g => <li key={g.variant_group}><span className="font-mono text-xs">{g.variant_group}</span> — {g.rows.length} række(r)</li>)}
          {groups.length > 5 && <li>... og {groups.length - 5} flere</li>}
        </ul>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitDisabled}
        className="px-6 py-3 rounded-xl bg-black text-white disabled:opacity-40">
        {busy ? "Opretter..." : "Opret"}
      </button>
    </div>
  );
}
