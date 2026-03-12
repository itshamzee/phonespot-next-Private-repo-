"use client";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { CheckoutSummary } from "@/components/checkout/checkout-summary";

export default function KassePage() {
  return (
    <div className="min-h-screen bg-warm-white">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
        {/* Page title */}
        <h1 className="mb-10 font-display text-3xl font-bold uppercase tracking-tight text-charcoal md:text-4xl">
          Kasse
        </h1>

        {/* Two-column layout: form left, summary right */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px]">
          {/* Left: Customer form */}
          <div>
            <CheckoutForm />
          </div>

          {/* Right: Order summary */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <CheckoutSummary />
          </div>
        </div>
      </div>
    </div>
  );
}
