"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ProductTemplate, Device, SkuProduct } from "@/lib/supabase/platform-types";
import { useCart } from "@/components/cart/cart-context";
import { GradeSelector } from "./grade-selector";
import { StorageSelector } from "./storage-selector";
import { ColorSelectorPlatform } from "./color-selector-platform";
import { SpecificationsTable } from "./specifications-table";
import { SpecTable } from "./spec-table";
import { DescriptionRenderer } from "./description-renderer";
import { PickupLine } from "./pickup-line";
import { TradeInTeaser } from "./trade-in-teaser";
import { normalizeStoreId } from "@/lib/stores";
import { selectDisplaySpecs, findModelNumber } from "@/lib/product/spec-display";
import { pickBetterInStockGrade } from "@/lib/product/grade-comparison";
import { matchesStorage, matchesColor, resolveCartStorage, resolveCartColor } from "@/lib/product/variant-match";
import { KlarnaBanner } from "@/components/ui/klarna-banner";
import { InsuranceLead } from "@/components/insurance/insurance-lead";
import { trackViewContent, trackAddToCart } from "@/lib/tracking/fbq";
import { TRUSTPILOT_SCORE_LABEL, TRUSTPILOT_SCORE_LABEL_DA } from "@/lib/trustpilot/constants";
import { STORES } from "@/lib/store-config";

export type RelatedInStockProduct = {
  id: string;
  slug: string;
  display_name: string;
  image: string | null;
  min_price: number | null;
  brand: string;
};

type DeviceDetailProps = {
  template: ProductTemplate;
  devices: Device[];
  accessories: SkuProduct[];
  /** In-stock same-category models, shown when this model is fully sold out. */
  relatedInStock?: RelatedInStockProduct[];
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
  N: { label: "Fabriksny", battery: "100% batterikapacitet — fabriksnyt, aldrig brugt", cosmetic: "Forseglet i ubrudt originalemballage — aldrig brugt" },
  P: { label: "Premium stand", battery: "Nyt batteri isat — 100% kapacitet", cosmetic: "Næsten perfekt — minimale eller ingen brugsspor" },
  A: { label: "Som ny", battery: "Nyt batteri isat — 100% kapacitet", cosmetic: "Ingen synlige brugsspor — fremstår som ny" },
  B: { label: "God stand", battery: "Min. 80% batterikapacitet", cosmetic: "Lette brugsspor — små ridser eller mærker" },
  C: { label: "Brugt stand", battery: "Min. 75% batterikapacitet", cosmetic: "Synlige brugsspor — ridser og mærker" },
};

/* ------------------------------------------------------------------ */
/*  Store count, spelled out in Danish — derived from store-config so   */
/*  it can never drift from the actual number of physical shops.        */
/* ------------------------------------------------------------------ */

const DANISH_ORDINAL_COUNT: Record<number, string> = { 1: "én", 2: "to", 3: "tre", 4: "fire" };
const storeCount = Object.keys(STORES).length;
const storeCountWord = DANISH_ORDINAL_COUNT[storeCount] ?? String(storeCount);

