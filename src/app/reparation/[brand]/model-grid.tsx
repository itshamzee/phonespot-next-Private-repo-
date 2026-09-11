"use client";
import { useId, useRef, useState } from "react";
import Link from "next/link";
import { DeviceImage } from "@/components/repair/device-image";
import type { DeviceType } from "@/lib/supabase/types";
import styles from "@/components/repair/repair.module.css";
export type ModelCardData = { slug: string; name: string; series: string | null; cheapestPrice: number | null; brandSlug: string; imageUrl: string | null; deviceType: DeviceType };
function ModelCard({ model, linkPrefix }: { model: ModelCardData; linkPrefix?: string }) {
  return <Link href={`${linkPrefix ?? `/reparation/${model.brandSlug}`}/${model.slug}`} className={styles.modelCell}>
    <div className={styles.modelPhoto}>{model.imageUrl ? <DeviceImage brandSlug={model.brandSlug} deviceType={model.deviceType} imageUrl={model.imageUrl} modelName={model.name} className="h-full w-full" /> : <span className="flex h-full items-center justify-center text-xs text-gray">Billede ikke tilgængeligt</span>}</div>
    <strong>{model.name}</strong>
    <span className={styles.modelPrice}>{model.cheapestPrice != null && model.cheapestPrice > 0 ? `Fra ${model.cheapestPrice.toLocaleString("da-DK")} kr.` : "Priser kommer snart"}</span>
    <span className={styles.modelCta}>Se reparationer <span aria-hidden="true">→</span></span>
  </Link>;
}
export function ModelGrid({ models, brandName, linkPrefix }: { models: ModelCardData[]; brandName: string; linkPrefix?: string }) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const filtered = models.filter(m => m.name.toLowerCase().includes(search.trim().toLowerCase()));
  const groups = new Map<string, ModelCardData[]>();
  for (const model of filtered) {
    const key = search.trim() ? "" : model.series ?? "";
    groups.set(key, [...(groups.get(key) ?? []), model]);
  }
  return <div className={styles.modelGrid}>
    <div className={styles.search}>
      <label htmlFor={id}>Søg efter model</label>
      <div className={styles.searchField}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></svg>
        <input id={id} ref={inputRef} type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={`Find din ${brandName}-model`} />
        {search && <button type="button" aria-label="Ryd søgning" onClick={() => { setSearch(""); inputRef.current?.focus(); }}>×</button>}
      </div>
      <p role="status" className={styles.hint}>{filtered.length} {filtered.length === 1 ? "model" : "modeller"} fundet</p>
    </div>
    {filtered.length === 0 ? <div className={styles.empty}><p>{search ? `Ingen modeller fundet for “${search}”. Prøv et andet modelnavn.` : "Vi kan ikke vise modeller lige nu."}</p><Link href="/kontakt">Få hjælp til din model</Link></div> : Array.from(groups, ([series, items]) => <div key={series} className={styles.series}>{series && <h3>{series}</h3>}<div className={styles.modelCells}>{items.map(model => <ModelCard key={model.slug} model={model} linkPrefix={linkPrefix} />)}</div></div>)}
  </div>;
}
