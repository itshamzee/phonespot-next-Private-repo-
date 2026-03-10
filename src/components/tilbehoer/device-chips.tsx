"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { TilbehoerDevice, DeviceBrand } from "@/lib/tilbehoer-config";
import { DEVICE_BRANDS } from "@/lib/tilbehoer-config";

interface DeviceChipsProps {
  category: string;
  devices: TilbehoerDevice[];
  activeDevice?: string;
}

export function DeviceChips({ category, devices, activeDevice }: DeviceChipsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeBrand, setActiveBrand] = useState<DeviceBrand>("apple");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  if (devices.length === 0) return null;

  // Find current device label
  const currentDevice = devices.find((d) => d.slug === activeDevice);

  // Get brands that have devices
  const availableBrands = DEVICE_BRANDS.filter((b) =>
    devices.some((d) => d.brand === b.slug),
  );

  // Devices for the active brand tab
  const brandDevices = devices.filter((d) => d.brand === activeBrand);

  return (
    <div className="relative mb-6" ref={panelRef}>
      {/* Trigger row */}
      <div className="flex items-center gap-2">
        <Link
          href={`/tilbehoer/${category}`}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            !activeDevice
              ? "bg-charcoal text-white"
              : "bg-cream text-charcoal hover:bg-sand"
          }`}
        >
          Alle modeller
        </Link>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
            activeDevice
              ? "border-green-eco bg-green-eco/5 text-green-eco"
              : "border-sand bg-white text-charcoal hover:border-charcoal/30"
          }`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
          {currentDevice ? currentDevice.label : "Vælg model"}
          {activeDevice && (
            <Link
              href={`/tilbehoer/${category}`}
              onClick={(e) => e.stopPropagation()}
              className="ml-1 rounded-full p-0.5 hover:bg-green-eco/20"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
              </svg>
            </Link>
          )}
        </button>
      </div>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute left-0 top-full z-40 mt-2 w-full max-w-xl rounded-2xl border border-sand bg-white p-4 shadow-lg">
          {/* Brand tabs */}
          <div className="mb-4 flex gap-1 overflow-x-auto overscroll-x-contain rounded-lg bg-cream p-1">
            {availableBrands.map((brand) => (
              <button
                key={brand.slug}
                onClick={() => setActiveBrand(brand.slug)}
                className={`shrink-0 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  activeBrand === brand.slug
                    ? "bg-white text-charcoal shadow-sm"
                    : "text-charcoal/60 hover:text-charcoal"
                }`}
              >
                {brand.label}
              </button>
            ))}
          </div>

          {/* Device grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {brandDevices.map((device) => (
              <Link
                key={device.slug}
                href={`/tilbehoer/${category}/${device.slug}`}
                onClick={() => setIsOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  activeDevice === device.slug
                    ? "bg-green-eco text-white"
                    : "bg-cream/60 text-charcoal hover:bg-green-eco/10 hover:text-green-eco"
                }`}
              >
                {device.label}
              </Link>
            ))}
          </div>

          {brandDevices.length === 0 && (
            <p className="py-4 text-center text-sm text-gray">
              Ingen modeller tilgængelige for dette mærke.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
