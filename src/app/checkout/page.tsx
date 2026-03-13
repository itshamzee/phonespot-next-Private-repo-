"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart/cart-context";

function formatPrice(amount: string, currencyCode = "DKK"): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
  }).format(parseFloat(amount));
}

export default function CheckoutPage() {
  const { cartState, totals } = useCart();
  const items = cartState.items;

  if (items.length === 0) {
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
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="inline-block">
          <Image
            src="/brand/logos/phonespot-wordmark-dark.svg"
            alt="PhoneSpot"
            width={166}
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

      {/* Order summary */}
      <div className="rounded-2xl border border-sand bg-white p-6">
        <h2 className="mb-4 font-display text-xl font-bold text-charcoal">
          Ordreopsummering
        </h2>

        <div className="divide-y divide-sand/60">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-4 py-4">
              {item.image && (
                <Image
                  src={item.image}
                  alt={item.title}
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] rounded-xl bg-sand/30 object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-charcoal line-clamp-2">
                  {item.title}
                </p>
                <p className="mt-0.5 text-sm text-gray">
                  {item.type === "device" ? `Grade ${item.grade}` : `× ${item.quantity}`}
                </p>
              </div>
              <p className="font-semibold text-charcoal">
                {formatPrice(String((item.type === "device" ? item.price : item.price * item.quantity) / 100))}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 border-t border-sand pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray">Subtotal</span>
            <span className="text-charcoal">
              {formatPrice(String(totals.subtotal / 100))}
            </span>
          </div>
          <div className="flex justify-between border-t border-sand pt-2 text-lg font-bold">
            <span className="text-charcoal">Total</span>
            <span className="text-charcoal">
              {formatPrice(String(totals.total / 100))}
            </span>
          </div>
          <p className="text-xs text-gray">Inkl. moms. Fragt beregnes ved checkout.</p>
        </div>
      </div>

      {/* CTA — redirect to Stripe checkout */}
      <a
        href="/api/checkout"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-green-eco py-4 text-lg font-semibold text-white transition-opacity hover:opacity-90"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
        Gå til sikker betaling
      </a>

      {/* Trust signals */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-6">
        {[
          "36 måneders garanti",
          "14 dages returret",
          "Sikker betaling",
          "Gratis fragt over 500 kr",
        ].map((text) => (
          <div key={text} className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-green-eco">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-charcoal/60">{text}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-gray">
        Du videresendes til vores sikre betalingsside, hvor du kan betale med
        kort, MobilePay eller andre betalingsmetoder.
      </p>
    </div>
  );
}
