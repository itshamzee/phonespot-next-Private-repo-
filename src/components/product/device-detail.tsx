"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProductTemplate, Device, SkuProduct } from "@/lib/supabase/platform-types";
import { GradeSelector } from "./grade-selector";
import { StorageSelector } from "./storage-selector";
import { ColorSelectorPlatform } from "./color-selector-platform";
import { SpecificationsTable } from "./specifications-table";

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

type Tab = "beskrivelse" | "specifikationer";

export function DeviceDetail({ template, devices, accessories }: DeviceDetailProps) {
  // Derive available options from listed devices
  const listedDevices = devices.filter((d) => d.status === "listed");

  const availableGrades = (["A", "B", "C"] as const)
    .map((grade) => {
      const matching = listedDevices.filter((d) => d.grade === grade);
      const prices = matching
        .map((d) => d.selling_price)
        .filter((p): p is number => p != null);
      return {
        grade,
        price: prices.length > 0 ? Math.min(...prices) : null,
        available: matching.length,
      };
    })
    .filter((g) => {
      // Only show grades that have devices OR have a base price in template
      const templatePrice =
        g.grade === "A"
          ? template.base_price_a
          : g.grade === "B"
          ? template.base_price_b
          : template.base_price_c;
      return g.available > 0 || templatePrice != null;
    });

  const [selectedGrade, setSelectedGrade] = useState<string>(
    availableGrades.find((g) => g.available > 0)?.grade ?? availableGrades[0]?.grade ?? "A"
  );
  const [selectedStorage, setSelectedStorage] = useState<string>(
    template.storage_options[0] ?? ""
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    template.colors[0] ?? ""
  );
  const [activeTab, setActiveTab] = useState<Tab>("beskrivelse");
  const [mainImageIndex, setMainImageIndex] = useState(0);

  // Compute price for selected configuration
  const matchingDevices = listedDevices.filter(
    (d) =>
      d.grade === selectedGrade &&
      (selectedStorage === "" || d.storage === selectedStorage) &&
      (selectedColor === "" || d.color === selectedColor)
  );
  const price =
    matchingDevices.length > 0
      ? Math.min(...matchingDevices.map((d) => d.selling_price ?? 0))
      : selectedGrade === "A"
      ? template.base_price_a
      : selectedGrade === "B"
      ? template.base_price_b
      : template.base_price_c;

  const images = template.images.length > 0 ? template.images : [];
  const mainImage = images[mainImageIndex] ?? null;

  return (
    <div>
      {/* Top section: image + selectors */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Image gallery */}
        <div className="flex gap-3">
          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex flex-col gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setMainImageIndex(i)}
                  className={`relative h-16 w-16 overflow-hidden rounded-xl border-2 transition-all ${
                    i === mainImageIndex
                      ? "border-green-eco"
                      : "border-sand hover:border-charcoal/30"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${template.display_name} billede ${i + 1}`}
                    fill
                    className="object-contain p-1"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Main image */}
          <div className="relative flex-1 overflow-hidden rounded-2xl bg-cream aspect-square">
            {mainImage ? (
              <Image
                src={mainImage}
                alt={template.display_name}
                fill
                className="object-contain p-8"
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <svg
                  viewBox="0 0 64 64"
                  className="h-20 w-20 text-sand"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="16" y="8" width="32" height="48" rx="4" />
                  <circle cx="32" cy="52" r="2" />
                  <line x1="26" y1="14" x2="38" y2="14" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Product info + selectors */}
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-gray">
              {template.brand} · {template.category}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-charcoal">
              {template.display_name}
            </h1>

            {/* Rating placeholder */}
            <div className="mt-2 flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg
                  key={s}
                  viewBox="0 0 20 20"
                  className="h-4 w-4 fill-amber-400"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-xs text-charcoal/50">Bedømmelse kommer snart</span>
            </div>
          </div>

          {/* Grade selector */}
          {availableGrades.length > 0 && (
            <GradeSelector
              grades={availableGrades}
              selected={selectedGrade}
              onChange={setSelectedGrade}
            />
          )}

          {/* Storage selector */}
          {template.storage_options.length > 0 && (
            <StorageSelector
              options={template.storage_options}
              selected={selectedStorage}
              onChange={setSelectedStorage}
            />
          )}

          {/* Color selector */}
          {template.colors.length > 0 && (
            <ColorSelectorPlatform
              colors={template.colors}
              selected={selectedColor}
              onChange={setSelectedColor}
            />
          )}

          {/* Price + CTA */}
          <div className="rounded-2xl border border-sand bg-white p-5">
            <div className="flex items-end gap-2">
              <span className="font-display text-3xl font-bold text-charcoal">
                {price != null ? formatDKK(price) : "—"}
              </span>
              {price != null && (
                <span className="mb-0.5 text-sm text-charcoal/50">inkl. moms</span>
              )}
            </div>
            <p className="mt-1 text-xs text-charcoal/50">36 mdr. garanti · Fri fragt over 499 kr.</p>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-green-eco px-6 py-3.5 text-base font-bold text-white transition-colors hover:bg-green-eco/90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={price == null || matchingDevices.length === 0}
            >
              Læg i kurv
            </button>
          </div>
        </div>
      </div>

      {/* Below fold: tabs */}
      <div className="mt-12">
        <div className="flex border-b border-sand">
          {(["beskrivelse", "specifikationer"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-green-eco text-green-eco"
                  : "text-charcoal/50 hover:text-charcoal"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === "beskrivelse" && (
            <div className="prose prose-sm max-w-none text-charcoal/80">
              {template.description ? (
                <p className="whitespace-pre-line">{template.description}</p>
              ) : (
                <p className="text-charcoal/40">Ingen beskrivelse tilgængelig.</p>
              )}
            </div>
          )}
          {activeTab === "specifikationer" && (
            <SpecificationsTable specs={template.specifications} />
          )}
        </div>
      </div>

      {/* Compatible accessories */}
      {accessories.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 font-display text-xl font-bold text-charcoal">
            Kompatibelt tilbehør
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {accessories.map((acc) => (
              <a
                key={acc.id}
                href={acc.slug ? `/tilbehoer/${acc.slug}` : "#"}
                className="group flex flex-col overflow-hidden rounded-xl border border-sand bg-white transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-square overflow-hidden bg-cream">
                  {acc.images[0] ? (
                    <Image
                      src={acc.images[0]}
                      alt={acc.title}
                      fill
                      className="object-contain p-4 transition-transform group-hover:scale-105"
                      sizes="(min-width: 768px) 25vw, 50vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sand">
                      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray">{acc.brand}</p>
                  <p className="text-sm font-semibold text-charcoal line-clamp-2">
                    {acc.title}
                  </p>
                  <p className="mt-1 text-sm font-bold text-green-eco">
                    {formatDKK(acc.selling_price)}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
