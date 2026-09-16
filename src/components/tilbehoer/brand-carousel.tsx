"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DEVICE_BRANDS, TILBEHOER_DEVICES, type DeviceBrand } from "@/lib/tilbehoer-config";
import styles from "./accessories-landing.module.css";

// Only offer brands that have models in the existing compatibility selector.
const brands = DEVICE_BRANDS.filter(brand => TILBEHOER_DEVICES.some(device => device.brand === brand.slug));

export function BrandCarousel() {
  const rail = useRef<HTMLDivElement>(null);
  const [selectedBrand, setSelectedBrand] = useState<DeviceBrand | null>(null);
  const [model, setModel] = useState("");
  const [edges, setEdges] = useState({ start: true, end: true });
  const brandLabel = brands.find(brand => brand.slug === selectedBrand)?.label;
  const modelLabel = TILBEHOER_DEVICES.find(device => device.slug === model)?.label;

  const updateEdges = () => {
    const element = rail.current;
    if (element) setEdges({ start: element.scrollLeft <= 2, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2 });
  };
  useEffect(() => {
    if (!rail.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(rail.current);
    return () => observer.disconnect();
  }, []);

  const scroll = (direction: number) => {
    const element = rail.current;
    if (element) element.scrollBy({ left: direction * element.clientWidth * .8, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  return <section className={styles.brands} aria-labelledby="brands-title">
    <div className={styles.brandHeading}>
      <div><h2 id="brands-title">Tilbehør til din model</h2><p>Start med mærket. Vælg derefter din telefon eller tablet.</p></div>
      <div className={styles.brandControls}>
        <button type="button" aria-label="Vis tidligere mærker" aria-controls="accessory-brands" disabled={edges.start} onClick={() => scroll(-1)}>←</button>
        <button type="button" aria-label="Vis flere mærker" aria-controls="accessory-brands" disabled={edges.end} onClick={() => scroll(1)}>→</button>
      </div>
    </div>
    <div className={styles.brandRail} ref={rail} id="accessory-brands" onScroll={updateEdges}>
      {brands.map(brand => <button key={brand.slug} type="button" className={styles.brandChoice} aria-label={`Vælg ${brand.label}`} aria-pressed={selectedBrand === brand.slug} aria-controls="brand-model-choice" onClick={() => { setSelectedBrand(brand.slug); setModel(""); }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.slug === "google" ? "/images/brands/google-color.png" : `/images/brands/${brand.slug}.svg`} alt="" width="116" height="60" loading="lazy" data-brand={brand.slug} />
        <span>{brand.label}<span aria-hidden="true">↗</span></span>
      </button>)}
    </div>
    <div id="brand-model-choice">
      {selectedBrand && <div className={styles.brandModel}>
        <label htmlFor="brand-model">Vælg din {brandLabel}-model</label>
        <select id="brand-model" value={model} onChange={event => setModel(event.target.value)}>
          <option value="">Vælg model</option>
          {TILBEHOER_DEVICES.filter(device => device.brand === selectedBrand).map(device => <option key={device.slug} value={device.slug}>{device.label}</option>)}
        </select>
        {modelLabel ? <Link className={styles.button} href={`/tilbehoer?model=${encodeURIComponent(modelLabel)}#tilbehoersudvalg`} aria-label={`Se tilbehør til ${modelLabel}`}>Se tilbehør <span aria-hidden="true">→</span></Link> : <button className={styles.button} type="button" disabled>Se tilbehør <span aria-hidden="true">→</span></button>}
      </div>}
    </div>
  </section>;
}
