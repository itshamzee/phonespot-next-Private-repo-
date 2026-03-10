"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { formatDKK } from "@/lib/supabase/trade-in-types";

type PageState = "loading" | "form" | "success" | "error";

interface OfferData {
  offer_id: string;
  offer_amount: number;
  expires_at: string;
  prefill: {
    name: string;
    email: string;
    phone: string;
    device: { deviceType?: string; brand?: string; model?: string; storage?: string };
    condition: Record<string, string>;
    deliveryMethod: string;
  };
}

export default function AccepterPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    seller_name: "",
    seller_address: "",
    seller_postal_city: "",
    seller_bank_reg: "",
    seller_bank_account: "",
    confirmed: false,
  });

  useEffect(() => {
    if (!token) { setState("error"); setErrorMsg("Ugyldigt link."); return; }

    fetch(`/api/trade-in/offer-status?token=${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          setErrorMsg(data.message || "Ugyldigt link.");
          setState("error");
          return;
        }
        const data: OfferData = await res.json();
        setOffer(data);
        setForm((prev) => ({ ...prev, seller_name: data.prefill.name }));
        setState("form");
      })
      .catch(() => { setState("error"); setErrorMsg("Kunne ikke indlæse tilbud."); });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.confirmed || !form.seller_bank_reg || !form.seller_bank_account) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/trade-in/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Noget gik galt");
      }
      setState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Kunne ikke acceptere tilbud");
      setState("error");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyles = "w-full rounded-xl border border-soft-grey bg-white px-4 py-3.5 text-charcoal placeholder:text-gray/50 focus:border-green-eco focus:outline-none focus:ring-2 focus:ring-green-eco/20 transition-all";

  if (state === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-eco border-t-transparent" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10">
          <h1 className="font-display text-2xl font-bold text-charcoal">Tilbud ikke tilgængeligt</h1>
          <p className="mt-4 text-gray">{errorMsg}</p>
          <p className="mt-6 text-sm text-gray">
            Kontakt os på <a href="mailto:ha@phonespot.dk" className="text-green-eco underline">ha@phonespot.dk</a> for hjælp.
          </p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    const isInStore = offer?.prefill.deliveryMethod === "Aflever i butik";
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="rounded-2xl border border-green-eco/20 bg-green-eco/5 p-10">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-eco shadow-lg shadow-green-eco/25">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="h-10 w-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-charcoal">Tilbud accepteret!</h1>
          <p className="mt-4 text-gray">
            {isInStore
              ? "Vi kontakter dig med detaljer om aflevering i butikken."
              : "Vi sender et gratis forsendelseslabel til din email inden for 24 timer."}
          </p>
        </div>
      </div>
    );
  }

  // Form state
  const device = offer?.prefill.device;
  const deviceLine = [device?.brand, device?.model, device?.storage].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-charcoal">Acceptér tilbud</h1>
        <p className="mt-2 text-gray">Udfyld dine oplysninger for at acceptere</p>
      </div>

      {/* Offer summary */}
      <div className="mb-8 rounded-2xl border border-green-eco/20 bg-green-eco/5 p-6 text-center">
        <p className="text-sm text-gray">{deviceLine}</p>
        <p className="mt-2 font-display text-4xl font-bold text-charcoal">
          {offer ? formatDKK(offer.offer_amount) : ""}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-charcoal">Fulde navn *</label>
          <input
            type="text"
            required
            value={form.seller_name}
            onChange={(e) => setForm({ ...form, seller_name: e.target.value })}
            className={inputStyles}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-charcoal">Adresse</label>
          <input
            type="text"
            placeholder="Gadenavn og nr."
            value={form.seller_address}
            onChange={(e) => setForm({ ...form, seller_address: e.target.value })}
            className={inputStyles}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-charcoal">Postnr. og by</label>
          <input
            type="text"
            placeholder="f.eks. 4200 Slagelse"
            value={form.seller_postal_city}
            onChange={(e) => setForm({ ...form, seller_postal_city: e.target.value })}
            className={inputStyles}
          />
        </div>

        <div className="h-px bg-soft-grey" />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-charcoal">Reg.nr. *</label>
            <input
              type="text"
              required
              placeholder="4-cifret"
              maxLength={4}
              value={form.seller_bank_reg}
              onChange={(e) => setForm({ ...form, seller_bank_reg: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              className={inputStyles}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-charcoal">Kontonr. *</label>
            <input
              type="text"
              required
              placeholder="Op til 10 cifre"
              maxLength={10}
              value={form.seller_bank_account}
              onChange={(e) => setForm({ ...form, seller_bank_account: e.target.value.replace(/\D/g, "").slice(0, 10) })}
              className={inputStyles}
            />
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-soft-grey p-4 transition-colors hover:border-green-eco/30">
          <input
            type="checkbox"
            checked={form.confirmed}
            onChange={(e) => setForm({ ...form, confirmed: e.target.checked })}
            className="mt-0.5 h-5 w-5 rounded border-gray accent-green-eco"
          />
          <span className="text-sm text-charcoal">
            Jeg bekræfter at enheden er min ejendom og ikke er stjålet eller pansat.
          </span>
        </label>

        <button
          type="submit"
          disabled={!form.confirmed || !form.seller_bank_reg || !form.seller_bank_account || submitting}
          className="w-full rounded-xl bg-green-eco px-6 py-4 font-display text-lg font-bold text-white transition-all hover:brightness-110 hover:shadow-lg hover:shadow-green-eco/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Sender..." : "Acceptér tilbud"}
        </button>
      </form>
    </div>
  );
}
