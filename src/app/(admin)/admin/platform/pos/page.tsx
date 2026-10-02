"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatOere } from "@/lib/cart/utils";
import { posFetch, posJson, printBase64Pdf } from "@/lib/pos/client";
import {
  DISCOUNT_REASONS,
  STRIPE_TERMINAL_ENABLED,
  type DiscountReason,
} from "@/lib/pos/constants";
import { validatePayments } from "@/lib/pos/calc";
import { oereToInput, parseKr } from "@/lib/pos/money";
import type { RegisterInfo } from "@/lib/pos/sessions";
import {
  PaymentPanel,
  paymentLinesToInput,
  type PaymentLineState,
} from "./_components/payment-panel";
// Stripe Terminal is a disabled code path (NEXT_PUBLIC_POS_STRIPE_TERMINAL). In-store
// card payments are taken on the stand-alone terminal and recorded as "Kort (terminal)".
import {
  initTerminal,
  discoverReaders,
  discoverSimulatedReaders,
  connectReader,
  disconnectReader,
  collectPayment,
  cancelCollect,
  getConnectedReader,
} from "@/lib/stripe/terminal";
import type { Reader } from "@stripe/terminal-js";

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

type CartManual = {
  type: "free_text" | "deposit";
  key: string;
  name: string;
  price: number;
  quantity: number;
};

type CartItem = CartDevice | CartSku | CartManual;

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

type SaleResponse = {
  orderNumber: string;
  receiptNumber: string;
  total: number;
  receiptPdf: string | null;
  warnings: string[];
};

