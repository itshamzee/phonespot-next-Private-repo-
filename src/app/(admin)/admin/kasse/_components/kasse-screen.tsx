"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { useStoreScope } from "@/components/admin/shell/store-scope-context";
import { posFetch, posJson } from "@/lib/pos/client";
import { parseCaseReference } from "@/lib/pos/case-lookup";
import { oereToInput, parseKr } from "@/lib/pos/money";
import { isIntegratedTerminal, type DiscountReason, type PaymentTerminalKind, type PaymentType } from "@/lib/pos/constants";
import type { RegisterInfo } from "@/lib/pos/sessions";
import type { QuickTile, DeviceTile, TileCategory } from "@/lib/pos/quick-tiles";
import {
  cartTotals,
  caseBlockedReason,
  caseStockSummary,
  casePaymentLines,
  checkPayments,
  discountableBase,
  paymentsNeedCustomer,
  parseKasseParams,
  planAppliedDeposits,
  resolvePayments,
  terminalBodyExtras,
  toSaleItems,
  usesCardTerminal,
  type CartLine,
  type CaseContext,
  type PaymentChoice,
} from "@/lib/pos/kasse-logic";
import { CartPanel } from "./cart-panel";
import {
  CardDialog,
  CaseDialog,
  CustomerDialog,
  DepositDialog,
  DiscountDialog,
  DoneDialog,
  FreeTextDialog,
  SplitDialog,
  btnPrimary,
  fieldClass,
  type CustomerPick,
  type DoneSale,
} from "./dialogs";
import { clock, fmt, fmtKr } from "./format";
import { newPaymentLine, paymentLinesToInput } from "./payment-lines";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Loc = { id: string; name: string; slug: string | null };

type LookupDevice = {
  id: string;
  barcode: string | null;
  imei: string | null;
  grade: string | null;
  storage: string | null;
  color: string | null;
  selling_price: number;
  vat_scheme: string | null;
  product_templates: { display_name: string } | null;
};
type LookupSku = {
  id: string;
  title: string;
  ean: string | null;
  selling_price: number;
  sale_price: number | null;
  category: string | null;
};
type Lookup = { devices: LookupDevice[]; skuProducts: LookupSku[] };

type SaleResponse = {
  orderId: string;
  orderNumber: string;
  receiptNumber: string;
  total: number;
  receiptPdf: string | null;
  warnings: string[];
};

type Dialog =
  | null
  | "case-payment"
  | "case-deposit"
  | "deposit"
  | "freetext"
  | "discount"
  | "customer"
  | "split"
  | "card";

const CHIP_QUICK = "__quick";
const CHIP_DEVICES = "__devices";

const tileClass =
  "flex h-[108px] flex-col justify-between rounded-xl border border-[#E2E5E0] bg-white p-3.5 text-left transition-colors hover:border-[#1A3D2E]/40 hover:bg-[#FBFCFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1A3D2E]";

function effectiveSkuPrice(s: { selling_price: number; sale_price: number | null }) {
  return s.sale_price != null && s.sale_price < s.selling_price ? s.sale_price : s.selling_price;
}

