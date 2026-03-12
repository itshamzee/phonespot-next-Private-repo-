"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface StockItem {
  id: string;
  quantity: number;
  min_level: number | null;
  product?: {
    id: string;
    title: string;
  };
}

export function LowStockBanner() {
  const [count, setCount] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function fetchLowStock() {
      try {
        const res = await fetch("/api/platform/sku-stock?low_stock=true");
        if (res.ok) {
          const data: StockItem[] = await res.json();
          setCount(data.length);
        }
      } catch {
        // silently fail — banner stays hidden
      } finally {
        setLoaded(true);
      }
    }
    fetchLowStock();
  }, []);

  // Hide until loaded or if no low-stock items
  if (!loaded || count === 0) return null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Warning icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
          <svg
            className="h-4 w-4 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        {/* Text */}
        <div>
          <p className="text-sm font-semibold text-amber-800">
            {count === 1
              ? "1 produkt har lavt lager"
              : `${count} produkter har lavt lager`}
          </p>
          <p className="text-xs text-amber-600">
            Beholdningen er under minimumsniveauet — genbestil snarest.
          </p>
        </div>
      </div>

      {/* Link to SKU page */}
      <Link
        href="/admin/platform/sku"
        className="shrink-0 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-200"
      >
        Se lagerstatus &rarr;
      </Link>
    </div>
  );
}
