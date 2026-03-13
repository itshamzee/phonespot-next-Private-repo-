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
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
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
        // Auto-add if exact match (single device by barcode)
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
    // Don't add duplicates
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

  // Cart totals
  const subtotal = cart.reduce((sum, item) => {
    if (item.type === "device") return sum + item.price;
    return sum + item.price * item.quantity;
  }, 0);

  // Customer lookup
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

  // Complete sale
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

  // Print receipt
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
        <h1 className="text-2xl font-bold text-stone-800">Kasseapparat (POS)</h1>
        <div className="flex items-center gap-3">
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Success banner */}
      {lastSale && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-green-800">
                Salg gennemfort! Ordre {lastSale.orderNumber}
              </p>
              <p className="text-sm text-green-600">
                Total: {formatOere(lastSale.total)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={printReceipt}
                className="rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50"
              >
                Print kvittering
              </button>
              <button
                onClick={() => setLastSale(null)}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Nyt salg
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ── Left: scan + search ─────────────────────────────── */}
        <div className="space-y-4 lg:col-span-3">
          {/* Scan / Search input */}
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <label className="mb-2 block text-sm font-semibold text-stone-500">
              Scan stregkode / sog produkt
            </label>
            <input
              ref={scanInputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleScan}
              placeholder="Scan stregkode, IMEI, EAN eller sog..."
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-lg font-mono focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              autoComplete="off"
            />

            {/* Search results dropdown */}
            {results && (results.devices.length > 0 || results.skuProducts.length > 0) && (
              <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-stone-200 bg-white">
                {results.devices.map((dev) => (
                  <button
                    key={dev.id}
                    onClick={() => addDevice(dev)}
                    className="flex w-full items-center justify-between border-b border-stone-100 px-4 py-3 text-left hover:bg-stone-50 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-stone-800">
                        {dev.product_templates?.display_name ?? "Enhed"}
                        <span className="ml-2 inline-block rounded bg-stone-100 px-1.5 py-0.5 text-xs font-bold">
                          {dev.grade}
                        </span>
                      </p>
                      <p className="text-xs text-stone-500">
                        {[dev.storage, dev.color].filter(Boolean).join(" · ")} · {dev.barcode}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-stone-800">
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
                      className="flex w-full items-center justify-between border-b border-stone-100 px-4 py-3 text-left hover:bg-stone-50 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-stone-800">{sku.title}</p>
                        <p className="text-xs text-stone-500">{sku.category ?? "Tilbehor"}</p>
                      </div>
                      <span className="text-sm font-bold text-stone-800">
                        {formatOere(price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {searching && (
              <p className="mt-2 text-sm text-stone-400">Soger...</p>
            )}
          </div>

          {/* Cart items */}
          <div className="rounded-xl border border-stone-200 bg-white">
            <div className="border-b border-stone-100 px-5 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">
                Kurv ({cart.length} {cart.length === 1 ? "vare" : "varer"})
              </h2>
            </div>

            {cart.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-stone-400">Scan eller sog for at tilfoje varer</p>
              </div>
            ) : (
              <div>
                {cart.map((item, idx) => (
                  <div
                    key={`${item.type}-${item.type === "device" ? item.deviceId : item.skuProductId}-${idx}`}
                    className="flex items-center justify-between border-b border-stone-100 px-5 py-3 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-800">
                        {item.name}
                        {item.type === "device" && (
                          <span className="ml-2 inline-block rounded bg-stone-100 px-1.5 py-0.5 text-xs font-bold">
                            {item.grade}
                          </span>
                        )}
                      </p>
                      {item.type === "device" && item.storage && (
                        <p className="text-xs text-stone-500">{item.storage}</p>
                      )}
                    </div>

                    {item.type === "sku_product" && (
                      <div className="flex items-center gap-2 mr-4">
                        <button
                          onClick={() => updateSkuQuantity(idx, -1)}
                          className="rounded border border-stone-200 px-2 py-0.5 text-sm hover:bg-stone-50"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateSkuQuantity(idx, 1)}
                          className="rounded border border-stone-200 px-2 py-0.5 text-sm hover:bg-stone-50"
                        >
                          +
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-stone-800">
                        {formatOere(
                          item.type === "device"
                            ? item.price
                            : item.price * item.quantity
                        )}
                      </span>
                      <button
                        onClick={() => removeItem(idx)}
                        className="rounded-lg p-1 text-stone-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: payment + customer ────────────────────── */}
        <div className="space-y-4 lg:col-span-2">
          {/* Customer lookup */}
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <label className="mb-2 block text-sm font-semibold text-stone-500">
              Kunde (valgfrit)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookupCustomer()}
                placeholder="Email eller telefon"
                className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              />
              <button
                onClick={lookupCustomer}
                className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
              >
                Sog
              </button>
            </div>
            {customerName && (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-green-50 px-3 py-2">
                <span className="text-sm font-medium text-green-800">{customerName}</span>
                <button
                  onClick={() => {
                    setCustomerId(null);
                    setCustomerName(null);
                    setCustomerSearch("");
                  }}
                  className="text-xs text-green-600 hover:text-green-800"
                >
                  Fjern
                </button>
              </div>
            )}
          </div>

          {/* Payment method */}
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <label className="mb-3 block text-sm font-semibold text-stone-500">
              Betalingsmetode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["card", "cash", "mobilepay"] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`rounded-lg border-2 px-3 py-3 text-center text-sm font-medium transition-colors ${
                    paymentMethod === method
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-stone-200 text-stone-600 hover:border-stone-300"
                  }`}
                >
                  {method === "card" && "Kort"}
                  {method === "cash" && "Kontant"}
                  {method === "mobilepay" && "MobilePay"}
                </button>
              ))}
            </div>
          </div>

          {/* Total + Complete */}
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
              <span className="text-lg font-bold text-stone-800">Total</span>
              <span className="text-2xl font-bold text-stone-800">
                {formatOere(subtotal)}
              </span>
            </div>
            <p className="mb-4 text-xs text-stone-400">inkl. moms</p>

            <button
              onClick={completeSale}
              disabled={cart.length === 0 || processing}
              className="w-full rounded-xl bg-green-600 py-4 text-lg font-bold text-white shadow-lg shadow-green-600/20 transition-all hover:bg-green-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? "Behandler..." : "Gennemfor salg"}
            </button>
          </div>

          {/* Daily cash-up link */}
          <a
            href={`/admin/platform/pos/cashup?location_id=${locationId}`}
            className="block rounded-xl border border-stone-200 bg-white p-4 text-center text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            Se dagens omsaetning
          </a>
        </div>
      </div>
    </div>
  );
}
