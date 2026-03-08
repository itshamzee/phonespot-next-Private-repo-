# Advance Repair Payment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add online advance payment for repair services via Shopify Draft Orders, with date picker and pay-now/pay-in-store options in the booking wizard.

**Architecture:** Extend the existing 4-step BookingWizard with 2 new steps (date + confirm/pay). A new API route creates the Supabase ticket + Shopify Draft Order and returns the checkout URL. The existing webhook handler already marks tickets as paid. A new confirmation page shows post-payment status.

**Tech Stack:** Next.js App Router, Shopify Admin API (Draft Orders via `src/lib/shopify/admin-client.ts`), Supabase, Resend, Tailwind CSS v4

---

## Important Context

### Existing infrastructure (DO NOT recreate):
- `src/lib/shopify/admin-client.ts` — `createDraftOrder()` already creates Draft Orders with custom line items and returns `{ id, invoiceUrl, name }`
- `src/app/api/webhooks/shopify/route.ts` — Already handles `orders/paid` webhook, matches via `shopify_draft_order_id`, sets `paid=true`
- `src/app/api/repairs/route.ts` — Creates repair tickets in Supabase, sends emails via Resend
- `src/lib/supabase/client.ts` — `createServerClient()` for API routes, `createBrowserClient()` for components
- `src/lib/store-config.ts` — Store info (STORE.name, STORE.email, etc.)

### Env var issue to fix:
- `.env.local` has `SHOPIFY_ADMIN_API_TOKEN`
- `src/lib/shopify/admin-client.ts` reads `SHOPIFY_ADMIN_ACCESS_TOKEN`
- These must match. Fix the admin-client to use `SHOPIFY_ADMIN_API_TOKEN`.

### Database columns (already exist on repair_tickets):
- `paid`, `paid_at`, `shopify_draft_order_id`, `shopify_order_id`, `booking_details` (jsonb)

### BookingWizard location:
- `src/components/repair/booking-wizard.tsx`
- Current steps: Enhed (0), Reparation (1), Detaljer (2), Bekraeft (3)
- Submits to `POST /api/repairs`

---

## Task 1: Fix Shopify Admin API env var mismatch

**Files:**
- Modify: `src/lib/shopify/admin-client.ts:2`

**Step 1: Fix the env var name**

In `src/lib/shopify/admin-client.ts`, line 2, change:

```ts
const adminAccessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? "";
```

to:

```ts
const adminAccessToken = process.env.SHOPIFY_ADMIN_API_TOKEN ?? "";
```

**Step 2: Verify the build still works**

Run: `cd /c/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx next build 2>&1 | tail -5`

Expected: Build succeeds (or at least no new errors from this change).

**Step 3: Commit**

```bash
git add src/lib/shopify/admin-client.ts
git commit -m "fix: match Shopify admin env var name to .env.local"
```

---

## Task 2: Create the repair checkout API route

**Files:**
- Create: `src/app/api/repairs/checkout/route.ts`

**Step 1: Create the API route**

This route: validates input, creates a Supabase ticket, creates a Shopify Draft Order, and returns the invoice URL.

```ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/client";
import { createDraftOrder } from "@/lib/shopify/admin-client";
import { STORE } from "@/lib/store-config";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const body = await request.json();

  const {
    customer_name,
    customer_email,
    customer_phone,
    device_type,
    device_model,
    issue_description,
    service_type,
    selected_services,
    total_price_dkk,
    discount_percent,
    includes_tempered_glass,
    preferred_date,
  } = body;

  // Validate required fields
  if (!customer_name?.trim() || !customer_email?.trim() || !customer_phone?.trim()) {
    return NextResponse.json({ error: "Kundeoplysninger mangler" }, { status: 400 });
  }
  if (!selected_services?.length) {
    return NextResponse.json({ error: "Ingen reparationer valgt" }, { status: 400 });
  }
  if (!preferred_date) {
    return NextResponse.json({ error: "Vælg en afleveringsdato" }, { status: 400 });
  }

  const supabase = createServerClient();

  try {
    // 1. Build booking details
    const bookingDetails = {
      selected_services,
      total_price_dkk,
      discount_percent: discount_percent || 0,
      includes_tempered_glass: includes_tempered_glass || false,
      preferred_date,
    };

    // 2. Create repair ticket
    const { data: ticket, error: insertError } = await supabase
      .from("repair_tickets")
      .insert({
        customer_name: customer_name.trim(),
        customer_email: customer_email.trim(),
        customer_phone: customer_phone.trim(),
        device_type: (device_type || "").trim(),
        device_model: (device_model || "").trim(),
        issue_description: (issue_description || "").trim(),
        service_type: (service_type || "").trim(),
        booking_details: bookingDetails,
        paid: false,
      })
      .select()
      .single();

    if (insertError || !ticket) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json({ error: "Kunne ikke oprette reparationssag" }, { status: 500 });
    }

    // 3. Log initial status
    await supabase.from("repair_status_log").insert({
      ticket_id: ticket.id,
      old_status: null,
      new_status: "modtaget",
      note: "Sag oprettet via online booking med forudbetaling",
    });

    // 4. Build line items for Draft Order
    const lineItems = selected_services.map(
      (s: { name: string; price_dkk: number }) => ({
        title: s.name,
        quantity: 1,
        originalUnitPrice: String(s.price_dkk.toFixed(2)),
      }),
    );

    if (includes_tempered_glass) {
      lineItems.push({
        title: "Panserglas",
        quantity: 1,
        originalUnitPrice: "99.00",
      });
    }

    // 5. Create Shopify Draft Order
    const draftOrder = await createDraftOrder({
      customerEmail: customer_email.trim(),
      customerPhone: customer_phone.trim(),
      lineItems,
      note: `PhoneSpot reparation - ${device_model} - Sag: ${ticket.id.slice(0, 8)} - Aflevering: ${preferred_date}`,
      tags: ["reparation", "forudbetalt", `sag-${ticket.id.slice(0, 8)}`],
    });

    // 6. Store Draft Order ID on ticket
    await supabase
      .from("repair_tickets")
      .update({
        shopify_draft_order_id: draftOrder.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id);

    // 7. Send staff notification email
    try {
      await resend.emails.send({
        from: "PhoneSpot System <noreply@phonespot.dk>",
        to: "info@phonespot.dk",
        subject: `Ny forudbetalt reparation: ${device_model}`,
        text: [
          "Ny reparationsanmodning med forudbetaling:",
          "",
          `Kunde: ${customer_name}`,
          `Email: ${customer_email}`,
          `Telefon: ${customer_phone}`,
          `Enhed: ${device_type} - ${device_model}`,
          `Onsket aflevering: ${preferred_date}`,
          "",
          "Reparationer:",
          ...selected_services.map(
            (s: { name: string; price_dkk: number }) => `  ${s.name}: ${s.price_dkk} DKK`,
          ),
          "",
          `Total: ${total_price_dkk} DKK`,
          `Sags-ID: ${ticket.id}`,
          "",
          "Kunden er sendt til Shopify checkout for betaling.",
        ].join("\n"),
      });
    } catch (emailErr) {
      console.error("Staff notification email error:", emailErr);
    }

    // 8. Return invoice URL for redirect
    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      invoiceUrl: draftOrder.invoiceUrl,
    });
  } catch (err) {
    console.error("Repair checkout error:", err);
    return NextResponse.json(
      { error: "Noget gik galt. Prøv igen senere." },
      { status: 500 },
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/repairs/checkout/route.ts
git commit -m "feat: add repair checkout API route with Shopify Draft Orders"
```

---

## Task 3: Create the confirmation page

**Files:**
- Create: `src/app/reparation/bekraeftelse/page.tsx`

**Step 1: Create the confirmation page**

This page shows after the customer returns from Shopify checkout. It reads the ticket ID from the URL and displays a success message.

```tsx
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Betaling gennemført - PhoneSpot Reparation",
  robots: { index: false, follow: false },
};

export default async function RepairConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const { ticket } = await searchParams;
  const ticketShort = ticket ? ticket.slice(0, 8) : null;

  return (
    <section className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <div className="rounded-2xl border border-green-eco/20 bg-green-eco/5 p-8 text-center sm:p-12">
        {/* Success icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-eco shadow-lg shadow-green-eco/25">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="h-10 w-10">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="font-display text-2xl font-bold text-charcoal sm:text-3xl">
          Tak! Din reparation er betalt
        </h1>

        <p className="mx-auto mt-4 max-w-md text-gray">
          Vi har modtaget din betaling og forbereder din reparation.
          Du vil modtage en bekraeftelse paa email.
        </p>

        {ticketShort && (
          <div className="mx-auto mt-6 inline-block rounded-xl bg-white px-6 py-3 shadow-sm">
            <p className="text-xs font-medium text-gray">Sags-ID</p>
            <p className="font-mono text-lg font-bold text-charcoal">{ticketShort}</p>
          </div>
        )}

        <div className="mx-auto mt-8 max-w-sm space-y-3 rounded-xl bg-white p-5 text-left shadow-sm">
          <h2 className="text-sm font-bold text-charcoal">Hvad sker der nu?</h2>
          <ol className="space-y-2 text-sm text-gray">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-eco/10 text-xs font-bold text-green-eco">1</span>
              <span>Vi bekraefter din booking paa email</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-eco/10 text-xs font-bold text-green-eco">2</span>
              <span>Aflever din enhed paa den valgte dato</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-eco/10 text-xs font-bold text-green-eco">3</span>
              <span>Vi reparerer og kontakter dig naar den er klar</span>
            </li>
          </ol>
        </div>

        {/* Trust signals */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5 text-green-eco">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-sm font-bold text-green-eco">Livstidsgaranti inkluderet</span>
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-charcoal px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-charcoal/90"
        >
          Tilbage til forsiden
        </Link>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/reparation/bekraeftelse/page.tsx
git commit -m "feat: add repair payment confirmation page"
```

