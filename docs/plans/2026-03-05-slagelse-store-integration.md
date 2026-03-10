# PhoneSpot Slagelse Store Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate the Slagelse physical store into phonespot.dk with a shared store config, dedicated `/butik` page, per-location inventory badges on product pages, and a Supabase-backed repair admin panel.

**Architecture:** Three independent workstreams — (1) centralize store data in a shared config and refactor 4 files, (2) add `storeAvailability` to Shopify GraphQL queries and show inventory badges, (3) build a repair ticket system with Supabase for storage, Resend for email, and a protected `/admin/reparationer` dashboard.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Shopify Storefront API (GraphQL 2024-10), Supabase (Postgres + Auth), Resend, Vitest

---

## Workstream 1: Shared Store Config + `/butik` Page

### Task 1: Create shared store config

**Files:**
- Create: `src/lib/store-config.ts`

**Step 1: Create the config file**

```typescript
// src/lib/store-config.ts

export const STORE = {
  name: "PhoneSpot Slagelse",
  company: "PhoneSpot ApS",
  mall: "VestsjællandsCentret",
  street: "VestsjællandsCentret 10",
  city: "Slagelse",
  zip: "4200",
  country: "Danmark",
  countryCode: "DK",
  phone: "+45 XX XX XX XX",
  email: "info@phonespot.dk",
  shopifyLocationId: "90389381464",
  hours: {
    weekdays: "10:00 – 18:00",
    saturday: "10:00 – 16:00",
    sunday: "Lukket",
  },
  googleMapsUrl:
    "https://maps.google.com/?q=VestsjællandsCentret+10,+4200+Slagelse",
  googleMapsEmbed:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2245.5!2d11.3531!3d55.4028!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTXCsDI0JzEwLjEiTiAxMcKwMjEnMTEuMiJF!5e0!3m2!1sda!2sdk!4v1",
  coordinates: { lat: 55.4028, lng: 11.3531 },
} as const;

export type StoreConfig = typeof STORE;
```

**Step 2: Verify build**

Run: `cd /c/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/store-config.ts
git commit -m "feat: add shared store config for Slagelse location"
```

---

### Task 2: Refactor existing files to use shared config

**Files:**
- Modify: `src/components/ui/store-location.tsx` — replace hardcoded `STORE_INFO` with import from `store-config.ts`
- Modify: `src/components/layout/footer.tsx` — replace hardcoded "VestsjællandsCentret, Slagelse" string with import, add "Butik" to SERVICE_LINKS
- Modify: `src/app/kontakt/page.tsx` — replace hardcoded address/hours with import
- Modify: `src/components/seo/json-ld.tsx` — replace hardcoded address fields with import

**Step 1: Refactor store-location.tsx**

Remove lines 3-16 (the `STORE_INFO` object). Add import at top:

```typescript
import { STORE } from "@/lib/store-config";
```

Replace all `STORE_INFO.mall` → `STORE.mall`, `STORE_INFO.street` → `STORE.street`, `STORE_INFO.zip` → `STORE.zip`, `STORE_INFO.city` → `STORE.city`, `STORE_INFO.hours.weekdays` → `STORE.hours.weekdays`, etc. Also update the `googleMapsUrl` check:

```typescript
{STORE.googleMapsUrl && (
  <a href={STORE.googleMapsUrl} ...>
```

**Step 2: Refactor footer.tsx**

Add import and add "Butik" link:

```typescript
import { STORE } from "@/lib/store-config";
```

Change the SERVICE_LINKS array to add Butik:
```typescript
const SERVICE_LINKS = [
  { label: "Kvalitet", href: "/kvalitet" },
  { label: "Garanti", href: "/garanti" },
  { label: "Reparation", href: "/reparation" },
  { label: "Butik", href: "/butik" },
  { label: "Reklamation", href: "/reklamation" },
  { label: "Kontakt", href: "/kontakt" },
] as const;
```

Change line 144 from hardcoded text to:
```tsx
<span className="text-xs text-white/50">Fysisk butik i {STORE.mall}, {STORE.city}</span>
```

**Step 3: Refactor kontakt/page.tsx**

Add import:
```typescript
import { STORE } from "@/lib/store-config";
```

Replace the address section (around line 211-216) with:
```tsx
<p className="text-sm text-gray">
  {STORE.company}
  <br />
  {STORE.street}
  <br />
  {STORE.zip} {STORE.city}
</p>
```

Replace the hours section (around line 241-245) with:
```tsx
<p className="text-sm text-gray">
  Man – Fre: {STORE.hours.weekdays}
  <br />
  Lørdag: {STORE.hours.saturday}
  <br />
  Søndag: {STORE.hours.sunday}
</p>
```

**Step 4: Refactor json-ld.tsx**

Add import:
```typescript
import { STORE } from "@/lib/store-config";
```

Replace the hardcoded address object with:
```typescript
address: {
  "@type": "PostalAddress",
  streetAddress: STORE.street,
  addressLocality: STORE.city,
  postalCode: STORE.zip,
  addressCountry: STORE.countryCode,
},
```

**Step 5: Verify build**

Run: `cd /c/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx next build 2>&1 | tail -5`
Expected: Build succeeds. No hardcoded store data remains in the 4 refactored files.

**Step 6: Commit**

```bash
git add src/components/ui/store-location.tsx src/components/layout/footer.tsx src/app/kontakt/page.tsx src/components/seo/json-ld.tsx
git commit -m "refactor: use shared store config in all store-related files"
```

---

### Task 3: Build the `/butik` page

**Files:**
- Create: `src/app/butik/page.tsx`

**Step 1: Create the page**

The page is a static server component. It should follow the existing PhoneSpot design system (SectionWrapper, Heading, FadeIn, TrustBar). Use the existing Tailwind design tokens: `charcoal`, `green-eco`, `sand`, `cream`, `gray`, `soft-grey`, `font-display`, `font-body`.