/* ------------------------------------------------------------------ */
/*  Trust icon helper (still used by the Garanti & Levering tab)       */
/* ------------------------------------------------------------------ */

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
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5">
            <defs>
              <linearGradient id="detail-partial-star">
                <stop offset="80%" stopColor="#00B67A" />
                <stop offset="80%" stopColor="#00B67A" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" fill="url(#detail-partial-star)" />
          </svg>
        </div>
        <span className="text-[10px] font-medium text-[#111111]/50">
          {TRUSTPILOT_SCORE_LABEL}/5 — Trustpilot
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

export function DeviceDetail({ template, devices, accessories, relatedInStock = [] }: DeviceDetailProps) {
  const { addDevice, openCart, openUpsell, cartState } = useCart();

  const listedDevices = devices.filter((d) => d.status === "listed");
  // Whole model has no stock in any grade — the page is a dead end unless we
  // route the buyer to similar in-stock models.
  const fullySoldOut = listedDevices.length === 0;

  // Check if any device has grade "N" (factory new)
  const hasNewGrade = listedDevices.some((d) => d.grade === "A" && d.condition_notes?.toLowerCase().includes("fabriksny")) ||
    listedDevices.some((d) => (d.grade as string) === "N");

  const allGradeKeys = hasNewGrade ? (["N", "P", "A", "B", "C"] as const) : (["P", "A", "B", "C"] as const);

  const availableGrades = allGradeKeys
    .map((grade) => {
      const matching = grade === "N"
        ? listedDevices.filter((d) => (d.grade as string) === "N" || (d.grade === "A" && d.condition_notes?.toLowerCase().includes("fabriksny")))
        : listedDevices.filter((d) => d.grade === grade && !(grade === "A" && d.condition_notes?.toLowerCase().includes("fabriksny")));
      const prices = matching.map((d) => d.selling_price).filter((p): p is number => p != null);
      const templatePrice = grade === "N" ? template.base_price_a : grade === "P" ? template.base_price_a : grade === "A" ? template.base_price_a : grade === "B" ? template.base_price_b : template.base_price_c;
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
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [notifyMessage, setNotifyMessage] = useState<string | null>(null);

  async function handleNotifySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (notifyStatus === "submitting") return;
    setNotifyStatus("submitting");
    setNotifyMessage(null);
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: notifyEmail,
          templateId: template.id,
          gradePreference: selectedGrade === "N" ? "A" : selectedGrade,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotifyStatus("error");
        setNotifyMessage(data?.error ?? "Noget gik galt. Prøv igen.");
        return;
      }
      setNotifyStatus("done");
      setNotifyMessage(data?.message ?? "Du får besked når produktet er på lager!");
    } catch {
      setNotifyStatus("error");
      setNotifyMessage("Kunne ikke sende. Tjek din forbindelse og prøv igen.");
    }
  }

  // Grade filter is reused for availability calculations and final match
  const matchesGrade = (d: Device): boolean => {
    if (selectedGrade === "N") {
      return (
        (d.grade as string) === "N" ||
        (d.grade === "A" && d.condition_notes?.toLowerCase().includes("fabriksny")) === true
      );
    }
    return (
      d.grade === selectedGrade &&
      !(selectedGrade !== "N" && d.condition_notes?.toLowerCase().includes("fabriksny") && d.grade === "A")
    );
  };

  // Devices that match the currently selected grade — used to determine
  // which storage and color values are actually in stock.
  const gradeMatchedDevices = useMemo(
    () => listedDevices.filter(matchesGrade),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listedDevices, selectedGrade],
  );

  const availableStorages = useMemo(() => {
    const set = new Set<string>();
    for (const d of gradeMatchedDevices) {
      if (d.storage) set.add(d.storage);
    }
    return set;
  }, [gradeMatchedDevices]);

  const availableColors = useMemo(() => {
    const set = new Set<string>();
    for (const d of gradeMatchedDevices) {
      // When filtering by storage, a color is "available" only if a device
      // with that color AND the selected storage exists. Falls back to all
      // colors for the grade if storage is unselected.
      if (!d.color) continue;
      if (selectedStorage && d.storage && d.storage !== selectedStorage) continue;
      set.add(d.color);
    }
    return set;
  }, [gradeMatchedDevices, selectedStorage]);

  // Colors that have stock in *any* grade (not just the currently selected
  // one). Used to decide which color swatches are clickable: a color the
  // shop has on the shelf in another grade is reachable — clicking it just
  // auto-switches the grade.
  const stockedColors = useMemo(() => {
    const set = new Set<string>();
    for (const d of listedDevices) {
      if (d.color) set.add(d.color);
    }
    return set;
  }, [listedDevices]);

  // Find the cheapest grade that has stock for a given color, so we can
  // jump the customer there when they pick a color the current grade
  // doesn't carry.
  const findGradeForColor = (color: string): string | null => {
    let best: { grade: string; price: number } | null = null;
    for (const d of listedDevices) {
      if (d.color !== color) continue;
      const isNewByNote =
        d.grade === "A" &&
        d.condition_notes?.toLowerCase().includes("fabriksny") === true;
      const effectiveGrade = isNewByNote ? "N" : (d.grade as string);
      const price = d.selling_price ?? Number.MAX_SAFE_INTEGER;
      if (!best || price < best.price) {
        best = { grade: effectiveGrade, price };
      }
    }
    return best?.grade ?? null;
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    if (!availableColors.has(color)) {
      const newGrade = findGradeForColor(color);
      if (newGrade) setSelectedGrade(newGrade);
    }
  };

  // If the current storage/color selection becomes unavailable after a
  // grade change, auto-jump to the first available option.
  useEffect(() => {
    if (
      template.storage_options.length > 0 &&
      availableStorages.size > 0 &&
      selectedStorage &&
      !availableStorages.has(selectedStorage)
    ) {
      const firstAvailable = template.storage_options.find((s) => availableStorages.has(s));
      if (firstAvailable) setSelectedStorage(firstAvailable);
    }
  }, [availableStorages, selectedStorage, template.storage_options]);

  useEffect(() => {
    if (
      template.colors.length > 0 &&
      availableColors.size > 0 &&
      selectedColor &&
      !availableColors.has(selectedColor)
    ) {
      const firstAvailable = template.colors.find((c) => availableColors.has(c));
      if (firstAvailable) setSelectedColor(firstAvailable);
    }
  }, [availableColors, selectedColor, template.colors]);

  // Reset gallery index when the customer picks a new color, so they see
  // the first image of that color rather than the carry-over from the previous one.
  useEffect(() => {
    setMainImageIndex(0);
  }, [selectedColor]);

  // Find matching devices (grade + storage + color). See variant-match.ts
  // for why a unit with an unknown (null) storage/color can only match when
  // the template has no variants for that field at all.
  const matchingDevices = gradeMatchedDevices.filter(
    (d) => matchesStorage(d.storage, selectedStorage) && matchesColor(d.color, selectedColor),
  );
  const price =
    matchingDevices.length > 0
      ? Math.min(...matchingDevices.map((d) => d.selling_price ?? 0))
      : selectedGrade === "N" ? template.base_price_a
      : selectedGrade === "P" ? template.base_price_a
      : selectedGrade === "A" ? template.base_price_a
      : selectedGrade === "B" ? template.base_price_b
      : template.base_price_c;

  const bestMatch = matchingDevices.length > 0
    ? matchingDevices.reduce((best, d) => (d.selling_price ?? Infinity) < (best.selling_price ?? Infinity) ? d : best)
    : null;

  // Color-specific images via default_attributes.images_by_color
  // Falls back to flat template.images when no per-color entry exists.
  const imagesByColor = (template.default_attributes?.images_by_color ?? null) as
    | Record<string, string[]>
    | null;
  const colorImages =
    selectedColor && imagesByColor?.[selectedColor]?.length
      ? imagesByColor[selectedColor]
      : null;
  const images = colorImages ?? (template.images.length > 0 ? template.images : []);
  const mainImage = images[mainImageIndex] ?? null;
  const inStock = matchingDevices.length > 0;
  const gradeDetail = GRADE_DETAILS[selectedGrade];

  // When the selected grade is sold out, surface other grades of the SAME model
  // that DO have stock so the customer has a one-click path forward instead of a
  // dead end. (Storage/color auto-correct via effects once the grade switches.)
  const otherInStockGrades = availableGrades.filter(
    (g) => g.grade !== selectedGrade && g.available > 0,
  );

  // Inline grade clarity: descriptor + savings vs the next grade up, so the
  // A-vs-B tradeoff is resolved at the selector instead of below the fold.
  // Only ever compares against a grade that's actually in stock — a sold-out
  // grade doesn't appear in the (now filtered) GradeSelector, so comparing
  // against it would reference something invisible on the page.
  const betterGrade = pickBetterInStockGrade(availableGrades, selectedGrade);
  const gradeSavingsVsBetter =
    betterGrade && betterGrade.price != null && price != null && betterGrade.price > price
      ? betterGrade.price - price
      : null;

  // Compute store availability from matching devices
  const storeLocations = new Map<string, { name: string; count: number }>();
  for (const d of matchingDevices) {
    const loc = (d as unknown as Record<string, unknown>).location as { name: string; type: string } | null;
    if (loc && loc.type === "store") {
      const entry = storeLocations.get(loc.name) || { name: loc.name, count: 0 };
      entry.count++;
      storeLocations.set(loc.name, entry);
    }
  }
  const pickupLocations = Array.from(storeLocations.values());
  // Same store-count data as pickupLocations, keyed by STORES slug for PickupLine
  // (locations.name is just "Vejle"/"Slagelse", which normalizeStoreId lowercases
  // straight into the "vejle"/"slagelse" slugs STORES and PickupLine key on).
  const stockByStore: { slug: string; count: number }[] = pickupLocations
    .map((loc) => ({ slug: normalizeStoreId(loc.name), count: loc.count }))
    .filter((s): s is { slug: NonNullable<typeof s.slug>; count: number } => s.slug !== null);

  const categoryName = getCategoryName(template.category);
  const deviceType = getDeviceType(template.category);

  const modelNumber = useMemo(() => findModelNumber(template.specifications), [template.specifications]);
  const displaySpecs = useMemo(() => selectDisplaySpecs(template.specifications), [template.specifications]);
  const categoryListingHref =
    template.category === "iphone" ? "/iphones"
    : template.category === "ipad" ? "/ipads"
    : template.category === "laptop" ? "/baerbare"
    : template.category === "smartwatch" ? "/smartwatches"
    : "/smartphones";

  // Fire Meta Pixel ViewContent once on mount
  useEffect(() => {
    const p = listedDevices.length > 0
      ? Math.min(...listedDevices.map((d) => d.selling_price ?? 0).filter(Boolean))
      : template.base_price_a;
    if (p) {
      trackViewContent({
        name: template.display_name,
        id: template.id,
        price: p / 100,
        category: template.category,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compare-at price — must come from the real recommended retail price
  // (new_price), never from base_price_a/b/c/n/p. Those are PhoneSpot's own
  // refurbished selling prices; showing one of them struck-through as "Nypris"
  // would misrepresent our own price as the manufacturer's new price. When
  // new_price is missing or not actually higher than the current price, no
  // comparison is shown at all — no struck-through figure, no savings line.
  const compareAtPrice = template.new_price && price && template.new_price > price ? template.new_price : null;
  const savingsPercent = compareAtPrice && price ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : null;

  async function handleAddToCart() {
    if (!bestMatch || !price) return;

    // Each refurbished device is a unique physical unit. When a customer wants
    // multiple of the same model, pick the next matching unit not already in cart.
    const inCartDeviceIds = new Set(
      cartState.items.flatMap((i) => (i.type === "device" ? [i.deviceId] : [])),
    );
    const addable = matchingDevices.filter((d) => !inCartDeviceIds.has(d.id));
    if (addable.length === 0) {
      setCartError(
        "Du har allerede alle tilgængelige enheder af denne model i kurven.",
      );
      return;
    }
    const unit = addable.reduce((best, d) =>
      (d.selling_price ?? Infinity) < (best.selling_price ?? Infinity) ? d : best,
    );
    const unitPrice = unit.selling_price ?? price;

    setIsAddingToCart(true);
    setCartError(null);
    trackAddToCart({ id: template.id, name: template.display_name, price: unitPrice / 100 });
    try {
      const loc = (unit as unknown as Record<string, unknown>).location as { id: string; name: string } | null;
      await addDevice({
        type: "device",
        deviceId: unit.id,
        templateId: template.id,
        title: template.display_name,
        grade: (selectedGrade === "N" ? "A" : unit.grade) as "A" | "B" | "C",
        // `unit` always comes from matchingDevices, so (per matchesStorage/
        // matchesColor above) its own storage/color is never null when the
        // template has variants for that field — this always records the
        // unit's own value, never a fabricated customer selection.
        color: resolveCartColor(unit.color, selectedColor),
        storage: resolveCartStorage(unit.storage, selectedStorage),
        image: template.images[0] ?? null,
        price: unitPrice,
        reservedAt: new Date().toISOString(),
        locationId: loc?.id,
        locationName: loc?.name,
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
      <div className="grid grid-cols-1 gap-4 sm:gap-8 lg:grid-cols-12 lg:gap-12">
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
                    className={`relative h-16 w-16 overflow-hidden rounded-xl border transition-all ${
                      i === mainImageIndex
                        ? "border-[#1A3D2E] shadow-sm ring-1 ring-[#1A3D2E]/20"
                        : "border-[#E5E5EA] hover:border-[#86868B]/50"
                    }`}
                  >
                    <Image src={img} alt={`${template.display_name} billede ${i + 1}`} fill className="object-contain p-1" sizes="64px" />
                  </button>
                ))}
              </div>
            )}

            {/* Main image — warm studio stage so the product sits on a floor
                instead of floating in a flat grey void. Product shots are
                white-background JPEGs, so the image multiplies onto the stage
                (white turns transparent) and a soft ellipse draws the floor. */}
            <div className="relative flex-1 overflow-hidden rounded-2xl aspect-square bg-[radial-gradient(120%_100%_at_50%_0%,#FFFFFF_0%,#F6F2EA_55%,#ECE6D8_100%)]">
              {mainImage ? (
                <>
                  <div aria-hidden="true" className="absolute bottom-[27%] left-1/2 h-8 w-1/2 -translate-x-1/2 rounded-[50%] bg-[#111111]/20 blur-xl" />
                  <Image src={mainImage} alt={template.display_name} fill className="object-contain p-2 sm:p-5 mix-blend-multiply" sizes="(min-width: 1024px) 58vw, 100vw" priority />
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg viewBox="0 0 64 64" className="h-20 w-20 text-[#E5E5EA]" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="16" y="8" width="32" height="48" rx="4" /><circle cx="32" cy="52" r="2" /><line x1="26" y1="14" x2="38" y2="14" />
                  </svg>
                </div>
              )}

              {/* Garanti badge — clean corner ribbon */}
              <div className="absolute top-4 right-4 z-20">
                <div className="flex items-center gap-1.5 rounded-lg bg-[#1A3D2E] px-3 py-1.5 shadow-md">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-white/90">
                    <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[11px] font-bold text-white">36 mdr. garanti</span>
                </div>
              </div>

              {/* Stock + savings badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {inStock ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1A3D2E] px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    {matchingDevices.length} på lager
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#86868B] px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    Udsolgt
                  </span>
                )}
                {savingsPercent && savingsPercent > 5 && (
                  <span className="inline-flex items-center rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
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
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border transition-all ${
                    i === mainImageIndex
                      ? "border-[#1A3D2E] ring-1 ring-[#1A3D2E]/20"
                      : "border-[#E5E5EA]"
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1A3D2E] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              {template.brand} · {selectedGrade === "N" ? "Fabriksny" : "Refurbished"} {categoryName}
            </span>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold leading-tight text-[#111111] lg:text-4xl">
              {template.display_name}
            </h1>
            {(modelNumber || selectedColor) && (
              <p className="mt-1 text-xs text-[#86868B]">
                {[modelNumber ? `Model ${modelNumber}` : null, selectedColor || null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {template.short_description && (
              <p className="mt-2 text-sm text-[#86868B] leading-relaxed">{template.short_description}</p>
            )}
          </div>

          {/* Scannable spec table — above the fold, above the price */}
          {displaySpecs.length > 0 && <SpecTable specs={displaySpecs} />}

          {/* Grade selector */}
          {availableGrades.length > 0 && (
            <GradeSelector grades={availableGrades} selected={selectedGrade} onChange={setSelectedGrade} />
          )}

          {/* Inline grade clarity — descriptor + savings vs the grade one step up */}
          {gradeDetail && (
            <div className="-mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#86868B]">
              <span className="font-semibold text-[#111111]">
                {gradeDetail.battery}
              </span>
              <span>· {gradeDetail.cosmetic}</span>
              {gradeSavingsVsBetter && betterGrade && (
                <span className="font-semibold text-[#1A3D2E]">
                  · spar {formatDKK(gradeSavingsVsBetter)} vs.{" "}
                  {betterGrade.grade === "N" ? "Fabriksny" : `Grade ${betterGrade.grade}`}
                </span>
              )}
            </div>
          )}

          {/* Storage selector — hidden for single-option products; the value
              already sits in the spec table, so a selector would only add bulk */}
          {template.storage_options.length > 1 && (
            <StorageSelector
              options={template.storage_options}
              selected={selectedStorage}
              onChange={setSelectedStorage}
              availableOptions={availableStorages}
            />
          )}

          {/* Color selector — same single-option rule as storage */}
          {template.colors.length > 1 && (
            <ColorSelectorPlatform
              colors={template.colors}
              selected={selectedColor}
              onChange={handleColorChange}
              availableColors={stockedColors}
            />
          )}

          {/* ── Price card + CTA ── */}
          <div className="rounded-2xl border border-[#1A3D2E]/15 bg-white p-4 sm:p-5 shadow-[0_10px_35px_rgba(26,61,46,0.10)] space-y-4">
            {/* Price */}
            <div>
              <div className="flex items-end gap-3">
                <span className="font-display text-3xl sm:text-4xl font-bold text-[#1A3D2E]">
                  {price != null ? formatDKK(price) : "—"}
                </span>
                {compareAtPrice && (
                  <span className="mb-1 text-lg text-[#86868B]">
                    <span className="mr-1 align-middle text-xs font-medium">Nypris</span>
                    <span className="line-through">{formatDKK(compareAtPrice)}</span>
                  </span>
                )}
              </div>
              {price != null && (
                <p className="mt-1 text-xs text-[#86868B]">
                  inkl. moms · 36 mdr. garanti · Fri fragt over 500 kr
                </p>
              )}

              {/* 1. Savings comparison vs new price */}
              {compareAtPrice && price && compareAtPrice > price && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-[#EFF5F1] px-3 py-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-[#1A3D2E]">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-[#1A3D2E] font-semibold">
                    Du sparer {formatDKK(compareAtPrice - price)}{savingsPercent ? ` (${savingsPercent}%)` : ""} sammenlignet med nypris
                  </span>
                </div>
              )}

              {/* 2. Klarna split payment */}
              {price && price > 30000 && (
                <div className="flex items-center gap-2 mt-2">
                  <svg width="18" height="18" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Klarna" className="shrink-0">
                    <rect width="36" height="36" rx="6" fill="#FFB3C7" />
                    <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#1A1A1A">K</text>
                  </svg>
                  <span className="text-xs text-[#6E6E73]">
                    Eller betal <strong className="text-[#111111]">{formatDKK(Math.round(price / 3))}/md</strong> med Klarna
                  </span>
                </div>
              )}
            </div>

            {/* Add to cart button — or out-of-stock state with notify form */}
            {!inStock ? (
              <div className="space-y-3">
                <button disabled className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6E6E73] px-6 py-4 text-base font-bold text-white cursor-not-allowed opacity-70">
                  Udsolgt
                </button>

                {/* In-stock alternatives — one-click path to an available grade */}
                {otherInStockGrades.length > 0 && (
                  <div className="rounded-xl border border-[#1A3D2E]/20 bg-[#EFF5F1] p-4">
                    <p className="text-sm font-semibold text-[#1A3D2E]">
                      Findes på lager i anden stand
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {otherInStockGrades.map((g) => (
                        <button
                          key={g.grade}
                          type="button"
                          onClick={() => setSelectedGrade(g.grade)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A3D2E]/25 bg-white px-3 py-2 text-sm font-semibold text-[#1A3D2E] transition-colors hover:border-[#1A3D2E] hover:bg-[#1A3D2E]/[0.04]"
                        >
                          {g.grade === "N" ? "Fabriksny" : `Grade ${g.grade}`}
                          {g.price != null && (
                            <span className="text-[#111111]">fra {formatDKK(g.price)}</span>
                          )}
                          <span className="text-xs font-normal text-[#86868B]">
                            · {g.available} på lager
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notify me when back in stock — saves to notify_requests */}
                <div className="rounded-xl border border-[#E5E5EA] p-4">
                  {notifyStatus === "done" ? (
                    <div className="flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-5 w-5 shrink-0 text-[#1A3D2E]">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm font-medium text-[#111111]">{notifyMessage}</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-[#111111]">Få besked når den er på lager</p>
                      <form className="mt-2 flex gap-2" onSubmit={handleNotifySubmit}>
                        <input
                          type="email"
                          placeholder="Din email"
                          required
                          value={notifyEmail}
                          onChange={(e) => setNotifyEmail(e.target.value)}
                          disabled={notifyStatus === "submitting"}
                          className="flex-1 rounded-lg border border-[#E5E5EA] px-3 py-2 text-sm outline-none focus:border-[#1A3D2E] focus:ring-1 focus:ring-[#1A3D2E]/20 disabled:opacity-60"
                        />
                        <button
                          type="submit"
                          disabled={notifyStatus === "submitting"}
                          className="rounded-lg bg-[#1A3D2E] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#2D6B45] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {notifyStatus === "submitting" ? "Sender..." : "Giv besked"}
                        </button>
                      </form>
                      {notifyStatus === "error" && notifyMessage && (
                        <p className="mt-2 text-sm text-red-600">{notifyMessage}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
              {/* Low-stock scarcity — reinforced right at the decision point */}
              {matchingDevices.length <= 3 && (
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1A3D2E]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1A3D2E] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1A3D2E]" />
                  </span>
                  {matchingDevices.length === 1
                    ? "Kun 1 tilbage — sidste eksemplar"
                    : `Kun ${matchingDevices.length} tilbage`}
                </p>
              )}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A3D2E] px-5 py-3.5 sm:px-6 sm:py-4 text-sm sm:text-base font-bold text-white transition-all hover:bg-[#2D6B45] hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAddingToCart ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4Z" />
                    </svg>
                    Reserverer...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                    Læg i kurv
                  </>
                )}
              </button>
              </>
            )}

            {cartError && <p className="text-sm text-red-600">{cartError}</p>}

            {/* Local pickup availability — directly under the CTA, the one advantage
                Back Market/Swappie/green.dk structurally can't match. Never shown for
                Foxway-sourced units, which never sit in a physical shop. */}
            {inStock && (
              <PickupLine stockByStore={bestMatch?.source === "foxway" ? [] : stockByStore} />
            )}

            {/* Trade-in teaser — link-only, no price claim (see component doc) */}
            <TradeInTeaser category={template.category} />

            {/* Pickup / delivery info */}
            {inStock && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7F7F8] px-3 py-1.5 text-xs font-semibold text-[#86868B]">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h-.375a3 3 0 013-3V7.5h9.75" />
                  </svg>
                  Kan sendes
                </span>
                {bestMatch?.source === "foxway" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7F7F8] px-3 py-1.5 text-xs font-semibold text-[#86868B]">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Levering 1-3 hverdage
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7F7F8] px-3 py-1.5 text-xs font-semibold text-[#86868B]">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {/* Qualified with the cutoff rather than evaluated live:
                        this pill renders in a "use client" tree, so it's
                        rendered once on the server and again at hydration —
                        a live Europe/Copenhagen cutoff check here would
                        reintroduce the exact SSR/hydration mismatch risk
                        being fixed in pickup-line.tsx just for a claim that
                        collapses to the same static fact 99% of the day.
                        Stating the cutoff (already used verbatim in the
                        Garanti & Levering tab below) is honest and requires
                        no clock read at all. "på hverdage" matches the
                        frontpage claim (page.tsx) — without it this pill
                        implies same-day dispatch on weekends too. */}
                    Bestil før kl. 16 på hverdage — sendt samme dag
                  </span>
                )}
              </div>
            )}

            {/* Sikker betaling — unlike the shipping pills above, this isn't
                tied to whether this specific SKU is in stock, so it renders
                regardless (matches its old always-on visibility via the
                removed TRUST_POINTS strip). */}
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#F7F7F8] px-3 py-1.5 text-xs font-semibold text-[#86868B]">
              <TrustIcon type="lock" className="h-3.5 w-3.5" />
              Sikker betaling — kort, MobilePay og Klarna
            </span>

            {/* Compact trust strip — three lines: warranty/return, the
                condition claim for the selected grade, and Trustpilot +
                store count. Replaces what used to be three separate
                trust modules further down the page (grade explanation
                cards, the 6-tile TRUST_POINTS strip and a second "hvad
                betyder standen" toggle) — see the deeper quality section
                below for the full grade-by-grade breakdown. */}
            <div className="flex flex-col gap-1 pt-1 border-t border-[#E5E5EA] text-xs text-[#86868B]">
              <p>36 måneders garanti — og 14 dages returret</p>
              {gradeDetail && <p>{gradeDetail.cosmetic}</p>}
              <p>
                {TRUSTPILOT_SCORE_LABEL_DA} på Trustpilot — {storeCountWord} fysiske butikker i Danmark
              </p>
            </div>

            {/* 4. Share buttons */}
            <div className="flex items-center gap-2 sm:gap-3 pt-2 border-t border-[#E5E5EA]">
              <span className="hidden sm:inline text-xs text-[#6E6E73]">Del:</span>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
                title="Kopier link"
                className="flex items-center justify-center rounded-lg border border-[#E5E5EA] bg-[#F7F7F8] p-1.5 text-[#6E6E73] transition-colors hover:border-[#1A3D2E]/30 hover:bg-[#EFF5F1] hover:text-[#1A3D2E]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
              </button>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Del på Facebook"
                className="flex items-center justify-center rounded-lg border border-[#E5E5EA] bg-[#F7F7F8] p-1.5 text-[#6E6E73] transition-colors hover:border-[#1877F2]/30 hover:bg-[#1877F2]/[0.06] hover:text-[#1877F2]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.269h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Elektronikforsikring — at the decision point instead of buried
              below the fold; compact cart-variant matches the buy box scale */}
          <InsuranceLead source="product" variant="cart" />

          {/* Klarna banner */}
          {price != null && (
            <KlarnaBanner priceAmount={String(price / 100)} />
          )}

          {/* Trustpilot — social proof anchors the buy box instead of
              pushing title and specs down from the top */}
          <TrustpilotBadge />
        </div>
      </div>

      {/* ============================================================ */}
      {/* SOLD-OUT RECOVERY — similar in-stock models                   */}
      {/* ============================================================ */}
      {fullySoldOut && relatedInStock.length > 0 && (
        <div className="mt-10 rounded-2xl border border-[#E5E5EA] bg-[#F7F7F8] p-5 sm:p-6">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-[#111111]">
                Lignende modeller på lager
              </h2>
              <p className="mt-0.5 text-sm text-[#86868B]">
                {template.display_name} er udsolgt — disse er klar til levering nu.
              </p>
            </div>
            <Link href={categoryListingHref} className="hidden sm:inline text-sm font-semibold text-[#1A3D2E] hover:underline">
              Se alle &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-4">
            {relatedInStock.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={`/refurbished/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-[#E5E5EA] bg-white transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-square overflow-hidden bg-[#F7F7F8]">
                  {p.image ? (
                    <Image src={p.image} alt={p.display_name} fill className="object-contain p-4 transition-transform group-hover:scale-105" sizes="(min-width: 640px) 25vw, 50vw" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#E5E5EA]">
                      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="6" y="3" width="12" height="18" rx="2" /></svg>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  {p.brand && <p className="text-xs text-[#86868B]">{p.brand}</p>}
                  <p className="text-sm font-semibold text-[#111111] line-clamp-2">{p.display_name}</p>
                  {p.min_price != null && (
                    <p className="mt-1 text-sm font-bold text-[#1A3D2E]">fra {formatDKK(p.min_price)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TABS: Beskrivelse / Specifikationer / Garanti & Levering      */}
      {/* ============================================================ */}
      <div className="mt-12">
        <div className="flex border-b border-[#E5E5EA]">
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
                className={`px-3 sm:px-5 py-2.5 sm:py-3.5 text-xs sm:text-sm font-semibold transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-[#1A3D2E] text-[#1A3D2E]"
                    : "text-[#86868B] hover:text-[#111111]"
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
              <div className="max-w-3xl">
                {template.description ? (
                  <DescriptionRenderer text={template.description} />
                ) : (
                  <div className="prose prose-sm max-w-none space-y-3 text-[#111111]/80">
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
              <div className="rounded-2xl bg-[#F7F7F8] p-6">
                <h3 className="mb-4 font-display text-base font-bold text-[#111111]">
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
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-[#1A3D2E]">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-[#111111]">{item.title}</p>
                        <p className="mt-0.5 text-xs text-[#86868B] leading-relaxed">{item.desc}</p>
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
                <p className="text-sm text-[#86868B]">Specifikationer er endnu ikke tilgængelige for dette produkt.</p>
              )}
            </div>
          )}

          {/* ── Garanti & Levering ── */}
          {activeTab === "garanti" && (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A3D2E]/10">
                    <TrustIcon type="shield" className="h-5 w-5 text-[#1A3D2E]" />
                  </div>
                  <h4 className="font-display text-base font-bold text-[#111111]">36 måneders garanti</h4>
                  <p className="mt-2 text-sm text-[#86868B] leading-relaxed">
                    Din {template.display_name} er dækket af 36 måneders garanti. Det dækker alle
                    fabrikationsfejl og funktionelle mangler. Har du problemer? Vi reparerer, bytter eller refunderer.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                    <TrustIcon type="return" className="h-5 w-5 text-blue-600" />
                  </div>
                  <h4 className="font-display text-base font-bold text-[#111111]">14 dages fortrydelsesret</h4>
                  <p className="mt-2 text-sm text-[#86868B] leading-relaxed">
                    Ikke tilfreds? Returner din enhed inden for 14 dage og få fuld refundering.
                    Ingen spørgsmål stillet. Vi betaler returfragt.
                  </p>
                </div>
              </div>
              <Link
                href="/forsikring"
                className="flex items-center justify-between gap-4 rounded-2xl border border-[#1A3D2E]/20 bg-[#1A3D2E]/5 p-5 transition-colors hover:bg-[#1A3D2E]/10"
              >
                <div className="flex items-start gap-3">
                  <TrustIcon type="shield" className="mt-0.5 h-5 w-5 shrink-0 text-[#1A3D2E]" />
                  <div>
                    <h4 className="font-display text-base font-bold text-[#111111]">
                      Kan forsikres mod uheld
                    </h4>
                    <p className="mt-1 text-sm text-[#86868B] leading-relaxed">
                      Garantien dækker fejl — tilføj elektronikforsikring i samarbejde med
                      Storstrøm Forsikring og vær også dækket mod uheld som fald og skærmskader.
                      Spørg i butikken i Slagelse.
                    </p>
                  </div>
                </div>
                <span className="hidden shrink-0 text-sm font-semibold text-[#1A3D2E] sm:inline">
                  Læs mere &rarr;
                </span>
              </Link>
              <div className="rounded-2xl border border-[#E5E5EA] bg-white p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                  <TrustIcon type="truck" className="h-5 w-5 text-amber-600" />
                </div>
                <h4 className="font-display text-base font-bold text-[#111111]">Levering &amp; afhentning</h4>
                <ul className="mt-3 space-y-2.5 text-sm text-[#86868B]">
                  {pickupLocations.length > 0 && pickupLocations.map((loc) => (
                    <li key={loc.name} className="flex items-start gap-2">
                      <span className="mt-0.5 text-[#1A3D2E] font-bold">&#10003;</span>
                      <span><strong className="text-[#111111]">Hent i {loc.name} (gratis)</strong> — Klar til afhentning i dag</span>
                    </li>
                  ))}
                  {pickupLocations.length === 0 && (
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-[#1A3D2E] font-bold">&#10003;</span>
                      <span><strong className="text-[#111111]">Afhentning i butik (gratis)</strong> — Slagelse &amp; Vejle</span>
                    </li>
                  )}
                  {[
                    { label: "DAO Pakke (49 kr)", desc: "Afhentning i nærmeste pakkeshop, 2-4 hverdage" },
                    { label: "PostNord (59 kr)", desc: "Levering til døren, 2-4 hverdage" },
                    { label: "Fri fragt", desc: "Ved køb over 500 kr" },
                    { label: "Samme dag", desc: "Bestil før kl. 16 på hverdage — sendt samme dag" },
                    { label: "Sikker betaling", desc: "Kort, MobilePay og Klarna" },
                  ].map((item) => (
                    <li key={item.label} className="flex items-start gap-2">
                      <span className="mt-0.5 text-[#1A3D2E] font-bold">&#10003;</span>
                      <span><strong className="text-[#111111]">{item.label}</strong> — {item.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FAQ moved to page level (page.tsx) — see src/lib/product/device-faq.ts
          for the merged question set. Having it live once, at page level,
          is what makes "exactly one FAQ per product page" true regardless
          of which route rendered this component. */}

      {/* ============================================================ */}
      {/* COMPATIBLE ACCESSORIES                                        */}
      {/* ============================================================ */}
      {accessories.length > 0 && (
        <div className="mt-12">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-display text-xl font-bold text-[#111111]">
              Kompatibelt tilbehør
            </h2>
            <Link href="/tilbehoer" className="text-sm font-semibold text-[#1A3D2E] hover:underline">
              Se alt tilbehør &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-3 md:grid-cols-4">
            {accessories.slice(0, 4).map((acc) => (
              <Link
                key={acc.id}
                href={acc.slug ? `/tilbehoer/${acc.category ?? ""}/${acc.slug}` : "#"}
                className="group flex flex-col overflow-hidden rounded-xl border border-[#E5E5EA] bg-white transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-square overflow-hidden bg-[#F7F7F8]">
                  {acc.images[0] ? (
                    <Image src={acc.images[0]} alt={acc.title} fill className="object-contain p-4 transition-transform group-hover:scale-105" sizes="(min-width: 768px) 25vw, 50vw" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#E5E5EA]">
                      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  {acc.brand && <p className="text-xs text-[#86868B]">{acc.brand}</p>}
                  <p className="text-sm font-semibold text-[#111111] line-clamp-2">{acc.title}</p>
                  <p className="mt-1 text-sm font-bold text-[#1A3D2E]">{formatDKK(acc.sale_price ?? acc.selling_price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
