# Tilbehør Landing Pages Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace flat tilbehør pages with rich, conversion-optimised landing pages featuring a device picker widget, category hero sections, FAQ accordions, and a Klarna micro-banner.

**Architecture:** New client components (DevicePicker, TilbehoerCategoryHero, CategoryFaq, KlarnaMicroBanner) slot into a rewritten hub page and a refactored category page that splits into a server shell (SEO metadata + force-dynamic) + TilbehoerCategoryClient (device picker state + grid). The `externalModel` prop on AccessoryGrid bridges the device picker to the product API.

**Tech Stack:** Next.js 14 App Router, React 18 client components, Tailwind CSS, Supabase (existing), `/api/accessories` existing endpoint

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/lib/tilbehoer-config.ts` | Add `icon`, `heroDescription`, `faq` fields to `TilbehoerCategory`; populate per category |
| Create | `src/components/tilbehoer/device-picker.tsx` | Brand chips → model chips, emits selected model string |
| Create | `src/components/ui/klarna-micro-banner.tsx` | Static compact Klarna payment strip |
| Create | `src/components/tilbehoer/tilbehoer-category-hero.tsx` | Dark hero with DevicePicker + trust row |
| Create | `src/components/tilbehoer/category-faq.tsx` | Accordion FAQ component |
| Modify | `src/components/tilbehoer/accessory-grid.tsx` | Add `externalModel` prop; hide internal picker when set |
| Rewrite | `src/app/tilbehoer/page.tsx` | Rich hub page: hero + device picker + category grid + cross-sell + grid + Klarna + USPs + TrustBar |
| Modify | `src/app/tilbehoer/[category]/page.tsx` | Server shell only (metadata + count fetch); render `TilbehoerCategoryClient` |
| Create | `src/components/tilbehoer/tilbehoer-category-client.tsx` | `"use client"` wrapper: device picker state → hero + grid |

---

## Task 1: Config additions to `tilbehoer-config.ts`

**Files:**
- Modify: `src/lib/tilbehoer-config.ts`

- [ ] **Step 1: Add fields to `TilbehoerCategory` interface**

Open `src/lib/tilbehoer-config.ts`. Replace the existing interface:

```ts
export interface TilbehoerCategory {
  slug: string;
  label: string;
  description: string;
  deviceSpecific: boolean;
  icon: string;           // emoji for category card
  heroDescription: string; // 1-2 sentence hero subtext
  faq: { q: string; a: string }[]; // 3 FAQ items
}
```

- [ ] **Step 2: Update `TILBEHOER_CATEGORIES` with new fields**

Replace the `TILBEHOER_CATEGORIES` array with the following (keep all existing fields, add new ones):

```ts
export const TILBEHOER_CATEGORIES: TilbehoerCategory[] = [
  {
    slug: "covers",
    label: "Covers & Cases",
    description: "Beskyt din enhed med stilfulde covers og cases.",
    deviceSpecific: true,
    icon: "📱",
    heroDescription: "Find det perfekte cover til din model — TPU, hardcase og MagSafe-kompatible varianter til alle populære telefoner.",
    faq: [
      {
        q: "Hvad er forskellen på TPU og hardcase?",
        a: "TPU covers er bløde og absorberer stød bedre. Hardcases er stivere og giver mere kantbeskyttelse. Vi anbefaler TPU til daglig brug og hybrid-cases til maksimal beskyttelse.",
      },
      {
        q: "Passer et cover til iPhone 15 på iPhone 15 Pro?",
        a: "Nej — iPhone 15 og 15 Pro har forskellig kamerahul-placering og knap-layout. Vælg altid cover der er specifikt til din model.",
      },
      {
        q: "Understøtter coverene MagSafe?",
        a: "Vores MagSafe-kompatible covers er mærket med 'MagSafe' og har den nødvendige magnet-ring. Tjek produktbeskrivelsen for din model.",
      },
    ],
  },
  {
    slug: "skaermbeskyttelse",
    label: "Skærmbeskyttelse",
    description: "Panserglas og screen protectors til alle enheder.",
    deviceSpecific: true,
    icon: "🛡️",
    heroDescription: "Hærdet panserglas og plastfolie til din skærm — monteret rigtigt første gang, ellers bytter vi det.",
    faq: [
      {
        q: "Hvad er forskellen på hærdet glas og plastfolie?",
        a: "Hærdet glas (panserglas) er hårdere, skraber ikke og giver en skarpere touchfornemmelse. Plastfolie er tyndere og billigere men slides hurtigere.",
      },
      {
        q: "Dækker skærmbeskyttelsen hele skærmen?",
        a: "Edge-to-edge modeller dækker hele skærmen inkl. kanter. Tjek om din model er kompatibel med edge-to-edge eller flat-skærm-variant.",
      },
      {
        q: "Kan jeg sætte panserglas på med cover på?",
        a: "Ja, de fleste panserglas-modeller er designet til at fungere med tynde covers. Tjek produktets kompatibilitets-noter.",
      },
    ],
  },
  {
    slug: "opladere",
    label: "Kabler & Opladere",
    description: "Lightning, USB-C, trådløs opladning og kabler.",
    deviceSpecific: false,
    icon: "⚡",
    heroDescription: "Hurtigopladere, USB-C kabler og trådløse opladere til iPhone, Samsung og alle Android-modeller.",
    faq: [
      {
        q: "Hvad er forskellen på USB-C og Lightning?",
        a: "iPhone 15 og nyere bruger USB-C. Ældre iPhones (14 og tidligere) bruger Lightning. Samsung og de fleste Android-telefoner bruger USB-C.",
      },
      {
        q: "Hvad er hurtigopladning og har jeg brug for det?",
        a: "Hurtigopladning (f.eks. 20W, 45W eller 65W) lader din telefon markant hurtigere end standard 5W. Din telefon skal understøtte hurtigopladning for at drage nytte af det.",
      },
      {
        q: "Virker trådløs opladning med alle telefoner?",
        a: "Trådløs opladning (Qi-standard) virker med alle iPhones fra iPhone 8 og frem samt de fleste Samsung Galaxy-modeller fra 2018 og frem.",
      },
    ],
  },
  {
    slug: "lyd",
    label: "Lyd & Høretelefoner",
    description: "Earbuds, headsets og højttalere til alle enheder.",
    deviceSpecific: false,
    icon: "🎧",
    heroDescription: "Trådløse earbuds, over-ear headphones og Bluetooth højttalere — til hjemmet, kontoret og på farten.",
    faq: [
      {
        q: "Hvad er forskellen på in-ear og on-ear høretelefoner?",
        a: "In-ear (earbuds) sidder i øregangen og er kompakte til sport og pendling. On-ear/over-ear giver typisk bedre lydkvalitet og er bedre til hjemmebrug og kontoret.",
      },
      {
        q: "Understøtter alle earbuds noise cancelling?",
        a: "Nej — aktiv støjreduktion (ANC) er en premium-funktion. Tjek produktspecifikationerne for ANC hvis det er vigtigt for dig.",
      },
      {
        q: "Virker trådløse earbuds med alle telefoner?",
        a: "Ja, alle Bluetooth earbuds virker med iPhone, Samsung og Android-telefoner. Apple AirPods giver dog ekstra funktioner (Siri, automatisk pausering) med iPhone.",
      },
    ],
  },
  {
    slug: "holdere",
    label: "Holdere & Mounts",
    description: "Bilholdere, stander og mounts til din enhed.",
    deviceSpecific: false,
    icon: "🚗",
    heroDescription: "Bilholdere, skrivebords-standere og MagSafe mounts — hold din telefon stabilt og tilgængeligt.",
    faq: [
      {
        q: "Hvad er den bedste bilholder til min telefon?",
        a: "Det afhænger af din bil. Ventilationsholere passer til de fleste biler og er nemme at montere. Magnetiske holdere kræver en metalplate bag coverret men er hurtige at sætte telefonen i.",
      },
      {
        q: "Er MagSafe bilholdere bedre end klips-holdere?",
        a: "MagSafe-holdere (til iPhone 12 og nyere) sidder solidt og er meget nemme at bruge med én hånd. Klips-holdere virker med alle telefoner uanset model.",
      },
      {
        q: "Virker skrivebords-standere med alle telefoner?",
        a: "Ja, justerbare standere passer til alle telefonstørrelser fra 4\" til 7\". Tjek at stativets bredde passer til din telefons bredde.",
      },
    ],
  },
  {
    slug: "outlet",
    label: "Outlet",
    description: "Ekstra skarpe priser på udvalgte tilbehør. Begrænset antal.",
    deviceSpecific: false,
    icon: "🏷️",
    heroDescription: "Overskydende lager og kampagnevarer til ekstra skarpe priser. Begrænset antal — køb mens lager haves.",
    faq: [
      {
        q: "Hvad er outlet-varer?",
        a: "Outlet-varer er nye produkter fra overskydende lager eller kampagner. De er i perfekt stand og leveres med samme garanti som resten af vores sortiment.",
      },
      {
        q: "Kan jeg returnere outlet-varer?",
        a: "Ja — alle vores produkter inkl. outlet-varer er dækket af 14 dages returret i henhold til dansk forbrugerret.",
      },
      {
        q: "Skiftes outlet-sortimentet?",
        a: "Ja, vi opdaterer løbende outlet-sortimentet. Tilmeld dig vores nyhedsbrev for at få besked når nye tilbud er tilgængelige.",
      },
    ],
  },
];
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
cd C:/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `TilbehoerCategory`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/tilbehoer-config.ts
git commit -m "feat(tilbehoer): add icon, heroDescription, faq fields to TilbehoerCategory config"
```

---

## Task 2: `DevicePicker` component

**Files:**
- Create: `src/components/tilbehoer/device-picker.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/tilbehoer/device-picker.tsx
"use client";