```tsx
// src/app/butik/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { STORE } from "@/lib/store-config";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Heading } from "@/components/ui/heading";
import { TrustBar } from "@/components/ui/trust-bar";
import { FadeIn } from "@/components/ui/fade-in";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "PhoneSpot Slagelse — Besøg os i VestsjællandsCentret",
  description:
    "Besøg PhoneSpot i VestsjællandsCentret, Slagelse. Reparation, personlig rådgivning og refurbished elektronik med 36 mdr. garanti.",
  alternates: { canonical: "https://phonespot.dk/butik" },
  openGraph: {
    title: "PhoneSpot Slagelse — Besøg os i VestsjællandsCentret",
    description:
      "Besøg PhoneSpot i VestsjællandsCentret, Slagelse. Reparation, personlig rådgivning og refurbished elektronik med 36 mdr. garanti.",
    url: "https://phonespot.dk/butik",
    type: "website",
  },
};

const STORE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: STORE.name,
  url: "https://phonespot.dk/butik",
  telephone: STORE.phone,
  email: STORE.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: STORE.street,
    addressLocality: STORE.city,
    postalCode: STORE.zip,
    addressCountry: STORE.countryCode,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: STORE.coordinates.lat,
    longitude: STORE.coordinates.lng,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "10:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "10:00",
      closes: "16:00",
    },
  ],
  priceRange: "$$",
};

const SERVICES = [
  {
    title: "Reparation",
    description:
      "Få din iPhone, iPad eller MacBook repareret samme dag. Skærmskift, batteriskift og meget mere.",
    href: "/reparation",
    icon: "wrench",
  },
  {
    title: "Personlig rådgivning",
    description:
      "Usikker på hvilken enhed der passer dig? Vores team hjælper dig med at finde den perfekte refurbished enhed.",
    href: null,
    icon: "chat",
  },
  {
    title: "Afprøv produkter",
    description:
      "Se og prøv vores refurbished iPhones, iPads og bærbare inden du køber. Mærk kvaliteten selv.",
    href: null,
    icon: "device",
  },
];

function ServiceIcon({ type }: { type: string }) {
  const cls = "h-7 w-7";
  if (type === "wrench") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    );
  }
  if (type === "chat") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  // device
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

export default function ButikPage() {
  return (
    <>
      <JsonLd data={STORE_JSONLD} />

      {/* ── Hero ── */}
      <SectionWrapper background="charcoal" className="text-center text-white">
        <FadeIn>
          <span className="mb-4 inline-block rounded-full bg-green-eco/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
            {STORE.mall}
          </span>
          <Heading size="xl" className="text-white">
            Besøg PhoneSpot Slagelse
          </Heading>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            Kom forbi vores butik i {STORE.mall} og oplev refurbished
            kvalitet på egen hånd. Vi tilbyder personlig rådgivning,
            reparation og et bredt udvalg af kvalitetstestet elektronik.
          </p>
        </FadeIn>
      </SectionWrapper>

      {/* ── Google Maps ── */}
      <div className="w-full">
        <iframe
          src={STORE.googleMapsEmbed}
          width="100%"
          height="400"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`${STORE.name} på Google Maps`}
          className="w-full"
        />
      </div>

      {/* ── Address + Hours ── */}
      <SectionWrapper>
        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          <FadeIn>
            <div className="rounded-2xl border border-soft-grey bg-white p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[10px] bg-green-eco/10 text-green-eco">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <h2 className="font-display text-base font-bold text-charcoal">Adresse</h2>
              <p className="mt-2 text-sm text-gray">
                {STORE.company}<br />
                {STORE.street}<br />
                {STORE.zip} {STORE.city}
              </p>
              <a
                href={STORE.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-green-eco hover:underline"
              >
                Åbn i Google Maps &rarr;
              </a>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="rounded-2xl border border-soft-grey bg-white p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[10px] bg-green-eco/10 text-green-eco">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h2 className="font-display text-base font-bold text-charcoal">Åbningstider</h2>
              <div className="mt-2 space-y-1 text-sm text-gray">
                <p><span className="font-medium text-charcoal">Man – Fre:</span> {STORE.hours.weekdays}</p>
                <p><span className="font-medium text-charcoal">Lørdag:</span> {STORE.hours.saturday}</p>
                <p><span className="font-medium text-charcoal">Søndag:</span> {STORE.hours.sunday}</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* ── Services ── */}
      <SectionWrapper background="sand">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              I butikken
            </p>
            <Heading as="h2" size="md">
              Det kan du hos os
            </Heading>
          </FadeIn>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
          {SERVICES.map((svc, i) => (
            <FadeIn key={svc.title} delay={i * 0.1}>
              <div className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-eco/10 text-green-eco">
                  <ServiceIcon type={svc.icon} />
                </div>
                <h3 className="font-display text-lg font-bold text-charcoal">{svc.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-gray">{svc.description}</p>
                {svc.href && (
                  <Link href={svc.href} className="mt-4 text-sm font-semibold text-green-eco hover:underline">
                    Læs mere &rarr;
                  </Link>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Photo gallery placeholder ── */}
      <SectionWrapper>
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <Heading as="h2" size="md">Vores butik</Heading>
            <p className="mt-4 text-gray">Billeder fra vores butik i {STORE.mall}</p>
          </FadeIn>
        </div>
        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="aspect-[4/3] rounded-2xl bg-sand flex items-center justify-center text-gray text-sm">
                Butiksbillede {i}
              </div>
            </FadeIn>
          ))}
        </div>
      </SectionWrapper>

      {/* ── CTA ── */}
      <SectionWrapper background="cream">
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <Heading as="h2" size="md">Har du spørgsmål?</Heading>
            <p className="mt-4 text-gray">
              Kontakt os inden du kigger forbi, eller bare mød op i åbningstiden.
              Vi glæder os til at hjælpe dig.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/kontakt"
                className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
              >
                Kontakt os &rarr;
              </Link>
              <a
                href={STORE.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-full border-2 border-charcoal/20 px-8 py-3 font-semibold text-charcoal transition-colors hover:border-charcoal hover:bg-charcoal hover:text-white"
              >
                Få rutevejledning &rarr;
              </a>
            </div>
          </FadeIn>
        </div>
      </SectionWrapper>

      {/* ── Trust ── */}
      <SectionWrapper>
        <TrustBar />
      </SectionWrapper>
    </>
  );
}
```

**Step 2: Verify build**

Run: `cd /c/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx next build 2>&1 | tail -10`
Expected: Build succeeds. Route `/butik` appears as `○` (Static).

