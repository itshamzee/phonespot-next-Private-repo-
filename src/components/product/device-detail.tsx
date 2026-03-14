"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ProductTemplate, Device, SkuProduct } from "@/lib/supabase/platform-types";
import { useCart } from "@/components/cart/cart-context";
import { GradeSelector } from "./grade-selector";
import { StorageSelector } from "./storage-selector";
import { ColorSelectorPlatform } from "./color-selector-platform";
import { SpecificationsTable } from "./specifications-table";
import { ConditionExplainer } from "./condition-explainer";
import { KlarnaBanner } from "@/components/ui/klarna-banner";

type DeviceDetailProps = {
  template: ProductTemplate;
  devices: Device[];
  accessories: SkuProduct[];
};

function formatDKK(oere: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 0,
  }).format(oere / 100);
}

/* ------------------------------------------------------------------ */
/*  Grade detail data                                                  */
/* ------------------------------------------------------------------ */

const GRADE_DETAILS: Record<string, { label: string; battery: string; cosmetic: string }> = {
  N: { label: "Fabriksny", battery: "100% batterikapacitet", cosmetic: "Helt ny — uåbnet originalemballage" },
  A: { label: "Som ny", battery: "Min. 85% batterikapacitet", cosmetic: "Ingen synlige brugsspor — fremstår som ny" },
  B: { label: "God stand", battery: "Min. 80% batterikapacitet", cosmetic: "Lette brugsspor — små ridser eller mærker" },
  C: { label: "Brugt stand", battery: "Min. 75% batterikapacitet", cosmetic: "Synlige brugsspor — ridser og mærker" },
};

/* ------------------------------------------------------------------ */
/*  Trust point data + icon helper                                     */
/* ------------------------------------------------------------------ */

const TRUST_POINTS = [
  { icon: "shield", label: "36 mdr. garanti", desc: "Dækker fabrikationsfejl" },
  { icon: "return", label: "14 dages returret", desc: "Fuld refundering" },
  { icon: "test", label: "30+ tests", desc: "Testet individuelt" },
  { icon: "truck", label: "1-2 dages levering", desc: "Sendt samme dag" },
  { icon: "lock", label: "Sikker betaling", desc: "Kort, MobilePay, Klarna" },
  { icon: "eco", label: "80% mindre CO₂", desc: "Bæredygtigt valg" },
];