function lineTotal(item: CartItem): number {
  return item.type === "device" ? item.price : item.price * item.quantity;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PosPage() {
  const supabase = createBrowserClient();

  // Location + register
  const [locationId, setLocationId] = useState<string>("");
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [registers, setRegisters] = useState<RegisterInfo[]>([]);
  const [registerId, setRegisterId] = useState<string>("");

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [manualMode, setManualMode] = useState<null | "free_text" | "deposit">(null);
  const [manualText, setManualText] = useState("");
  const [manualPrice, setManualPrice] = useState("");

  // Discount
  const [discountKr, setDiscountKr] = useState("");
  const [discountReason, setDiscountReason] = useState<DiscountReason | "">("");

  // Search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Payment
  const [paymentLines, setPaymentLines] = useState<PaymentLineState[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const [lastSale, setLastSale] = useState<SaleResponse | null>(null);

  // Stripe Terminal (disabled unless the flag is on)
  const [terminalStatus, setTerminalStatus] = useState<"disconnected" | "connecting" | "connected" | "collecting">("disconnected");
  const [terminalReaders, setTerminalReaders] = useState<Reader[]>([]);
  const [showReaderPicker, setShowReaderPicker] = useState(false);

  // Customer lookup
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);

  const register = registers.find((r) => r.id === registerId) ?? null;
  const openSession = register?.openSession ?? null;

  // Load locations
  useEffect(() => {
    async function loadLocations() {
      const { data } = await supabase.from("locations").select("id, name").in("type", ["store"]);
      if (data && data.length > 0) {
        setLocations(data);
        setLocationId(data[0].id);
      }
    }
    loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRegisters = useCallback(async () => {
    if (!locationId) return;
    try {
      const data = await posJson<{ registers: RegisterInfo[] }>(`/api/pos/session?location_id=${locationId}`);
      setRegisters(data.registers);
      setRegisterId((cur) => (data.registers.some((r) => r.id === cur) ? cur : (data.registers[0]?.id ?? "")));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente kasser");
    }
  }, [locationId]);

  useEffect(() => {
    void loadRegisters();
  }, [loadRegisters]);

  useEffect(() => {
    scanInputRef.current?.focus();
  }, [cart]);

  /* ----- Search ----- */

  async function runLookup(value: string): Promise<SearchResult | null> {
    const res = await posFetch(`/api/pos/lookup?q=${encodeURIComponent(value)}&location_id=${locationId}`);
    return res.ok ? ((await res.json()) as SearchResult) : null;
  }

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
        setResults(await runLookup(value));
      } catch {
        // Ignore search errors
      }
      setSearching(false);
    }, 300);
  }

  async function handleScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || !query.trim()) return;
    e.preventDefault();
    setSearching(true);
    try {
      const data = await runLookup(query.trim());
      if (data) {
        if (data.devices.length === 1 && data.skuProducts.length === 0) {
          addDevice(data.devices[0]);
        } else if (data.skuProducts.length === 1 && data.devices.length === 0) {
          addSku(data.skuProducts[0]);
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
    if (!cart.some((c) => c.type === "device" && c.deviceId === dev.id)) {
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
    }
    setQuery("");
    setResults(null);
  }

  function addSku(sku: SearchResult["skuProducts"][0]) {
    const effectivePrice = sku.sale_price && sku.sale_price < sku.selling_price ? sku.sale_price : sku.selling_price;
    setCart((prev) => {
      const existing = prev.find((c) => c.type === "sku_product" && c.skuProductId === sku.id);
      if (existing) {
        return prev.map((c) =>
          c.type === "sku_product" && c.skuProductId === sku.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { type: "sku_product", skuProductId: sku.id, name: sku.title, price: effectivePrice, quantity: 1 }];
    });
    setQuery("");
    setResults(null);
  }

  function addManual() {
    const price = parseKr(manualPrice);
    const name = manualText.trim() || (manualMode === "deposit" ? "Depositum" : "");
    if (!manualMode || !price || price <= 0 || !name) return;
    setCart((prev) => [
      ...prev,
      { type: manualMode, key: crypto.randomUUID(), name, price, quantity: 1 },
    ]);
    setManualMode(null);
    setManualText("");
    setManualPrice("");
  }

  function removeItem(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuantity(index: number, delta: number) {
    setCart((prev) =>
      prev.map((item, i) => {
        if (i !== index || item.type === "device" || item.type === "deposit") return item;
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }),
    );
  }

  /* ----- Totals ----- */

  const subtotal = cart.reduce((sum, item) => sum + lineTotal(item), 0);
  const discountableBase = cart.reduce((sum, item) => (item.type === "deposit" ? sum : sum + lineTotal(item)), 0);
  const itemCount = cart.reduce((sum, item) => sum + (item.type === "device" || item.type === "deposit" ? 1 : item.quantity), 0);
  const discount = parseKr(discountKr) ?? 0;
  const discountInvalid = discount > discountableBase || (discount > 0 && !discountReason);
  const total = subtotal - Math.min(discount, discountableBase);

  // A single payment line follows the total until the cashier edits it.
  const effectiveLines = useMemo(
    () =>
      paymentLines.length === 1 && paymentLines[0].auto
        ? [{ ...paymentLines[0], amountKr: total > 0 ? oereToInput(total) : "" }]
        : paymentLines,
    [paymentLines, total],
  );
  const paymentInput = paymentLinesToInput(effectiveLines);
  const paymentCheck = validatePayments(paymentInput, total);
  const needsCustomer = paymentLines.some((l) => l.type === "faktura") && !customerId;

  const canComplete =
    cart.length > 0 &&
    !!register &&
    !!openSession &&
    !processing &&
    !discountInvalid &&
    paymentCheck.ok &&
    !needsCustomer;

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

  /* ----- Stripe Terminal (disabled path) ----- */

  async function handleConnectTerminal() {
    setTerminalStatus("connecting");
    try {
      await initTerminal();
      let readers = await discoverReaders();
      if (readers.length === 0) readers = await discoverSimulatedReaders();
      setTerminalReaders(readers);
      if (readers.length === 1) {
        await connectReader(readers[0]);
        setTerminalStatus("connected");
      } else if (readers.length > 1) {
        setShowReaderPicker(true);
        setTerminalStatus("disconnected");
      } else {
        setError("Ingen kortlæsere fundet.");
        setTerminalStatus("disconnected");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terminal-fejl");
      setTerminalStatus("disconnected");
    }
  }

  async function handleSelectReader(reader: Reader) {
    setTerminalStatus("connecting");
    setShowReaderPicker(false);
    try {
      await connectReader(reader);
      setTerminalStatus("connected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke forbinde til læser");
      setTerminalStatus("disconnected");
    }
  }

  /* ----- Complete sale ----- */

  async function completeSale() {
    if (!canComplete || !register) return;
    setProcessing(true);
    setError("");

    try {
      // Payment lines as entered. With the Stripe flag on and a reader connected, card
      // lines are collected on the reader first and the PaymentIntent id kept as reference.
      const payments = paymentInput.map((p) => ({ ...p }));
      if (STRIPE_TERMINAL_ENABLED && terminalStatus === "connected") {
        for (const p of payments) {
          if (p.type !== "kort_terminal") continue;
          setTerminalStatus("collecting");
          try {
            const result = await collectPayment(p.amountOere, crypto.randomUUID());
            p.reference = result.paymentIntentId;
          } finally {
            setTerminalStatus("connected");
          }
        }
      }

      const items = cart.map((item) => {
        if (item.type === "device") return { type: "device" as const, deviceId: item.deviceId };
        if (item.type === "sku_product") {
          return { type: "sku_product" as const, skuProductId: item.skuProductId, quantity: item.quantity };
        }
        if (item.type === "deposit") {
          return { type: "deposit" as const, description: item.name, unitPriceOere: item.price };
        }
        return { type: "free_text" as const, description: item.name, unitPriceOere: item.price, quantity: item.quantity };
      });

      const result = await posJson<SaleResponse>("/api/pos/sale", {
        method: "POST",
        body: JSON.stringify({
          items,
          payments,
          locationId,
          registerId: register.id,
          customerId: customerId ?? undefined,
          discountAmount: discount > 0 ? discount : undefined,
          discountReason: discount > 0 ? discountReason : undefined,
        }),
      });

      setLastSale(result);
      setCart([]);
      setPaymentLines([]);
      setDiscountKr("");
      setDiscountReason("");
      setCustomerId(null);
      setCustomerName(null);
      setCustomerSearch("");
      void loadRegisters();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fejl ved salg");
    }
    setProcessing(false);
  }

  /* ----- Render ----- */

  const sessionLink = (path: string) =>
    `/admin/platform/pos/${path}?location_id=${locationId}${registerId ? `&register_id=${registerId}` : ""}`;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal sm:text-3xl">Kasseapparat</h1>
          <p className="mt-0.5 text-sm text-charcoal/35">Scan, søg og gennemfør salg</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="rounded-xl border border-black/[0.04] bg-white px-3 py-2 text-sm font-medium text-charcoal shadow-sm outline-none"
            aria-label="Lokation"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          <select
            value={registerId}
            onChange={(e) => setRegisterId(e.target.value)}
            className="rounded-xl border border-black/[0.04] bg-white px-3 py-2 text-sm font-medium text-charcoal shadow-sm outline-none"
            aria-label="Kasse"
          >
            {registers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <Link href={sessionLink("session")} className="rounded-xl border border-black/[0.04] bg-white px-4 py-2 text-sm font-medium text-charcoal shadow-sm hover:shadow-md">
            Kassesession
          </Link>
          <Link href={sessionLink("retur")} className="rounded-xl border border-black/[0.04] bg-white px-4 py-2 text-sm font-medium text-charcoal shadow-sm hover:shadow-md">
            Returnering
          </Link>
          <Link href={sessionLink("cashup")} className="rounded-xl border border-black/[0.04] bg-white px-4 py-2 text-sm font-medium text-charcoal shadow-sm hover:shadow-md">
            Dagsopgørelse
          </Link>
        </div>
      </div>

      {/* Session status */}
      {register && !openSession && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium text-amber-900">
            {register.name} er lukket. Åbn kassen med startbeholdning, før du kan sælge.
          </p>
          <Link href={sessionLink("session")} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
            Åbn kassen
          </Link>
        </div>
      )}
      {register && openSession && (
        <p className="mb-4 text-xs text-charcoal/40">
          {register.name} er åben siden{" "}
          {new Date(openSession.openedAt).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" })}
          {" "}· startbeholdning {formatOere(openSession.openingFloat)}
        </p>
      )}

      {error && (
        <div role="alert" className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-xs font-semibold text-red-600">Luk</button>
        </div>
      )}

      {/* Success banner */}
      {lastSale && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-emerald-200/50 bg-emerald-50 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-display text-lg font-bold text-emerald-900">Salg gennemført</p>
              <p className="text-sm text-emerald-700/70">
                Bon {lastSale.receiptNumber} &middot; {formatOere(lastSale.total)}
              </p>
              {lastSale.warnings.map((w) => (
                <p key={w} className="mt-1 text-xs text-amber-700">{w}</p>
              ))}
            </div>
            <div className="flex gap-2">
              {lastSale.receiptPdf && (
                <button
                  onClick={() => printBase64Pdf(lastSale.receiptPdf!)}
                  className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:shadow-md"
                >
                  Print kvittering
                </button>
              )}
              <button
                onClick={() => setLastSale(null)}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:brightness-110"
              >
                Nyt salg
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: scan + cart */}
        <div className="space-y-4 lg:col-span-3">
          <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white p-5 shadow-sm">
            <input
              ref={scanInputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleScan}
              placeholder={searching ? "Søger..." : "Scan stregkode, IMEI, EAN eller søg..."}
              className="w-full rounded-xl border border-black/[0.06] bg-[#f4f3f0] px-4 py-4 font-mono text-base text-charcoal placeholder:text-charcoal/25 transition-all focus:border-emerald-500/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              autoComplete="off"
            />

            {results && (results.devices.length > 0 || results.skuProducts.length > 0) && (
              <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-black/[0.04] bg-white shadow-lg">
                {results.devices.map((dev) => (
                  <button
                    key={dev.id}
                    onClick={() => addDevice(dev)}
                    className="flex w-full items-center justify-between border-b border-black/[0.03] px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-emerald-50/50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-charcoal">
                        {dev.product_templates?.display_name ?? "Enhed"}
                        <span className="ml-2 inline-block rounded-md bg-charcoal/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-charcoal/50">
                          {dev.grade}
                        </span>
                      </p>
                      <p className="text-xs text-charcoal/35">
                        {[dev.storage, dev.color].filter(Boolean).join(" · ")} · {dev.barcode}
                      </p>
                    </div>
                    <span className="font-display text-sm font-bold text-charcoal">{formatOere(dev.selling_price || 0)}</span>
                  </button>
                ))}
                {results.skuProducts.map((sku) => {
                  const price = sku.sale_price && sku.sale_price < sku.selling_price ? sku.sale_price : sku.selling_price;
                  return (
                    <button
                      key={sku.id}
                      onClick={() => addSku(sku)}
                      className="flex w-full items-center justify-between border-b border-black/[0.03] px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-emerald-50/50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-charcoal">{sku.title}</p>
                        <p className="text-xs text-charcoal/35">{sku.category ?? "Tilbehør"}</p>
                      </div>
                      <span className="font-display text-sm font-bold text-charcoal">{formatOere(price)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setManualMode(manualMode === "free_text" ? null : "free_text")}
                className="rounded-xl border border-black/[0.06] px-4 py-2 text-sm font-semibold text-charcoal/60 hover:bg-black/[0.02] hover:text-charcoal"
              >
                Diverse salg
              </button>
              <button
                type="button"
                onClick={() => setManualMode(manualMode === "deposit" ? null : "deposit")}
                className="rounded-xl border border-black/[0.06] px-4 py-2 text-sm font-semibold text-charcoal/60 hover:bg-black/[0.02] hover:text-charcoal"
              >
                Depositum
              </button>
            </div>
            {manualMode && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-[#f4f3f0] p-3">
                <input
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder={manualMode === "deposit" ? "Depositum (valgfri tekst)" : "Tekst, fx Diverse salg"}
                  className="min-w-0 flex-1 rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-sm"
                  aria-label="Tekst"
                />
                <input
                  inputMode="decimal"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  placeholder="Beløb"
                  className="w-28 rounded-lg border border-black/[0.08] bg-white px-3 py-2 text-right text-sm"
                  aria-label="Beløb i kroner"
                />
                <button
                  type="button"
                  onClick={addManual}
                  className="rounded-lg bg-charcoal px-4 py-2 text-sm font-semibold text-white"
                >
                  Tilføj
                </button>
                <p className="w-full text-[11px] text-charcoal/40">Beløbet er inkl. 25 % moms.</p>
              </div>
            )}
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
                <button onClick={() => setCart([])} className="text-xs font-medium text-charcoal/30 hover:text-red-500">
                  Ryd kurv
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-sm font-medium text-charcoal/25">Scan eller søg for at tilføje varer</p>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.03]">
                {cart.map((item, idx) => (
                  <div
                    key={`${item.type}-${item.type === "device" ? item.deviceId : item.type === "sku_product" ? item.skuProductId : item.key}`}
                    className="flex items-center gap-4 px-6 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-charcoal">
                        {item.name}
                        {item.type === "device" && (
                          <span className="ml-2 inline-block rounded-md bg-charcoal/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-charcoal/50">
                            {item.grade}
                          </span>
                        )}
                        {item.type === "deposit" && (
                          <span className="ml-2 text-[11px] font-medium text-charcoal/35">Depositum</span>
                        )}
                      </p>
                      {item.type === "device" && item.storage && <p className="text-xs text-charcoal/35">{item.storage}</p>}
                    </div>

                    {(item.type === "sku_product" || item.type === "free_text") && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQuantity(idx, -1)} aria-label="Færre" className="h-8 w-8 rounded-lg border border-black/[0.06] text-charcoal/40 hover:text-charcoal">-</button>
                        <span className="flex h-8 w-10 items-center justify-center text-sm font-bold text-charcoal">{item.quantity}</span>
                        <button onClick={() => updateQuantity(idx, 1)} aria-label="Flere" className="h-8 w-8 rounded-lg border border-black/[0.06] text-charcoal/40 hover:text-charcoal">+</button>
                      </div>
                    )}

                    <span className="w-24 text-right font-display text-sm font-bold text-charcoal">{formatOere(lineTotal(item))}</span>
                    <button onClick={() => removeItem(idx)} aria-label="Fjern" className="rounded-lg px-2 py-1 text-xs text-charcoal/30 hover:bg-red-50 hover:text-red-500">
                      Fjern
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: customer, discount, payment, total */}
        <div className="space-y-4 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white px-5 py-4 shadow-sm">
            <p className="mb-3 text-[11px] font-bold tracking-[0.08em] text-charcoal/30">Kunde (valgfrit)</p>
            {customerName ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                <span className="text-sm font-semibold text-emerald-800">{customerName}</span>
                <button
                  onClick={() => {
                    setCustomerId(null);
                    setCustomerName(null);
                    setCustomerSearch("");
                  }}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-800"
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
                  className="min-w-0 flex-1 rounded-xl border border-black/[0.06] bg-[#f4f3f0] px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal/25 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                />
                <button onClick={lookupCustomer} className="rounded-xl border border-black/[0.06] px-4 py-2.5 text-sm font-semibold text-charcoal/50 hover:text-charcoal">
                  Søg
                </button>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white px-5 py-4 shadow-sm">
            <p className="mb-3 text-[11px] font-bold tracking-[0.08em] text-charcoal/30">Rabat</p>
            <div className="flex gap-2">
              <input
                inputMode="decimal"
                value={discountKr}
                onChange={(e) => setDiscountKr(e.target.value)}
                placeholder="Beløb i kr"
                className="w-28 rounded-xl border border-black/[0.06] bg-[#f4f3f0] px-3 py-2.5 text-right text-sm"
                aria-label="Rabat i kroner"
              />
              <select
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value as DiscountReason | "")}
                className="min-w-0 flex-1 rounded-xl border border-black/[0.06] bg-[#f4f3f0] px-3 py-2.5 text-sm"
                aria-label="Årsag til rabat"
              >
                <option value="">Vælg årsag</option>
                {DISCOUNT_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            {discount > 0 && !discountReason && <p className="mt-2 text-xs text-red-500">Vælg en årsag til rabatten.</p>}
            {discount > discountableBase && <p className="mt-2 text-xs text-red-500">Rabatten kan ikke overstige varernes værdi.</p>}
          </div>

          <PaymentPanel
            total={total}
            lines={effectiveLines}
            onChange={setPaymentLines}
            hasCustomer={!!customerId}
          />

          {STRIPE_TERMINAL_ENABLED && (
            <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white px-5 py-4 shadow-sm">
              <p className="mb-3 text-[11px] font-bold tracking-[0.08em] text-charcoal/30">Stripe-kortlæser (deaktiveret som standard)</p>
              {terminalStatus === "disconnected" && (
                <button onClick={handleConnectTerminal} className="w-full rounded-xl border-2 border-dashed border-emerald-300 py-3 text-sm font-semibold text-emerald-600">
                  Forbind kortlæser
                </button>
              )}
              {terminalStatus === "connecting" && <p className="text-sm text-charcoal/60">Søger efter kortlæsere...</p>}
              {terminalStatus === "connected" && (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <span>{getConnectedReader()?.label || "Kortlæser forbundet"}</span>
                  <button onClick={async () => { await disconnectReader(); setTerminalStatus("disconnected"); }} className="text-xs">Afbryd</button>
                </div>
              )}
              {terminalStatus === "collecting" && (
                <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  <span>Venter på kort...</span>
                  <button onClick={async () => { await cancelCollect(); setTerminalStatus("connected"); }} className="text-xs">Annuller</button>
                </div>
              )}
              {showReaderPicker && terminalReaders.map((reader) => (
                <button key={reader.id} onClick={() => handleSelectReader(reader)} className="mt-2 w-full rounded-lg border border-charcoal/10 px-4 py-2.5 text-left text-sm">
                  {reader.label || reader.id}
                </button>
              ))}
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
            <div className="p-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-charcoal/40">Subtotal ({itemCount} {itemCount === 1 ? "vare" : "varer"})</span>
                <span className="font-medium text-charcoal/60">{formatOere(subtotal)}</span>
              </div>
              {discount > 0 && !discountInvalid && (
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-charcoal/40">Rabat ({discountReason})</span>
                  <span className="font-medium text-charcoal/60">-{formatOere(discount)}</span>
                </div>
              )}
              <div className="my-4 h-px bg-black/[0.04]" />
              <div className="mb-1 flex items-baseline justify-between">
                <span className="font-display text-lg font-bold text-charcoal">Total</span>
                <span className="font-display text-3xl font-bold tracking-tight text-charcoal">{formatOere(total)}</span>
              </div>
              <p className="mb-5 text-[11px] text-charcoal/30">inkl. moms</p>

              {!paymentCheck.ok && cart.length > 0 && paymentLines.length > 0 && (
                <p className="mb-3 text-xs text-red-500">{paymentCheck.message}</p>
              )}
              {cart.length > 0 && paymentLines.length === 0 && (
                <p className="mb-3 text-xs text-charcoal/40">Vælg betalingstype for at gennemføre salget.</p>
              )}

              <button
                onClick={completeSale}
                disabled={!canComplete}
                className="w-full rounded-xl bg-emerald-600 py-4 text-center font-display text-lg font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {processing ? "Behandler..." : "Gennemfør salg"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