**Step 3: Commit**

```bash
git add src/app/butik/page.tsx
git commit -m "feat: add dedicated /butik page for Slagelse store"
```

---

## Workstream 2: Store Availability on Product Pages

### Task 4: Add storeAvailability to Shopify GraphQL query and types

**Files:**
- Modify: `src/lib/shopify/queries.ts:42-60` — add `storeAvailability` inside the variants fragment
- Modify: `src/lib/shopify/types.ts:20-27` — add `storeAvailability` to `ProductVariant` interface
- Modify: `src/lib/shopify/types.ts:106-109` — add raw type for reshaping
- Modify: `src/lib/shopify/client.ts:84-90` — update `reshapeProduct` to flatten `storeAvailability`

**Step 1: Update types.ts — add StoreAvailability type and update ProductVariant**

Add after line 17 (after `ShopifyImage` interface):

```typescript
/** Store availability for a variant at a physical location. */
export interface StoreAvailability {
  available: boolean;
  pickUpTime: string | null;
  location: {
    id: string;
    name: string;
  };
}
```

Add to `ProductVariant` interface after `compareAtPrice`:

```typescript
storeAvailability?: StoreAvailability[];
```

Add a raw variant type for reshaping. After `ShopifyProductRaw` (line 106), add:

```typescript
export interface ShopifyProductVariantRaw extends Omit<ProductVariant, "storeAvailability"> {
  storeAvailability?: ShopifyConnection<StoreAvailability>;
}
```

Update `ShopifyProductRaw` to use the new raw variant type:

```typescript
export interface ShopifyProductRaw extends Omit<Product, "images" | "variants"> {
  images: ShopifyConnection<ShopifyImage>;
  variants: ShopifyConnection<ShopifyProductVariantRaw>;
}
```

**Step 2: Update queries.ts — add storeAvailability to PRODUCT_FRAGMENT**

Inside the `variants(first: 50) { nodes { ... } }` block, after `compareAtPrice { ... }`, add:

```graphql
        storeAvailability(first: 5) {
          nodes {
            available
            pickUpTime
            location {
              id
              name
            }
          }
        }
```

**Step 3: Update client.ts — reshape storeAvailability**

Update the `reshapeProduct` function to flatten variant `storeAvailability`:

```typescript
function reshapeProduct(raw: ShopifyProductRaw): Product {
  return {
    ...raw,
    images: raw.images.nodes,
    variants: raw.variants.nodes.map((v) => ({
      ...v,
      storeAvailability: v.storeAvailability?.nodes,
    })),
  };
}
```

**Step 4: Verify build**

Run: `cd /c/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx next build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/lib/shopify/queries.ts src/lib/shopify/types.ts src/lib/shopify/client.ts
git commit -m "feat: add storeAvailability to Shopify product query and types"
```

---

### Task 5: Create StoreAvailabilityBadge component and integrate into product pages

**Files:**
- Create: `src/components/product/store-availability-badge.tsx`
- Modify: `src/components/product/product-info.tsx` — add the badge below the "Add to cart" button

**Step 1: Create the badge component**

```tsx
// src/components/product/store-availability-badge.tsx
import Link from "next/link";
import type { StoreAvailability } from "@/lib/shopify/types";
import { STORE } from "@/lib/store-config";

type Props = {
  storeAvailability?: StoreAvailability[];
};

export function StoreAvailabilityBadge({ storeAvailability }: Props) {
  if (!storeAvailability || storeAvailability.length === 0) {
    return null;
  }

  // Find the Slagelse location
  const slagelse = storeAvailability.find(
    (sa) =>
      sa.location.name.toLowerCase().includes("slagelse") ||
      sa.location.name.toLowerCase().includes("vestsjælland") ||
      sa.location.id.includes(STORE.shopifyLocationId),
  );

  if (!slagelse) return null;

  if (slagelse.available) {
    return (
      <Link
        href="/butik"
        className="flex items-center gap-2 rounded-xl bg-green-eco/5 px-4 py-2.5 transition-colors hover:bg-green-eco/10"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="h-4 w-4 text-green-eco"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
          />
        </svg>
        <span className="text-xs font-medium text-green-eco">
          På lager i Slagelse
          {slagelse.pickUpTime ? ` — ${slagelse.pickUpTime}` : " — Klar til afhentning"}
        </span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-sand/40 px-4 py-2.5">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-4 w-4 text-gray"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
        />
      </svg>
      <span className="text-xs font-medium text-gray">
        Ikke på lager i butikken — bestil online med levering
      </span>
    </div>
  );
}
```

**Step 2: Add badge to product-info.tsx**

Add import at the top of `src/components/product/product-info.tsx`:

```typescript
import { StoreAvailabilityBadge } from "@/components/product/store-availability-badge";
```

Inside the `ProductInfoInner` component, after the `<AddToCartButton>` (around line 211) and before the trust strip `<div>` (around line 214), add:

```tsx
      {/* ---- Store availability ---- */}
      <StoreAvailabilityBadge storeAvailability={selectedVariant?.storeAvailability} />
```

**Step 3: Verify build**

Run: `cd /c/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx next build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/components/product/store-availability-badge.tsx src/components/product/product-info.tsx
git commit -m "feat: add store availability badge to product pages"
```

---

## Workstream 3: Repair Admin Panel

### Task 6: Install Supabase and set up client

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/types.ts`
- Modify: `.env.local` — add Supabase env vars
- Modify: `.env.example` — add Supabase env vars

**Prerequisites:** The user must create a Supabase project at https://supabase.com and run the SQL schema from the design doc to create the 3 tables (`repair_tickets`, `repair_quotes`, `repair_status_log`). They also need to enable email/password auth in Supabase dashboard.

**Step 1: Install Supabase client**

Run: `cd /c/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npm install @supabase/supabase-js`

**Step 2: Add env vars to .env.local**

Append to `.env.local`:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Step 3: Create database types**

```typescript
// src/lib/supabase/types.ts

export type RepairStatus =
  | "modtaget"
  | "tilbud_sendt"
  | "godkendt"
  | "i_gang"
  | "faerdig"
  | "afhentet";

