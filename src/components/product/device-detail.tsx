"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type {
  ProductTemplate,
  Device,
} from "@/lib/supabase/platform-types";
import type { PublicSkuProduct } from "@/lib/product/public-sku";
import { ACCESSORY_CATEGORY_TO_SLUG } from "@/lib/tilbehoer-config";
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
import {
  selectDisplaySpecs,
  findModelNumber,
} from "@/lib/product/spec-display";
import {
  matchesStorage,
  matchesColor,
  resolveCartStorage,
  resolveCartColor,
} from "@/lib/product/variant-match";
import { KlarnaBanner } from "@/components/ui/klarna-banner";
import { InsuranceLead } from "@/components/insurance/insurance-lead";
import { trackViewContent, trackAddToCart } from "@/lib/tracking/fbq";
import { TRUSTPILOT_SCORE_LABEL_DA } from "@/lib/trustpilot/constants";
import styles from "./device-detail.module.css";
import { UpgradeSelector, type UpgradeOption } from "./upgrade-selector";
import { customerFacingError } from "@/lib/customer-facing-error";

export type RelatedInStockProduct = {
  id: string;
  slug: string;
  display_name: string;
  image: string | null;
  min_price: number | null;
  brand: string;
};

/**
 * Kun de device-kolonner denne (client-)komponent faktisk laeser.
 * Bevidst IKKE hele `Device`: alt hvad der staar her bliver serialiseret ind
 * i sidens RSC-payload og er laesbart i den offentlige kildekode, saa
 * purchase_price/source_sku/source_url maa aldrig kunne snige sig med.
 * Holdes i sync med AVAILABLE_DEVICE_COLUMNS i lib/supabase/product-queries.ts.
 */
export type PublicDevice = Pick<
  Device,
  | "id"
  | "template_id"
  | "status"
  | "grade"
  | "condition_notes"
  | "selling_price"
  | "storage"
  | "color"
  | "battery_health"
  | "battery_replaced"
  | "source"
>;