function shortStoreName(name: string) {
  return name.replace(/^phonespot\s*/i, "").trim() || name;
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */

export function KasseScreen({ terminalKind = "manual" }: { terminalKind?: PaymentTerminalKind } = {}) {
  const integratedTerminal = isIntegratedTerminal(terminalKind);
  const supabase = useMemo(() => createBrowserClient(), []);
  const router = useRouter();
  const params = useSearchParams();
  const { scope, ownSlug } = useStoreScope();

  // Location + register + session
  const [locations, setLocations] = useState<Loc[]>([]);
  const [locationId, setLocationId] = useState("");
  const [registers, setRegisters] = useState<RegisterInfo[]>([]);
  const [registerId, setRegisterId] = useState("");
  const [registersLoaded, setRegistersLoaded] = useState(false);
  const [openingFloat, setOpeningFloat] = useState("");
  const [openError, setOpenError] = useState("");

  // Cart
  const [lines, setLines] = useState<CartLine[]>([]);
  const [caseCtx, setCaseCtx] = useState<CaseContext | null>(null);
  const [customer, setCustomer] = useState<CustomerPick | null>(null);
  const [discountKr, setDiscountKr] = useState("");
  const [discountReason, setDiscountReason] = useState<DiscountReason | "">("");
  const [payChoice, setPayChoice] = useState<PaymentChoice>({ kind: "single", type: "kort_terminal" });

  // Scan / search
  const [query, setQuery] = useState("");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [caseHit, setCaseHit] = useState<CaseContext | null>(null);
  const [caseHitError, setCaseHitError] = useState("");
  const [searching, setSearching] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);
  const searchSeq = useRef(0);

  // Tiles
  const [topTiles, setTopTiles] = useState<QuickTile[]>([]);
  const [categories, setCategories] = useState<TileCategory[]>([]);
  const [chip, setChip] = useState(CHIP_QUICK);
  const [chipTiles, setChipTiles] = useState<QuickTile[]>([]);
  const [chipDevices, setChipDevices] = useState<DeviceTile[]>([]);

  // Dialogs / flow
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dialogError, setDialogError] = useState("");
  const [dialogBusy, setDialogBusy] = useState(false);
  const [depositCase, setDepositCase] = useState<CaseContext | null>(null);
  const [splitInitial, setSplitInitial] = useState<ReturnType<typeof newPaymentLine>[]>([]);
  const [processing, setProcessing] = useState(false);
  // Integrated terminal only: the key of the charge that is waiting on the terminal.
  const terminalRef = useRef<string | null>(null);
  const [cancellingTerminal, setCancellingTerminal] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<DoneSale | null>(null);

  const register = registers.find((r) => r.id === registerId) ?? null;
  const location = locations.find((l) => l.id === locationId) ?? null;
  const openSession = register?.openSession ?? null;

  /* ----- Location, registers ----- */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let rows: Loc[] = [];
      const withSlug = await supabase.from("locations").select("id, name, slug").eq("type", "store");
      if (!withSlug.error) {
        rows = (withSlug.data ?? []) as Loc[];
      } else {
        // locations.slug comes with migration 20261003100000; fall back to names before it is applied.
        const legacy = await supabase.from("locations").select("id, name").eq("type", "store");
        rows = ((legacy.data ?? []) as Array<{ id: string; name: string }>).map((l) => ({ ...l, slug: null }));
      }
      if (!cancelled) setLocations(rows.sort((a, b) => a.name.localeCompare(b.name, "da")));
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (locations.length === 0) return;
    const wanted = scope === "vejle" || scope === "slagelse" ? scope : ownSlug;
    const match = wanted ? locations.find((l) => (l.slug ?? l.name).toLowerCase().includes(wanted)) : null;
    setLocationId((cur) => (match && cur !== match.id ? match.id : locations.some((l) => l.id === cur) ? cur : (match ?? locations[0]).id));
  }, [locations, scope, ownSlug]);

  const loadRegisters = useCallback(async () => {
    if (!locationId) return;
    try {
      const data = await posJson<{ registers: RegisterInfo[] }>(`/api/pos/session?location_id=${locationId}`);
      setRegisters(data.registers);
      setRegisterId((cur) => (data.registers.some((r) => r.id === cur) ? cur : (data.registers[0]?.id ?? "")));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente kasser");
    }
    setRegistersLoaded(true);
  }, [locationId]);

  useEffect(() => {
    void loadRegisters();
  }, [loadRegisters]);

  async function openRegister() {
    if (!register) return;
    const amount = parseKr(openingFloat);
    if (amount == null) {
      setOpenError("Skriv startbeholdningen (0 hvis kassen er tom)");
      return;
    }
    setOpenError("");
    try {
      await posJson("/api/pos/session", { method: "POST", body: JSON.stringify({ action: "open", registerId: register.id, openingFloat: amount }) });
      setOpeningFloat("");
      await loadRegisters();
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : "Kunne ikke åbne kassen");
    }
  }

  /* ----- Tiles ----- */

  useEffect(() => {
    if (!locationId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await posJson<{ tiles: QuickTile[]; categories: TileCategory[] }>(`/api/pos/quick-tiles?location_id=${locationId}`);
        if (!cancelled) {
          setTopTiles(data.tiles);
          setCategories(data.categories);
        }
      } catch {
        if (!cancelled) {
          setTopTiles([]);
          setCategories([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  useEffect(() => {
    if (!locationId || chip === CHIP_QUICK) return;
    let cancelled = false;
    (async () => {
      try {
        if (chip === CHIP_DEVICES) {
          const d = await posJson<{ devices: DeviceTile[] }>(`/api/pos/quick-tiles?location_id=${locationId}&kind=devices`);
          if (!cancelled) setChipDevices(d.devices);
        } else {
          const d = await posJson<{ tiles: QuickTile[] }>(
            `/api/pos/quick-tiles?location_id=${locationId}&category=${encodeURIComponent(chip)}`,
          );
          if (!cancelled) setChipTiles(d.tiles);
        }
      } catch {
        if (!cancelled) {
          setChipTiles([]);
          setChipDevices([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chip, locationId]);

  /* ----- Totals ----- */

  const base = discountableBase(lines);
  const rawDiscount = parseKr(discountKr) ?? 0;
  const discountInvalid = rawDiscount > base || (rawDiscount > 0 && !discountReason);
  const discount = discountInvalid ? Math.min(rawDiscount, base) : rawDiscount;
  const applied = useMemo(() => planAppliedDeposits(lines, caseCtx, discount), [lines, caseCtx, discount]);
  const totals = useMemo(() => cartTotals(lines, applied, discount), [lines, applied, discount]);
  const payments = resolvePayments(payChoice, totals.total);
  const paymentCheck = checkPayments(payChoice, totals.total);
  const needsCustomer = paymentsNeedCustomer(payments) && !customer;
  const caseBlocked = caseCtx && lines.some((l) => l.type === "repair_service") ? caseBlockedReason(caseCtx, "payment") : null;

  const blockReason = !openSession
    ? null
    : caseBlocked
      ? caseBlocked
      : discountInvalid
        ? "Ret rabatten: vælg en årsag, og hold den under varernes værdi"
        : needsCustomer
          ? "Vælg en kunde for at betale med faktura"
          : lines.length > 0 && !paymentCheck.ok && payChoice.kind === "split"
            ? "Den delte betaling matcher ikke totalen. Ret den."
            : null;

  const canCharge = lines.length > 0 && !!register && !!openSession && !processing && !blockReason && paymentCheck.ok;

  /* ----- Case ----- */

  async function fetchCase(q: string): Promise<CaseContext> {
    const res = await posJson<{ case: CaseContext | null; candidates: Array<{ id: string; ticketNumber: string }> }>(
      `/api/pos/case?q=${encodeURIComponent(q)}`,
    );
    if (res.case) return res.case;
    if (res.candidates.length > 1) {
      throw new Error(`Flere sager passer: ${res.candidates.map((c) => c.ticketNumber).join(", ")}. Skriv hele sagsnummeret.`);
    }
    throw new Error("Sagen blev ikke fundet");
  }

  function loadCaseForPayment(c: CaseContext): string | null {
    const blocked = caseBlockedReason(c, "payment");
    if (blocked) return blocked;
    setLines((prev) => [...prev.filter((l) => l.type !== "repair_service" && l.type !== "deposit" && !("repairTicketItemId" in l && l.repairTicketItemId)), ...casePaymentLines(c)]);
    setCaseCtx(c);
    setCustomer((cur) => cur ?? (c.customer.id ? { id: c.customer.id, name: c.customer.name, phone: c.customer.phone, email: c.customer.email } : null));
    setPayChoice((cur) => (cur.kind === "split" ? { kind: "single", type: "kort_terminal" } : cur));
    return null;
  }

  function openDepositFor(c: CaseContext): string | null {
    const blocked = caseBlockedReason(c, "deposit");
    if (blocked) return blocked;
    setDepositCase(c);
    setDialogError("");
    setDialog("deposit");
    return null;
  }

  // ?sag=<id> (and &depositum=1) from the case pages.
  const initialParams = useRef(false);
  useEffect(() => {
    if (initialParams.current) return;
    const { caseId, openDeposit } = parseKasseParams(params);
    if (!caseId) return;
    initialParams.current = true;
    (async () => {
      try {
        const c = await fetchCase(caseId);
        const problem = openDeposit ? openDepositFor(c) : loadCaseForPayment(c);
        if (problem) setError(problem);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sagen kunne ikke hentes");
      }
    })();
  }, [params]);

  async function submitCaseDialog(q: string, mode: "payment" | "deposit") {
    setDialogBusy(true);
    setDialogError("");
    try {
      const c = await fetchCase(q);
      const problem = mode === "payment" ? loadCaseForPayment(c) : openDepositFor(c);
      if (problem) setDialogError(problem);
      else if (mode === "payment") setDialog(null);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Sagen kunne ikke hentes");
    }
    setDialogBusy(false);
  }

  /* ----- Cart editing ----- */

  function addSku(s: { id: string; title: string; priceOere: number }) {
    setLines((prev) => {
      const existing = prev.find((l) => l.type === "sku_product" && l.skuProductId === s.id);
      if (existing) return prev.map((l) => (l === existing && l.type === "sku_product" ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { key: crypto.randomUUID(), type: "sku_product", skuProductId: s.id, name: s.title, price: s.priceOere, quantity: 1 }];
    });
    clearScan();
  }

  function addDevice(d: { id: string; name: string; grade: string | null; storage: string | null; priceOere: number; vatScheme: string | null }) {
    setLines((prev) =>
      prev.some((l) => l.type === "device" && l.deviceId === d.id)
        ? prev
        : [
            ...prev,
            {
              key: crypto.randomUUID(),
              type: "device",
              deviceId: d.id,
              name: d.name,
              detail: [d.storage, d.grade ? `Grade ${d.grade}` : null].filter(Boolean).join(" · "),
              price: d.priceOere,
              vatScheme: d.vatScheme === "brugtmoms" ? "brugtmoms" : "regular",
            },
          ],
    );
    clearScan();
  }

  function addFreeText(name: string, priceOere: number) {
    setLines((prev) => [...prev, { key: crypto.randomUUID(), type: "free_text", name, price: priceOere, quantity: 1 }]);
    setDialog(null);
  }

  function changeQty(key: string, delta: number) {
    setLines((prev) =>
      prev.flatMap((l) => {
        if (l.key !== key || (l.type !== "sku_product" && l.type !== "free_text")) return [l];
        const q = l.quantity + delta;
        return q < 1 ? [] : [{ ...l, quantity: q }];
      }),
    );
  }

  function removeLine(key: string) {
    setLines((prev) => {
      const gone = prev.find((l) => l.key === key);
      const next = prev.filter((l) => l.key !== key);
      if (gone?.type === "repair_service") setCaseCtx(null);
      return next;
    });
  }

  function setPrice(key: string, oere: number) {
    setLines((prev) => prev.map((l) => (l.key === key && l.type === "repair_service" ? { ...l, price: oere } : l)));
  }

  /* ----- Scan / search ----- */

  function clearScan() {
    setQuery("");
    setLookup(null);
    setCaseHit(null);
    setCaseHitError("");
    searchSeq.current += 1;
    scanRef.current?.focus();
  }

  async function runLookup(value: string): Promise<Lookup | null> {
    const res = await posFetch(`/api/pos/lookup?q=${encodeURIComponent(value)}&location_id=${locationId}`);
    return res.ok ? ((await res.json()) as Lookup) : null;
  }

  useEffect(() => {
    const value = query.trim();
    const mine = ++searchSeq.current;
    if (value.length < 2) {
      setLookup(null);
      setCaseHit(null);
      setCaseHitError("");
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        if (parseCaseReference(value)) {
          try {
            const c = await fetchCase(value);
            if (mine === searchSeq.current) {
              setCaseHit(c);
              setCaseHitError("");
              setLookup(null);
            }
          } catch (err) {
            if (mine === searchSeq.current) {
              setCaseHit(null);
              setCaseHitError(err instanceof Error ? err.message : "Sagen blev ikke fundet");
            }
          }
        } else {
          const data = await runLookup(value);
          if (mine === searchSeq.current) {
            setLookup(data);
            setCaseHit(null);
            setCaseHitError("");
          }
        }
      } finally {
        if (mine === searchSeq.current) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, locationId]);

  async function onScanEnter() {
    const value = query.trim();
    if (!value) return;
    setError("");
    setSearching(true);
    try {
      if (parseCaseReference(value)) {
        const c = caseHit ?? (await fetchCase(value));
        const problem = loadCaseForPayment(c);
        if (problem) setError(problem);
        else clearScan();
        return;
      }
      const data = lookup ?? (await runLookup(value));
      if (!data) return;
      const devs = data.devices;
      const skus = data.skuProducts;
      // An exact barcode/IMEI/EAN hit is added straight away; anything ambiguous stays on screen.
      const exactDevice = devs.length === 1 && skus.length === 0 ? devs[0] : null;
      const exactSku = skus.length === 1 && devs.length === 0 ? skus[0] : null;
      if (exactDevice) {
        addDevice({
          id: exactDevice.id,
          name: exactDevice.product_templates?.display_name ?? "Enhed",
          grade: exactDevice.grade,
          storage: exactDevice.storage,
          priceOere: exactDevice.selling_price,
          vatScheme: exactDevice.vat_scheme,
        });
      } else if (exactSku) {
        addSku({ id: exactSku.id, title: exactSku.title, priceOere: effectiveSkuPrice(exactSku) });
      } else {
        setLookup(data);
        if (devs.length === 0 && skus.length === 0) setCaseHitError("Ingen varer fundet");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Søgningen fejlede");
    } finally {
      setSearching(false);
    }
  }

  // Keyboard: F2 focuses the scan field, Esc clears it when no dialog is open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        scanRef.current?.focus();
        scanRef.current?.select();
      } else if (e.key === "Escape" && !document.querySelector("[data-kasse-dialog]")) {
        setQuery("");
        setLookup(null);
        setCaseHit(null);
        setCaseHitError("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!dialog && !done && openSession) scanRef.current?.focus();
  }, [dialog, done, openSession, lines.length]);

  /* ----- Payment + sale ----- */

  function pickMethod(type: PaymentType) {
    setPayChoice({ kind: "single", type });
  }

  function openSplit(preset?: PaymentType) {
    const lines0 =
      payChoice.kind === "split" && !preset
        ? payChoice.lines.map((l) => ({ ...newPaymentLine(l.type as PaymentType, l.amountOere), reference: l.reference ?? "" }))
        : [newPaymentLine(preset ?? (payChoice.kind === "single" ? payChoice.type : "kontant"), Math.max(0, totals.total))];
    setSplitInitial(lines0);
    setDialog("split");
  }

  function requestCharge() {
    if (!canCharge) return;
    setError("");
    if (usesCardTerminal(payments)) {
      setDialogError("");
      setDialog("card");
      // Integrated terminal: the amount goes to the terminal straight away.
      if (integratedTerminal) void submitSale({ card: true });
    } else {
      void submitSale();
    }
  }

  /** Integrated terminal: ask the terminal to abort the pending charge. The sale request then answers. */
  async function cancelTerminal() {
    const reference = terminalRef.current;
    if (!reference || cancellingTerminal) return;
    setCancellingTerminal(true);
    try {
      await posJson("/api/pos/terminal/cancel", { method: "POST", body: JSON.stringify({ reference, locationId }) });
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Betalingen kunne ikke annulleres");
    }
    setCancellingTerminal(false);
  }

  async function submitSale(opts: { card?: boolean } = {}) {
    if (!register || !canCharge) return;
    const inCardDialog = opts.card ?? dialog === "card";
    const reference = crypto.randomUUID();
    terminalRef.current = integratedTerminal ? reference : null;
    setProcessing(true);
    setDialogError("");
    setError("");
    try {
      const result = await posJson<SaleResponse>("/api/pos/sale", {
        method: "POST",
        body: JSON.stringify({
          items: toSaleItems(lines, applied),
          payments,
          locationId,
          registerId: register.id,
          customerId: customer?.id ?? undefined,
          discountAmount: discount > 0 ? discount : undefined,
          discountReason: discount > 0 ? discountReason : undefined,
          ...terminalBodyExtras(terminalKind, payments, reference),
        }),
      });
      setDialog(null);
      setDone({
        orderId: result.orderId,
        receiptNumber: result.receiptNumber,
        total: result.total,
        receiptPdf: result.receiptPdf,
        warnings: result.warnings,
        kind: "sale",
        caseNumber: caseCtx?.ticketNumber ?? null,
        customerEmail: customer?.email ?? caseCtx?.customer.email ?? null,
        customerPhone: customer?.phone ?? caseCtx?.customer.phone ?? null,
      });
      void loadRegisters();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Fejl ved salg";
      if (inCardDialog) setDialogError(msg);
      else setError(msg);
    }
    terminalRef.current = null;
    setProcessing(false);
  }

  async function submitDeposit(amountOere: number, method: PaymentType) {
    if (!register || !depositCase) return;
    const depositPayments = [{ type: method, amountOere }];
    const reference = crypto.randomUUID();
    terminalRef.current = integratedTerminal ? reference : null;
    setDialogBusy(true);
    setDialogError("");
    try {
      const result = await posJson<SaleResponse>("/api/pos/sale", {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              type: "deposit",
              repairTicketId: depositCase.id,
              description: `Depositum · sag ${depositCase.ticketNumber}`,
              unitPriceOere: amountOere,
            },
          ],
          payments: depositPayments,
          locationId,
          registerId: register.id,
          customerId: depositCase.customer.id ?? undefined,
          ...terminalBodyExtras(terminalKind, depositPayments, reference),
        }),
      });
      setDialog(null);
      setDone({
        orderId: result.orderId,
        receiptNumber: result.receiptNumber,
        total: result.total,
        receiptPdf: result.receiptPdf,
        warnings: result.warnings,
        kind: "deposit",
        caseNumber: depositCase.ticketNumber,
        customerEmail: depositCase.customer.email,
        customerPhone: depositCase.customer.phone,
      });
      void loadRegisters();
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : "Depositum kunne ikke gemmes");
    }
    terminalRef.current = null;
    setDialogBusy(false);
  }

  function newCustomer() {
    setDone(null);
    setLines([]);
    setCaseCtx(null);
    setDepositCase(null);
    setCustomer(null);
    setDiscountKr("");
    setDiscountReason("");
    setPayChoice({ kind: "single", type: "kort_terminal" });
    setError("");
    clearScan();
    if (params.get("sag")) router.replace("/admin/kasse");
  }

  /* ----- Render ----- */

  const sessionQs = `location_id=${locationId}${registerId ? `&register_id=${registerId}` : ""}`;
  const showResults = !!caseHit || !!caseHitError || (lookup && (lookup.devices.length > 0 || lookup.skuProducts.length > 0));

  return (
    <div className="-m-4 flex min-h-[calc(100dvh-3.5rem)] flex-col bg-[#F5F6F4] text-[#15211B] sm:-m-5 lg:-m-8 lg:h-[calc(100dvh-3.5rem)]">
      {/* Header */}
      <header className="flex min-h-14 flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#E2E5E0] bg-white px-5 py-2">
        <span className="flex h-9 items-center gap-2 rounded-lg border border-[#E2E5E0] bg-[#F5F6F4] px-3 text-sm font-semibold">
          <span className={`h-2 w-2 rounded-full ${openSession ? "bg-[#2F8F55]" : "bg-[#C9D0C7]"}`} aria-hidden />
          {locations.length > 1 ? (
            <select
              aria-label="Butik"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="bg-transparent font-semibold outline-none"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {shortStoreName(l.name)}
                </option>
              ))}
            </select>
          ) : (
            <span>{location ? shortStoreName(location.name) : "Butik"}</span>
          )}
          <span aria-hidden>·</span>
          {registers.length > 1 ? (
            <select aria-label="Kasse" value={registerId} onChange={(e) => setRegisterId(e.target.value)} className="bg-transparent font-semibold outline-none">
              {registers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          ) : (
            <span>{register?.name ?? "Kasse"}</span>
          )}
        </span>
        {openSession && (
          <span className="text-[13px] text-[#5E6A63]">
            Åbnet {clock(openSession.openedAt)}
            {openSession.openedByName ? ` af ${openSession.openedByName}` : ""} · startbeholdning {fmtKr(openSession.openingFloat)}
          </span>
        )}
        <div className="flex-1" />
        <Link href={`/admin/platform/orders?type=pos${locationId ? `&location=${locationId}` : ""}`} className="text-sm text-[#1A3D2E] hover:text-[#2D6B45]">
          Salgshistorik
        </Link>
        <Link href={`/admin/platform/pos/retur?${sessionQs}`} className="text-sm text-[#1A3D2E] hover:text-[#2D6B45]">
          Retur
        </Link>
        <Link href={`/admin/platform/pos/session?${sessionQs}`} className="text-sm font-semibold text-[#1A3D2E] hover:text-[#2D6B45]">
          Luk kassen
        </Link>
      </header>

      {/* Closed till */}
      {registersLoaded && register && !openSession ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-2xl border border-[#E2E5E0] bg-white p-6">
            <h1 className="text-lg font-bold">Åbn kassen</h1>
            <p className="mt-1 text-sm text-[#5E6A63]">
              {location ? shortStoreName(location.name) : ""} · {register.name}. Tæl kontanterne i skuffen, og skriv startbeholdningen.
            </p>
            <label className="mb-1 mt-4 block text-sm text-[#5E6A63]" htmlFor="kasse-float">
              Startbeholdning (kr.)
            </label>
            <input
              id="kasse-float"
              autoFocus
              inputMode="decimal"
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void openRegister()}
              className={`${fieldClass} text-right tabular-nums`}
            />
            {openError && <p role="alert" className="mt-2 text-sm text-red-700">{openError}</p>}
            <button type="button" onClick={openRegister} className={`${btnPrimary} mt-4 w-full`}>
              Åbn kassen
            </button>
          </div>
        </div>
      ) : registersLoaded && !register ? (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-[#5E6A63]">Der er ingen kasse på denne butik.</div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
            {/* Scan / search */}
            <div className="relative">
              <label className="flex h-12 items-center gap-2 rounded-[10px] border-2 border-[#1A3D2E] bg-white px-3.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A3D2E" strokeWidth="2" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  ref={scanRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void onScanEnter();
                    }
                  }}
                  aria-label="Scan eller søg"
                  placeholder="Scan stregkode / IMEI, eller søg vare eller sagsnr."
                  className="flex-1 border-0 bg-transparent text-base outline-none"
                  autoComplete="off"
                  spellCheck={false}
                />
                {searching && <span className="text-xs text-[#5E6A63]">Søger</span>}
                <kbd className="hidden rounded border border-[#C9D0C7] px-1.5 text-[11px] text-[#5E6A63] sm:block">F2</kbd>
              </label>

              {showResults && (
                <div className="absolute inset-x-0 top-[52px] z-20 max-h-[360px] overflow-y-auto rounded-xl border border-[#E2E5E0] bg-white shadow-lg">
                  {caseHit && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF0EC] px-4 py-3">
                      <div className="min-w-0 text-sm">
                        <b>Sag {caseHit.ticketNumber}</b>
                        <div className="truncate text-[#5E6A63]">
                          {caseHit.customer.name}
                          {caseHit.deviceLabel ? ` · ${caseHit.deviceLabel}` : ""}
                          {caseHit.totalOere > 0 ? ` · ${fmtKr(caseHit.totalOere)}` : ""}
                          {caseHit.paid ? " · betalt" : ""}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="h-9 rounded-lg bg-[#1A3D2E] px-3 text-sm font-semibold text-white hover:bg-[#2D6B45]"
                          onClick={() => {
                            const p = loadCaseForPayment(caseHit);
                            if (p) setError(p);
                            else clearScan();
                          }}
                        >
                          Hent sag til betaling
                        </button>
                        <button
                          type="button"
                          className="h-9 rounded-lg border border-[#C9D0C7] px-3 text-sm font-semibold hover:bg-[#F5F6F4]"
                          onClick={() => {
                            const p = openDepositFor(caseHit);
                            if (p) setError(p);
                            else clearScan();
                          }}
                        >
                          Depositum
                        </button>
                      </div>
                    </div>
                  )}
                  {caseHitError && !caseHit && <p className="px-4 py-3 text-sm text-[#5E6A63]">{caseHitError}</p>}
                  {lookup?.devices.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-b border-[#EEF0EC] px-4 py-3 text-left text-sm hover:bg-[#F5F6F4]"
                      onClick={() =>
                        addDevice({
                          id: d.id,
                          name: d.product_templates?.display_name ?? "Enhed",
                          grade: d.grade,
                          storage: d.storage,
                          priceOere: d.selling_price,
                          vatScheme: d.vat_scheme,
                        })
                      }
                    >
                      <span>
                        <b>{d.product_templates?.display_name ?? "Enhed"}</b>
                        <span className="block text-[#5E6A63]">{[d.storage, d.color, d.grade ? `Grade ${d.grade}` : null, d.barcode].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="tabular-nums">{fmt(d.selling_price)}</span>
                    </button>
                  ))}
                  {lookup?.skuProducts.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-b border-[#EEF0EC] px-4 py-3 text-left text-sm hover:bg-[#F5F6F4]"
                      onClick={() => addSku({ id: s.id, title: s.title, priceOere: effectiveSkuPrice(s) })}
                    >
                      <span>
                        <b>{s.title}</b>
                        {s.ean && <span className="block text-[#5E6A63]">{s.ean}</span>}
                      </span>
                      <span className="tabular-nums">{fmt(effectiveSkuPrice(s))}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category chips */}
            <div role="tablist" aria-label="Kategorier" className="flex flex-wrap gap-2">
              {[
                { id: CHIP_QUICK, label: "Hurtigvalg" },
                ...categories.map((c) => ({ id: c.name, label: c.name })),
                { id: CHIP_DEVICES, label: "Enheder" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={chip === c.id}
                  onClick={() => setChip(c.id)}
                  className={`h-[38px] rounded-full px-4 text-sm ${
                    chip === c.id ? "bg-[#1A3D2E] font-semibold text-white" : "border border-[#C9D0C7] bg-white hover:bg-[#FBFCFB]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Tiles */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
              {chip === CHIP_QUICK && (
                <>
                  <button
                    type="button"
                    className={tileClass}
                    onClick={() => {
                      setDialogError("");
                      setDialog("case-payment");
                    }}
                  >
                    <b className="text-[15px]">Hent sag til betaling</b>
                    <span className="text-[13px] text-[#5E6A63]">Scan sagsnr.</span>
                  </button>
                  <button
                    type="button"
                    className={tileClass}
                    onClick={() => {
                      setDialogError("");
                      setDialog("case-deposit");
                    }}
                  >
                    <b className="text-[15px]">Depositum på sag</b>
                    <span className="text-[13px] text-[#5E6A63]">Forudbetaling</span>
                  </button>
                  <button type="button" className={tileClass} onClick={() => setDialog("freetext")}>
                    <b className="text-[15px]">Diverse salg</b>
                    <span className="text-[13px] text-[#5E6A63]">Fri tekst og pris</span>
                  </button>
                  {topTiles.map((t) => (
                    <button key={t.id} type="button" className={tileClass} onClick={() => addSku(t)}>
                      <b className="text-[15px]">{t.title}</b>
                      <span className="text-sm font-semibold text-[#1A3D2E]">{fmtKr(t.priceOere).replace(",00", "")}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={tileClass}
                    onClick={() => (totals.total > 0 ? openSplit("gavekort") : setError("Læg varer i kurven, før et gavekort kan indløses"))}
                  >
                    <b className="text-[15px]">Gavekort</b>
                    <span className="text-[13px] text-[#5E6A63]">Indløs som betaling</span>
                  </button>
                </>
              )}
              {chip !== CHIP_QUICK &&
                chip !== CHIP_DEVICES &&
                chipTiles.map((t) => (
                  <button key={t.id} type="button" className={tileClass} onClick={() => addSku(t)}>
                    <b className="text-[15px]">{t.title}</b>
                    <span className="text-sm font-semibold text-[#1A3D2E]">{fmtKr(t.priceOere).replace(",00", "")}</span>
                  </button>
                ))}
              {chip === CHIP_DEVICES &&
                chipDevices.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={tileClass}
                    onClick={() => addDevice({ id: d.id, name: d.name, grade: d.grade, storage: d.storage, priceOere: d.priceOere, vatScheme: d.vatScheme })}
                  >
                    <span>
                      <b className="text-[15px]">{d.name}</b>
                      <span className="block text-[13px] text-[#5E6A63]">{[d.storage, d.grade ? `Grade ${d.grade}` : null].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="text-sm font-semibold text-[#1A3D2E]">{fmtKr(d.priceOere).replace(",00", "")}</span>
                  </button>
                ))}
            </div>
            {chip === CHIP_DEVICES && chipDevices.length === 0 && (
              <p className="text-sm text-[#5E6A63]">Ingen enheder til salg i denne butik. Scan stregkode eller IMEI på enheden.</p>
            )}
            {chip !== CHIP_QUICK && chip !== CHIP_DEVICES && chipTiles.length === 0 && (
              <p className="text-sm text-[#5E6A63]">Ingen varer på lager i denne kategori.</p>
            )}
          </main>

          <CartPanel
            lines={lines}
            applied={applied}
            totals={totals}
            customer={customer}
            discountOere={discount}
            discountReason={discountReason}
            payChoice={payChoice}
            terminalKind={terminalKind}
            canCharge={canCharge}
            processing={processing}
            blockReason={blockReason}
            error={error}
            hasOpenSession={!!openSession}
            caseStock={caseCtx ? caseStockSummary(caseCtx) : null}
            onTakeDeposit={() => {
              if (caseCtx) {
                const problem = openDepositFor(caseCtx);
                if (problem) setError(problem);
              }
            }}
            onQty={changeQty}
            onRemove={removeLine}
            onPrice={setPrice}
            onCustomer={() => setDialog("customer")}
            onClearCustomer={() => setCustomer(null)}
            onDiscount={() => setDialog("discount")}
            onMethod={pickMethod}
            onSplit={() => openSplit()}
            onCharge={requestCharge}
          />
        </div>
      )}

      {/* Dialogs */}
      {dialog === "case-payment" && (
        <CaseDialog mode="payment" busy={dialogBusy} error={dialogError} onClose={() => setDialog(null)} onFind={(q) => void submitCaseDialog(q, "payment")} />
      )}
      {dialog === "case-deposit" && (
        <CaseDialog mode="deposit" busy={dialogBusy} error={dialogError} onClose={() => setDialog(null)} onFind={(q) => void submitCaseDialog(q, "deposit")} />
      )}
      {dialog === "deposit" && depositCase && (
        <DepositDialog
          c={depositCase}
          busy={dialogBusy}
          error={dialogError}
          terminalKind={terminalKind}
          cancelling={cancellingTerminal}
          onCancelTerminal={() => void cancelTerminal()}
          onClose={() => setDialog(null)}
          onSubmit={(a, m) => void submitDeposit(a, m)}
        />
      )}
      {dialog === "freetext" && <FreeTextDialog onAdd={addFreeText} onClose={() => setDialog(null)} />}
      {dialog === "discount" && (
        <DiscountDialog
          maxOere={base}
          initialKr={discountKr}
          initialReason={discountReason}
          onClose={() => setDialog(null)}
          onSave={(kr, reason) => {
            setDiscountKr(kr ? oereToInput(parseKr(kr) ?? 0) : "");
            setDiscountReason(reason);
            setDialog(null);
          }}
        />
      )}
      {dialog === "customer" && (
        <CustomerDialog
          onClose={() => setDialog(null)}
          onPick={(c) => {
            setCustomer(c);
            setDialog(null);
          }}
        />
      )}
      {dialog === "split" && (
        <SplitDialog
          total={totals.total}
          hasCustomer={!!customer}
          initialLines={splitInitial}
          onClose={() => setDialog(null)}
          onConfirm={(ls) => {
            setPayChoice({ kind: "split", lines: paymentLinesToInput(ls) });
            setDialog(null);
          }}
        />
      )}
      {dialog === "card" && (
        <CardDialog
          amountOere={payments.filter((p) => p.type === "kort_terminal").reduce((s, p) => s + p.amountOere, 0)}
          busy={processing}
          error={dialogError}
          terminalKind={terminalKind}
          cancelling={cancellingTerminal}
          onCancelTerminal={() => void cancelTerminal()}
          onClose={() => setDialog(null)}
          onApproved={() => void submitSale({ card: true })}
        />
      )}
      {done && <DoneDialog sale={done} onNew={newCustomer} />}
    </div>
  );
}