export interface RepairTicket {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  device_type: string;
  device_model: string;
  issue_description: string;
  service_type: string;
  status: RepairStatus;
  created_at: string;
  updated_at: string;
}

export interface RepairQuote {
  id: string;
  ticket_id: string;
  price_dkk: number;
  estimated_days: number | null;
  notes: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  created_at: string;
}

export interface RepairStatusLog {
  id: string;
  ticket_id: string;
  old_status: string | null;
  new_status: string;
  note: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      repair_tickets: {
        Row: RepairTicket;
        Insert: Omit<RepairTicket, "id" | "created_at" | "updated_at" | "status">;
        Update: Partial<RepairTicket>;
      };
      repair_quotes: {
        Row: RepairQuote;
        Insert: Omit<RepairQuote, "id" | "created_at">;
        Update: Partial<RepairQuote>;
      };
      repair_status_log: {
        Row: RepairStatusLog;
        Insert: Omit<RepairStatusLog, "id" | "created_at">;
        Update: Partial<RepairStatusLog>;
      };
    };
  };
}
```

**Step 4: Create Supabase clients**

```typescript
// src/lib/supabase/client.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Browser/client-side Supabase client (uses anon key). */
export function createBrowserClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

/** Server-side Supabase client (uses service role key — bypasses RLS). */
export function createServerClient() {
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}
```

**Step 5: Verify build**

Run: `cd /c/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx next build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 6: Commit**

```bash
git add src/lib/supabase/client.ts src/lib/supabase/types.ts package.json package-lock.json
git commit -m "feat: add Supabase client and database types for repair system"
```

---

### Task 7: Create repair request API route

**Files:**
- Create: `src/app/api/repairs/route.ts`

**Step 1: Create the API route**

This route handles POST requests to create new repair tickets. It validates input, inserts into Supabase, and sends emails via Resend.

```typescript
// src/app/api/repairs/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/client";
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
  } = body;

  // Validate required fields
  if (
    !customer_name ||
    !customer_email ||
    !customer_phone ||
    !device_type ||
    !device_model ||
    !issue_description ||
    !service_type
  ) {
    return NextResponse.json(
      { error: "Udfyld venligst alle påkrævede felter" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // Insert ticket
  const { data: ticket, error } = await supabase
    .from("repair_tickets")
    .insert({
      customer_name,
      customer_email,
      customer_phone,
      device_type,
      device_model,
      issue_description,
      service_type,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json(
      { error: "Kunne ikke oprette reparationsanmodning" },
      { status: 500 },
    );
  }

  // Send confirmation to customer
  try {
    await resend.emails.send({
      from: "PhoneSpot Reparation <noreply@phonespot.dk>",
      to: customer_email,
      subject: "Vi har modtaget din reparationsanmodning",
      text: [
        `Hej ${customer_name},`,
        "",
        `Tak for din reparationsanmodning. Vi har modtaget den og vender tilbage hurtigst muligt med et tilbud.`,
        "",
        `Enhed: ${device_type} ${device_model}`,
        `Problem: ${issue_description}`,
        `Service: ${service_type}`,
        "",
        `Du kan aflevere din enhed i vores butik:`,
        `${STORE.street}, ${STORE.zip} ${STORE.city}`,
        `Åbningstider: Man-Fre ${STORE.hours.weekdays}, Lør ${STORE.hours.saturday}`,
        "",
        "Med venlig hilsen,",
        "PhoneSpot Reparation",
      ].join("\n"),
    });
  } catch (emailErr) {
    console.error("Customer email failed:", emailErr);
  }

  // Notify staff
  try {
    await resend.emails.send({
      from: "PhoneSpot System <noreply@phonespot.dk>",
      to: STORE.email,
      subject: `Ny reparation: ${device_type} ${device_model} — ${customer_name}`,
      text: [
        `Ny reparationsanmodning:`,
        "",
        `Kunde: ${customer_name}`,
        `Email: ${customer_email}`,
        `Telefon: ${customer_phone}`,
        `Enhed: ${device_type} ${device_model}`,
        `Problem: ${issue_description}`,
        `Service: ${service_type}`,
        "",
        `Ticket ID: ${ticket.id}`,
        `Oprettet: ${ticket.created_at}`,
      ].join("\n"),
    });
  } catch (emailErr) {
    console.error("Staff email failed:", emailErr);
  }

  return NextResponse.json({ success: true, ticketId: ticket.id });
}
```

**Step 2: Verify build**

Run: `cd /c/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx next build 2>&1 | tail -5`
Expected: Build succeeds. Route `/api/repairs` appears as `ƒ` (Dynamic).

**Step 3: Commit**

```bash
git add src/app/api/repairs/route.ts
git commit -m "feat: add repair ticket creation API with email notifications"
```

---

### Task 8: Add repair request form to reparation page

**Files:**
- Create: `src/app/reparation/repair-form.tsx` — client component with the form
- Modify: `src/app/reparation/page.tsx` — add the form before the CTA section

**Step 1: Create the repair form client component**

