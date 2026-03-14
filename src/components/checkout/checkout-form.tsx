"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { ShippingSelector } from "@/components/checkout/shipping-selector";
import { PrePurchaseInfo } from "@/components/checkout/pre-purchase-info";

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    postal_code: string;
    country: string;
  };
}

const EMPTY_CUSTOMER: CustomerInfo = {
  name: "",
  email: "",
  phone: "",
  address: {
    line1: "",
    line2: "",
    city: "",
    postal_code: "",
    country: "DK",
  },
};

export function CheckoutForm() {
  const router = useRouter();
  const { cartState, applyDiscount, removeDiscount } = useCart();

  const [customer, setCustomer] = useState<CustomerInfo>(EMPTY_CUSTOMER);
  const [shippingMethod, setShippingMethod] = useState<string | null>(null);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [discountInput, setDiscountInput] = useState("");
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Field helpers
  // -----------------------------------------------------------------------

  function setField(field: keyof Omit<CustomerInfo, "address">, value: string) {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }

  function setAddressField(
    field: keyof CustomerInfo["address"],
    value: string,
  ) {
    setCustomer((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  }

  // -----------------------------------------------------------------------
  // Discount code
  // -----------------------------------------------------------------------

  async function handleApplyDiscount() {
    if (!discountInput.trim()) return;
    setIsApplyingDiscount(true);
    setDiscountError(null);
    const result = await applyDiscount(discountInput.trim());
    setIsApplyingDiscount(false);
    if (result.error) {
      setDiscountError(result.error);
    } else {
      setDiscountApplied(true);
    }
  }

  function handleRemoveDiscount() {
    removeDiscount();
    setDiscountApplied(false);
    setDiscountInput("");
    setDiscountError(null);
  }

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    if (!shippingMethod) {
      setSubmitError("Vælg en leveringsmetode for at fortsætte.");
      return;
    }

    if (cartState.items.length === 0) {
      setSubmitError("Din kurv er tom.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartState.items,
          customer,
          discountCode: cartState.discount?.code ?? undefined,
          shippingMethod,
        }),
      });

      const data = (await res.json()) as
        | { url: string; sessionId: string; orderId: string; orderNumber: string }
        | { error: string; errors?: string[] };

      if (!res.ok || "error" in data) {
        const errData = data as { error: string; errors?: string[] };
        const errors = Array.isArray(errData.errors) ? errData.errors : [];
        const errorMsg = errors.length > 0
          ? `${errData.error}: ${errors.join(", ")}`
          : errData.error ?? "Der skete en fejl. Prøv igen.";
        setSubmitError(errorMsg);
        setIsSubmitting(false);
        return;
      }

      // Redirect to Stripe Checkout
      router.push(data.url);
    } catch {
      setSubmitError("Netværksfejl. Tjek din forbindelse og prøv igen.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      {/* ---------------------------------------------------------------- */}
      {/* Customer info                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-charcoal">
          Dine oplysninger
        </h2>

        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="mb-1 block text-sm font-medium text-charcoal"
          >
            Fulde navn <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={customer.name}
            onChange={(e) => setField("name", e.target.value)}
            className="w-full rounded-lg border border-sand bg-warm-white px-4 py-2.5 text-sm text-charcoal placeholder-gray-400 focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            placeholder="Jens Jensen"
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-charcoal"
          >
            E-mail <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={customer.email}
            onChange={(e) => setField("email", e.target.value)}
            className="w-full rounded-lg border border-sand bg-warm-white px-4 py-2.5 text-sm text-charcoal placeholder-gray-400 focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            placeholder="jens@eksempel.dk"
          />
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="mb-1 block text-sm font-medium text-charcoal"
          >
            Telefon <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            required
            autoComplete="tel"
            value={customer.phone}
            onChange={(e) => setField("phone", e.target.value)}
            className="w-full rounded-lg border border-sand bg-warm-white px-4 py-2.5 text-sm text-charcoal placeholder-gray-400 focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            placeholder="+45 12 34 56 78"
          />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Shipping address                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-charcoal">
          Leveringsadresse
        </h2>

        {/* Address line 1 */}
        <div>
          <label
            htmlFor="line1"
            className="mb-1 block text-sm font-medium text-charcoal"
          >
            Adresse <span className="text-red-500">*</span>
          </label>
          <input
            id="line1"
            type="text"
            required
            autoComplete="address-line1"
            value={customer.address.line1}
            onChange={(e) => setAddressField("line1", e.target.value)}
            className="w-full rounded-lg border border-sand bg-warm-white px-4 py-2.5 text-sm text-charcoal placeholder-gray-400 focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            placeholder="Eksempelgade 42"
          />
        </div>

        {/* Address line 2 */}
        <div>
          <label
            htmlFor="line2"
            className="mb-1 block text-sm font-medium text-charcoal"
          >
            Adresse 2 <span className="text-xs font-normal text-gray-400">(valgfrit)</span>
          </label>
          <input
            id="line2"
            type="text"
            autoComplete="address-line2"
            value={customer.address.line2}
            onChange={(e) => setAddressField("line2", e.target.value)}
            className="w-full rounded-lg border border-sand bg-warm-white px-4 py-2.5 text-sm text-charcoal placeholder-gray-400 focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            placeholder="Lejlighed, etage…"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Postal code */}
          <div>
            <label
              htmlFor="postal_code"
              className="mb-1 block text-sm font-medium text-charcoal"
            >
              Postnr. <span className="text-red-500">*</span>
            </label>
            <input
              id="postal_code"
              type="text"
              required
              inputMode="numeric"
              autoComplete="postal-code"
              value={customer.address.postal_code}
              onChange={(e) => setAddressField("postal_code", e.target.value)}
              className="w-full rounded-lg border border-sand bg-warm-white px-4 py-2.5 text-sm text-charcoal placeholder-gray-400 focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
              placeholder="4200"
            />
          </div>

          {/* City */}
          <div>
            <label
              htmlFor="city"
              className="mb-1 block text-sm font-medium text-charcoal"
            >
              By <span className="text-red-500">*</span>
            </label>
            <input
              id="city"
              type="text"
              required
              autoComplete="address-level2"
              value={customer.address.city}
              onChange={(e) => setAddressField("city", e.target.value)}
              className="w-full rounded-lg border border-sand bg-warm-white px-4 py-2.5 text-sm text-charcoal placeholder-gray-400 focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
              placeholder="Slagelse"
            />
          </div>
        </div>

        {/* Country (hidden, always DK) */}
        <input type="hidden" name="country" value="DK" />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Shipping selector                                                  */}
      {/* ---------------------------------------------------------------- */}
      <section>
        <ShippingSelector
          selected={shippingMethod}
          onSelect={(method, cost) => {
            setShippingMethod(method);
            setShippingCost(cost);
          }}
        />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Discount code                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-charcoal">
          Rabatkode
        </h2>

        {discountApplied && cartState.discount ? (
          <div className="flex items-center justify-between rounded-xl border border-green-eco/40 bg-green-eco/5 px-4 py-3">
            <span className="text-sm text-charcoal">
              Kode{" "}
              <span className="font-mono font-semibold uppercase">
                {cartState.discount.code}
              </span>{" "}
              er anvendt
            </span>
            <button
              type="button"
              onClick={handleRemoveDiscount}
              className="text-xs text-gray-500 underline hover:text-charcoal"
            >
              Fjern
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={discountInput}
              onChange={(e) => {
                setDiscountInput(e.target.value.toUpperCase());
                setDiscountError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleApplyDiscount();
                }
              }}
              placeholder="KODE"
              className="flex-1 rounded-lg border border-sand bg-warm-white px-4 py-2.5 font-mono text-sm uppercase text-charcoal placeholder-gray-400 focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            />
            <button
              type="button"
              onClick={() => void handleApplyDiscount()}
              disabled={isApplyingDiscount || !discountInput.trim()}
              className="rounded-lg bg-charcoal px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {isApplyingDiscount ? "…" : "Anvend"}
            </button>
          </div>
        )}

        {discountError && (
          <p className="text-xs text-red-500">{discountError}</p>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Pre-purchase info                                                  */}
      {/* ---------------------------------------------------------------- */}
      <PrePurchaseInfo />

      {/* ---------------------------------------------------------------- */}
      {/* Submit error                                                       */}
      {/* ---------------------------------------------------------------- */}
      {submitError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* CTA                                                                */}
      {/* ---------------------------------------------------------------- */}
      <button
        type="submit"
        disabled={isSubmitting || cartState.items.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-green-eco px-8 py-4 font-display text-base font-bold uppercase tracking-wider text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-green-eco/20 disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4Z"
              />
            </svg>
            Sender…
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
            </svg>
            Gå til sikker betaling
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 text-xs text-gray">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-green-eco">
          <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
        </svg>
        SSL-krypteret · Du viderestilles til Stripe for sikker betaling
      </div>
    </form>
  );
}