function TrustIcon({ type, className }: { type: string; className?: string }) {
  const c = className ?? "h-5 w-5";
  switch (type) {
    case "shield":
      return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={c}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>;
    case "return":
      return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={c}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>;
    case "test":
      return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={c}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
    case "truck":
      return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={c}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>;
    case "lock":
      return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={c}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>;
    case "eco":
      return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={c}><path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 0 1-1.161.886l-.143.048a1.107 1.107 0 0 0-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 0 1-1.652.928l-.679-.906a1.125 1.125 0 0 0-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 1 0 6.72 14.94M12.75 3.031a9 9 0 0 1 6.72 14.94m0 0-.177.823A3 3 0 0 1 16.35 21H13.488a3 3 0 0 1-2.116-.879l-.947-.947a1.5 1.5 0 0 0-.53-.342" /></svg>;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Trustpilot inline badge (client-side, static data)                 */
/* ------------------------------------------------------------------ */

function TrustpilotBadge() {
  return (
    <a
      href="https://dk.trustpilot.com/review/phonespot.dk"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-[#00B67A]/20 bg-[#00B67A]/[0.04] px-4 py-2.5 transition-colors hover:bg-[#00B67A]/[0.08]"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
        <path d="M12 1.5l2.76 8.49h8.93l-7.22 5.25 2.76 8.49L12 18.49l-7.23 5.24 2.76-8.49L.31 9.99h8.93z" fill="#00B67A" />
      </svg>
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((i) => (
            <svg key={i} viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-[#00B67A]">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-[#00B67A]/50">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        <span className="text-[10px] font-medium text-charcoal/50">
          4.4/5 — Trustpilot
        </span>
      </div>
    </a>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab type                                                           */
/* ------------------------------------------------------------------ */

type Tab = "beskrivelse" | "specifikationer" | "garanti";

/* ------------------------------------------------------------------ */
/*  Category helpers                                                   */
/* ------------------------------------------------------------------ */

type DeviceType = "phone" | "watch" | "ipad" | "laptop";

function getDeviceType(category: string): DeviceType {
  if (category === "smartwatch") return "watch";
  if (category === "ipad") return "ipad";
  if (category === "laptop") return "laptop";
  return "phone";
}

function getCategoryName(category: string): string {
  if (category === "iphone") return "iPhone";
  if (category === "ipad") return "iPad";
  if (category === "laptop") return "bærbar";
  if (category === "smartwatch") return "smartwatch";
  return "smartphone";
}

/* ================================================================== */
/*  Main component                                                     */
/* ================================================================== */

export function DeviceDetail({ template, devices, accessories }: DeviceDetailProps) {
  const { addDevice, openCart, openUpsell } = useCart();

  const listedDevices = devices.filter((d) => d.status === "listed");

  // Check if any device has grade "N" (factory new)
  const hasNewGrade = listedDevices.some((d) => d.grade === "A" && d.condition_notes?.toLowerCase().includes("fabriksny")) ||
    listedDevices.some((d) => (d.grade as string) === "N");

  const allGradeKeys = hasNewGrade ? (["N", "A", "B", "C"] as const) : (["A", "B", "C"] as const);

  const availableGrades = allGradeKeys
    .map((grade) => {
      const matching = grade === "N"
        ? listedDevices.filter((d) => (d.grade as string) === "N" || (d.grade === "A" && d.condition_notes?.toLowerCase().includes("fabriksny")))
        : listedDevices.filter((d) => d.grade === grade && !(grade === "A" && d.condition_notes?.toLowerCase().includes("fabriksny")));
      const prices = matching.map((d) => d.selling_price).filter((p): p is number => p != null);
      const templatePrice = grade === "N" ? template.base_price_a : grade === "A" ? template.base_price_a : grade === "B" ? template.base_price_b : template.base_price_c;
      return {
        grade: grade as string,
        price: prices.length > 0 ? Math.min(...prices) : templatePrice ?? null,
        available: matching.length,
      };
    });

  const [selectedGrade, setSelectedGrade] = useState<string>(
    availableGrades.find((g) => g.available > 0)?.grade ?? availableGrades[0]?.grade ?? "A"
  );
  const [selectedStorage, setSelectedStorage] = useState<string>(template.storage_options[0] ?? "");
  const [selectedColor, setSelectedColor] = useState<string>(template.colors[0] ?? "");
  const [activeTab, setActiveTab] = useState<Tab>("beskrivelse");
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  // Find matching devices
  const matchingDevices = listedDevices.filter(
    (d) => {
      const gradeMatch = selectedGrade === "N"
        ? ((d.grade as string) === "N" || (d.grade === "A" && d.condition_notes?.toLowerCase().includes("fabriksny")))
        : d.grade === selectedGrade && !(selectedGrade !== "N" && d.condition_notes?.toLowerCase().includes("fabriksny") && d.grade === "A");
      return gradeMatch &&
        (selectedStorage === "" || d.storage === selectedStorage) &&
        (selectedColor === "" || d.color === selectedColor);
    }
  );
  const price =
    matchingDevices.length > 0
      ? Math.min(...matchingDevices.map((d) => d.selling_price ?? 0))
      : selectedGrade === "N" ? template.base_price_a
      : selectedGrade === "A" ? template.base_price_a
      : selectedGrade === "B" ? template.base_price_b
      : template.base_price_c;

  const bestMatch = matchingDevices.length > 0
    ? matchingDevices.reduce((best, d) => (d.selling_price ?? Infinity) < (best.selling_price ?? Infinity) ? d : best)
    : null;

  const images = template.images.length > 0 ? template.images : [];
  const mainImage = images[mainImageIndex] ?? null;
  const inStock = matchingDevices.length > 0;
  const gradeDetail = GRADE_DETAILS[selectedGrade];

  const categoryName = getCategoryName(template.category);
  const deviceType = getDeviceType(template.category);

  // Compare-at price (use grade A as "original" reference)
  const compareAtPrice = template.base_price_a && price && template.base_price_a > price ? template.base_price_a : null;
  const savingsPercent = compareAtPrice && price ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : null;

  async function handleAddToCart() {
    if (!bestMatch || !price) return;
    setIsAddingToCart(true);
    setCartError(null);
    try {
      await addDevice({
        type: "device",
        deviceId: bestMatch.id,
        templateId: template.id,
        title: template.display_name,
        grade: (selectedGrade === "N" ? "A" : bestMatch.grade) as "A" | "B" | "C",
        color: bestMatch.color ?? selectedColor,
        storage: bestMatch.storage ?? selectedStorage,
        image: template.images[0] ?? null,
        price: bestMatch.selling_price ?? price,
        reservedAt: new Date().toISOString(),
      });
      // Only show screen protector upsell for phones/smartphones
      if (deviceType === "phone") {
        openUpsell();
      } else {
        openCart();
      }
    } catch (err) {
      setCartError(err instanceof Error ? err.message : "Kunne ikke tilføje til kurv. Prøv igen.");
    } finally {
      setIsAddingToCart(false);
    }
  }

  return (
    <div>
      {/* ============================================================ */}
      {/* HERO: Image + Buy Box                                        */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
        {/* ── Image gallery (7 cols) ── */}
        <div className="lg:col-span-7">
          <div className="flex gap-3">
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="hidden sm:flex flex-col gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setMainImageIndex(i)}
                    className={`relative h-16 w-16 overflow-hidden rounded-xl border-2 transition-all ${
                      i === mainImageIndex ? "border-green-eco shadow-sm" : "border-sand/60 hover:border-charcoal/30"
                    }`}
                  >
                    <Image src={img} alt={`${template.display_name} billede ${i + 1}`} fill className="object-contain p-1" sizes="64px" />
                  </button>
                ))}
              </div>
            )}

            {/* Main image */}
            <div className="relative flex-1 overflow-hidden rounded-2xl bg-cream aspect-square">
              {mainImage ? (
                <Image src={mainImage} alt={template.display_name} fill className="object-contain p-8" sizes="(min-width: 1024px) 58vw, 100vw" priority />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg viewBox="0 0 64 64" className="h-20 w-20 text-sand" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="16" y="8" width="32" height="48" rx="4" /><circle cx="32" cy="52" r="2" /><line x1="26" y1="14" x2="38" y2="14" />
                  </svg>
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {inStock ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-eco/90 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    {matchingDevices.length} på lager
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-charcoal/70 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                    Udsolgt
                  </span>
                )}
                {savingsPercent && savingsPercent > 5 && (
                  <span className="inline-flex items-center rounded-full bg-red-500/90 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                    Spar {savingsPercent}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mobile thumbnails */}
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 sm:hidden overflow-x-auto scrollbar-hide">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setMainImageIndex(i)}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${
                    i === mainImageIndex ? "border-green-eco" : "border-sand/60"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-contain p-1" sizes="56px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Buy box (5 cols) ── */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Title + brand */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[3px] text-green-eco">
              {template.brand} · {selectedGrade === "N" ? "Fabriksny" : "Refurbished"} {categoryName}
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-charcoal lg:text-4xl">
              {template.display_name}
            </h1>
            {template.short_description && (
              <p className="mt-2 text-sm text-charcoal/60 leading-relaxed">{template.short_description}</p>
            )}

            {/* Trustpilot inline */}
            <div className="mt-3">
              <TrustpilotBadge />
            </div>
          </div>

          {/* Grade selector */}
          {availableGrades.length > 0 && (
            <GradeSelector grades={availableGrades} selected={selectedGrade} onChange={setSelectedGrade} />
          )}

          {/* Storage selector */}
          {template.storage_options.length > 0 && (
            <StorageSelector options={template.storage_options} selected={selectedStorage} onChange={setSelectedStorage} />
          )}

          {/* Color selector */}
          {template.colors.length > 0 && (
            <ColorSelectorPlatform colors={template.colors} selected={selectedColor} onChange={setSelectedColor} />
          )}

          {/* ── Price card + CTA ── */}
          <div className="rounded-2xl border border-sand bg-white p-5 shadow-sm space-y-4">
            {/* Price */}
            <div>
              <div className="flex items-end gap-3">
                <span className="font-display text-4xl font-bold text-charcoal">
                  {price != null ? formatDKK(price) : "—"}
                </span>
                {compareAtPrice && (
                  <span className="mb-1 text-lg text-charcoal/30 line-through">
                    {formatDKK(compareAtPrice)}
                  </span>
                )}
              </div>
              {price != null && (
                <p className="mt-1 text-xs text-charcoal/50">
                  inkl. moms · 36 mdr. garanti · Fri fragt over 500 kr
                </p>
              )}
            </div>

            {/* Add to cart button */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!inStock || isAddingToCart}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-eco px-6 py-4 text-base font-bold text-white transition-all hover:bg-green-eco/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAddingToCart ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4Z" />
                  </svg>
                  Reserverer...
                </>
              ) : !inStock ? "Udsolgt" : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                  Læg i kurv
                </>
              )}
            </button>

            {cartError && <p className="text-sm text-red-600">{cartError}</p>}

            {/* Quick trust signals */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
              {["36 mdr. garanti", "14 dages returret", "Sendt samme dag"].map((text) => (
                <span key={text} className="flex items-center gap-1 text-xs text-charcoal/50">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-green-eco">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  {text}
                </span>
              ))}
            </div>
          </div>

          {/* Klarna banner */}
          {price != null && (
            <KlarnaBanner priceAmount={String(price / 100)} />
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* GRADE EXPLANATION — "Hvad betyder standen?"                   */}
      {/* ============================================================ */}
      {gradeDetail && (
        <div className="mt-10 rounded-2xl border border-sand bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-charcoal">
              {selectedGrade === "N" ? "Fabriksny enhed" : `Grade ${selectedGrade}: ${gradeDetail.label}`}
            </h3>
            <Link href="/kvalitet" className="text-xs font-semibold text-green-eco hover:underline">
              Læs mere om grader &rarr;
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-xl bg-green-eco/[0.04] p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-eco/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-green-eco">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-charcoal">100% funktionel</p>
                <p className="mt-0.5 text-xs text-charcoal/50">Alle funktioner testet og virker</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-amber-500/[0.04] p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-amber-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5h.375c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M3.75 18h15A2.25 2.25 0 0 0 21 15.75v-6a2.25 2.25 0 0 0-2.25-2.25h-15A2.25 2.25 0 0 0 1.5 9.75v6A2.25 2.25 0 0 0 3.75 18Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-charcoal">Batteri</p>
                <p className="mt-0.5 text-xs text-charcoal/50">{gradeDetail.battery}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-blue-500/[0.04] p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-charcoal">Kosmetisk</p>
                <p className="mt-0.5 text-xs text-charcoal/50">{gradeDetail.cosmetic}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TRUST POINTS STRIP                                           */}
      {/* ============================================================ */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {TRUST_POINTS.map((point) => (
          <div key={point.label} className="flex flex-col items-center rounded-2xl border border-sand/60 bg-white p-4 text-center transition-shadow hover:shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-eco/10 text-green-eco">
              <TrustIcon type={point.icon} />
            </div>
            <p className="mt-2 text-xs font-bold text-charcoal">{point.label}</p>
            <p className="mt-0.5 text-[10px] text-charcoal/40 leading-tight">{point.desc}</p>
          </div>
        ))}
      </div>

      {/* ============================================================ */}
      {/* CONDITION VISUAL EXPLAINER — "Hvad betyder standen?"          */}
      {/* ============================================================ */}
      <div className="mt-10">
        <ConditionExplainer variant="compact" deviceType={deviceType} />
      </div>

      {/* ============================================================ */}
      {/* TABS: Beskrivelse / Specifikationer / Garanti & Levering      */}
      {/* ============================================================ */}
      <div className="mt-12">
        <div className="flex border-b border-sand">
          {(["beskrivelse", "specifikationer", "garanti"] as Tab[]).map((tab) => {
            const labels: Record<Tab, string> = {
              beskrivelse: "Beskrivelse",
              specifikationer: "Specifikationer",
              garanti: "Garanti & Levering",
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3.5 text-sm font-semibold transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-green-eco text-green-eco"
                    : "text-charcoal/40 hover:text-charcoal"
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {/* ── Beskrivelse ── */}
          {activeTab === "beskrivelse" && (
            <div className="space-y-8">
              <div className="prose prose-sm max-w-none text-charcoal/80">
                {template.description ? (
                  <p className="whitespace-pre-line leading-relaxed">{template.description}</p>
                ) : (
                  <div className="space-y-3">
                    <p>
                      Denne refurbished {template.display_name} er kvalitetstestet med 30+ individuelle kontroller
                      og leveres med 36 måneders garanti fra PhoneSpot. Enheden er fuldt funktionel og klar til brug fra dag ét.
                    </p>
                    <p>
                      Enheden er nulstillet til fabriksindstillinger, opdateret til den nyeste software og grundigt
                      rengjort. Du får en {categoryName} der virker og ser ud som{" "}
                      {selectedGrade === "A" ? "ny" : selectedGrade === "B" ? "næsten ny" : "godt brugt"} —
                      til en brøkdel af nyprisen.
                    </p>
                    <h3>Hvad er inkluderet?</h3>
                    <ul>
                      <li>{template.display_name} i {gradeDetail?.label.toLowerCase() ?? "valgt stand"}</li>
                      <li>Oplader-kabel (USB-C eller Lightning)</li>
                      <li>Sikkerhedsboks med SIM-nål</li>
                      <li>36 måneders garanti fra PhoneSpot</li>
                      <li>Garantibevis med QR-kode</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Why refurbished */}
              <div className="rounded-2xl bg-cream p-6">
                <h3 className="mb-4 font-display text-base font-bold text-charcoal">
                  Hvorfor vælge refurbished?
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { title: "Spar penge", desc: `Spar 20-40% sammenlignet med en ny ${categoryName}. Samme produkt, lavere pris.` },
                    { title: "Bedre for miljøet", desc: "Vælg refurbished og reducer CO₂-udledningen med op til 80% sammenlignet med ny produktion." },
                    { title: "Grundigt testet", desc: "Hver enhed gennemgår 30+ individuelle tests. Vi tester alt fra skærm og batteri til sensorer og porte." },
                    { title: "Længere garanti", desc: "36 måneders garanti — 12 måneder mere end producentens standard." },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-green-eco">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-charcoal">{item.title}</p>
                        <p className="mt-0.5 text-xs text-charcoal/50 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Specifikationer ── */}
          {activeTab === "specifikationer" && (
            <div className="space-y-4">
              <SpecificationsTable specs={template.specifications} />
              {Object.keys(template.specifications).length === 0 && (
                <p className="text-sm text-charcoal/40">Specifikationer er endnu ikke tilgængelige for dette produkt.</p>
              )}
            </div>
          )}

          {/* ── Garanti & Levering ── */}
          {activeTab === "garanti" && (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-2xl border border-sand bg-white p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-eco/10">
                    <TrustIcon type="shield" className="h-5 w-5 text-green-eco" />
                  </div>
                  <h4 className="font-display text-base font-bold text-charcoal">36 måneders garanti</h4>
                  <p className="mt-2 text-sm text-charcoal/60 leading-relaxed">
                    Din {template.display_name} er dækket af 36 måneders garanti. Det dækker alle
                    fabrikationsfejl og funktionelle mangler. Har du problemer? Vi reparerer, bytter eller refunderer.
                  </p>
                </div>
                <div className="rounded-2xl border border-sand bg-white p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                    <TrustIcon type="return" className="h-5 w-5 text-blue-600" />
                  </div>
                  <h4 className="font-display text-base font-bold text-charcoal">14 dages fortrydelsesret</h4>
                  <p className="mt-2 text-sm text-charcoal/60 leading-relaxed">
                    Ikke tilfreds? Returner din enhed inden for 14 dage og få fuld refundering.
                    Ingen spørgsmål stillet. Vi betaler returfragt.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-sand bg-white p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                  <TrustIcon type="truck" className="h-5 w-5 text-amber-600" />
                </div>
                <h4 className="font-display text-base font-bold text-charcoal">Levering</h4>
                <ul className="mt-3 space-y-2.5 text-sm text-charcoal/60">
                  {[
                    { label: "DAO Pakke (49 kr)", desc: "Afhentning i nærmeste pakkeshop, 2-4 hverdage" },
                    { label: "PostNord (59 kr)", desc: "Levering til døren, 2-4 hverdage" },
                    { label: "Afhentning i butik (gratis)", desc: "VestsjællandsCentret 10, 4200 Slagelse" },
                    { label: "Fri fragt", desc: "Ved køb over 500 kr" },
                    { label: "Samme dag", desc: "Bestil før kl. 16 — sendt samme dag" },
                  ].map((item) => (
                    <li key={item.label} className="flex items-start gap-2">
                      <span className="mt-0.5 text-green-eco">&#10003;</span>
                      <span><strong>{item.label}</strong> — {item.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* FAQ                                                           */}
      {/* ============================================================ */}
      <div className="mt-12">
        <h2 className="mb-6 font-display text-xl font-bold text-charcoal">
          Ofte stillede spørgsmål om {template.display_name}
        </h2>
        <div className="divide-y divide-sand rounded-2xl border border-sand bg-white">
          {[
            {
              q: `Er denne ${template.display_name} fuldt funktionel?`,
              a: `Ja, 100%. Alle enheder gennemgår 30+ individuelle kvalitetstests. Vi tester skærm, batteri, kamera, højttalere, mikrofon, sensorer, porte og meget mere. Enheden er nulstillet til fabriksindstillinger og opdateret til nyeste software.`,
            },
            {
              q: "Hvad er forskellen mellem Grade A, B og C?",
              a: "Forskellen er udelukkende kosmetisk — alle grader er 100% funktionelle. Grade A er i perfekt stand uden synlige mærker. Grade B har lette brugsspor. Grade C har synlige brugsspor men er den billigste mulighed. Batterikapaciteten varierer: A min. 85%, B min. 80%, C min. 75%.",
            },
            {
              q: "Hvad dækker de 36 måneders garanti?",
              a: "Garantien dækker alle fabrikationsfejl og funktionelle mangler i 36 måneder. Det inkluderer problemer med skærm, batteri, kamera, højttalere og interne komponenter. Garantien dækker ikke fysisk skade eller kosmetisk slid.",
            },
            {
              q: "Kan jeg bruge alle danske mobilabonnementer?",
              a: "Ja. Alle enheder er ulåste (factory unlocked) og virker med alle danske operatører — TDC, Telenor, Telia, 3, Lebara og andre.",
            },
            {
              q: "Hvad hvis jeg ikke er tilfreds?",
              a: "Du har 14 dages fuld fortrydelsesret. Returner enheden i original stand, og vi refunderer det fulde beløb inkl. fragt. Ingen spørgsmål stillet.",
            },
          ].map((faq) => (
            <details key={faq.q} className="group">
              <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-charcoal">
                {faq.q}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-charcoal/30 transition-transform group-open:rotate-180">
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </summary>
              <p className="px-5 pb-4 text-sm text-charcoal/60 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* COMPATIBLE ACCESSORIES                                        */}
      {/* ============================================================ */}
      {accessories.length > 0 && (
        <div className="mt-12">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-xl font-bold text-charcoal">
              Kompatibelt tilbehør
            </h2>
            <Link href="/tilbehoer" className="text-sm font-semibold text-green-eco hover:underline">
              Se alt tilbehør &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {accessories.slice(0, 4).map((acc) => (
              <Link
                key={acc.id}
                href={acc.slug ? `/tilbehoer/${acc.category ?? ""}/${acc.slug}` : "#"}
                className="group flex flex-col overflow-hidden rounded-xl border border-sand bg-white transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-square overflow-hidden bg-cream">
                  {acc.images[0] ? (
                    <Image src={acc.images[0]} alt={acc.title} fill className="object-contain p-4 transition-transform group-hover:scale-105" sizes="(min-width: 768px) 25vw, 50vw" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sand">
                      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  {acc.brand && <p className="text-xs text-charcoal/50">{acc.brand}</p>}
                  <p className="text-sm font-semibold text-charcoal line-clamp-2">{acc.title}</p>
                  <p className="mt-1 text-sm font-bold text-green-eco">{formatDKK(acc.sale_price ?? acc.selling_price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
