"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart/cart-context";
import {
  updateCartCustomer,
  getShippingOptions,
  addShippingMethod,
  initiatePaymentSession,
  completeCart,
} from "@/lib/medusa/client";
import { StripeProvider } from "@/components/checkout/stripe-provider";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatPrice(amount: string, currencyCode = "DKK"): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
  }).format(parseFloat(amount));
}

// ---------------------------------------------------------------------------
// Step 1: Address Form
// ---------------------------------------------------------------------------

type AddressData = {
  email: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  postalCode: string;
  phone: string;
};

function AddressStep({
  onComplete,
}: {
  onComplete: (data: AddressData) => void;
}) {
  const [form, setForm] = useState<AddressData>({
    email: "",
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    postalCode: "",
    phone: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(form);
  };

  const inputClass =
    "w-full rounded-xl border border-sand bg-white px-4 py-3 text-sm text-charcoal placeholder:text-gray/50 focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="font-display text-xl font-bold text-charcoal">
        Leveringsoplysninger
      </h2>

      <input
        type="email"
        required
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className={inputClass}
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          required
          placeholder="Fornavn"
          value={form.firstName}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          required
          placeholder="Efternavn"
          value={form.lastName}
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          className={inputClass}
        />
      </div>

      <input
        type="text"
        required
        placeholder="Adresse"
        value={form.address1}
        onChange={(e) => setForm({ ...form, address1: e.target.value })}
        className={inputClass}
      />

      <input
        type="text"
        placeholder="Lejlighed, etage osv. (valgfrit)"
        value={form.address2}
        onChange={(e) => setForm({ ...form, address2: e.target.value })}
        className={inputClass}
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          required
          placeholder="Postnummer"
          value={form.postalCode}
          onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          required
          placeholder="By"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className={inputClass}
        />
      </div>

      <input
        type="tel"
        placeholder="Telefon (valgfrit)"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        className={inputClass}
      />

      <button
        type="submit"
        className="w-full rounded-full bg-green-eco py-3.5 font-semibold text-white transition-opacity hover:opacity-90"
      >
        Fortsæt til fragt
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Shipping Selection
// ---------------------------------------------------------------------------

type ShippingOption = {
  id: string;
  name: string;
  amount: number;
};

function ShippingStep({
  options,
  onSelect,
  isLoading,
}: {
  options: ShippingOption[];
  onSelect: (optionId: string) => void;
  isLoading: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold text-charcoal">
        Vælg fragt
      </h2>

      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setSelected(option.id)}
            className={`flex w-full items-center justify-between rounded-xl border-2 bg-white p-4 text-left transition-colors ${
              selected === option.id
                ? "border-green-eco"
                : "border-sand hover:border-charcoal/20"
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-charcoal">
                {option.name}
              </p>
            </div>
            <p className="text-sm font-bold text-charcoal">
              {option.amount === 0
                ? "Gratis"
                : `${(option.amount / 100).toFixed(0)} kr`}
            </p>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!selected || isLoading}
        onClick={() => selected && onSelect(selected)}
        className="w-full rounded-full bg-green-eco py-3.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isLoading ? "Indlæser..." : "Fortsæt til betaling"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Payment (Stripe)
// ---------------------------------------------------------------------------

function PaymentForm({ cartId }: { cartId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { setCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { error: stripeError } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (stripeError) {
        setError(stripeError.message ?? "Betalingen fejlede. Prøv igen.");
        setIsProcessing(false);
        return;
      }

      // Complete the cart in Medusa
      const result = await completeCart(cartId);

      if (result.type === "order") {
        setCart(null); // Clear cart
        router.push(`/ordre/${result.order.id}`);
      }
    } catch {
      setError("Der opstod en fejl. Prøv venligst igen.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="font-display text-xl font-bold text-charcoal">
        Betaling
      </h2>

      <div className="rounded-xl border border-sand bg-white p-4">
        <PaymentElement />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full rounded-full bg-green-eco py-3.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isProcessing ? "Behandler betaling..." : "Betal nu"}
      </button>

      <div className="flex items-center justify-center gap-4 pt-2">
        <span className="text-xs text-gray">Sikker betaling via</span>
        {["Visa", "Mastercard", "MobilePay"].map((m) => (
          <span
            key={m}
            className="rounded bg-sand/60 px-2 py-0.5 text-[10px] font-medium text-charcoal/60"
          >
            {m}
          </span>
        ))}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main Checkout Page
// ---------------------------------------------------------------------------

type CheckoutStep = "address" | "shipping" | "payment";

export default function CheckoutPage() {
  const { cart } = useCart();
  const [step, setStep] = useState<CheckoutStep>("address");
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const lines = cart?.lines ?? [];

  // Handle address submission
  const handleAddressComplete = useCallback(
    async (data: AddressData) => {
      if (!cart) return;

      try {
        // Update cart with customer info
        await updateCartCustomer(cart.id, {
          email: data.email,
          shipping_address: {
            first_name: data.firstName,
            last_name: data.lastName,
            address_1: data.address1,
            address_2: data.address2 || undefined,
            city: data.city,
            postal_code: data.postalCode,
            country_code: "dk",
            phone: data.phone || undefined,
          },
        });

        // Fetch shipping options
        setIsLoadingShipping(true);
        const result = await getShippingOptions(cart.id);
        setShippingOptions(result.shipping_options);
        setStep("shipping");
      } catch (err) {
        console.error("Failed to update cart:", err);
      } finally {
        setIsLoadingShipping(false);
      }
    },
    [cart],
  );

  // Handle shipping selection
  const handleShippingSelect = useCallback(
    async (optionId: string) => {
      if (!cart) return;

      setIsLoadingShipping(true);
      try {
        await addShippingMethod(cart.id, optionId);

        // Initiate payment session
        const paymentResult = await initiatePaymentSession(cart.id);
        // The client secret is returned from the payment session
        // Medusa + Stripe provider returns it in the payment session data
        setClientSecret(
          (paymentResult as unknown as { payment_collection: { payment_sessions: { data: { client_secret: string } }[] } })
            .payment_collection.payment_sessions[0]?.data?.client_secret ?? null,
        );
        setStep("payment");
      } catch (err) {
        console.error("Failed to set shipping:", err);
      } finally {
        setIsLoadingShipping(false);
      }
    },
    [cart],
  );

  if (!cart || lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-charcoal">
          Din kurv er tom
        </h1>
        <p className="mt-4 text-gray">
          Tilføj produkter til din kurv for at fortsætte til checkout.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white"
        >
          Fortsæt med at handle
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="inline-block">
          <Image
            src="/brand/logos/phonespot-wordmark-dark.svg"
            alt="PhoneSpot"
            width={140}
            height={32}
            className="h-8 w-auto"
          />
        </Link>
        <div className="flex items-center gap-2 text-xs text-gray">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-green-eco">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          Sikker checkout
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mb-10 flex items-center gap-2">
        {(["address", "shipping", "payment"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step === s
                  ? "bg-green-eco text-white"
                  : i < ["address", "shipping", "payment"].indexOf(step)
                    ? "bg-green-eco/20 text-green-eco"
                    : "bg-sand text-gray"
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-sm ${step === s ? "font-semibold text-charcoal" : "text-gray"}`}>
              {s === "address" ? "Levering" : s === "shipping" ? "Fragt" : "Betaling"}
            </span>
            {i < 2 && <div className="mx-2 h-px w-8 bg-sand" />}
          </div>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-5">
        {/* Left: Form steps */}
        <div className="lg:col-span-3">
          {step === "address" && (
            <AddressStep onComplete={handleAddressComplete} />
          )}
          {step === "shipping" && (
            <ShippingStep
              options={shippingOptions}
              onSelect={handleShippingSelect}
              isLoading={isLoadingShipping}
            />
          )}
          {step === "payment" && clientSecret && cart && (
            <StripeProvider clientSecret={clientSecret}>
              <PaymentForm cartId={cart.id} />
            </StripeProvider>
          )}
        </div>

        {/* Right: Order summary */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-sand bg-white p-6">
            <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-charcoal">
              Ordreopsummering
            </h3>
            <div className="divide-y divide-sand/60">
              {lines.map((item) => (
                <div key={item.id} className="flex gap-3 py-3">
                  {item.merchandise.product.featuredImage && (
                    <Image
                      src={item.merchandise.product.featuredImage.url}
                      alt={item.merchandise.product.title}
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-lg bg-sand/30 object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-charcoal">
                      {item.merchandise.product.title}
                    </p>
                    <p className="text-xs text-gray">
                      {item.merchandise.title} &times; {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-charcoal">
                    {formatPrice(item.cost.totalAmount.amount)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-sand pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray">Subtotal</span>
                <span className="text-charcoal">
                  {formatPrice(cart.cost.subtotalAmount.amount)}
                </span>
              </div>
              {cart.cost.totalTaxAmount && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray">Moms (25%)</span>
                  <span className="text-charcoal">
                    {formatPrice(cart.cost.totalTaxAmount.amount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-sand pt-2 text-base font-bold">
                <span className="text-charcoal">Total</span>
                <span className="text-charcoal">
                  {formatPrice(cart.cost.totalAmount.amount)}
                </span>
              </div>
            </div>

            {/* Trust signals */}
            <div className="mt-6 space-y-2">
              {[
                "36 måneders garanti",
                "14 dages returret",
                "Sikker betaling",
              ].map((text) => (
                <div key={text} className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-green-eco">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-gray">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
