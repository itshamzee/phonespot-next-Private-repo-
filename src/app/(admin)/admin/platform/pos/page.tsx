"use client";

import { useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatOere } from "@/lib/cart/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CartDevice = {
  type: "device";
  deviceId: string;
  name: string;
  grade: string;
  storage: string | null;
  price: number;
  barcode: string;
};

type CartSku = {
  type: "sku_product";
  skuProductId: string;
  name: string;
  price: number;
  quantity: number;
};

type CartItem = CartDevice | CartSku;

type SearchResult = {
  devices: Array<{
    id: string;
    barcode: string;
    imei: string | null;
    grade: string;
    storage: string | null;
    color: string | null;
    selling_price: number;
    vat_scheme: string;
    product_templates: { display_name: string; brand: string; model: string } | null;
  }>;
  skuProducts: Array<{
    id: string;
    title: string;
    ean: string | null;
    selling_price: number;
    sale_price: number | null;
    category: string | null;
  }>;
};

const PAYMENT_METHODS = [
  {
    id: "card" as const,
    label: "Kort",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
  },
  {
    id: "cash" as const,
    label: "Kontant",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75" />
      </svg>
    ),
  },
  {
    id: "mobilepay" as const,
    label: "MobilePay",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PosPage() {
  const supabase = createBrowserClient();

  // Location
  const [locationId, setLocationId] = useState<string>("");
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "mobilepay">("card");
  const [processing, setProcessing] = useState(false);
  const [lastSale, setLastSale] = useState<{
    orderNumber: string;
    total: number;
    receiptPdf: string;
  } | null>(null);

  // Customer lookup
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);

  // Load locations
  useEffect(() => {
    async function loadLocations() {
      const { data } = await supabase
        .from("locations")
        .select("id, name")
        .in("type", ["store"]);
      if (data && data.length > 0) {
        setLocations(data);
        setLocationId(data[0].id);
      }
    }
    loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-focus scan input
  useEffect(() => {
    scanInputRef.current?.focus();
  }, [cart]);

  // Search handler with debounce
  function handleSearchChange(value: string) {
    setQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.length < 2) {
      setResults(null);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `/api/pos/lookup?q=${encodeURIComponent(value)}&location_id=${locationId}`,
          { headers: { Authorization: `Bearer ${session?.access_token}` } }
        );
        if (res.ok) {
          setResults(await res.json());
        }
      } catch {
        // Ignore search errors
      }
      setSearching(false);
    }, 300);
  }

  // Handle barcode scan (Enter key in scan field)
  async function handleScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || !query.trim()) return;
    e.preventDefault();

    setSearching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `/api/pos/lookup?q=${encodeURIComponent(query.trim())}&location_id=${locationId}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      if (res.ok) {
        const data: SearchResult = await res.json();
        if (data.devices.length === 1 && data.skuProducts.length === 0) {
          addDevice(data.devices[0]);
          setQuery("");
          setResults(null);
        } else if (data.skuProducts.length === 1 && data.devices.length === 0) {
          addSku(data.skuProducts[0]);
          setQuery("");
          setResults(null);
        } else {
          setResults(data);
        }
      }
    } catch {
      // Ignore
    }
    setSearching(false);
  }

  function addDevice(dev: SearchResult["devices"][0]) {
    if (cart.some((c) => c.type === "device" && c.deviceId === dev.id)) return;
    setCart((prev) => [
      ...prev,
      {
        type: "device",
        deviceId: dev.id,
        name: dev.product_templates?.display_name ?? "Enhed",
        grade: dev.grade,
        storage: dev.storage,
        price: dev.selling_price || 0,
        barcode: dev.barcode,
      },
    ]);
    setQuery("");
    setResults(null);
  }

  function addSku(sku: SearchResult["skuProducts"][0]) {
    const effectivePrice = sku.sale_price && sku.sale_price < sku.selling_price
      ? sku.sale_price
      : sku.selling_price;

    setCart((prev) => {
      const existing = prev.find(
        (c) => c.type === "sku_product" && c.skuProductId === sku.id
      ) as CartSku | undefined;
      if (existing) {
        return prev.map((c) =>
          c.type === "sku_product" && (c as CartSku).skuProductId === sku.id
            ? { ...c, quantity: (c as CartSku).quantity + 1 }
            : c
        );
      }
      return [
        ...prev,
        {
          type: "sku_product",
          skuProductId: sku.id,
          name: sku.title,
          price: effectivePrice,
          quantity: 1,
        },
      ];
    });
    setQuery("");
    setResults(null);
  }

  function removeItem(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSkuQuantity(index: number, delta: number) {
    setCart((prev) =>
      prev.map((item, i) => {
        if (i !== index || item.type !== "sku_product") return item;
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      })
    );
  }

  const subtotal = cart.reduce((sum, item) => {
    if (item.type === "device") return sum + item.price;
    return sum + item.price * item.quantity;
  }, 0);

  const itemCount = cart.reduce((sum, item) => {
    if (item.type === "sku_product") return sum + item.quantity;
    return sum + 1;
  }, 0);

  async function lookupCustomer() {
    if (!customerSearch.trim()) return;
    const { data } = await supabase
      .from("customers")
      .select("id, name, email, phone")
      .or(`email.eq.${customerSearch},phone.eq.${customerSearch}`)
      .limit(1)
      .single();

    if (data) {
      setCustomerId(data.id);
      setCustomerName(data.name);
    } else {
      setCustomerId(null);
      setCustomerName(null);
    }
  }

  async function completeSale() {
    if (cart.length === 0 || !locationId) return;

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const items = cart.map((item) => {
        if (item.type === "device") {
          return { type: "device" as const, deviceId: item.deviceId };
        }
        return {
          type: "sku_product" as const,
          skuProductId: item.skuProductId,
          quantity: item.quantity,
        };
      });

      const res = await fetch("/api/pos/sale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          items,
          paymentMethod,
          locationId,
          customerId: customerId ?? undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Salg fejlede");
      }

      const result = await res.json();
      setLastSale({
        orderNumber: result.orderNumber,
        total: result.total,
        receiptPdf: result.receiptPdf,
      });
      setCart([]);
      setCustomerId(null);
      setCustomerName(null);
      setCustomerSearch("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fejl ved salg");
    }
    setProcessing(false);
  }

  function printReceipt() {
    if (!lastSale?.receiptPdf) return;
    const byteChars = atob(lastSale.receiptPdf);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      bytes[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      win.addEventListener("load", () => {
        win.print();
      });
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal sm:text-3xl">Kasseapparat</h1>
          <p className="mt-0.5 text-sm text-charcoal/35">Scan, s\u00f8g og gennemf\u00f8r salg</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Location selector */}
          <div className="flex items-center gap-2 rounded-xl border border-black/[0.04] bg-white px-3 py-2 shadow-sm">
            <svg className="h-4 w-4 text-charcoal/30" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="border-none bg-transparent text-sm font-medium text-charcoal outline-none"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cashup link */}
          <a
            href={`/admin/platform/pos/cashup?location_id=${locationId}`}
            className="flex items-center gap-2 rounded-xl border border-black/[0.04] bg-white px-4 py-2 text-sm font-medium text-charcoal shadow-sm transition-all hover:shadow-md"
          >
            <svg className="h-4 w-4 text-charcoal/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            Dagsoversigt
          </a>
        </div>
      </div>

      {/* Success banner */}
      {lastSale && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-r from-emerald-50 to-emerald-50/50 shadow-sm">
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 shadow-md shadow-emerald-500/20">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <p className="font-display text-lg font-bold text-emerald-900">
                  Salg gennemf\u00f8rt!
                </p>
                <p className="text-sm text-emerald-700/60">
                  Ordre {lastSale.orderNumber} &middot; {formatOere(lastSale.total)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={printReceipt}
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-all hover:shadow-md"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                </svg>
                Print
              </button>
              <button
                onClick={() => setLastSale(null)}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/15 transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
              >
                Nyt salg
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ── Left: scan + cart ───────────────────────── */}
        <div className="space-y-4 lg:col-span-3">
          {/* Scan / Search */}
          <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
            <div className="p-5">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  {searching ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-emerald-500" />
                  ) : (
                    <svg className="h-5 w-5 text-charcoal/25" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                    </svg>
                  )}
                </div>
                <input
                  ref={scanInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleScan}
                  placeholder="Scan stregkode, IMEI, EAN eller s\u00f8g..."
                  className="w-full rounded-xl border border-black/[0.06] bg-[#f4f3f0] py-4 pl-12 pr-4 font-mono text-base text-charcoal placeholder:text-charcoal/25 transition-all focus:border-emerald-500/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  autoComplete="off"
                />
              </div>

              {/* Search results dropdown */}
              {results && (results.devices.length > 0 || results.skuProducts.length > 0) && (
                <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-black/[0.04] bg-white shadow-lg">
                  {results.devices.map((dev) => (
                    <button
                      key={dev.id}
                      onClick={() => addDevice(dev)}
                      className="flex w-full items-center justify-between border-b border-black/[0.03] px-4 py-3.5 text-left transition-colors hover:bg-emerald-50/50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-charcoal">
                            {dev.product_templates?.display_name ?? "Enhed"}
                            <span className="ml-2 inline-block rounded-md bg-charcoal/[0.06] px-1.5 py-0.5 text-[10px] font-bold uppercase text-charcoal/50">
                              {dev.grade}
                            </span>
                          </p>
                          <p className="text-xs text-charcoal/35">
                            {[dev.storage, dev.color].filter(Boolean).join(" \u00b7 ")} \u00b7 {dev.barcode}
                          </p>
                        </div>
                      </div>
                      <span className="font-display text-sm font-bold text-charcoal">
                        {formatOere(dev.selling_price || 0)}
                      </span>
                    </button>
                  ))}
                  {results.skuProducts.map((sku) => {
                    const price = sku.sale_price && sku.sale_price < sku.selling_price
                      ? sku.sale_price
                      : sku.selling_price;
                    return (
                      <button
                        key={sku.id}
                        onClick={() => addSku(sku)}
                        className="flex w-full items-center justify-between border-b border-black/[0.03] px-4 py-3.5 text-left transition-colors hover:bg-emerald-50/50 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-charcoal">{sku.title}</p>
                            <p className="text-xs text-charcoal/35">{sku.category ?? "Tilbeh\u00f8r"}</p>
                          </div>
                        </div>
                        <span className="font-display text-sm font-bold text-charcoal">
                          {formatOere(price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cart */}
          <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-[15px] font-bold text-charcoal">Kurv</h2>
                {cart.length > 0 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">
                    {itemCount}
                  </span>
                )}
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs font-medium text-charcoal/30 transition-colors hover:text-red-500"
                >
                  Ryd kurv
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-charcoal/[0.03]">
                  <svg className="h-6 w-6 text-charcoal/15" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-charcoal/25">Scan eller s\u00f8g for at tilf\u00f8je varer</p>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.03]">
                {cart.map((item, idx) => (
                  <div
                    key={`${item.type}-${item.type === "device" ? item.deviceId : item.skuProductId}-${idx}`}
                    className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-black/[0.01]"
                  >
                    {/* Icon */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      item.type === "device" ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500"
                    }`}>
                      {item.type === "device" ? (
                        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
                        </svg>
                      ) : (
                        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                        </svg>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-charcoal">
                        {item.name}
                        {item.type === "device" && (
                          <span className="ml-2 inline-block rounded-md bg-charcoal/[0.06] px-1.5 py-0.5 text-[10px] font-bold uppercase text-charcoal/50">
                            {item.grade}
                          </span>
                        )}
                      </p>
                      {item.type === "device" && item.storage && (
                        <p className="text-xs text-charcoal/35">{item.storage}</p>
                      )}
                    </div>

                    {/* Quantity controls for SKU */}
                    {item.type === "sku_product" && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateSkuQuantity(idx, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.06] text-charcoal/40 transition-colors hover:bg-black/[0.02] hover:text-charcoal active:scale-95"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                          </svg>
                        </button>
                        <span className="flex h-8 w-10 items-center justify-center text-sm font-bold text-charcoal">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateSkuQuantity(idx, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.06] text-charcoal/40 transition-colors hover:bg-black/[0.02] hover:text-charcoal active:scale-95"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Price + remove */}
                    <div className="flex items-center gap-3">
                      <span className="font-display text-sm font-bold text-charcoal">
                        {formatOere(
                          item.type === "device"
                            ? item.price
                            : item.price * item.quantity
                        )}
                      </span>
                      <button
                        onClick={() => removeItem(idx)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-charcoal/20 transition-all hover:bg-red-50 hover:text-red-500 active:scale-90"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: payment panel ──────────────────── */}
        <div className="space-y-4 lg:col-span-2">
          {/* Customer */}
          <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
            <div className="px-5 py-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal/25">
                Kunde (valgfrit)
              </p>
              {customerName ? (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-bold text-emerald-600">
                      {customerName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-emerald-800">{customerName}</span>
                  </div>
                  <button
                    onClick={() => {
                      setCustomerId(null);
                      setCustomerName(null);
                      setCustomerSearch("");
                    }}
                    className="text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-800"
                  >
                    Fjern
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && lookupCustomer()}
                    placeholder="Email eller telefon"
                    className="min-w-0 flex-1 rounded-xl border border-black/[0.06] bg-[#f4f3f0] px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal/25 transition-all focus:border-emerald-500/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                  />
                  <button
                    onClick={lookupCustomer}
                    className="rounded-xl border border-black/[0.06] px-4 py-2.5 text-sm font-semibold text-charcoal/50 transition-all hover:bg-black/[0.02] hover:text-charcoal"
                  >
                    S\u00f8g
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Payment method */}
          <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
            <div className="px-5 py-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal/25">
                Betalingsmetode
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3.5 text-center transition-all duration-150 active:scale-[0.97] ${
                      paymentMethod === method.id
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-500/10"
                        : "border-transparent bg-[#f4f3f0] text-charcoal/40 hover:bg-charcoal/[0.04] hover:text-charcoal/60"
                    }`}
                  >
                    <span className={paymentMethod === method.id ? "text-emerald-500" : ""}>
                      {method.icon}
                    </span>
                    <span className="text-xs font-bold">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Total + Complete sale */}
          <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
            <div className="p-5">
              {/* Subtotal line */}
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-charcoal/40">
                  Subtotal ({itemCount} {itemCount === 1 ? "vare" : "varer"})
                </span>
                <span className="text-sm font-medium text-charcoal/60">
                  {formatOere(subtotal)}
                </span>
              </div>

              {/* Divider */}
              <div className="mb-4 h-px bg-black/[0.04]" />

              {/* Total */}
              <div className="mb-5 flex items-baseline justify-between">
                <span className="font-display text-lg font-bold text-charcoal">Total</span>
                <span className="font-display text-3xl font-bold tracking-tight text-charcoal">
                  {formatOere(subtotal)}
                </span>
              </div>

              <p className="mb-5 text-[11px] text-charcoal/25">inkl. moms</p>

              {/* Complete button */}
              <button
                onClick={completeSale}
                disabled={cart.length === 0 || processing}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-4.5 text-center font-display text-lg font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-transparent border-t-white" />
                    Behandler...
                  </span>
                ) : (
                  "Gennemf\u00f8r salg"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