---

## Task 4: Extend BookingWizard with date step and payment options

**Files:**
- Modify: `src/components/repair/booking-wizard.tsx`

This is the biggest change. The wizard goes from 4 steps to 5:
- Steps 0-2 stay the same (Enhed, Reparation, Detaljer)
- Step 3 becomes **Dato** (new date picker)
- Step 4 becomes **Bekraeft & Betal** (modified confirmation with two CTAs)

**Step 1: Update the BookingWizard**

Key changes:
1. Update `STEPS` array to 5 steps
2. Add `preferredDate` state
3. Add Step 3 (Dato) with a date input
4. Modify Step 4 (Bekraeft) to show two buttons: "Betal nu" and "Betal i butikken"
5. "Betal nu" calls `/api/repairs/checkout` and redirects to `invoiceUrl`
6. "Betal i butikken" calls existing `/api/repairs`

Replace the entire file with:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { RepairBrand, RepairModel, RepairService } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STEPS = [
  { label: "Enhed", icon: "device" },
  { label: "Reparation", icon: "wrench" },
  { label: "Detaljer", icon: "user" },
  { label: "Dato", icon: "calendar" },
  { label: "Betal", icon: "check" },
] as const;

const TEMPERED_GLASS_PRICE = 99;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  description: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Returns the next N weekdays (Mon-Sat) as YYYY-MM-DD strings. */
function getAvailableDates(count: number): string[] {
  const dates: string[] = [];
  const d = new Date();
  d.setDate(d.getDate() + 1); // start from tomorrow
  while (dates.length < count) {
    const day = d.getDay();
    if (day >= 1 && day <= 6) {
      // Mon-Sat
      dates.push(d.toISOString().slice(0, 10));
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function formatDateDanish(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/* ------------------------------------------------------------------ */
/*  Step Icons                                                         */
/* ------------------------------------------------------------------ */

function StepIcon({ type, active }: { type: string; active: boolean }) {
  const color = active ? "text-white" : "text-gray";
  const icons: Record<string, React.ReactNode> = {
    device: (
      <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 ${color}`}>
        <rect x="5" y="2" width="10" height="16" rx="2" />
      </svg>
    ),
    wrench: (
      <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 ${color}`}>
        <path d="M13.7 5.3a1 1 0 000 1.4l.6.6a1 1 0 001.4 0l2.77-2.77a5 5 0 01-6.94 6.94l-5.91 5.91a1.62 1.62 0 01-2.3-2.3l5.91-5.91a5 5 0 016.94-6.94L13.7 5.3z" />
      </svg>
    ),
    user: (
      <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 ${color}`}>
        <path d="M10 10a4 4 0 100-8 4 4 0 000 8zM2 18a8 8 0 0116 0H2z" />
      </svg>
    ),
    calendar: (
      <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 ${color}`}>
        <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4H16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h1.25V2.75A.75.75 0 015.75 2zM4 8v8h12V8H4z" clipRule="evenodd" />
      </svg>
    ),
    check: (
      <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 ${color}`}>
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
      </svg>
    ),
  };
  return <>{icons[type] ?? icons.check}</>;
}

/* ------------------------------------------------------------------ */
/*  Progress Bar                                                       */
/* ------------------------------------------------------------------ */

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="mb-10">
      {/* Desktop steps */}
      <div className="hidden sm:flex items-center justify-between">
        {STEPS.map(({ label, icon }, i) => {
          const isCompleted = i < current;
          const isActive = i === current;
          return (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 ${
                    isCompleted
                      ? "bg-green-eco shadow-md shadow-green-eco/25"
                      : isActive
                        ? "bg-green-eco shadow-lg shadow-green-eco/30 ring-4 ring-green-eco/20"
                        : "border-2 border-soft-grey bg-white"
                  }`}
                >
                  {isCompleted ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-white">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <StepIcon type={icon} active={isActive} />
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-bold ${
                    isActive ? "text-green-eco" : isCompleted ? "text-charcoal" : "text-gray"
                  }`}
                >
                  {label}
                </span>
              </div>

              {i < STEPS.length - 1 && (
                <div className="relative mx-3 h-0.5 flex-1 overflow-hidden rounded-full bg-soft-grey">
                  <div
                    className="absolute left-0 top-0 h-full bg-green-eco transition-all duration-500"
                    style={{ width: i < current ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile compact pills */}
      <div className="flex items-center justify-between sm:hidden">
        {STEPS.map(({ label }, i) => {
          const isCompleted = i < current;
          const isActive = i === current;
          return (
            <div
              key={label}
              className={`flex-1 py-2 text-center text-xs font-bold transition-colors ${
                isActive
                  ? "border-b-2 border-green-eco text-green-eco"
                  : isCompleted
                    ? "border-b-2 border-green-eco/30 text-charcoal"
                    : "border-b-2 border-transparent text-gray"
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Navigation Buttons                                                 */
/* ------------------------------------------------------------------ */

function NavButtons({
  step,
  canNext,
  onPrev,
  onNext,
  isSubmitting,
  isLast,
}: {
  step: number;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  isSubmitting?: boolean;
  isLast?: boolean;
}) {
  // On the last step, we show custom CTAs instead
  if (isLast) return null;

  return (
    <div className="mt-10 flex justify-between gap-4">
      {step > 0 ? (
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-2 rounded-full border border-soft-grey bg-white px-6 py-3 text-sm font-bold text-charcoal transition-colors hover:bg-sand"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Tilbage
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext || isSubmitting}
        className="flex items-center gap-2 rounded-full bg-green-eco px-8 py-3 text-sm font-bold text-white transition-all hover:bg-green-eco/90 hover:shadow-lg hover:shadow-green-eco/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        {isSubmitting ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sender...
          </>
        ) : (
          <>
            Naeste
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function BookingWizard() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createBrowserClient(), []);

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    ticketId?: string;
    error?: string;
  } | null>(null);

  /* ---- step 0: device ---- */
  const [brands, setBrands] = useState<RepairBrand[]>([]);
  const [models, setModels] = useState<RepairModel[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(false);

  /* ---- step 1: services ---- */
  const [services, setServices] = useState<RepairService[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [includesTemperedGlass, setIncludesTemperedGlass] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);

  /* ---- step 2: customer ---- */
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: "",
    email: "",
    phone: "",
    description: "",
  });

  /* ---- step 3: date ---- */
  const [preferredDate, setPreferredDate] = useState("");
  const availableDates = useMemo(() => getAvailableDates(12), []);

  /* ---- derived ---- */
  const selectedBrand = brands.find((b) => b.id === selectedBrandId);
  const selectedModel = models.find((m) => m.id === selectedModelId);
  const selectedServices = services.filter((s) => selectedServiceIds.has(s.id));

  const subtotal =
    selectedServices.reduce((sum, s) => sum + s.price_dkk, 0) +
    (includesTemperedGlass ? TEMPERED_GLASS_PRICE : 0);

  const discountPercent =
    selectedServiceIds.size >= 3 ? 15 : selectedServiceIds.size >= 2 ? 10 : 0;

  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const totalPrice = subtotal - discountAmount;

  /* ---------------------------------------------------------------- */
  /*  Data fetching                                                    */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("repair_brands")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      setBrands((data as RepairBrand[]) ?? []);
      setBrandsLoading(false);
    })();
  }, [supabase]);

  useEffect(() => {
    if (!selectedBrandId) {
      setModels([]);
      return;
    }
    setModelsLoading(true);
    setSelectedModelId("");
    setServices([]);
    setSelectedServiceIds(new Set());
    (async () => {
      const { data } = await supabase
        .from("repair_models")
        .select("*")
        .eq("brand_id", selectedBrandId)
        .eq("active", true)
        .order("sort_order");
      setModels((data as RepairModel[]) ?? []);
      setModelsLoading(false);
    })();
  }, [selectedBrandId, supabase]);

  useEffect(() => {
    if (!selectedModelId) {
      setServices([]);
      setSelectedServiceIds(new Set());
      return;
    }
    setServicesLoading(true);
    (async () => {
      const { data } = await supabase
        .from("repair_services")
        .select("*")
        .eq("model_id", selectedModelId)
        .eq("active", true)
        .order("sort_order");
      setServices((data as RepairService[]) ?? []);
      setServicesLoading(false);
    })();
  }, [selectedModelId, supabase]);

  /* ---- pre-fill from URL ---- */
  useEffect(() => {
    if (brands.length === 0) return;
    const brandSlug = searchParams.get("brand");
    if (!brandSlug) return;
    const matchedBrand = brands.find((b) => b.slug === brandSlug);
    if (matchedBrand && !selectedBrandId) setSelectedBrandId(matchedBrand.id);
  }, [brands, searchParams, selectedBrandId]);

  useEffect(() => {
    if (models.length === 0) return;
    const modelSlug = searchParams.get("model");
    if (!modelSlug) return;
    const matchedModel = models.find((m) => m.slug === modelSlug);
    if (matchedModel && !selectedModelId) setSelectedModelId(matchedModel.id);
  }, [models, searchParams, selectedModelId]);

  useEffect(() => {
    if (services.length === 0) return;
    const serviceSlug = searchParams.get("service");
    if (!serviceSlug) return;
    const matchedService = services.find((s) => s.slug === serviceSlug);
    if (matchedService && selectedServiceIds.size === 0)
      setSelectedServiceIds(new Set([matchedService.id]));
  }, [services, searchParams, selectedServiceIds.size]);

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  const toggleService = useCallback((id: string) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCustomerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setCustomer((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    [],
  );

  const canGoNext = useMemo(() => {
    switch (step) {
      case 0: return !!selectedBrandId && !!selectedModelId;
      case 1: return selectedServiceIds.size > 0;
      case 2: return !!(customer.name.trim() && customer.email.trim() && customer.phone.trim() && customer.description.trim());
      case 3: return !!preferredDate;
      case 4: return true;
      default: return false;
    }
  }, [step, selectedBrandId, selectedModelId, selectedServiceIds.size, customer, preferredDate]);

  const buildPayload = () => ({
    customer_name: customer.name.trim(),
    customer_email: customer.email.trim(),
    customer_phone: customer.phone.trim(),
    device_type: selectedBrand?.name ?? "",
    device_model: selectedModel?.name ?? "",
    issue_description: customer.description.trim(),
    service_type: selectedServices.map((s) => s.name).join(", "),
    selected_services: selectedServices.map((s) => ({
      id: s.id,
      name: s.name,
      price_dkk: s.price_dkk,
    })),
    total_price_dkk: totalPrice,
    discount_percent: discountPercent,
    includes_tempered_glass: includesTemperedGlass,
    preferred_date: preferredDate,
  });

  /** "Betal i butikken" — existing flow, no payment */
  const handleSubmitNoPay = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitResult({ success: true, ticketId: data.ticketId });
      } else {
        setSubmitResult({ success: false, error: data.error });
      }
    } catch {
      setSubmitResult({ success: false, error: "Noget gik galt. Proev igen senere." });
    } finally {
      setIsSubmitting(false);
    }
  };

  /** "Betal nu" — create Draft Order, redirect to Shopify checkout */
  const handleSubmitAndPay = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/repairs/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (res.ok && data.invoiceUrl) {
        // Redirect to Shopify checkout
        window.location.href = data.invoiceUrl;
      } else {
        setSubmitResult({ success: false, error: data.error || "Kunne ikke oprette betaling" });
        setIsSubmitting(false);
      }
    } catch {
      setSubmitResult({ success: false, error: "Noget gik galt. Proev igen senere." });
      setIsSubmitting(false);
    }
  };

  const goNext = () => setStep((s) => Math.min(s + 1, 4));
  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  /* ---------------------------------------------------------------- */
  /*  Success screen (pay-in-store path)                               */
  /* ---------------------------------------------------------------- */

  if (submitResult?.success) {
    return (
      <div className="rounded-2xl border border-green-eco/20 bg-green-eco/5 p-10 text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-eco shadow-lg shadow-green-eco/25">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="h-10 w-10">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-charcoal">
          Tak for din anmodning!
        </h2>
        <p className="mt-3 text-gray">
          Vi har modtaget din reparationsanmodning og vender tilbage inden for faa timer.
        </p>
        {preferredDate && (
          <p className="mt-2 text-sm text-gray">
            Onsket aflevering: <span className="font-medium text-charcoal">{formatDateDanish(preferredDate)}</span>
          </p>
        )}
        {submitResult.ticketId && (
          <p className="mt-4 rounded-lg bg-white p-3 text-sm text-gray">
            Sags-ID:{" "}
            <span className="font-mono font-bold text-charcoal">
              {submitResult.ticketId.slice(0, 8)}
            </span>
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5 text-green-eco">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-sm font-bold text-green-eco">Livstidsgaranti inkluderet</span>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Styles                                                           */
  /* ---------------------------------------------------------------- */

  const inputStyles =
    "w-full rounded-xl border border-soft-grey bg-white px-4 py-3.5 text-charcoal placeholder:text-gray/50 focus:border-green-eco focus:outline-none focus:ring-2 focus:ring-green-eco/20 transition-all";

  const labelStyles = "text-sm font-bold text-charcoal";

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="rounded-2xl border border-soft-grey bg-white p-6 shadow-sm md:p-8">
      <ProgressBar current={step} />

      {submitResult?.error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {submitResult.error}
        </div>
      )}

      {/* ---- Step 0: Enhed ---- */}
      {step === 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">
              Vaelg din enhed
            </h2>
            <p className="mt-1 text-sm text-gray">Vaelg maerke og model for at se tilgaengelige reparationer.</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="brand" className={labelStyles}>Maerke</label>
            {brandsLoading ? (
              <div className="flex items-center gap-2 py-3 text-sm text-gray">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Indlaeser maerker...
              </div>
            ) : (
              <select
                id="brand"
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className={inputStyles}
              >
                <option value="">Vaelg maerke...</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="model" className={labelStyles}>Model</label>
            {modelsLoading ? (
              <div className="flex items-center gap-2 py-3 text-sm text-gray">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Indlaeser modeller...
              </div>
            ) : (
              <select
                id="model"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                disabled={!selectedBrandId}
                className={inputStyles}
              >
                <option value="">
                  {selectedBrandId ? "Vaelg model..." : "Vaelg maerke foerst..."}
                </option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* ---- Step 1: Reparation ---- */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">
              Vaelg reparation
            </h2>
            <p className="mt-1 text-sm text-gray">
              Vaelg en eller flere reparationer. Flere reparationer = stoerre rabat!
            </p>
          </div>

          {servicesLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-gray">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Indlaeser reparationer...
            </div>
          ) : services.length === 0 ? (
            <p className="py-4 text-sm text-gray">Ingen reparationer tilgaengelige for denne model.</p>
          ) : (
            <div className="space-y-2">
              {services.map((s) => {
                const isChecked = selectedServiceIds.has(s.id);
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => toggleService(s.id)}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${
                      isChecked
                        ? "border-green-eco bg-green-eco/5 shadow-sm"
                        : "border-soft-grey hover:border-green-eco/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all ${
                        isChecked
                          ? "border-green-eco bg-green-eco text-white"
                          : "border-soft-grey"
                      }`}>
                        {isChecked && (
                          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                            <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-charcoal">{s.name}</span>
                        {s.estimated_minutes && (
                          <span className="ml-2 text-xs text-gray">ca. {s.estimated_minutes} min</span>
                        )}
                      </div>
                    </div>
                    <span className="font-display font-bold text-charcoal">{s.price_dkk} DKK</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tempered glass upsell */}
          <div className={`rounded-xl border-2 p-4 transition-all ${
            includesTemperedGlass
              ? "border-green-eco bg-green-eco/5"
              : "border-dashed border-green-eco/30 bg-green-eco/[0.02]"
          }`}>
            <button type="button" onClick={() => setIncludesTemperedGlass((v) => !v)} className="flex w-full cursor-pointer items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <div className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all ${
                  includesTemperedGlass
                    ? "border-green-eco bg-green-eco text-white"
                    : "border-green-eco/30"
                }`}>
                  {includesTemperedGlass && (
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <span className="font-bold text-charcoal">Tilfoej panserglas</span>
                  <p className="text-xs text-gray">Beskyt din skaerm med haerdet glas</p>
                </div>
              </div>
              <span className="font-display font-bold text-green-eco">{TEMPERED_GLASS_PRICE} DKK</span>
            </button>
          </div>

          {/* Discount badge */}
          {discountPercent > 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-green-eco/10 p-4">
              <span className="rounded-full bg-green-eco px-3 py-1.5 text-xs font-bold text-white">
                -{discountPercent}%
              </span>
              <span className="text-sm font-medium text-charcoal">
                Rabat ved {selectedServiceIds.size} reparationer — du sparer {discountAmount} DKK!
              </span>
            </div>
          )}

          {/* Running total */}
          {selectedServiceIds.size > 0 && (
            <div className="rounded-xl bg-charcoal/[0.03] p-4">
              {discountPercent > 0 && (
                <div className="flex justify-between text-sm text-gray">
                  <span>Subtotal</span>
                  <span className="line-through">{subtotal} DKK</span>
                </div>
              )}
              <div className="mt-1 flex justify-between text-lg font-bold text-charcoal">
                <span>Total</span>
                <span className="text-green-eco">{totalPrice} DKK</span>
              </div>
              <p className="mt-1 text-xs text-gray">Inkl. moms, reservedele og livstidsgaranti</p>
            </div>
          )}
        </div>
      )}

      {/* ---- Step 2: Detaljer ---- */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">
              Dine oplysninger
            </h2>
            <p className="mt-1 text-sm text-gray">Vi bruger disse oplysninger til at kontakte dig om reparationen.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className={labelStyles}>Fulde navn</label>
              <input
                id="name" name="name" type="text" required
                placeholder="Anders Andersen"
                value={customer.name} onChange={handleCustomerChange}
                className={inputStyles}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="phone" className={labelStyles}>Telefon</label>
              <input
                id="phone" name="phone" type="tel" required
                placeholder="+45 XX XX XX XX"
                value={customer.phone} onChange={handleCustomerChange}
                className={inputStyles}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className={labelStyles}>Email</label>
            <input
              id="email" name="email" type="email" required
              placeholder="din@email.dk"
              value={customer.email} onChange={handleCustomerChange}
              className={inputStyles}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="description" className={labelStyles}>Beskriv problemet</label>
            <textarea
              id="description" name="description" required
              placeholder="Beskriv hvad der er galt med din enhed — hvad skete der, og hvornaar startede det?"
              rows={4}
              value={customer.description} onChange={handleCustomerChange}
              className={inputStyles}
            />
          </div>
        </div>
      )}

      {/* ---- Step 3: Dato ---- */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">
              Hvornaar vil du aflevere din enhed?
            </h2>
            <p className="mt-1 text-sm text-gray">
              Vaelg en dato hvor du kan aflevere din enhed i butikken.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {availableDates.map((date) => {
              const isSelected = preferredDate === date;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setPreferredDate(date)}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? "border-green-eco bg-green-eco/5 shadow-sm"
                      : "border-soft-grey hover:border-green-eco/30"
                  }`}
                >
                  <p className={`text-sm font-bold ${isSelected ? "text-green-eco" : "text-charcoal"}`}>
                    {new Date(date + "T12:00:00").toLocaleDateString("da-DK", { weekday: "long" })}
                  </p>
                  <p className="mt-0.5 text-xs text-gray">
                    {new Date(date + "T12:00:00").toLocaleDateString("da-DK", { day: "numeric", month: "long" })}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Parts availability note */}
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-amber-500">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-amber-800">
              <span className="font-bold">Bemaerk:</span> Nogle reservedele har vi ikke paa lager, men vi har dag-til-dag levering og kan have dem klar til naeste dag. Vi kontakter dig hvis din valgte dato skal justeres.
            </p>
          </div>
        </div>
      )}

      {/* ---- Step 4: Bekraeft & Betal ---- */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-charcoal">
              Bekraeft din booking
            </h2>
            <p className="mt-1 text-sm text-gray">Gennemgaa dine valg og vaelg betalingsmetode.</p>
          </div>

          {/* Device */}
          <div className="rounded-xl bg-charcoal/[0.03] p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray">Enhed</p>
            <p className="mt-1 font-display text-lg font-bold text-charcoal">
              {selectedBrand?.name} {selectedModel?.name}
            </p>
          </div>

          {/* Date */}
          <div className="rounded-xl bg-charcoal/[0.03] p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray">Afleveringsdato</p>
            <p className="mt-1 font-display text-lg font-bold text-charcoal">
              {formatDateDanish(preferredDate)}
            </p>
          </div>

          {/* Services */}
          <div className="rounded-xl bg-charcoal/[0.03] p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray">Reparationer</p>
            <ul className="space-y-2">
              {selectedServices.map((s) => (
                <li key={s.id} className="flex justify-between text-sm">
                  <span className="text-charcoal">{s.name}</span>
                  <span className="font-bold text-charcoal">{s.price_dkk} DKK</span>
                </li>
              ))}
              {includesTemperedGlass && (
                <li className="flex justify-between text-sm">
                  <span className="text-charcoal">Panserglas</span>
                  <span className="font-bold text-charcoal">{TEMPERED_GLASS_PRICE} DKK</span>
                </li>
              )}
            </ul>

            <div className="mt-4 border-t border-soft-grey pt-3">
              {discountPercent > 0 && (
                <>
                  <div className="flex justify-between text-sm text-gray">
                    <span>Subtotal</span>
                    <span className="line-through">{subtotal} DKK</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-eco">
                    <span>Rabat ({discountPercent}%)</span>
                    <span>-{discountAmount} DKK</span>
                  </div>
                </>
              )}
              <div className="mt-1 flex justify-between font-display text-lg font-bold">
                <span className="text-charcoal">Total</span>
                <span className="text-green-eco">{totalPrice} DKK</span>
              </div>
              <p className="mt-1 text-xs text-gray">Inkl. moms, reservedele og livstidsgaranti</p>
            </div>
          </div>

          {/* Customer */}
          <div className="rounded-xl bg-charcoal/[0.03] p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray">Kontaktoplysninger</p>
            <dl className="space-y-2 text-sm">
              {[
                ["Navn", customer.name],
                ["Email", customer.email],
                ["Telefon", customer.phone],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-gray">{label}</dt>
                  <dd className="font-medium text-charcoal">{value}</dd>
                </div>
              ))}
              <div>
                <dt className="text-gray">Beskrivelse</dt>
                <dd className="mt-1 text-charcoal">{customer.description}</dd>
              </div>
            </dl>
          </div>

          {/* Guarantee */}
          <div className="flex items-center gap-3 rounded-xl border border-green-eco/20 bg-green-eco/5 p-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 shrink-0 text-green-eco">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <div>
              <p className="text-sm font-bold text-charcoal">Livstidsgaranti inkluderet</p>
              <p className="text-xs text-gray">Alle reparationer daekkes af livstidsgaranti paa arbejde og reservedele.</p>
            </div>
          </div>

          {/* Payment CTAs */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleSubmitAndPay}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-green-eco py-4 text-base font-bold text-white shadow-lg shadow-green-eco/20 transition-all hover:brightness-110 hover:shadow-xl hover:shadow-green-eco/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Opretter betaling...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Betal nu — {totalPrice} DKK
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray">
              Betal sikkert med Klarna, kort eller MobilePay
            </p>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-soft-grey" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-xs text-gray">eller</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmitNoPay}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-soft-grey bg-white py-3.5 text-sm font-bold text-charcoal transition-all hover:border-charcoal/30 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              Betal i butikken
            </button>
          </div>

          {/* Back button for step 4 */}
          <div className="pt-2">
            <button
              type="button"
              onClick={goPrev}
              className="flex items-center gap-2 text-sm font-medium text-gray transition-colors hover:text-charcoal"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
              Tilbage
            </button>
          </div>
        </div>
      )}

      <NavButtons
        step={step}
        canNext={canGoNext}
        onPrev={goPrev}
        onNext={goNext}
        isSubmitting={isSubmitting}
        isLast={step === 4}
      />
    </div>
  );
}
```

**Step 2: Verify the build**

Run: `cd /c/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx next build 2>&1 | tail -10`

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/components/repair/booking-wizard.tsx
git commit -m "feat: add date picker and advance payment to booking wizard"
```

---

## Task 5: Update the webhook to handle Draft Order IDs correctly

The existing webhook at `src/app/api/webhooks/shopify/route.ts` matches orders by `shopify_order_id` or `shopify_draft_order_id`. However, the Shopify `orders/paid` payload includes the `draft_order_id` field separately from the order `id`. We need to check both.

**Files:**
- Modify: `src/app/api/webhooks/shopify/route.ts`

**Step 1: Update the webhook handler**

The current handler matches `payload.id` (the order ID) against both columns. But when a Draft Order is completed, we need to also check `payload.draft_order_id` which is the original Draft Order's numeric ID. Update the `orders/paid` handler:

Replace the `orders/paid` block (lines 27-45) with:

```ts
  if (topic === "orders/paid") {
    const orderId = String(payload.id);
    const draftOrderId = payload.draft_order_id ? String(payload.draft_order_id) : null;

    // Try matching by draft_order_id first (for advance repair payments),
    // then fall back to order_id
    let ticketId: string | null = null;

    if (draftOrderId) {
      // Draft Order IDs from Shopify GraphQL are formatted as "gid://shopify/DraftOrder/123"
      // The webhook sends the numeric ID, so check both formats
      const { data } = await supabase
        .from("repair_tickets")
        .select("id")
        .or(`shopify_draft_order_id.eq.${draftOrderId},shopify_draft_order_id.eq.gid://shopify/DraftOrder/${draftOrderId}`)
        .single();
      if (data) ticketId = data.id;
    }

    if (!ticketId) {
      const { data } = await supabase
        .from("repair_tickets")
        .select("id")
        .or(`shopify_order_id.eq.${orderId},shopify_draft_order_id.eq.${orderId}`)
        .single();
      if (data) ticketId = data.id;
    }

    if (ticketId) {
      await supabase
        .from("repair_tickets")
        .update({
          paid: true,
          paid_at: new Date().toISOString(),
          shopify_order_id: orderId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);
    }
  }
```

**Step 2: Also send a confirmation email when payment completes**

After the ticket update in the `orders/paid` block, add:

```ts
    if (ticketId) {
      // ... existing update code ...

      // Send payment confirmation email
      try {
        const { data: paidTicket } = await supabase
          .from("repair_tickets")
          .select("customer_name, customer_email, device_model, booking_details")
          .eq("id", ticketId)
          .single();

        if (paidTicket?.customer_email) {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          const preferredDate = (paidTicket.booking_details as Record<string, unknown>)?.preferred_date;

          await resend.emails.send({
            from: "PhoneSpot <noreply@phonespot.dk>",
            to: paidTicket.customer_email,
            subject: `Betaling bekraeftet - ${paidTicket.device_model}`,
            text: [
              `Hej ${paidTicket.customer_name},`,
              "",
              `Tak for din betaling! Din reparation af ${paidTicket.device_model} er nu bekraeftet.`,
              "",
              `Sags-ID: ${ticketId.slice(0, 8)}`,
              ...(preferredDate ? [`Onsket aflevering: ${preferredDate}`] : []),
              "",
              "Vi ser frem til at modtage din enhed. Kom forbi butikken paa den aftalte dato.",
              "",
              "Med venlig hilsen,",
              "PhoneSpot",
            ].join("\n"),
          });
        }
      } catch (emailErr) {
        console.error("Payment confirmation email error:", emailErr);
      }
    }
```

**Step 3: Commit**

```bash
git add src/app/api/webhooks/shopify/route.ts
git commit -m "feat: improve webhook Draft Order matching and add payment confirmation email"
```

---

## Task 6: Add SHOPIFY_WEBHOOK_SECRET to env and verify end-to-end

**Files:**
- Modify: `.env.example`

**Step 1: Update .env.example with the webhook secret var**

Add to `.env.example`:

```
# Shopify webhook verification
SHOPIFY_WEBHOOK_SECRET=your_shopify_webhook_secret
```

**Step 2: Manual verification checklist**

Run the dev server: `cd /c/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npm run dev`

Verify:
1. Navigate to `/reparation/booking` — wizard should show 5 steps
2. Complete steps 1-3 (device, services, customer details)
3. Step 4 should show date picker with next 12 weekdays
4. Step 4 should show amber info box about parts availability
5. Step 5 should show full summary with "Betal nu" and "Betal i butikken" buttons
6. "Betal i butikken" should create ticket (existing behavior)
7. "Betal nu" should call `/api/repairs/checkout` and redirect to Shopify checkout

**Step 3: Commit**

```bash
git add .env.example
git commit -m "docs: add SHOPIFY_WEBHOOK_SECRET to env example"
```
