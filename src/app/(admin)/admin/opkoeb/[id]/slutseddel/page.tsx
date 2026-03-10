"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import { STORES, type StoreLocationConfig } from "@/lib/store-config";
import type { ContactInquiry } from "@/lib/supabase/types";
import type {
  TradeInOffer,
  TradeInReceipt,
  TradeInReceiptItem,
  TradeInReceiptStatus,
} from "@/lib/supabase/trade-in-types";
import { formatDKK } from "@/lib/supabase/trade-in-types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CONDITION_GRADES = ["Perfekt", "God", "Acceptabel", "Defekt"] as const;

const RECEIPT_STATUS_CONFIG: Record<
  TradeInReceiptStatus,
  { label: string; color: string }
> = {
  draft: { label: "Kladde", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Bekraeftet", color: "bg-emerald-100 text-emerald-700" },
  paid: { label: "Betalt", color: "bg-emerald-200 text-emerald-800" },
  completed: { label: "Faerdig", color: "bg-green-100 text-green-700" },
};

const DELIVERY_LABELS: Record<string, string> = {
  shipping: "Forsendelse",
  in_store: "I butik",
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DeviceItemForm {
  id?: string;
  brand: string;
  model: string;
  storage: string;
  ram: string;
  condition_grade: (typeof CONDITION_GRADES)[number] | "";
  imei_serial: string;
  color: string;
  price_kr: string;
  condition_notes: string;
}

function emptyItem(): DeviceItemForm {
  return {
    brand: "",
    model: "",
    storage: "",
    ram: "",
    condition_grade: "",
    imei_serial: "",
    color: "",
    price_kr: "",
    condition_notes: "",
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminSlutseddelPage() {
  const params = useParams();
  const inquiryId = params.id as string;
  const supabase = useMemo(() => createBrowserClient(), []);

  /* ---- State ---- */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [inquiry, setInquiry] = useState<ContactInquiry | null>(null);
  const [acceptedOffer, setAcceptedOffer] = useState<TradeInOffer | null>(null);
  const [receipt, setReceipt] = useState<TradeInReceipt | null>(null);

  // Form state
  const [sellerName, setSellerName] = useState("");
  const [sellerAddress, setSellerAddress] = useState("");
  const [sellerPostalCity, setSellerPostalCity] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [sellerBankReg, setSellerBankReg] = useState("");
  const [sellerBankAccount, setSellerBankAccount] = useState("");

  const [buyerCompany, setBuyerCompany] = useState("Phonego ApS");
  const [buyerCvr, setBuyerCvr] = useState("38688766");
  const [buyerEmail, setBuyerEmail] = useState("ha@phonespot.dk");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerPostalCity, setBuyerPostalCity] = useState("");
  const [selectedStoreSlug, setSelectedStoreSlug] = useState("slagelse");

  const [items, setItems] = useState<DeviceItemForm[]>([emptyItem()]);
  const [staffInitials, setStaffInitials] = useState("");

  /* ---- Derived ---- */
  const meta = (inquiry?.metadata ?? {}) as Record<string, unknown>;
  const device = (meta.device ?? {}) as Record<string, unknown>;
  const deliveryMethod = (meta.deliveryMethod ?? meta.delivery_method ?? null) as string | null;

  const totalKr = items.reduce((sum, item) => {
    const val = parseFloat(item.price_kr);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const storeOptions = Object.values(STORES);

  /* ---- Auto-fill buyer from selected store ---- */
  const applyStoreToForm = useCallback((store: StoreLocationConfig) => {
    setBuyerAddress(store.street);
    setBuyerPostalCity(`${store.zip} ${store.city}`);
    setBuyerPhone(store.phone);
  }, []);

  /* ---- Data fetching ---- */

  const loadData = useCallback(async () => {
    setLoading(true);

    // Fetch inquiry
    const { data: inq } = await supabase
      .from("contact_inquiries")
      .select("*")
      .eq("id", inquiryId)
      .single();
    if (inq) setInquiry(inq as ContactInquiry);

    // Fetch accepted offer
    const { data: offerData } = await supabase
      .from("trade_in_offers")
      .select("*")
      .eq("inquiry_id", inquiryId)
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .limit(1);
    const offer = (offerData as TradeInOffer[] | null)?.[0] ?? null;
    setAcceptedOffer(offer);

    // Check for existing receipt
    const { data: receiptData } = await supabase
      .from("trade_in_receipts")
      .select("*")
      .eq("inquiry_id", inquiryId)
      .order("created_at", { ascending: false })
      .limit(1);
    const existingReceipt = (receiptData as TradeInReceipt[] | null)?.[0] ?? null;

    if (existingReceipt) {
      // Load existing receipt into form
      setReceipt(existingReceipt);
      setSellerName(existingReceipt.seller_name);
      setSellerAddress(existingReceipt.seller_address ?? "");
      setSellerPostalCity(existingReceipt.seller_postal_city ?? "");
      setSellerPhone(existingReceipt.seller_phone ?? "");
      setSellerEmail(existingReceipt.seller_email ?? "");
      setSellerBankReg(existingReceipt.seller_bank_reg ?? "");
      setSellerBankAccount(existingReceipt.seller_bank_account ?? "");
      setBuyerCompany(existingReceipt.buyer_company);
      setBuyerCvr(existingReceipt.buyer_cvr);
      setBuyerEmail(existingReceipt.buyer_email);
      setBuyerPhone(existingReceipt.buyer_phone ?? "");
      setBuyerAddress(existingReceipt.buyer_address ?? "");
      setBuyerPostalCity(existingReceipt.buyer_postal_city ?? "");
      setStaffInitials(existingReceipt.staff_initials ?? "");

      // Load receipt items
      const { data: itemData } = await supabase
        .from("trade_in_receipt_items")
        .select("*")
        .eq("receipt_id", existingReceipt.id)
        .order("created_at", { ascending: true });
      const existingItems = (itemData as TradeInReceiptItem[] | null) ?? [];
      if (existingItems.length > 0) {
        setItems(
          existingItems.map((it) => ({
            id: it.id,
            brand: it.brand,
            model: it.model,
            storage: it.storage ?? "",
            ram: it.ram ?? "",
            condition_grade: it.condition_grade ?? "",
            imei_serial: it.imei_serial ?? "",
            color: it.color ?? "",
            price_kr: (it.price / 100).toString(),
            condition_notes: it.condition_notes ?? "",
          }))
        );
      }
    } else {
      // Auto-fill from accepted offer and inquiry
      if (offer) {
        setSellerName(offer.seller_name ?? inq?.name ?? "");
        setSellerAddress(offer.seller_address ?? "");
        setSellerPostalCity(offer.seller_postal_city ?? "");
        setSellerPhone(inq?.phone ?? "");
        setSellerEmail(inq?.email ?? "");
        setSellerBankReg(offer.seller_bank_reg ?? "");
        setSellerBankAccount(offer.seller_bank_account ?? "");
      } else if (inq) {
        setSellerName(inq.name ?? "");
        setSellerPhone(inq.phone ?? "");
        setSellerEmail(inq.email ?? "");
      }

      // Auto-fill first device item from inquiry metadata
      const inqMeta = ((inq as ContactInquiry | null)?.metadata ?? {}) as Record<string, unknown>;
      const dev = (inqMeta.device ?? {}) as Record<string, unknown>;
      if (dev.brand || dev.model) {
        setItems([
          {
            brand: (dev.brand as string) ?? "",
            model: (dev.model as string) ?? "",
            storage: (dev.storage as string) ?? "",
            ram: (dev.ram as string) ?? "",
            condition_grade: "",
            imei_serial: "",
            color: "",
            price_kr: offer ? (offer.offer_amount / 100).toString() : "",
            condition_notes: "",
          },
        ]);
      }

      // Auto-fill buyer from default store
      const defaultStore = STORES.slagelse;
      applyStoreToForm(defaultStore);
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryId]);

  useEffect(() => {
    if (inquiryId) loadData();
  }, [inquiryId, loadData]);

  /* ---- Item helpers ---- */

  function updateItem(index: number, field: keyof DeviceItemForm, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  /* ---- Store change ---- */

  function handleStoreChange(slug: string) {
    setSelectedStoreSlug(slug);
    const store = STORES[slug];
    if (store) applyStoreToForm(store);
  }

  /* ---- Build payload ---- */

  function buildPayload() {
    return {
      inquiry_id: inquiryId,
      offer_id: acceptedOffer?.id ?? null,
      store_location_id: selectedStoreSlug,
      seller_name: sellerName,
      seller_address: sellerAddress || null,
      seller_postal_city: sellerPostalCity || null,
      seller_phone: sellerPhone || null,
      seller_email: sellerEmail || null,
      seller_bank_reg: sellerBankReg || null,
      seller_bank_account: sellerBankAccount || null,
      buyer_company: buyerCompany,
      buyer_cvr: buyerCvr,
      buyer_address: buyerAddress || null,
      buyer_postal_city: buyerPostalCity || null,
      buyer_email: buyerEmail,
      buyer_phone: buyerPhone || null,
      total_amount: Math.round(totalKr * 100),
      staff_initials: staffInitials || null,
      delivery_method: deliveryMethod as "shipping" | "in_store" | null,
      items: items.map((item) => ({
        id: item.id,
        brand: item.brand,
        model: item.model,
        storage: item.storage || null,
        ram: item.ram || null,
        condition_grade: item.condition_grade || null,
        imei_serial: item.imei_serial || null,
        color: item.color || null,
        price: Math.round((parseFloat(item.price_kr) || 0) * 100),
        condition_notes: item.condition_notes || null,
      })),
    };
  }

  /* ---- Save draft ---- */

  async function handleSaveDraft() {
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const payload = buildPayload();
      const url = receipt
        ? `/api/trade-in/receipts/${receipt.id}`
        : "/api/trade-in/receipts";
      const method = receipt ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Ukendt fejl" }));
        setError(err.error ?? "Kunne ikke gemme slutseddel");
      } else {
        const data = await res.json();
        setReceipt(data);
        setSuccess("Slutseddel gemt som kladde.");
      }
    } catch {
      setError("Netvaerksfejl");
    }

    setSaving(false);
  }

  /* ---- Confirm + PDF ---- */

  async function handleConfirmAndPdf() {
    setError("");
    setSuccess("");
    setConfirming(true);

    try {
      // First save
      const payload = buildPayload();
      const saveUrl = receipt
        ? `/api/trade-in/receipts/${receipt.id}`
        : "/api/trade-in/receipts";
      const saveMethod = receipt ? "PATCH" : "POST";

      const saveRes = await fetch(saveUrl, {
        method: saveMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({ error: "Ukendt fejl" }));
        setError(err.error ?? "Kunne ikke gemme slutseddel");
        setConfirming(false);
        return;
      }

      const savedReceipt = (await saveRes.json()) as TradeInReceipt;
      setReceipt(savedReceipt);

      // Then confirm
      const confirmRes = await fetch(
        `/api/trade-in/receipts/${savedReceipt.id}/confirm`,
        { method: "POST" }
      );

      if (!confirmRes.ok) {
        const err = await confirmRes.json().catch(() => ({ error: "Ukendt fejl" }));
        setError(err.error ?? "Kunne ikke bekraefte slutseddel");
      } else {
        const confirmed = (await confirmRes.json()) as TradeInReceipt;
        setReceipt(confirmed);
        setSuccess("Slutseddel bekraeftet og PDF genereret!");
      }
    } catch {
      setError("Netvaerksfejl");
    }

    setConfirming(false);
  }

  /* ---- Register payment ---- */

  async function handlePay() {
    if (!receipt) return;
    setError("");
    setSuccess("");
    setPaying(true);

    try {
      const res = await fetch(`/api/trade-in/receipts/${receipt.id}/pay`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Ukendt fejl" }));
        setError(err.error ?? "Kunne ikke registrere betaling");
      } else {
        const paid = (await res.json()) as TradeInReceipt;
        setReceipt(paid);
        setSuccess("Betaling registreret!");
      }
    } catch {
      setError("Netvaerksfejl");
    }

    setPaying(false);
  }

  /* ---- Loading / not found ---- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-green-eco" />
          <p className="text-sm text-stone-400">Indlaeser slutseddel...</p>
        </div>
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="py-20 text-center">
        <p className="text-stone-400">Henvendelse ikke fundet.</p>
        <Link
          href="/admin/opkoeb"
          className="mt-4 inline-block text-sm text-green-eco hover:underline"
        >
          Tilbage til opkoeb
        </Link>
      </div>
    );
  }

  const isConfirmed = receipt?.status === "confirmed" || receipt?.status === "paid" || receipt?.status === "completed";
  const isPaid = receipt?.status === "paid" || receipt?.status === "completed";
  const statusCfg = receipt ? RECEIPT_STATUS_CONFIG[receipt.status] : null;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/admin/opkoeb/${inquiryId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-charcoal"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Tilbage til henvendelse
      </Link>

      {/* Header */}
      <div className="mb-6 rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-charcoal">
              Slutseddel
            </h2>
            {receipt && (
              <p className="mt-1 text-sm text-stone-400">
                {receipt.receipt_number}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Status badge */}
            {statusCfg && (
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            )}
            {/* Paid timestamp */}
            {isPaid && receipt?.paid_at && (
              <span className="text-xs text-stone-400">
                Betalt {formatDate(receipt.paid_at)}
              </span>
            )}
            {/* Delivery method badge */}
            {deliveryMethod && (
              <span className="inline-block rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                {DELIVERY_LABELS[deliveryMethod] ?? deliveryMethod}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error / success */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-600">
          {success}
          {/* PDF download link after confirm */}
          {isConfirmed && receipt?.pdf_url && (
            <a
              href={receipt.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-3 font-semibold underline"
            >
              Download PDF
            </a>
          )}
          {isConfirmed && !receipt?.pdf_url && receipt && (
            <a
              href={`/api/trade-in/receipts/${receipt.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-3 font-semibold underline"
            >
              Download PDF
            </a>
          )}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---- Left: Seller info ---- */}
        <div className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Saelger (kunde)
          </h3>
          <div className="space-y-3">
            <FormField label="Navn" value={sellerName} onChange={setSellerName} disabled={isPaid} />
            <FormField label="Adresse" value={sellerAddress} onChange={setSellerAddress} disabled={isPaid} />
            <FormField label="Postnr. / by" value={sellerPostalCity} onChange={setSellerPostalCity} disabled={isPaid} />
            <FormField label="Telefon" value={sellerPhone} onChange={setSellerPhone} disabled={isPaid} />
            <FormField label="Email" value={sellerEmail} onChange={setSellerEmail} disabled={isPaid} />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Bank reg.nr." value={sellerBankReg} onChange={setSellerBankReg} disabled={isPaid} />
              <FormField label="Kontonr." value={sellerBankAccount} onChange={setSellerBankAccount} disabled={isPaid} />
            </div>
          </div>
        </div>

        {/* ---- Right: Buyer info ---- */}
        <div className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Koeber (PhoneSpot)
          </h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-charcoal">Butik</label>
              <select
                value={selectedStoreSlug}
                onChange={(e) => handleStoreChange(e.target.value)}
                disabled={isPaid}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-charcoal transition-colors focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10 disabled:opacity-50"
              >
                {storeOptions.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <FormField label="Firma" value={buyerCompany} onChange={setBuyerCompany} disabled={isPaid} />
            <FormField label="CVR" value={buyerCvr} onChange={setBuyerCvr} disabled={isPaid} />
            <FormField label="Adresse" value={buyerAddress} onChange={setBuyerAddress} disabled={isPaid} />
            <FormField label="Postnr. / by" value={buyerPostalCity} onChange={setBuyerPostalCity} disabled={isPaid} />
            <FormField label="Email" value={buyerEmail} onChange={setBuyerEmail} disabled={isPaid} />
            <FormField label="Telefon" value={buyerPhone} onChange={setBuyerPhone} disabled={isPaid} />
          </div>
        </div>
      </div>

      {/* ---- Device items ---- */}
      <div className="mt-6 rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
            Enheder
          </h3>
          {!isPaid && (
            <button
              type="button"
              onClick={addItem}
              className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-200"
            >
              + 1 enhed
            </button>
          )}
        </div>

        <div className="space-y-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-stone-100 bg-stone-50/30 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-400">
                  Enhed {idx + 1}
                </span>
                {items.length > 1 && !isPaid && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Fjern
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <FormField
                  label="Maerke"
                  value={item.brand}
                  onChange={(v) => updateItem(idx, "brand", v)}
                  disabled={isPaid}
                />
                <FormField
                  label="Model"
                  value={item.model}
                  onChange={(v) => updateItem(idx, "model", v)}
                  disabled={isPaid}
                />
                <FormField
                  label="Lagerplads"
                  value={item.storage}
                  onChange={(v) => updateItem(idx, "storage", v)}
                  disabled={isPaid}
                />
                <FormField
                  label="RAM"
                  value={item.ram}
                  onChange={(v) => updateItem(idx, "ram", v)}
                  disabled={isPaid}
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-charcoal">
                    Tilstandsgrad
                  </label>
                  <select
                    value={item.condition_grade}
                    onChange={(e) => updateItem(idx, "condition_grade", e.target.value)}
                    disabled={isPaid}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-charcoal transition-colors focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10 disabled:opacity-50"
                  >
                    <option value="">Vaelg...</option>
                    {CONDITION_GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <FormField
                  label="IMEI / Serienr."
                  value={item.imei_serial}
                  onChange={(v) => updateItem(idx, "imei_serial", v)}
                  disabled={isPaid}
                />
                <FormField
                  label="Farve"
                  value={item.color}
                  onChange={(v) => updateItem(idx, "color", v)}
                  disabled={isPaid}
                />
                <FormField
                  label="Pris (kr)"
                  value={item.price_kr}
                  onChange={(v) => updateItem(idx, "price_kr", v)}
                  type="number"
                  disabled={isPaid}
                />
                <FormField
                  label="Tilstandsnoter"
                  value={item.condition_notes}
                  onChange={(v) => updateItem(idx, "condition_notes", v)}
                  disabled={isPaid}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Staff initials + Total ---- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Personale
          </h3>
          <FormField
            label="Initialer"
            value={staffInitials}
            onChange={setStaffInitials}
            disabled={isPaid}
            placeholder="F.eks. HA"
          />
        </div>

        <div className="flex items-center justify-center rounded-xl border border-stone-200/60 bg-white p-5 shadow-sm">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Total
            </p>
            <p className="mt-1 font-display text-3xl font-bold tracking-tight text-charcoal">
              {formatDKK(Math.round(totalKr * 100))}
            </p>
          </div>
        </div>
      </div>

      {/* ---- Actions ---- */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/* Save draft */}
        {!isPaid && (
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="rounded-full bg-stone-600 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Gemmer..." : "Gem kladde"}
          </button>
        )}

        {/* Confirm + PDF */}
        {!isPaid && (
          <button
            type="button"
            onClick={handleConfirmAndPdf}
            disabled={confirming}
            className="rounded-full bg-green-eco px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {confirming ? "Bekraefter..." : "Bekraeft og generer PDF"}
          </button>
        )}

        {/* Register payment (only after confirmed) */}
        {isConfirmed && !isPaid && (
          <button
            type="button"
            onClick={handlePay}
            disabled={paying}
            className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {paying ? "Registrerer..." : "Registrer betaling"}
          </button>
        )}

        {/* PDF download link (persistent) */}
        {isConfirmed && receipt && (
          <a
            href={receipt.pdf_url ?? `/api/trade-in/receipts/${receipt.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:bg-stone-50"
          >
            Download PDF
          </a>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Form field helper                                                  */
/* ------------------------------------------------------------------ */

function FormField({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-charcoal">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm text-charcoal placeholder:text-stone-400 transition-colors focus:border-green-eco/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-eco/10 disabled:opacity-50"
      />
    </div>
  );
}
