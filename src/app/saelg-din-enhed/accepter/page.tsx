"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatDKK } from "@/lib/supabase/trade-in-types";
import { customerFacingError } from "@/lib/customer-facing-error";

type PageState = "loading" | "form" | "success" | "error";

interface OfferData {
  offer_id: string;
  offer_amount: number;
  expires_at: string;
  prefill: {
    name: string;
    email: string;
    phone: string;
    device: {
      deviceType?: string;
      brand?: string;
      model?: string;
      storage?: string;
    };
    condition: Record<string, string>;
    deliveryMethod: string;
  };
}

export default function AccepterPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="Indlæser tilbud"
          className="flex min-h-[40vh] items-center justify-center"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-eco border-t-transparent" />
        </div>
      }
    >
      <AccepterContent />
    </Suspense>
  );
}

function AccepterContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    seller_name: "",
    seller_address: "",
    seller_zipcode: "",
    seller_city: "",
    seller_bank_reg: "",
    seller_bank_account: "",
    confirmed: false,
  });

  useEffect(() => {
    if (!token) {
      setState("error");
      setErrorMsg("Ugyldigt link.");
      return;
    }

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
      .catch(() => {
        setState("error");
        setErrorMsg("Kunne ikke indlæse tilbud.");
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.confirmed || !form.seller_bank_reg || !form.seller_bank_account)
      return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/trade-in/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          ...form,
          // The column stays one field; the form just stopped asking for it
          // as one field.
          seller_postal_city:
            `${form.seller_zipcode} ${form.seller_city}`.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Noget gik galt");
      }
      setState("success");
    } catch (err) {
      setErrorMsg(
        customerFacingError(
          err,
          "Kunne ikke acceptere tilbuddet. Prøv igen.",
          [
            "Navn og bankoplysninger er påkrævet",
            "Adresse, postnummer og by er påkrævet",
            "Token er ugyldigt eller udløbet",
            "Tilbuddet er udløbet",
          ],
        ),
      );
      setState("error");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyles =
    "w-full rounded-md border border-soft-grey bg-white px-4 py-3.5 text-charcoal placeholder:text-gray/50 focus:border-green-eco focus:outline-none focus:ring-2 focus:ring-green-eco/20 transition-all";

  if (state === "loading") {
    return (
      <div
        role="status"
        aria-label="Indlæser tilbud"
        className="flex min-h-[40vh] items-center justify-center"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-eco border-t-transparent" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <div
          role="alert"
          className="rounded-xl border border-soft-grey bg-white p-6 sm:p-8"
        >
          <h1 className="font-body text-2xl font-semibold text-charcoal">
            Tilbud ikke tilgængeligt
          </h1>
          <p className="mt-4 text-gray">{errorMsg}</p>
          <p className="mt-6 text-sm text-gray">
            Kontakt os på{" "}
            <a
              href="mailto:info@phonespot.dk"
              className="text-green-eco underline"
            >
              info@phonespot.dk
            </a>{" "}
            for hjælp.
          </p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    const isInStore = offer?.prefill.deliveryMethod === "Aflever i butik";
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <div className="rounded-xl border border-green-eco/20 bg-[#eef0eb] p-6 sm:p-8">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-green-eco ">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth={2.5}
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="font-body text-2xl font-semibold text-charcoal">
            Tilbud accepteret!
          </h1>
          <p className="mt-4 text-gray">
            {isInStore
              ? "Vi kontakter dig med detaljer om aflevering i butikken."
              : "Vi sender en gratis forsendelseslabel og oplysninger om indsendelse til din e-mail."}
          </p>
        </div>
      </div>
    );
  }

  // Form state
  const device = offer?.prefill.device;
  const deviceLine = [device?.brand, device?.model, device?.storage]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="font-body text-3xl font-semibold text-charcoal">
          Acceptér tilbud
        </h1>
        <p className="mt-2 text-gray">
          Udfyld dine oplysninger for at acceptere
        </p>
      </div>

      {/* Offer summary */}
      <div className="mb-8 rounded-xl border border-green-eco/20 bg-[#eef0eb] p-6 text-center">
        <p className="text-sm text-gray">{deviceLine}</p>
        <p className="mt-2 font-body text-4xl font-semibold text-charcoal">
          {offer ? formatDKK(offer.offer_amount) : ""}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-soft-grey bg-white p-6 sm:p-8"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="seller_name"
            className="text-sm font-semibold text-charcoal"
          >
            Fuldt navn *
          </label>
          <input
            id="seller_name"
            type="text"
            required
            value={form.seller_name}
            onChange={(e) => setForm({ ...form, seller_name: e.target.value })}
            className={inputStyles}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="seller_address"
            className="text-sm font-semibold text-charcoal"
          >
            Adresse
          </label>
          <input
            id="seller_address"
            type="text"
            required
            placeholder="Gadenavn og nr."
            value={form.seller_address}
            onChange={(e) =>
              setForm({ ...form, seller_address: e.target.value })
            }
            className={inputStyles}
          />
        </div>

        {/* Two fields, both required. One free-text box asking for
            "4200 Slagelse" came back as "4000", "213123" and worse, and a
            fragtlabel cannot be produced from that. */}
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="seller_zipcode"
              className="text-sm font-semibold text-charcoal"
            >
              Postnr.
            </label>
            <input
              id="seller_zipcode"
              type="text"
              required
              inputMode="numeric"
              pattern="[1-9][0-9]{3}"
              maxLength={4}
              placeholder="4200"
              title="Fire cifre, f.eks. 4200"
              value={form.seller_zipcode}
              onChange={(e) =>
                setForm({
                  ...form,
                  seller_zipcode: e.target.value.replace(/\D/g, "").slice(0, 4),
                })
              }
              className={inputStyles}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="seller_city"
              className="text-sm font-semibold text-charcoal"
            >
              By
            </label>
            <input
              id="seller_city"
              type="text"
              required
              placeholder="Slagelse"
              value={form.seller_city}
              onChange={(e) =>
                setForm({ ...form, seller_city: e.target.value })
              }
              className={inputStyles}
            />
          </div>
        </div>

        <div className="h-px bg-soft-grey" />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="seller_bank_reg"
              className="text-sm font-semibold text-charcoal"
            >
              Reg.nr. *
            </label>
            <input
              id="seller_bank_reg"
              type="text"
              required
              placeholder="4-cifret"
              maxLength={4}
              value={form.seller_bank_reg}
              onChange={(e) =>
                setForm({
                  ...form,
                  seller_bank_reg: e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 4),
                })
              }
              className={inputStyles}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="seller_bank_account"
              className="text-sm font-semibold text-charcoal"
            >
              Kontonr. *
            </label>
            <input
              id="seller_bank_account"
              type="text"
              required
              placeholder="Op til 10 cifre"
              maxLength={10}
              value={form.seller_bank_account}
              onChange={(e) =>
                setForm({
                  ...form,
                  seller_bank_account: e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 10),
                })
              }
              className={inputStyles}
            />
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer rounded-md border border-soft-grey p-4 transition-colors hover:border-green-eco/30">
          <input
            type="checkbox"
            checked={form.confirmed}
            onChange={(e) => setForm({ ...form, confirmed: e.target.checked })}
            className="mt-0.5 h-5 w-5 rounded border-gray accent-green-eco"
          />
          <span className="text-sm text-charcoal">
            Jeg bekræfter, at enheden er min ejendom og ikke er stjålet eller
            pantsat.
          </span>
        </label>

        <button
          type="submit"
          disabled={
            !form.confirmed ||
            !form.seller_bank_reg ||
            !form.seller_bank_account ||
            submitting
          }
          className="w-full rounded-md bg-green-eco px-6 py-4 font-body text-base font-semibold text-white transition-all hover:bg-green-eco/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Sender..." : "Acceptér tilbud"}
        </button>
      </form>
    </div>
  );
}
