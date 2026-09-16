"use client";

import { useMemo, useState } from "react";
import { DEVICE_BRANDS, TILBEHOER_DEVICES, type DeviceBrand } from "@/lib/tilbehoer-config";
import { Chip, Input } from "@/components/admin/ui";

/** Udleder en serie af modellens label: "iPhone 17 Pro Max" → "iPhone 17", "Galaxy S25 Ultra" → "Galaxy S25". */
function seriesOf(label: string): string {
  const m = label.match(/^([A-Za-z]+ [A-Za-z]?\d+[a-z]?)/);
  return m ? m[1] : label.split(" ").slice(0, 2).join(" ");
}

export function ModelsPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (slugs: string[]) => void;
}) {
  const [brand, setBrand] = useState<DeviceBrand>("apple");
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const devices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TILBEHOER_DEVICES.filter((d) => (q ? d.label.toLowerCase().includes(q) : d.brand === brand));
  }, [brand, query]);

  const series = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const d of devices) {
      const key = seriesOf(d.label);
      map.set(key, [...(map.get(key) ?? []), d.slug]);
    }
    return [...map.entries()].filter(([, slugs]) => slugs.length > 1);
  }, [devices]);

  const toggle = (slug: string) =>
    onChange(selectedSet.has(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);

  const toggleMany = (slugs: string[]) => {
    const allIn = slugs.every((s) => selectedSet.has(s));
    onChange(allIn ? selected.filter((s) => !slugs.includes(s)) : [...new Set([...selected, ...slugs])]);
  };

  const brandsWithDevices = DEVICE_BRANDS.filter((b) => TILBEHOER_DEVICES.some((d) => d.brand === b.slug));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {brandsWithDevices.map((b) => (
            <button
              key={b.slug}
              type="button"
              onClick={() => { setBrand(b.slug); setQuery(""); }}
              aria-pressed={brand === b.slug && !query}
              className={`rounded-md px-2.5 py-1 text-[13px] font-medium ${
                brand === b.slug && !query ? "bg-charcoal text-white" : "text-gray hover:bg-cream hover:text-charcoal"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className="ml-auto w-full sm:w-56">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søg model" className="h-8 !text-[14px]" />
        </div>
      </div>

      {series.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-gray">Hele serien:</span>
          {series.map(([name, slugs]) => (
            <Chip key={name} size="sm" selected={slugs.every((s) => selectedSet.has(s))} onToggle={() => toggleMany(slugs)}>
              {name}
            </Chip>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {devices.map((d) => (
          <Chip key={d.slug} selected={selectedSet.has(d.slug)} onToggle={() => toggle(d.slug)}>
            {d.label}
          </Chip>
        ))}
        {devices.length === 0 && <p className="text-[13px] text-gray">Ingen modeller matcher.</p>}
      </div>

      {selected.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-cream px-3 py-2 text-[13px]">
          <span className="text-charcoal">
            {selected.length} {selected.length === 1 ? "model valgt" : "modeller valgt"}
          </span>
          <button type="button" onClick={() => onChange([])} className="text-gray underline-offset-2 hover:text-charcoal hover:underline">
            Ryd
          </button>
        </div>
      )}
    </div>
  );
}