```tsx
// src/app/reparation/repair-form.tsx
"use client";

import { useState } from "react";
import { FormField } from "@/components/ui/form-field";

type Status = "idle" | "submitting" | "success" | "error";

const DEVICE_TYPES = ["iPhone", "iPad", "Samsung", "MacBook", "Andet"];
const SERVICE_TYPES = [
  "Skærmudskiftning",
  "Batteriskift",
  "Vandskade",
  "Kamera-reparation",
  "Ladestik / port",
  "Andet",
];

export function RepairForm() {
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    device_type: "",
    device_model: "",
    issue_description: "",
    service_type: "",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Noget gik galt");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Kunne ikke sende anmodning",
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-green-eco/30 bg-green-pale p-8 text-center">
        <p className="text-lg font-semibold text-charcoal">
          Tak for din reparationsanmodning!
        </p>
        <p className="mt-2 text-gray">
          Vi har sendt en bekræftelse til din email og vender tilbage
          hurtigst muligt med et tilbud.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setFormData({
              customer_name: "",
              customer_email: "",
              customer_phone: "",
              device_type: "",
              device_model: "",
              issue_description: "",
              service_type: "",
            });
          }}
          className="mt-6 rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
        >
          Send en ny anmodning
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-soft-grey bg-white p-6 md:p-8"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          label="Navn"
          name="customer_name"
          type="text"
          required
          placeholder="Dit fulde navn"
          value={formData.customer_name}
          onChange={handleChange}
        />
        <FormField
          label="Email"
          name="customer_email"
          type="email"
          required
          placeholder="din@email.dk"
          value={formData.customer_email}
          onChange={handleChange}
        />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <FormField
          label="Telefon"
          name="customer_phone"
          type="tel"
          required
          placeholder="+45 XX XX XX XX"
          value={formData.customer_phone}
          onChange={handleChange}
        />
        <FormField
          label="Enhedstype"
          name="device_type"
          type="select"
          required
          options={DEVICE_TYPES}
          placeholder="Vælg enhedstype..."
          value={formData.device_type}
          onChange={handleChange}
        />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <FormField
          label="Model"
          name="device_model"
          type="text"
          required
          placeholder="F.eks. iPhone 14 Pro"
          value={formData.device_model}
          onChange={handleChange}
        />
        <FormField
          label="Ønsket service"
          name="service_type"
          type="select"
          required
          options={SERVICE_TYPES}
          placeholder="Vælg service..."
          value={formData.service_type}
          onChange={handleChange}
        />
      </div>

      <div className="mt-6">
        <FormField
          label="Beskrivelse af problem"
          name="issue_description"
          type="textarea"
          required
          placeholder="Beskriv hvad der er galt med din enhed..."
          value={formData.issue_description}
          onChange={handleChange}
        />
      </div>

      {status === "error" && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      <div className="mt-8">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {status === "submitting" ? "Sender..." : "Send reparationsanmodning"}
        </button>
      </div>
    </form>
  );
}
```

**Step 2: Add the form to the reparation page**

In `src/app/reparation/page.tsx`, add import at top:

```typescript
import { RepairForm } from "./repair-form";
```

Before the final CTA section (the `"Klar til at få din enhed fikset?"` section, around line 586), add a new section:

```tsx
      {/* ── Repair request form ── */}
      <SectionWrapper id="book-reparation">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[3px] text-green-eco">
              Book reparation
            </p>
            <Heading as="h2" size="md">
              Send din reparationsanmodning
            </Heading>
            <p className="mt-4 text-gray">
              Udfyld formularen herunder, og vi vender tilbage med et tilbud
              inden for 24 timer. Du kan også aflevere din enhed direkte i
              vores butik.
            </p>
          </FadeIn>
        </div>
        <div className="mx-auto mt-10 max-w-2xl">
          <RepairForm />
        </div>
      </SectionWrapper>
```

Also update the hero CTA link (line 269) from `/kontakt` to `#book-reparation`:

```tsx
<Link
  href="#book-reparation"
  className="inline-block rounded-full bg-green-eco px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
>
  Book en reparation &rarr;
</Link>
```

**Step 3: Verify build**

Run: `cd /c/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx next build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/app/reparation/repair-form.tsx src/app/reparation/page.tsx
git commit -m "feat: add repair request form to reparation page"
```

---

### Task 9: Create admin layout with auth guard

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/login/page.tsx`

**Step 1: Create admin layout with Supabase auth guard**

```tsx
// src/app/admin/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-eco border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <AdminLogin supabase={supabase} />;
  }

  return (
    <div className="min-h-screen bg-sand/30">
      <header className="border-b border-soft-grey bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="font-display text-lg font-bold text-charcoal">
            PhoneSpot Admin
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray">{user.email}</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-lg bg-charcoal/5 px-4 py-2 text-sm font-medium text-charcoal hover:bg-charcoal/10"
            >
              Log ud
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}