import { useState } from "react";
import {
  DEVICE_BRANDS,
  TILBEHOER_DEVICES,
  getDevicesByBrand,
  type DeviceBrand,
} from "@/lib/tilbehoer-config";

// Exclude tablets from the picker
const TABLET_SLUG_PATTERNS = ["ipad", "tab-s", "matepad"];
function isPhone(slug: string): boolean {
  return !TABLET_SLUG_PATTERNS.some((p) => slug.includes(p));
}

export interface DevicePickerProps {
  selectedModel: string;
  onChange: (model: string) => void;
  compact?: boolean;
}

export function DevicePicker({
  selectedModel,
  onChange,
  compact = false,
}: DevicePickerProps) {
  const [selectedBrand, setSelectedBrand] = useState<DeviceBrand | null>(null);

  const models = selectedBrand
    ? getDevicesByBrand(selectedBrand).filter((d) => isPhone(d.slug))
    : [];

  function handleBrandClick(brand: DeviceBrand) {
    setSelectedBrand((prev) => (prev === brand ? null : brand));
    // Clear model selection when switching brand
    if (selectedBrand !== brand) onChange("");
  }

  function handleModelClick(label: string) {
    onChange(selectedModel === label ? "" : label);
  }

  function handleClear() {
    setSelectedBrand(null);
    onChange("");
  }

  const chipBase = compact
    ? "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
    : "rounded-full px-4 py-2 text-sm font-semibold transition-colors";

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {/* Brand chips */}
      <div className="flex flex-wrap gap-2">
        {DEVICE_BRANDS.map((b) => (
          <button
            key={b.slug}
            onClick={() => handleBrandClick(b.slug)}
            className={`${chipBase} ${
              selectedBrand === b.slug
                ? "bg-charcoal text-white"
                : "border border-white/20 bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {b.label}
          </button>
        ))}
        {selectedModel && (
          <button
            onClick={handleClear}
            className={`${chipBase} border border-white/20 text-white/60 hover:text-white`}
          >
            ✕ Ryd
          </button>
        )}
      </div>

      {/* Model chips */}
      {models.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {models.map((d) => (
            <button
              key={d.slug}
              onClick={() => handleModelClick(d.label)}
              className={`${chipBase} ${
                selectedModel === d.label
                  ? "bg-green-eco text-white"
                  : "border border-white/20 bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {/* Hint when no brand selected */}
      {!selectedBrand && (
        <p className={`${compact ? "text-xs" : "text-sm"} text-white/40`}>
          Vælg et mærke for at se modeller
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tilbehoer/device-picker.tsx
git commit -m "feat(tilbehoer): add DevicePicker component with brand→model chip flow"
```

---

## Task 3: `KlarnaMicroBanner` component

**Files:**
- Create: `src/components/ui/klarna-micro-banner.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/ui/klarna-micro-banner.tsx

export function KlarnaMicroBanner() {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-pink-100 bg-pink-50 px-6 py-4">
      {/* Klarna K logo */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFB3C7] text-sm font-black text-[#17120E]">
        K
      </div>
      <p className="text-sm font-medium text-charcoal">
        Del betalingen op med{" "}
        <span className="font-bold text-[#17120E]">Klarna</span> — betal i 3
        rater uden renter
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/klarna-micro-banner.tsx
git commit -m "feat(ui): add KlarnaMicroBanner static component"
```

---

## Task 4: `CategoryFaq` component

**Files:**
- Create: `src/components/tilbehoer/category-faq.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/tilbehoer/category-faq.tsx
"use client";

import { useState } from "react";

interface FaqItem {
  q: string;
  a: string;
}

interface CategoryFaqProps {
  items: FaqItem[];
}

export function CategoryFaq({ items }: CategoryFaqProps) {
  const [open, setOpen] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="mb-6 font-display text-2xl font-bold uppercase tracking-tight text-charcoal">
        Ofte stillede spørgsmål
      </h2>
      <div className="divide-y divide-sand">
        {items.map((item, i) => (
          <div key={i} className="py-4">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 text-left"
            >
              <span className="font-semibold text-charcoal">{item.q}</span>
              <span className="shrink-0 text-charcoal/40">
                {open === i ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                  </svg>
                )}
              </span>
            </button>
            {open === i && (
              <p className="mt-3 text-sm leading-relaxed text-charcoal/70">{item.a}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/components/tilbehoer/category-faq.tsx
git commit -m "feat(tilbehoer): add CategoryFaq accordion component"
```

---

## Task 5: `TilbehoerCategoryHero` component

**Files:**
- Create: `src/components/tilbehoer/tilbehoer-category-hero.tsx`

**Dependencies:** DevicePicker (Task 2), TilbehoerCategory with new fields (Task 1)

- [ ] **Step 1: Create the component**

```tsx
// src/components/tilbehoer/tilbehoer-category-hero.tsx
"use client";

import { DevicePicker } from "./device-picker";
import type { TilbehoerCategory } from "@/lib/tilbehoer-config";

interface TilbehoerCategoryHeroProps {
  category: TilbehoerCategory;
  productCount: number;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export function TilbehoerCategoryHero({
  category,
  productCount,
  selectedModel,
  onModelChange,
}: TilbehoerCategoryHeroProps) {
  return (
    <section className="relative overflow-hidden bg-charcoal">
      {/* Dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 30px, currentColor 30px, currentColor 31px)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 md:py-16">
        {/* Green accent line */}
        <div className="mb-4 h-1 w-10 bg-green-eco" />

        {/* Category label */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-[4px] text-green-eco">
          {category.label}
        </p>

        {/* Heading */}
        <h1 className="font-display text-4xl font-extrabold italic text-white md:text-5xl">
          {category.label}
        </h1>

        {/* Description */}
        <p className="mt-3 max-w-xl text-base text-white/60">
          {category.heroDescription}
        </p>

        {/* Product count badge */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-eco opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-eco" />
          </span>
          <span className="text-xs font-semibold text-white/80">
            {productCount} produkter
          </span>
        </div>

        {/* DevicePicker — only for device-specific categories */}
        {category.deviceSpecific && (
          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
              Filtrer efter din model
            </p>
            <DevicePicker
              selectedModel={selectedModel}
              onChange={onModelChange}
              compact
            />
          </div>
        )}

        {/* Trust row */}
        <div className="mt-8 flex flex-wrap gap-4 text-xs font-semibold text-white/50">
          <span>✓ 36 mdr. garanti</span>
          <span>✓ 14 dages returret</span>
          <span>✓ Fri fragt over 499 kr.</span>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/components/tilbehoer/tilbehoer-category-hero.tsx
git commit -m "feat(tilbehoer): add TilbehoerCategoryHero with device picker and trust row"
```

---

## Task 6: `AccessoryGrid` — add `externalModel` prop

**Files:**
- Modify: `src/components/tilbehoer/accessory-grid.tsx`

The `AccessoryGrid` currently has an internal model state with a text input and popular chips. When `externalModel` is provided, the internal picker should be hidden and the model state should be driven by the external value.

- [ ] **Step 1: Read the current file**

Read `src/components/tilbehoer/accessory-grid.tsx` to confirm current content before editing.

- [ ] **Step 2: Update component signature and add externalModel logic**

At the top of the `AccessoryGrid` function, add the prop interface and sync logic. Replace:

```tsx
export function AccessoryGrid() {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    category: "",
    brand: "",
    model: "",
    inStore: false,
  });
```

With:

```tsx
interface AccessoryGridProps {
  externalModel?: string;
  initialCategory?: string;
}

export function AccessoryGrid({ externalModel, initialCategory }: AccessoryGridProps = {}) {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    category: initialCategory ?? "",
    brand: "",
    model: externalModel ?? "",
    inStore: false,
  });
```

- [ ] **Step 3: Add useEffect to sync externalModel changes**

After the existing state declarations (around line 153, after the `abortRef` line), add:

```tsx
  // Sync external model changes (from DevicePicker in parent)
  useEffect(() => {
    if (externalModel !== undefined) {
      setFilter("model", externalModel);
    }
  }, [externalModel]);
```

- [ ] **Step 4: Conditionally hide the internal model picker section**

Find the internal model picker section (the `<div className="rounded-2xl border border-sand bg-cream p-4">` block that starts around line 223 with "Find tilbehør til din mobil"). Wrap that entire `<div>` block so it only renders when `externalModel === undefined`:

```tsx
      {/* Model filter — only shown when no external picker */}
      {externalModel === undefined && (
        <div className="rounded-2xl border border-sand bg-cream p-4">
          {/* ... existing internal model picker content unchanged ... */}
        </div>
      )}
```

- [ ] **Step 5: Update the label when filtering by external model**

Find the results count `<p>` around line 350:

```tsx
        <p className="text-sm text-charcoal/50">
          {products.length === 0
            ? "Ingen produkter"
            : `${products.length} produkt${products.length !== 1 ? "er" : ""}`}
        </p>
```

Replace with:

```tsx
        <p className="text-sm text-charcoal/50">
          {products.length === 0
            ? "Ingen produkter"
            : externalModel
              ? `${products.length} produkt${products.length !== 1 ? "er" : ""} til ${externalModel}`
              : `${products.length} produkt${products.length !== 1 ? "er" : ""}`}
        </p>
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd C:/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/tilbehoer/accessory-grid.tsx
git commit -m "feat(tilbehoer): add externalModel prop to AccessoryGrid, hide internal picker when set"
```

---

## Task 7: `TilbehoerCategoryClient` + category page refactor

**Files:**
- Create: `src/components/tilbehoer/tilbehoer-category-client.tsx`
- Modify: `src/app/tilbehoer/[category]/page.tsx`

**Dependencies:** Tasks 1, 2, 4, 5, 6 must be complete.

- [ ] **Step 1: Create `TilbehoerCategoryClient`**

```tsx
// src/components/tilbehoer/tilbehoer-category-client.tsx
"use client";

import { useState } from "react";
import type { TilbehoerCategory } from "@/lib/tilbehoer-config";
import { TilbehoerCategoryHero } from "./tilbehoer-category-hero";
import { AccessoryGrid } from "./accessory-grid";
import { KlarnaMicroBanner } from "@/components/ui/klarna-micro-banner";
import { CategoryFaq } from "./category-faq";

interface TilbehoerCategoryClientProps {
  category: TilbehoerCategory;
  initialCount: number;
}

export function TilbehoerCategoryClient({
  category,
  initialCount,
}: TilbehoerCategoryClientProps) {
  const [selectedModel, setSelectedModel] = useState("");

  return (
    <>
      <TilbehoerCategoryHero
        category={category}
        productCount={initialCount}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />

      <div className="mx-auto max-w-7xl px-4 py-10">
        <AccessoryGrid
          externalModel={selectedModel}
          initialCategory={category.slug}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-8">
        <KlarnaMicroBanner />
      </div>

      {category.faq.length > 0 && (
        <CategoryFaq items={category.faq} />
      )}
    </>
  );
}
```

- [ ] **Step 2: Refactor the category page server component**

Read `src/app/tilbehoer/[category]/page.tsx` first, then replace its body.

The page should:
1. Keep `force-dynamic` and `generateStaticParams`
2. Keep `generateMetadata` (unchanged)
3. In the page component: resolve config, fetch product count, render breadcrumb JSON-LD + `TilbehoerCategoryClient` + `TrustBar`

For the product count, query Supabase admin client directly in the page component.

Replace the entire file content with:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryConfig, getAllCategoryParams } from "@/lib/tilbehoer-config";
import { TilbehoerCategoryClient } from "@/components/tilbehoer/tilbehoer-category-client";
import { JsonLd } from "@/components/seo/json-ld";
import { TrustBar } from "@/components/ui/trust-bar";
import { Breadcrumb } from "@/components/tilbehoer/breadcrumb";

export const dynamicParams = true;
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getAllCategoryParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const config = getCategoryConfig(category);
  if (!config) return { title: "Ikke fundet" };

  const title = `${config.label} til iPhone & Samsung | PhoneSpot`;
  const description = config.description;

  return {
    title,
    description,
    alternates: { canonical: `https://phonespot.dk/tilbehoer/${category}` },
    openGraph: {
      title,
      description,
      url: `https://phonespot.dk/tilbehoer/${category}`,
    },
  };
}

async function getAccessoryCount(categorySlug: string): Promise<number> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/accessories?category=${categorySlug}`,
      { cache: "no-store" },
    );
    if (!res.ok) return 0;
    const data = (await res.json()) as unknown[];
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

export default async function TilbehoerCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const config = getCategoryConfig(category);
  if (!config) notFound();

  const initialCount = await getAccessoryCount(category);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
      { "@type": "ListItem", position: 2, name: "Tilbehør", item: "https://phonespot.dk/tilbehoer" },
      {
        "@type": "ListItem",
        position: 3,
        name: config.label,
        item: `https://phonespot.dk/tilbehoer/${category}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />

      <div className="mx-auto max-w-7xl px-4 pt-4">
        <Breadcrumb
          items={[
            { label: "Tilbehør", href: "/tilbehoer" },
            { label: config.label },
          ]}
        />
      </div>

      <TilbehoerCategoryClient category={config} initialCount={initialCount} />

      <div className="mx-auto max-w-7xl px-4 pb-16">
        <TrustBar />
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/tilbehoer/tilbehoer-category-client.tsx src/app/tilbehoer/[category]/page.tsx
git commit -m "feat(tilbehoer): refactor category pages to hybrid server+client with hero and FAQ"
```

---

## Task 8: Rewrite `/tilbehoer` hub page

**Files:**
- Rewrite: `src/app/tilbehoer/page.tsx`

**Dependencies:** Tasks 1–6 must be complete.

This is the most complex task. The hub page becomes a rich landing page with 7 sections. The page itself is a server component; it imports `AccessoryGrid` (client component) and DevicePicker is handled in a local client wrapper.

- [ ] **Step 1: Create a local client wrapper for the hub hero**

The hub page needs to be a server component (for metadata export), but the device picker is a client component. Create an inline approach: since Next.js allows importing client components in server components, just import the components directly. However, state (selectedModel) must live in a client component. Create a small wrapper:

```tsx
// src/components/tilbehoer/hub-hero-client.tsx
"use client";

import { useState } from "react";
import { DevicePicker } from "./device-picker";
import { AccessoryGrid } from "./accessory-grid";

export function HubHeroClient() {
  const [selectedModel, setSelectedModel] = useState("");

  function handleModelChange(model: string) {
    setSelectedModel(model);
    if (model) {
      document.getElementById("produkter")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <>
      {/* Device picker in hero (rendered by parent for layout, state here) */}
      <div id="hub-picker">
        <DevicePicker
          selectedModel={selectedModel}
          onChange={handleModelChange}
        />
      </div>

      {/* Product grid */}
      <div id="produkter" className="scroll-mt-24">
        <AccessoryGrid externalModel={selectedModel} />
      </div>
    </>
  );
}
```

Wait — this splits the picker and grid across the DOM. Better to keep them together in one client component. Use a single `HubClient` component that renders both the picker section (in the hero area) and the grid below. But the hero HTML is in the server component...

**Revised approach:** Make the entire interactive part of the hub page a single `HubClient` component that renders the picker + grid together. The hero section's decorative parts (charcoal bg, headline, trust badges) stay in the server component as static HTML, and the `HubClient` is embedded inside the hero section for the picker, then also renders the grid section below the hero.

Actually, the simplest approach is to just make the whole hub page a client component by putting `"use client"` at the top, since it doesn't need server-side data fetching (the metadata export already handles SEO). The metadata export at module level still works with a client component via the `generateMetadata` pattern — wait, no, `export const metadata` cannot be in a client component.

**Correct final approach:**
- The page itself (`src/app/tilbehoer/page.tsx`) remains a server component with `export const metadata`
- It imports `HubClient`, a client component that manages `selectedModel` state
- `HubClient` renders: device picker (in a hero wrapper) + product grid (scrolled to via ref)
- All static sections (category grid, cross-sell, USPs) are in the server component

Create `src/components/tilbehoer/hub-client.tsx`:

```tsx
"use client";

import { useState, useRef } from "react";
import { DevicePicker } from "./device-picker";
import { AccessoryGrid } from "./accessory-grid";

export function HubClient() {
  const [selectedModel, setSelectedModel] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  function handleModelChange(model: string) {
    setSelectedModel(model);
    if (model) {
      setTimeout(() => {
        gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }

  return (
    <>
      {/* Picker area (rendered inside the hero section by the server page) */}
      <DevicePicker selectedModel={selectedModel} onChange={handleModelChange} />

      {/* Spacer handled by server page layout */}
      <div ref={gridRef} id="produkter" className="scroll-mt-24" />
    </>
  );
}
```

Hmm, this still splits the grid rendering. The cleanest solution is one `HubInteractive` client component that contains both picker and grid:

```tsx
// src/components/tilbehoer/hub-interactive.tsx
"use client";

import { useState } from "react";
import { DevicePicker } from "./device-picker";
import { AccessoryGrid } from "./accessory-grid";

export function HubInteractive() {
  const [selectedModel, setSelectedModel] = useState("");

  function handleModelChange(model: string) {
    setSelectedModel(model);
    if (model) {
      document.getElementById("produkter")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <>
      {/* Picker — displayed inside the hero in the server layout */}
      <div className="mt-8">
        <DevicePicker selectedModel={selectedModel} onChange={handleModelChange} />
      </div>

      {/* Grid section — after hero, wrapped with an id for scroll target */}
      <section id="produkter" className="scroll-mt-24 bg-sand">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <AccessoryGrid externalModel={selectedModel} />
        </div>
      </section>
    </>
  );
}
```

But this puts the section wrapper inside the client component, breaking the server page layout.

**Final pragmatic decision:** The hub page will be a server component with inline `HubInteractive` as a client island. `HubInteractive` renders only the picker + the grid. The server component places `HubInteractive` inside the hero section (picker part comes first), then a static category grid section, then a cross-sell banner, and separately after that the grid section. Since you can't split a client component's output, the grid must be inside `HubInteractive`.

The actual server page layout will be:
```
<Hero section (charcoal bg)>
  <static headline + trust badges>
  <HubInteractive> ← client, contains picker then grid section
</Hero section end> ← wrong, because HubInteractive's grid section needs to be outside hero

```

Actually the simplest solution that works: **the entire hub page is not a server component at runtime — only the metadata export is**. Next.js 14 supports `export const metadata` in server components. We split: `page.tsx` exports metadata and renders a single `<HubPage />` client component that handles everything. This is the pattern used throughout the codebase.

Create `src/components/tilbehoer/hub-page-client.tsx` with `"use client"` that renders all 7 sections, and `page.tsx` keeps `export const metadata` and renders `<HubPageClient />`.

This is the cleanest approach.

- [ ] **Step 2: Create `src/components/tilbehoer/hub-page-client.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { TILBEHOER_CATEGORIES } from "@/lib/tilbehoer-config";
import { DevicePicker } from "./device-picker";
import { AccessoryGrid } from "./accessory-grid";
import { KlarnaMicroBanner } from "@/components/ui/klarna-micro-banner";
import { TrustBar } from "@/components/ui/trust-bar";

function scrollToGrid() {
  document.getElementById("produkter")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function HubPageClient() {
  const [selectedModel, setSelectedModel] = useState("");

  function handleModelChange(model: string) {
    setSelectedModel(model);
    if (model) setTimeout(scrollToGrid, 50);
  }

  return (
    <>
      {/* Section 1: Hero */}
      <section className="relative overflow-hidden bg-charcoal">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 30px, currentColor 30px, currentColor 31px)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center md:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[4px] text-green-eco">
            Tilbehør
          </p>
          <h1 className="font-display text-4xl font-extrabold italic text-white md:text-6xl">
            Find tilbehør til din enhed
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/60">
            Covers, panserglas, kabler og mere — vi har det hele.
          </p>

          {/* Device picker */}
          <div className="mx-auto mt-10 max-w-2xl text-left">
            <DevicePicker
              selectedModel={selectedModel}
              onChange={handleModelChange}
            />
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs font-semibold text-white/50">
            <span>e-mærket certificeret</span>
            <span>36 mdr. garanti</span>
            <span>14 dages returret</span>
            <span>Hurtig levering</span>
          </div>
        </div>
      </section>

      {/* Section 2: Category grid */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 font-display text-2xl font-bold uppercase tracking-tight text-charcoal md:text-3xl">
          Shop efter kategori
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {TILBEHOER_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/tilbehoer/${cat.slug}`}
              className="group relative flex flex-col items-center rounded-2xl border border-sand bg-white p-5 text-center transition-all hover:border-green-eco/30 hover:shadow-md"
            >
              {cat.slug === "outlet" && (
                <span className="absolute -right-2 -top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  SALE
                </span>
              )}
              <span className="text-3xl">{cat.icon}</span>
              <h3 className="mt-3 font-display text-sm font-bold text-charcoal">
                {cat.label}
              </h3>
              <p className="mt-1 hidden text-xs text-charcoal/50 md:block line-clamp-2">
                {cat.description}
              </p>
              <span className="mt-2 text-xs font-semibold text-green-eco opacity-0 transition-opacity group-hover:opacity-100">
                Se alle →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Section 3: Cross-sell banner */}
      <section className="mx-auto max-w-7xl px-4 pb-8">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-green-eco/20 bg-green-eco/5 px-6 py-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold text-charcoal">
              Køb cover + skærmbeskyttelse og spar 15% på begge
            </p>
            <p className="mt-0.5 text-sm text-charcoal/60">
              Kombiner og beskyt din enhed komplet.
            </p>
          </div>
          <Link
            href="/tilbehoer/covers"
            className="shrink-0 rounded-full bg-green-eco px-5 py-2.5 text-sm font-bold text-white hover:bg-green-eco/90"
          >
            Se covers →
          </Link>
        </div>
      </section>

      {/* Section 4: Product grid */}
      <section id="produkter" className="scroll-mt-16 bg-sand">
        <div className="mx-auto max-w-7xl px-4 py-10">
          {selectedModel && (
            <p className="mb-4 font-display text-xl font-bold text-charcoal">
              Tilbehør til {selectedModel}
            </p>
          )}
          <AccessoryGrid externalModel={selectedModel} />
        </div>
      </section>

      {/* Section 5: Klarna banner */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <KlarnaMicroBanner />
      </div>

      {/* Section 6: USP section */}
      <section className="bg-charcoal py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "🏅", title: "e-mærket certificeret", desc: "Tryg handel med certificeret dansk netbutik." },
              { icon: "🛡️", title: "36 måneders garanti", desc: "Markedets bedste garanti på alt tilbehør." },
              { icon: "↩️", title: "14 dages returret", desc: "Fortryd dit køb inden for 14 dage — ingen spørgsmål." },
              { icon: "🚀", title: "Hurtig levering", desc: "Bestil inden kl. 16 og modtag i morgen." },
            ].map((usp) => (
              <div key={usp.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className="text-2xl">{usp.icon}</span>
                <div>
                  <h3 className="font-display text-sm font-bold text-white">{usp.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">{usp.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7: TrustBar */}
      <TrustBar />
    </>
  );
}
```

- [ ] **Step 3: Rewrite `src/app/tilbehoer/page.tsx`**

```tsx
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { HubPageClient } from "@/components/tilbehoer/hub-page-client";

export const metadata: Metadata = {
  title: "Tilbehør til iPhone, iPad & Samsung | PhoneSpot",
  description:
    "Covers, panserglas, opladere, kabler og tilbehør til din telefon og tablet. Altid hurtig levering og skarpe priser hos PhoneSpot.",
  alternates: { canonical: "https://phonespot.dk/tilbehoer" },
  openGraph: {
    title: "Tilbehør til iPhone, iPad & Samsung | PhoneSpot",
    description:
      "Covers, panserglas, opladere, kabler og tilbehør til din telefon og tablet.",
    url: "https://phonespot.dk/tilbehoer",
  },
};

export default function TilbehoerPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: "https://phonespot.dk" },
      { "@type": "ListItem", position: 2, name: "Tilbehør", item: "https://phonespot.dk/tilbehoer" },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <HubPageClient />
    </>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd C:/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Start dev server and verify pages load**

```bash
cd C:/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npm run dev 2>&1 &
```

Check that `http://localhost:3000/tilbehoer` and `http://localhost:3000/tilbehoer/covers` load without runtime errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/tilbehoer/hub-page-client.tsx src/app/tilbehoer/page.tsx
git commit -m "feat(tilbehoer): rewrite hub page with DevicePicker, category grid, USPs and Klarna banner"
```

---

## Final Verification

- [ ] **Run TypeScript check**

```bash
cd C:/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Verify dev build compiles**

```bash
cd C:/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && npm run build 2>&1 | tail -20
```

Expected: successful build, no Next.js errors.

- [ ] **Push to main**

```bash
cd C:/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next && git push origin HEAD
```

Vercel auto-deploys. Monitor deployment at Vercel dashboard.
