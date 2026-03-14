"use client";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { CheckoutSummary } from "@/components/checkout/checkout-summary";

export default function KassePage() {
  return (
    <div className="min-h-screen bg-warm-white">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
        {/* Page title with lock icon */}
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-eco/10">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-green-eco">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-charcoal md:text-4xl">
              Sikker betaling
            </h1>
            <p className="text-sm text-gray">Dine data er krypteret og beskyttet</p>
          </div>
        </div>

        {/* Two-column layout: form left, summary right */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_400px]">
          {/* Left: Customer form */}
          <div>
            <CheckoutForm />
          </div>

          {/* Right: Order summary + trust elements */}
          <div className="space-y-5 lg:sticky lg:top-8 lg:self-start">
            <CheckoutSummary />

            {/* Klarna installments teaser */}
            <div className="rounded-2xl border border-sand bg-[#FFB3C7]/10 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-14 shrink-0 items-center justify-center rounded-md bg-[#FFB3C7] text-xs font-black text-[#17120F]">
                  klarna.
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal">
                    Betal i 3 rater med Klarna
                  </p>
                  <p className="mt-0.5 text-xs text-gray">
                    Del betalingen op i 3 rentefrie rater. Vælg Klarna ved betaling.
                  </p>
                </div>
              </div>
            </div>

            {/* Payment methods */}
            <div className="rounded-2xl border border-sand bg-cream p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray">
                Vi accepterer
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {/* Dankort */}
                <div className="flex h-8 w-12 items-center justify-center rounded bg-white border border-sand px-1">
                  <svg viewBox="0 0 40 24" className="h-5 w-8">
                    <rect width="40" height="24" rx="3" fill="#fff"/>
                    <rect x="2" y="2" width="16" height="20" rx="2" fill="#ED1C24"/>
                    <rect x="12" y="2" width="26" height="20" rx="2" fill="#003DA5"/>
                    <text x="20" y="15" fill="#fff" fontSize="7" fontWeight="bold" fontFamily="Arial">DK</text>
                  </svg>
                </div>
                {/* Visa */}
                <div className="flex h-8 w-12 items-center justify-center rounded bg-white border border-sand px-1">
                  <svg viewBox="0 0 40 24" className="h-5 w-8">
                    <rect width="40" height="24" rx="3" fill="#fff"/>
                    <text x="20" y="16" fill="#1A1F71" fontSize="10" fontWeight="bold" fontFamily="Arial" textAnchor="middle">VISA</text>
                  </svg>
                </div>
                {/* Mastercard */}
                <div className="flex h-8 w-12 items-center justify-center rounded bg-white border border-sand px-1">
                  <svg viewBox="0 0 40 24" className="h-5 w-8">
                    <rect width="40" height="24" rx="3" fill="#fff"/>
                    <circle cx="16" cy="12" r="7" fill="#EB001B"/>
                    <circle cx="24" cy="12" r="7" fill="#F79E1B"/>
                    <path d="M20 6.5a7 7 0 0 1 0 11" fill="#FF5F00"/>
                  </svg>
                </div>
                {/* MobilePay */}
                <div className="flex h-8 w-12 items-center justify-center rounded bg-[#5A78FF] border border-sand px-1">
                  <span className="text-[7px] font-bold text-white leading-none">Mobile Pay</span>
                </div>
                {/* Apple Pay */}
                <div className="flex h-8 w-12 items-center justify-center rounded bg-black border border-sand px-1">
                  <span className="text-[8px] font-bold text-white leading-none"> Pay</span>
                </div>
                {/* Google Pay */}
                <div className="flex h-8 w-12 items-center justify-center rounded bg-white border border-sand px-1">
                  <span className="text-[7px] font-bold text-charcoal leading-none">G Pay</span>
                </div>
              </div>
            </div>

            {/* USP trust badges */}
            <div className="rounded-2xl border border-sand bg-cream p-4 space-y-3">
              {[
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-green-eco">
                      <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                    </svg>
                  ),
                  title: "36 måneders garanti",
                  sub: "Fuld dækning på alle enheder",
                },
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-green-eco">
                      <path d="M11.983 1.907a.75.75 0 0 0-1.292-.657l-8.5 9.5A.75.75 0 0 0 2.75 12h6.572l-1.305 6.093a.75.75 0 0 0 1.292.657l8.5-9.5A.75.75 0 0 0 17.25 8h-6.572l1.305-6.093Z" />
                    </svg>
                  ),
                  title: "1-2 dages levering",
                  sub: "Hurtig afsendelse med sporing",
                },
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-green-eco">
                      <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H4.598a.75.75 0 0 0-.75.75v3.634a.75.75 0 0 0 1.5 0v-2.033l.312.311a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.06-7.795a.75.75 0 0 0-1.5 0v2.033l-.312-.31A7 7 0 0 0 2.838 8.49a.75.75 0 0 0 1.449.39A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h3.634a.75.75 0 0 0 .75-.75V3.63Z" clipRule="evenodd" />
                    </svg>
                  ),
                  title: "14 dages returret",
                  sub: "Nem og gratis returnering",
                },
                {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-green-eco">
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                    </svg>
                  ),
                  title: "Sikker betaling",
                  sub: "SSL-krypteret via Stripe",
                },
              ].map((usp) => (
                <div key={usp.title} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{usp.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-charcoal">{usp.title}</p>
                    <p className="text-xs text-gray">{usp.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trustpilot mini badge */}
            <div className="rounded-2xl border border-sand bg-cream p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4].map((i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#00B67A]">
                      <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                    </svg>
                  ))}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#00B67A]/50">
                    <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal">4.4 / 5 på Trustpilot</p>
                  <p className="text-xs text-gray">Baseret på kundeanmeldelser</p>
                </div>
              </div>
            </div>

            {/* Seller info compact */}
            <div className="rounded-2xl border border-sand bg-warm-white px-4 py-3 text-xs text-gray">
              <p>
                <span className="font-semibold text-charcoal">PhoneSpot ApS</span> · CVR: 38688766 · VestsjællandsCentret 10, 4200 Slagelse
              </p>
              <p className="mt-1">
                Solgt under brugtmomsordningen. Køber har ikke fradragsret for moms.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