function AdminLogin({
  supabase,
}: {
  supabase: ReturnType<typeof createBrowserClient>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Forkert email eller adgangskode");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand/30 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-soft-grey bg-white p-8">
        <h1 className="font-display text-xl font-bold text-charcoal">
          PhoneSpot Admin
        </h1>
        <p className="mt-2 text-sm text-gray">Log ind for at administrere reparationer</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="admin-email" className="text-sm font-medium text-charcoal">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-soft-grey px-4 py-2.5 text-sm focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="text-sm font-medium text-charcoal">
              Adgangskode
            </label>
            <input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-soft-grey px-4 py-2.5 text-sm focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-eco py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Logger ind..." : "Log ind"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `cd /c/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx next build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/admin/layout.tsx
git commit -m "feat: add admin layout with Supabase auth guard"
```

---

### Task 10: Create repair admin dashboard — ticket list

**Files:**
- Create: `src/app/admin/reparationer/page.tsx`

**Step 1: Create the ticket list page**

```tsx
// src/app/admin/reparationer/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import type { RepairTicket, RepairStatus } from "@/lib/supabase/types";

const STATUS_LABELS: Record<RepairStatus, string> = {
  modtaget: "Modtaget",
  tilbud_sendt: "Tilbud sendt",
  godkendt: "Godkendt",
  i_gang: "I gang",
  faerdig: "Færdig",
  afhentet: "Afhentet",
};

const STATUS_COLORS: Record<RepairStatus, string> = {
  modtaget: "bg-blue-100 text-blue-700",
  tilbud_sendt: "bg-yellow-100 text-yellow-700",
  godkendt: "bg-green-100 text-green-700",
  i_gang: "bg-orange-100 text-orange-700",
  faerdig: "bg-emerald-100 text-emerald-700",
  afhentet: "bg-gray-100 text-gray-600",
};

const ALL_STATUSES: RepairStatus[] = [
  "modtaget",
  "tilbud_sendt",
  "godkendt",
  "i_gang",
  "faerdig",
  "afhentet",
];

export default function AdminReparationerPage() {
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<RepairStatus | "all">("all");
  const [search, setSearch] = useState("");
  const supabase = createBrowserClient();

  useEffect(() => {
    async function load() {
      let query = supabase
        .from("repair_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data } = await query;
      setTickets((data as RepairTicket[]) ?? []);
      setLoading(false);
    }

    load();
  }, [supabase, filterStatus]);

  const filtered = search
    ? tickets.filter(
        (t) =>
          t.customer_name.toLowerCase().includes(search.toLowerCase()) ||
          t.customer_email.toLowerCase().includes(search.toLowerCase()) ||
          t.device_model.toLowerCase().includes(search.toLowerCase()),
      )
    : tickets;

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-charcoal">
        Reparationer
      </h2>
      <p className="mt-1 text-sm text-gray">
        {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"} i alt
      </p>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setFilterStatus("all")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            filterStatus === "all"
              ? "bg-charcoal text-white"
              : "bg-white text-charcoal hover:bg-charcoal/5"
          }`}
        >
          Alle
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filterStatus === s
                ? "bg-charcoal text-white"
                : "bg-white text-charcoal hover:bg-charcoal/5"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mt-4">
        <input
          type="text"
          placeholder="Søg efter navn, email eller model..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-soft-grey px-4 py-2.5 text-sm focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
        />
      </div>

      {/* Ticket list */}
      {loading ? (
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-center text-gray">Ingen reparationer fundet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/admin/reparationer/${ticket.id}`}
              className="block rounded-xl border border-soft-grey bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display font-semibold text-charcoal">
                    {ticket.customer_name}
                  </p>
                  <p className="mt-0.5 text-sm text-gray">
                    {ticket.device_type} {ticket.device_model} —{" "}
                    {ticket.service_type}
                  </p>
                  <p className="mt-1 text-xs text-gray">
                    {new Date(ticket.created_at).toLocaleDateString("da-DK", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    STATUS_COLORS[ticket.status as RepairStatus]
                  }`}
                >
                  {STATUS_LABELS[ticket.status as RepairStatus]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `cd /c/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx next build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/admin/reparationer/page.tsx
git commit -m "feat: add admin repair ticket list page"
```

---

### Task 11: Create repair admin — ticket detail with quoting and status updates

**Files:**
- Create: `src/app/admin/reparationer/[id]/page.tsx`
- Create: `src/app/api/repairs/[id]/quote/route.ts`
- Create: `src/app/api/repairs/[id]/status/route.ts`

**Step 1: Create quote API route**

```typescript
// src/app/api/repairs/[id]/quote/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/client";
import { STORE } from "@/lib/store-config";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { price_dkk, estimated_days, notes } = body;

  if (!price_dkk || price_dkk <= 0) {
    return NextResponse.json({ error: "Ugyldig pris" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get ticket
  const { data: ticket } = await supabase
    .from("repair_tickets")
    .select("*")
    .eq("id", id)
    .single();

  if (!ticket) {
    return NextResponse.json({ error: "Ticket ikke fundet" }, { status: 404 });
  }

  // Create quote
  const { error: quoteError } = await supabase.from("repair_quotes").insert({
    ticket_id: id,
    price_dkk,
    estimated_days: estimated_days || null,
    notes: notes || null,
    sent_at: new Date().toISOString(),
  });

  if (quoteError) {
    return NextResponse.json({ error: "Kunne ikke oprette tilbud" }, { status: 500 });
  }

  // Update ticket status
  const oldStatus = ticket.status;
  await supabase
    .from("repair_tickets")
    .update({ status: "tilbud_sendt", updated_at: new Date().toISOString() })
    .eq("id", id);

  // Log status change
  await supabase.from("repair_status_log").insert({
    ticket_id: id,
    old_status: oldStatus,
    new_status: "tilbud_sendt",
    note: `Tilbud sendt: ${price_dkk} DKK`,
  });

  // Email customer
  try {
    await resend.emails.send({
      from: "PhoneSpot Reparation <noreply@phonespot.dk>",
      to: ticket.customer_email,
      subject: `Tilbud på reparation af din ${ticket.device_type} ${ticket.device_model}`,
      text: [
        `Hej ${ticket.customer_name},`,
        "",
        `Vi har nu vurderet din ${ticket.device_type} ${ticket.device_model} og kan tilbyde følgende:`,
        "",
        `Pris: ${price_dkk} DKK (inkl. moms og reservedele)`,
        estimated_days ? `Estimeret tid: ${estimated_days} hverdage` : "",
        notes ? `Note: ${notes}` : "",
        "",
        `Vil du godkende tilbuddet? Svar på denne email eller ring til os.`,
        "",
        `${STORE.street}, ${STORE.zip} ${STORE.city}`,
        `Tlf: ${STORE.phone}`,
        "",
        "Med venlig hilsen,",
        "PhoneSpot Reparation",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  } catch (emailErr) {
    console.error("Quote email failed:", emailErr);
  }

  return NextResponse.json({ success: true });
}
```

**Step 2: Create status update API route**

```typescript
// src/app/api/repairs/[id]/status/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/client";
import { STORE } from "@/lib/store-config";
import type { RepairStatus } from "@/lib/supabase/types";

const resend = new Resend(process.env.RESEND_API_KEY);

const STATUS_EMAIL_SUBJECTS: Partial<Record<RepairStatus, string>> = {
  godkendt: "Din reparation er godkendt",
  i_gang: "Vi er gået i gang med din reparation",
  faerdig: "Din enhed er klar til afhentning!",
};

const STATUS_EMAIL_BODIES: Partial<Record<RepairStatus, (name: string, device: string) => string>> = {
  godkendt: (name, device) =>
    `Hej ${name},\n\nVi har modtaget din godkendelse og sætter reparationen af din ${device} i gang hurtigst muligt. Vi giver dig besked når den er færdig.\n\nMed venlig hilsen,\nPhoneSpot Reparation`,
  i_gang: (name, device) =>
    `Hej ${name},\n\nVi er nu gået i gang med reparationen af din ${device}. Vi forventer at den er klar inden for den estimerede tid.\n\nMed venlig hilsen,\nPhoneSpot Reparation`,
  faerdig: (name, device) =>
    `Hej ${name},\n\nDin ${device} er nu klar til afhentning!\n\nDu kan hente den i vores butik:\n${STORE.street}, ${STORE.zip} ${STORE.city}\nÅbningstider: Man-Fre ${STORE.hours.weekdays}, Lør ${STORE.hours.saturday}\n\nMed venlig hilsen,\nPhoneSpot Reparation`,
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { status, note } = body as { status: RepairStatus; note?: string };

  const supabase = createServerClient();

  // Get ticket
  const { data: ticket } = await supabase
    .from("repair_tickets")
    .select("*")
    .eq("id", id)
    .single();

  if (!ticket) {
    return NextResponse.json({ error: "Ticket ikke fundet" }, { status: 404 });
  }

  const oldStatus = ticket.status;

  // Update status
  await supabase
    .from("repair_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  // Log status change
  await supabase.from("repair_status_log").insert({
    ticket_id: id,
    old_status: oldStatus,
    new_status: status,
    note: note || null,
  });

  // Send email if applicable
  const subject = STATUS_EMAIL_SUBJECTS[status];
  const bodyFn = STATUS_EMAIL_BODIES[status];
  if (subject && bodyFn) {
    try {
      await resend.emails.send({
        from: "PhoneSpot Reparation <noreply@phonespot.dk>",
        to: ticket.customer_email,
        subject,
        text: bodyFn(
          ticket.customer_name,
          `${ticket.device_type} ${ticket.device_model}`,
        ),
      });
    } catch (emailErr) {
      console.error("Status email failed:", emailErr);
    }
  }

  return NextResponse.json({ success: true });
}
```

**Step 3: Create ticket detail page**

```tsx
// src/app/admin/reparationer/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type {
  RepairTicket,
  RepairQuote,
  RepairStatusLog,
  RepairStatus,
} from "@/lib/supabase/types";

const STATUS_LABELS: Record<RepairStatus, string> = {
  modtaget: "Modtaget",
  tilbud_sendt: "Tilbud sendt",
  godkendt: "Godkendt",
  i_gang: "I gang",
  faerdig: "Færdig",
  afhentet: "Afhentet",
};

const STATUS_COLORS: Record<RepairStatus, string> = {
  modtaget: "bg-blue-100 text-blue-700",
  tilbud_sendt: "bg-yellow-100 text-yellow-700",
  godkendt: "bg-green-100 text-green-700",
  i_gang: "bg-orange-100 text-orange-700",
  faerdig: "bg-emerald-100 text-emerald-700",
  afhentet: "bg-gray-100 text-gray-600",
};

const NEXT_STATUS: Partial<Record<RepairStatus, RepairStatus>> = {
  modtaget: "tilbud_sendt",
  tilbud_sendt: "godkendt",
  godkendt: "i_gang",
  i_gang: "faerdig",
  faerdig: "afhentet",
};

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createBrowserClient();

  const [ticket, setTicket] = useState<RepairTicket | null>(null);
  const [quotes, setQuotes] = useState<RepairQuote[]>([]);
  const [logs, setLogs] = useState<RepairStatusLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Quote form
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteDays, setQuoteDays] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);

  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    async function load() {
      const [ticketRes, quotesRes, logsRes] = await Promise.all([
        supabase.from("repair_tickets").select("*").eq("id", id).single(),
        supabase
          .from("repair_quotes")
          .select("*")
          .eq("ticket_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("repair_status_log")
          .select("*")
          .eq("ticket_id", id)
          .order("created_at", { ascending: false }),
      ]);

      setTicket(ticketRes.data as RepairTicket | null);
      setQuotes((quotesRes.data as RepairQuote[]) ?? []);
      setLogs((logsRes.data as RepairStatusLog[]) ?? []);
      setLoading(false);
    }

    load();
  }, [supabase, id]);

  async function handleSendQuote(e: React.FormEvent) {
    e.preventDefault();
    setQuoteSubmitting(true);

    const res = await fetch(`/api/repairs/${id}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price_dkk: parseInt(quotePrice),
        estimated_days: quoteDays ? parseInt(quoteDays) : null,
        notes: quoteNotes || null,
      }),
    });

    if (res.ok) {
      // Reload data
      router.refresh();
      window.location.reload();
    }
    setQuoteSubmitting(false);
  }

  async function handleStatusUpdate(newStatus: RepairStatus) {
    setStatusUpdating(true);

    await fetch(`/api/repairs/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    router.refresh();
    window.location.reload();
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-white" />;
  }

  if (!ticket) {
    return <p className="text-gray">Ticket ikke fundet.</p>;
  }

  const nextStatus = NEXT_STATUS[ticket.status as RepairStatus];

  return (
    <div>
      <button
        onClick={() => router.push("/admin/reparationer")}
        className="mb-6 text-sm font-semibold text-green-eco hover:underline"
      >
        &larr; Tilbage til oversigt
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & device */}
          <div className="rounded-2xl border border-soft-grey bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-charcoal">
                  {ticket.customer_name}
                </h2>
                <p className="mt-1 text-sm text-gray">
                  {ticket.customer_email} &middot; {ticket.customer_phone}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  STATUS_COLORS[ticket.status as RepairStatus]
                }`}
              >
                {STATUS_LABELS[ticket.status as RepairStatus]}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray">
                  Enhed
                </p>
                <p className="mt-1 text-sm text-charcoal">
                  {ticket.device_type} {ticket.device_model}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray">
                  Service
                </p>
                <p className="mt-1 text-sm text-charcoal">
                  {ticket.service_type}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray">
                Problembeskrivelse
              </p>
              <p className="mt-1 text-sm leading-relaxed text-charcoal">
                {ticket.issue_description}
              </p>
            </div>

            <p className="mt-4 text-xs text-gray">
              Oprettet:{" "}
              {new Date(ticket.created_at).toLocaleDateString("da-DK", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Actions */}
          <div className="rounded-2xl border border-soft-grey bg-white p-6">
            <h3 className="font-display text-base font-bold text-charcoal">
              Handlinger
            </h3>

            <div className="mt-4 flex flex-wrap gap-3">
              {ticket.status === "modtaget" && (
                <button
                  onClick={() => setShowQuoteForm(true)}
                  className="rounded-lg bg-green-eco px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Send tilbud
                </button>
              )}

              {nextStatus && ticket.status !== "modtaget" && (
                <button
                  onClick={() => handleStatusUpdate(nextStatus)}
                  disabled={statusUpdating}
                  className="rounded-lg bg-charcoal px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {statusUpdating
                    ? "Opdaterer..."
                    : `Marker som ${STATUS_LABELS[nextStatus]}`}
                </button>
              )}
            </div>

            {/* Quote form */}
            {showQuoteForm && (
              <form onSubmit={handleSendQuote} className="mt-6 space-y-4 rounded-lg border border-soft-grey p-4">
                <h4 className="font-semibold text-charcoal">Opret tilbud</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-charcoal">
                      Pris (DKK) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={quotePrice}
                      onChange={(e) => setQuotePrice(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-soft-grey px-4 py-2 text-sm focus:border-green-eco focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-charcoal">
                      Estimerede dage
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quoteDays}
                      onChange={(e) => setQuoteDays(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-soft-grey px-4 py-2 text-sm focus:border-green-eco focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-charcoal">
                    Note (intern)
                  </label>
                  <textarea
                    rows={3}
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-soft-grey px-4 py-2 text-sm focus:border-green-eco focus:outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={quoteSubmitting}
                    className="rounded-lg bg-green-eco px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {quoteSubmitting ? "Sender..." : "Send tilbud til kunden"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuoteForm(false)}
                    className="rounded-lg bg-charcoal/5 px-4 py-2 text-sm font-medium text-charcoal"
                  >
                    Annuller
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Quotes */}
          {quotes.length > 0 && (
            <div className="rounded-2xl border border-soft-grey bg-white p-6">
              <h3 className="font-display text-base font-bold text-charcoal">
                Tilbud
              </h3>
              <div className="mt-4 space-y-3">
                {quotes.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-lg border border-soft-grey p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-charcoal">
                        {q.price_dkk} DKK
                      </p>
                      <p className="text-xs text-gray">
                        {q.sent_at
                          ? new Date(q.sent_at).toLocaleDateString("da-DK")
                          : "Ikke sendt"}
                      </p>
                    </div>
                    {q.estimated_days && (
                      <p className="mt-1 text-sm text-gray">
                        Estimeret: {q.estimated_days} hverdage
                      </p>
                    )}
                    {q.notes && (
                      <p className="mt-1 text-sm text-gray">{q.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — status log */}
        <div>
          <div className="rounded-2xl border border-soft-grey bg-white p-6">
            <h3 className="font-display text-base font-bold text-charcoal">
              Historik
            </h3>
            {logs.length === 0 ? (
              <p className="mt-4 text-sm text-gray">Ingen ændringer endnu.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="border-l-2 border-green-eco/30 pl-4">
                    <p className="text-sm font-medium text-charcoal">
                      {log.old_status
                        ? `${STATUS_LABELS[log.old_status as RepairStatus] ?? log.old_status} → ${STATUS_LABELS[log.new_status as RepairStatus] ?? log.new_status}`
                        : STATUS_LABELS[log.new_status as RepairStatus] ?? log.new_status}
                    </p>
                    {log.note && (
                      <p className="mt-0.5 text-xs text-gray">{log.note}</p>
                    )}
                    <p className="mt-0.5 text-xs text-gray">
                      {new Date(log.created_at).toLocaleDateString("da-DK", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Verify build**

Run: `cd /c/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx next build 2>&1 | tail -10`
Expected: Build succeeds. Routes appear:
- `/admin/reparationer` as `ƒ` (Dynamic)
- `/admin/reparationer/[id]` as `ƒ` (Dynamic)
- `/api/repairs` as `ƒ` (Dynamic)
- `/api/repairs/[id]/quote` as `ƒ` (Dynamic)
- `/api/repairs/[id]/status` as `ƒ` (Dynamic)

**Step 5: Commit**

```bash
git add src/app/admin/reparationer/[id]/page.tsx src/app/api/repairs/[id]/quote/route.ts src/app/api/repairs/[id]/status/route.ts
git commit -m "feat: add admin ticket detail page with quoting and status management"
```

---

### Task 12: Final build verification and cleanup

**Files:**
- No new files. Verification only.

**Step 1: Full build**

Run: `cd /c/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx next build 2>&1 | tail -30`

Expected: Build succeeds with all new routes:
- `○ /butik` (Static)
- `ƒ /admin/reparationer`
- `ƒ /admin/reparationer/[id]`
- `ƒ /api/repairs`
- `ƒ /api/repairs/[id]/quote`
- `ƒ /api/repairs/[id]/status`

**Step 2: Verify no TypeScript errors**

Run: `cd /c/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx tsc --noEmit 2>&1 | tail -10`

Expected: No errors.

**Step 3: Commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: final build verification for Slagelse store integration"
```

---

## Summary of deliverables

| # | Task | Workstream | Key file(s) |
|---|------|-----------|-------------|
| 1 | Shared store config | Config | `src/lib/store-config.ts` |
| 2 | Refactor 4 files to use config | Config | store-location, footer, kontakt, json-ld |
| 3 | `/butik` page | Store page | `src/app/butik/page.tsx` |
| 4 | Shopify storeAvailability query | Inventory | queries.ts, types.ts, client.ts |
| 5 | Store availability badge | Inventory | `store-availability-badge.tsx`, product-info.tsx |
| 6 | Supabase setup | Repair admin | supabase/client.ts, types.ts |
| 7 | Repair ticket API | Repair admin | `api/repairs/route.ts` |
| 8 | Repair request form | Repair admin | repair-form.tsx, reparation/page.tsx |
| 9 | Admin auth layout | Repair admin | `admin/layout.tsx` |
| 10 | Admin ticket list | Repair admin | `admin/reparationer/page.tsx` |
| 11 | Admin ticket detail + APIs | Repair admin | `admin/reparationer/[id]/page.tsx`, quote + status APIs |
| 12 | Final verification | All | Build check |

## Prerequisites (manual steps before starting)

1. **Supabase project:** Create at https://supabase.com. Get the URL, anon key, and service role key.
2. **Supabase tables:** Run the SQL schema from the design doc to create `repair_tickets`, `repair_quotes`, `repair_status_log`.
3. **Supabase auth:** Create an admin user via Supabase dashboard (Authentication → Users → Add user).
4. **Shopify local pickup:** Enable in Shopify Admin → Settings → Shipping and delivery → Local pickup for the Slagelse location.
5. **Google Maps embed URL:** Get the actual embed URL from Google Maps (search for VestsjællandsCentret, click Share → Embed a map).