type DeviceDetailProps = {
  template: ProductTemplate;
  devices: PublicDevice[];
  accessories: PublicSkuProduct[];
  /** In-stock same-category models, shown when this model is fully sold out. */
  relatedInStock?: RelatedInStockProduct[];
  /** RAM/SSD-opgraderingstilvalg (kun laptops). */
  upgradeOptions?: UpgradeOption[];
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

/**
 * Grade describes cosmetic condition ONLY — never a battery promise. A
 * battery figure is a per-unit measurement (devices.battery_health), not
 * something a cosmetic grade can predict, so it must never be hardcoded
 * here. See buildBatteryLine() below for the per-unit statement shown
 * alongside this cosmetic description.
 */
const GRADE_DETAILS: Record<string, { label: string; cosmetic: string }> = {
  N: {
    label: "Fabriksny",
    cosmetic: "Forseglet i ubrudt originalemballage — aldrig brugt",
  },
  P: {
    label: "Premium stand",
    cosmetic: "Næsten perfekt — minimale eller ingen brugsspor",
  },
  A: { label: "Som ny", cosmetic: "Ingen synlige brugsspor — fremstår som ny" },
  B: {
    label: "God stand",
    cosmetic: "Lette brugsspor — små ridser eller mærker",
  },
  C: { label: "Brugt stand", cosmetic: "Synlige brugsspor — ridser og mærker" },
};

/**
 * The battery statement is always about ONE physical unit — never a grade.
 * `battery_health` is a measured fact recorded per device; when it's
 * unknown (null), nothing is said about the battery at all rather than
 * showing an invented floor. `battery_replaced` is only ever mentioned when
 * explicitly true for that same unit.
 */
export function buildBatteryLine(
  unit: Pick<Device, "battery_health" | "battery_replaced"> | null,
): string | null {
  if (!unit || unit.battery_health == null) return null;
  const base = `Batteri: ${unit.battery_health}% — målt på denne enhed`;
  return unit.battery_replaced === true ? `${base}. Nyt batteri isat.` : base;
}

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

export function DeviceDetail({
  template,
  devices,
  accessories,
  relatedInStock = [],
  upgradeOptions = [],
}: DeviceDetailProps) {
  const { addDevice, openCart, openUpsell, cartState } = useCart();

  const listedDevices = devices.filter((d) => d.status === "listed");
  // Whole model has no stock in any grade — the page is a dead end unless we
  // route the buyer to similar in-stock models.
  const fullySoldOut = listedDevices.length === 0;

  // Check if any device has grade "N" (factory new)
  const hasNewGrade =
    listedDevices.some(
      (d) =>
        d.grade === "A" &&
        d.condition_notes?.toLowerCase().includes("fabriksny"),
    ) || listedDevices.some((d) => (d.grade as string) === "N");

  const allGradeKeys = hasNewGrade
    ? (["N", "P", "A", "B", "C"] as const)
    : (["P", "A", "B", "C"] as const);

  const availableGrades = allGradeKeys.map((grade) => {
    const matching =
      grade === "N"
        ? listedDevices.filter(
            (d) =>
              (d.grade as string) === "N" ||
              (d.grade === "A" &&
                d.condition_notes?.toLowerCase().includes("fabriksny")),
          )
        : listedDevices.filter(
            (d) =>
              d.grade === grade &&
              !(
                grade === "A" &&
                d.condition_notes?.toLowerCase().includes("fabriksny")
              ),
          );
    const prices = matching
      .map((d) => d.selling_price)
      .filter((p): p is number => p != null);
    const templatePrice =
      grade === "N"
        ? template.base_price_a
        : grade === "P"
          ? template.base_price_a
          : grade === "A"
            ? template.base_price_a
            : grade === "B"
              ? template.base_price_b
              : template.base_price_c;
    return {
      grade: grade as string,
      price: prices.length > 0 ? Math.min(...prices) : (templatePrice ?? null),
      available: matching.length,
    };
  });

  const [selectedGrade, setSelectedGrade] = useState<string>(
    availableGrades.find((g) => g.available > 0)?.grade ??
      availableGrades[0]?.grade ??
      "A",
  );
  const [selectedStorage, setSelectedStorage] = useState<string>(
    template.storage_options[0] ?? "",
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    template.colors[0] ?? "",
  );
  const [selectedUpgrades, setSelectedUpgrades] = useState<{
    ram: string | null;
    ssd: string | null;
  }>({ ram: null, ssd: null });
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<
    "idle" | "submitting" | "done" | "error"
  >("idle");
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
      setNotifyMessage(
        data?.message ?? "Du får besked når produktet er på lager!",
      );
    } catch {
      setNotifyStatus("error");
      setNotifyMessage("Kunne ikke sende. Tjek din forbindelse og prøv igen.");
    }
  }

  // Grade filter is reused for availability calculations and final match
  const matchesGrade = (d: PublicDevice): boolean => {
    if (selectedGrade === "N") {
      return (
        (d.grade as string) === "N" ||
        (d.grade === "A" &&
          d.condition_notes?.toLowerCase().includes("fabriksny")) === true
      );
    }
    return (
      d.grade === selectedGrade &&
      !(
        selectedGrade !== "N" &&
        d.condition_notes?.toLowerCase().includes("fabriksny") &&
        d.grade === "A"
      )
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
      if (selectedStorage && d.storage && d.storage !== selectedStorage)
        continue;
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
      const firstAvailable = template.storage_options.find((s) =>
        availableStorages.has(s),
      );
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
      const firstAvailable = template.colors.find((c) =>
        availableColors.has(c),
      );
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
    (d) =>
      matchesStorage(d.storage, selectedStorage) &&
      matchesColor(d.color, selectedColor),
  );
  const price =
    matchingDevices.length > 0
      ? Math.min(...matchingDevices.map((d) => d.selling_price ?? 0))
      : selectedGrade === "N"
        ? template.base_price_a
        : selectedGrade === "P"
          ? template.base_price_a
          : selectedGrade === "A"
            ? template.base_price_a
            : selectedGrade === "B"
              ? template.base_price_b
              : template.base_price_c;

  const bestMatch =
    matchingDevices.length > 0
      ? matchingDevices.reduce((best, d) =>
          (d.selling_price ?? Infinity) < (best.selling_price ?? Infinity)
            ? d
            : best,
        )
      : null;

  // Color-specific images via default_attributes.images_by_color
  // Falls back to flat template.images when no per-color entry exists.
  const imagesByColor = (template.default_attributes?.images_by_color ??
    null) as Record<string, string[]> | null;
  const colorImages =
    selectedColor && imagesByColor?.[selectedColor]?.length
      ? imagesByColor[selectedColor]
      : null;
  const images =
    colorImages ?? (template.images.length > 0 ? template.images : []);
  const mainImage = images[mainImageIndex] ?? null;
  const inStock = matchingDevices.length > 0;
  const gradeDetail = GRADE_DETAILS[selectedGrade];
  // Per-unit battery statement for the specific device that would actually
  // be added to cart at the displayed price — never a grade-level promise.
  const batteryLine = buildBatteryLine(bestMatch);

  // When the selected grade is sold out, surface other grades of the SAME model
  // that DO have stock so the customer has a one-click path forward instead of a
  // dead end. (Storage/color auto-correct via effects once the grade switches.)
  const otherInStockGrades = availableGrades.filter(
    (g) => g.grade !== selectedGrade && g.available > 0,
  );

  // Compute store availability from matching devices
  const storeLocations = new Map<string, { name: string; count: number }>();
  for (const d of matchingDevices) {
    const loc = (d as unknown as Record<string, unknown>).location as {
      name: string;
      type: string;
    } | null;
    if (loc && loc.type === "store") {
      const entry = storeLocations.get(loc.name) || {
        name: loc.name,
        count: 0,
      };
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
    .filter(
      (s): s is { slug: NonNullable<typeof s.slug>; count: number } =>
        s.slug !== null,
    );

  const categoryName = getCategoryName(template.category);
  const deviceType = getDeviceType(template.category);

  const modelNumber = useMemo(
    () => findModelNumber(template.specifications),
    [template.specifications],
  );
  const displaySpecs = useMemo(
    () => selectDisplaySpecs(template.specifications),
    [template.specifications],
  );
  const categoryListingHref =
    template.category === "iphone"
      ? "/iphones"
      : template.category === "ipad"
        ? "/ipads"
        : template.category === "laptop"
          ? "/baerbare"
          : template.category === "smartwatch"
            ? "/smartwatches"
            : "/smartphones";

  // Fire Meta Pixel ViewContent once on mount
  useEffect(() => {
    const p =
      listedDevices.length > 0
        ? Math.min(
            ...listedDevices.map((d) => d.selling_price ?? 0).filter(Boolean),
          )
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
  const compareAtPrice =
    template.new_price && price && template.new_price > price
      ? template.new_price
      : null;
  const savingsPercent =
    compareAtPrice && price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : null;

  // Presentation only: cart keeps its existing base price and separate upgrades.
  const selectedUpgradeTotal = (["ram", "ssd"] as const).reduce((sum, kind) => {
    const option = upgradeOptions.find(
      (item) => item.id === selectedUpgrades[kind],
    );
    return sum + (option?.price ?? 0);
  }, 0);

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
      (d.selling_price ?? Infinity) < (best.selling_price ?? Infinity)
        ? d
        : best,
    );
    const unitPrice = unit.selling_price ?? price;

    const chosenUpgrades = (["ram", "ssd"] as const)
      .map((kind) => {
        const id = selectedUpgrades[kind];
        const opt = id ? upgradeOptions.find((o) => o.id === id) : null;
        return opt
          ? {
              optionId: opt.id,
              kind: opt.kind,
              label: opt.label,
              price: opt.price,
            }
          : null;
      })
      .filter((u): u is NonNullable<typeof u> => u !== null);

    setIsAddingToCart(true);
    setCartError(null);
    trackAddToCart({
      id: template.id,
      name: template.display_name,
      price: unitPrice / 100,
    });
    try {
      const loc = (unit as unknown as Record<string, unknown>).location as {
        id: string;
        name: string;
      } | null;
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
        ...(chosenUpgrades.length > 0 ? { upgrades: chosenUpgrades } : {}),
      });

      setSelectedUpgrades({ ram: null, ssd: null });

      // Only show screen protector upsell for phones/smartphones
      if (deviceType === "phone") {
        openUpsell();
      } else {
        openCart();
      }
    } catch (err) {
      setCartError(
        customerFacingError(err, "Kunne ikke tilføje til kurv. Prøv igen.", [
          "Udsolgt",
        ]),
      );
    } finally {
      setIsAddingToCart(false);
    }
  }

  return (
    <div className={styles.product}>
      <div className={styles.overview}>
        <header className={styles.title}>
          <p className={styles.eyebrow}>
            {selectedGrade === "N" ? "Fabriksny" : "Refurbished"} {categoryName}
          </p>
          <h1>{template.display_name}</h1>
          {(modelNumber || selectedColor) && (
            <p className={styles.subtitle}>
              {[
                modelNumber ? `Model ${modelNumber}` : null,
                selectedColor || null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {template.short_description && (
            <p className={styles.intro}>{template.short_description}</p>
          )}
        </header>

        <div className={styles.gallery}>
          <div className={styles.imageStage}>
            {mainImage ? (
              <Image
                src={mainImage}
                alt={template.display_name}
                fill
                className="object-contain p-5 sm:p-8"
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
              />
            ) : (
              <p>Billede kommer snart</p>
            )}
          </div>
          {images.length > 1 && (
            <div className={styles.thumbnails} aria-label="Produktbilleder">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMainImageIndex(i)}
                  aria-label={`Vis billede ${i + 1} af ${template.display_name}`}
                  aria-pressed={i === mainImageIndex}
                >
                  <Image
                    src={img}
                    alt=""
                    fill
                    className="object-contain p-2"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.configuration}>
          {availableGrades.length > 0 && (
            <GradeSelector
              grades={availableGrades}
              selected={selectedGrade}
              onChange={setSelectedGrade}
            />
          )}
          {template.storage_options.length > 1 && (
            <StorageSelector
              options={template.storage_options}
              selected={selectedStorage}
              onChange={setSelectedStorage}
              availableOptions={availableStorages}
            />
          )}
          {template.colors.length > 1 && (
            <ColorSelectorPlatform
              colors={template.colors}
              selected={selectedColor}
              onChange={handleColorChange}
              availableColors={stockedColors}
            />
          )}
          {bestMatch && (
            <div className={styles.unitDetails}>
              {gradeDetail && <p>{gradeDetail.cosmetic}</p>}
              {bestMatch.condition_notes && <p>{bestMatch.condition_notes}</p>}
              {batteryLine && (
                <p className="font-medium text-charcoal">{batteryLine}</p>
              )}
            </div>
          )}
          {deviceType === "laptop" && upgradeOptions.length > 0 && (
            <UpgradeSelector
              options={upgradeOptions}
              selected={selectedUpgrades}
              onChange={(kind, optionId) =>
                setSelectedUpgrades((prev) => ({ ...prev, [kind]: optionId }))
              }
            />
          )}

          <div className={styles.purchase}>
            {selectedUpgradeTotal > 0 && (
              <p className={styles.small}>Grundpris for enheden</p>
            )}
            <div className={styles.priceLine}>
              <span className={styles.price}>
                {price != null ? formatDKK(price) : "Pris ikke tilgængelig"}
              </span>
              {compareAtPrice && (
                <span className={styles.compare}>
                  <span>Nypris</span> <s>{formatDKK(compareAtPrice)}</s>
                </span>
              )}
            </div>
            {selectedUpgradeTotal > 0 && price != null && (
              <div className={styles.upgradeTotal}>
                <p>Tilvalg: +{formatDKK(selectedUpgradeTotal)}</p>
                <p className="font-semibold text-charcoal">
                  Samlet: {formatDKK(price + selectedUpgradeTotal)}
                </p>
              </div>
            )}
            <p className={styles.small}>
              Inkl. moms · 36 måneders garanti på enheden
            </p>
            {compareAtPrice && price && compareAtPrice > price && (
              <p className={styles.savings}>
                Du sparer {formatDKK(compareAtPrice - price)}
                {savingsPercent ? ` (${savingsPercent}%)` : ""} sammenlignet med
                nypris
              </p>
            )}
            {inStock ? (
              <>
                <p className={styles.stock}>
                  {matchingDevices.length} på lager i den valgte variant
                </p>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className={styles.buyButton}
                >
                  {isAddingToCart ? "Reserverer..." : "Læg i kurv"}
                </button>
              </>
            ) : (
              <div className={styles.soldOut}>
                <button disabled className={styles.buyButton}>
                  Udsolgt
                </button>
                {otherInStockGrades.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold">
                      Findes på lager i anden stand
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {otherInStockGrades.map((g) => (
                        <button
                          key={g.grade}
                          type="button"
                          onClick={() => setSelectedGrade(g.grade)}
                          className={styles.alternative}
                        >
                          {g.grade === "N" ? "Fabriksny" : `Grade ${g.grade}`}
                          {g.price != null && <> fra {formatDKK(g.price)}</>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <Link href={categoryListingHref} className={styles.textLink}>
                  Se flere modeller &rarr;
                </Link>
                <div className={styles.notify}>
                  {notifyStatus === "done" ? (
                    <p role="status">{notifyMessage}</p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold">
                        Få besked når den er på lager
                      </p>
                      <form onSubmit={handleNotifySubmit}>
                        <label
                          htmlFor="device-notify-email"
                          className="sr-only"
                        >
                          Din email
                        </label>
                        <input
                          id="device-notify-email"
                          type="email"
                          placeholder="Din email"
                          required
                          value={notifyEmail}
                          onChange={(e) => setNotifyEmail(e.target.value)}
                          disabled={notifyStatus === "submitting"}
                        />
                        <button
                          type="submit"
                          disabled={notifyStatus === "submitting"}
                        >
                          {notifyStatus === "submitting"
                            ? "Sender..."
                            : "Giv besked"}
                        </button>
                      </form>
                      {notifyStatus === "error" && notifyMessage && (
                        <p role="alert" className="mt-2 text-sm text-red-600">
                          {notifyMessage}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            {cartError && (
              <p role="alert" className="text-sm text-red-600">
                {cartError}
              </p>
            )}
            {inStock && (
              <PickupLine
                stockByStore={
                  bestMatch?.source === "foxway" ? [] : stockByStore
                }
              />
            )}
            <p className={styles.small}>
              14 dages returret · Kort, MobilePay og Klarna
            </p>
          </div>
          {price != null && (
            <div>
              {selectedUpgradeTotal > 0 && (
                <p className={styles.small}>
                  Klarna-visningen nedenfor gælder enhedens grundpris uden
                  tilvalg.
                </p>
              )}
              <KlarnaBanner priceAmount={String(price / 100)} />
            </div>
          )}
          <a
            href="https://dk.trustpilot.com/review/phonespot.dk"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.rating}
          >
            {TRUSTPILOT_SCORE_LABEL_DA}/5 på Trustpilot{" "}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      {fullySoldOut && relatedInStock.length > 0 && (
        <section className={styles.related}>
          <h2>Lignende modeller på lager</h2>
          <div className={styles.modelList}>
            {relatedInStock.map((p) => (
              <Link
                key={p.id}
                href={`/refurbished/${p.slug}`}
                className={styles.modelLink}
              >
                <span className={styles.smallImage}>
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt=""
                      fill
                      className="object-contain p-2"
                      sizes="80px"
                    />
                  ) : (
                    <span>Intet billede</span>
                  )}
                </span>
                <span>
                  <strong>{p.display_name}</strong>
                  {p.min_price != null && (
                    <span className="mt-1 block text-sm">
                      Fra {formatDKK(p.min_price)}
                    </span>
                  )}
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className={styles.helpLayout}>
        <div className={styles.details}>
          <details open>
            <summary>Om {template.display_name}</summary>
            <div className={styles.detailBody}>
              {template.description ? (
                <DescriptionRenderer text={template.description} />
              ) : (
                <p>
                  Denne {categoryName} er kvalitetstestet og leveres med 36
                  måneders garanti fra PhoneSpot. Vælg stand, lagerplads og
                  farve blandt de tilgængelige enheder ovenfor.
                </p>
              )}
              {displaySpecs.length > 0 && (
                <div className="mt-5">
                  <SpecTable specs={displaySpecs} />
                </div>
              )}
            </div>
          </details>
          <details>
            <summary>Specifikationer</summary>
            <div className={styles.detailBody}>
              {Object.keys(template.specifications).length > 0 ? (
                <SpecificationsTable specs={template.specifications} />
              ) : (
                <p>
                  Kontakt os, hvis du har spørgsmål til modellens
                  specifikationer.
                </p>
              )}
            </div>
          </details>
          <details>
            <summary>Garanti, levering og retur</summary>
            <div className={styles.detailBody}>
              <p>
                Din {template.display_name} er dækket af 36 måneders garanti.
                Standen beskriver kosmetiske brugsspor. En eventuel
                batterimåling gælder den konkrete enhed, du vælger.
              </p>
              <p className="mt-3">
                Du har 14 dages returret. Se vilkår for garanti, levering og
                returnering før dit køb.
              </p>
              <Link href="/handelsbetingelser" className={styles.textLink}>
                Læs handelsbetingelser &rarr;
              </Link>
              {inStock && (
                <div className="mt-3">
                  <PickupLine
                    stockByStore={
                      bestMatch?.source === "foxway" ? [] : stockByStore
                    }
                  />
                </div>
              )}
              <div className="mt-5">
                <InsuranceLead source="product" variant="cart" />
              </div>
            </div>
          </details>
        </div>
        <aside className={styles.service}>
          <p className="text-xs text-white/70">Køb, reparation og salg</p>
          <h2>Hjælp til din næste enhed.</h2>
          <p className="mt-3 text-sm leading-6 text-white/80">
            Vi hjælper med at vælge i Vejle og Slagelse. Du kan også få hjælp
            til den enhed, du allerede har.
          </p>
          <TradeInTeaser category={template.category} inverse />
          <Link href="/reparation" className={styles.serviceLink}>
            Se reparationer <span aria-hidden="true">→</span>
          </Link>
          <Link href="/kontakt" className={styles.serviceLink}>
            Kontakt os <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>

      {accessories.length > 0 && (
        <section className={styles.related}>
          <div className={styles.sectionHeading}>
            <h2>Kompatibelt tilbehør</h2>
            <Link href="/tilbehoer" className={styles.textLink}>
              Se alt tilbehør &rarr;
            </Link>
          </div>
          <p className={styles.small}>Tilbehør har 2 års reklamationsret.</p>
          <div className={styles.accessories}>
            {accessories
              .filter((acc) => acc.slug)
              .slice(0, 4)
              .map((acc) => (
                <Link
                  key={acc.id}
                  href={`/tilbehoer/${ACCESSORY_CATEGORY_TO_SLUG[acc.subcategory ?? ""] ?? "covers"}/${acc.slug}`}
                  className={styles.accessory}
                >
                  <div className={styles.accessoryImage}>
                    {acc.images[0] ? (
                      <Image
                        src={acc.images[0]}
                        alt={acc.title}
                        fill
                        className="object-contain p-5"
                        sizes="(min-width: 1024px) 25vw, 60vw"
                      />
                    ) : (
                      <p>Billede kommer snart</p>
                    )}
                  </div>
                  <div className="p-4">
                    <p className={styles.small}>{acc.brand}</p>
                    <h3>{acc.title}</h3>
                    <p className="mt-3 font-semibold">
                      {formatDKK(acc.sale_price ?? acc.selling_price)}
                    </p>
                    <span className={styles.textLink}>
                      Se tilbehøret &rarr;
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
