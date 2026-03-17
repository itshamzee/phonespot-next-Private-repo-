# Tilbehør Landing Pages — Design Spec
**Date:** 2026-03-18
**Status:** Approved

## Goal

Replace the current flat tilbehør pages with rich, conversion-optimised landing pages that make it easy for customers to find accessories for their specific device. Approach A+B: enhance both the hub `/tilbehoer` and all category pages `/tilbehoer/[category]` simultaneously.

## Competitor Context

No Danish competitor (mobilcovers.dk, lux-case.dk, elgiganten.dk, holdit.com) has an on-page interactive device picker widget. They all rely on menu navigation. This is PhoneSpot's primary differentiator opportunity. The pattern established by Elgiganten (brand tile grid) is the clearest entry point for new customers.

---

## Architecture Overview

### Files to create
| File | Purpose |
|------|---------|
| `src/components/tilbehoer/device-picker.tsx` | Brand chips → model chips, emits selected model string |
| `src/components/tilbehoer/tilbehoer-category-hero.tsx` | Hero with DevicePicker embedded, for category pages |
| `src/components/tilbehoer/category-faq.tsx` | Accordion FAQ, content passed as prop |
| `src/components/ui/klarna-micro-banner.tsx` | Compact Klarna strip for category pages |

### Files to modify
| File | Changes |
|------|---------|
| `src/app/tilbehoer/page.tsx` | Full rewrite as rich hub page |
| `src/app/tilbehoer/[category]/page.tsx` | Keep `force-dynamic` + server shell for SEO metadata; extract interactive section into `TilbehoerCategoryClient` client component; pass server-fetched `initialCount` as prop |
| `src/components/tilbehoer/accessory-grid.tsx` | Add `externalModel?: string` prop; when provided, hide the internal model picker UI entirely (the `DevicePicker` in the page hero replaces it) |
| `src/lib/tilbehoer-config.ts` | Add `icon`, `heroDescription`, and `faq` fields to `TilbehoerCategory`. The outlet SALE badge stays as a hardcoded `slug === "outlet"` check — no `badge` field needed. |

---

## Component Specs

### 1. `DevicePicker`

**Props:**
```ts
interface DevicePickerProps {
  selectedModel: string;
  onChange: (model: string) => void;
  compact?: boolean; // smaller variant for category hero
}
```

**Behaviour:**
- Renders brand chips: Apple / Samsung / Google / OnePlus / Huawei (from `DEVICE_BRANDS`)
- On brand click: model chips appear below (from `getDevicesByBrand(brand)`)
- On model click: calls `onChange(device.label)` — passes the human-readable label (e.g. "iPhone 15") to match `compatible_models[]` in the accessories API
- Selected brand/model chips are visually highlighted (charcoal bg, white text)
- Clear button appears when a model is selected
- `compact` variant: smaller chips, tighter spacing for embedding in hero

**No API calls** — all data from `TILBEHOER_DEVICES` in config.

**Device filtering:** Only show phone-type devices in the picker — filter out tablets (iPad, Galaxy Tab, MatePad). Specifically: exclude devices whose `slug` contains `ipad`, `tab-s`, or `matepad`. This keeps the picker focused and fast for the common case (phone accessories).

---

### 2. `TilbehoerCategoryHero`

**Props:**
```ts
interface TilbehoerCategoryHeroProps {
  category: TilbehoerCategory;
  productCount: number;
  selectedModel: string;
  onModelChange: (model: string) => void;
}
```

**Visual:**
- Dark charcoal background (`bg-charcoal`) with `ps-pattern-dots-dark`
- Green accent line (h-1 w-10 bg-green-eco)
- Category label in small caps above heading
- Heading: category.label (Barlow Condensed, white)
- Description: category.heroDescription (white/60)
- Product count badge with pulsing green dot: "X produkter"
- `DevicePicker` compact variant below (only shown for `deviceSpecific: true` categories)
- Trust row at bottom: 3 icons (36 mdr garanti, 14 dages retur, Fri fragt)

**For non-device-specific categories** (opladere, lyd, holdere): device picker is hidden. Show a simple hero without the picker.

---

### 3. `CategoryFaq`

**Props:**
```ts
interface CategoryFaqProps {
  items: { q: string; a: string }[];
}
```

**Visual:**
- Accordion — click to expand/collapse
- Clean divider lines between items
- Plus/minus icon toggle
- Section heading: "Ofte stillede spørgsmål"

---

### 4. `KlarnaMicroBanner`

**Props:** none (static)

**Visual:**
- Compact strip: pale pink/cream background
- Klarna-pink `K` logo icon
- Text: "Del betalingen op med Klarna — betal i 3 rater"
- Small, inline, not intrusive

---

### 5. `AccessoryGrid` — `externalModel` prop

Add prop `externalModel?: string`. When provided:
- Initialize internal `model` state from `externalModel`
- Watch `externalModel` via `useEffect` — sync if it changes
- The internal model search input still works but is pre-filled and overridden by picker

---

## Page Specs

### `/tilbehoer` Hub Page

**Section 1: Hero**
- Background: `bg-charcoal` + `ps-pattern-dots-dark` + green-to-charcoal gradient overlay
- Headline: "Find tilbehør til din enhed" (Barlow Condensed, 5xl/6xl, white)
- Sub: "Covers, panserglas, kabler og mere — vi har det hele."
- `DevicePicker` (full size) centered, below headline
- On model select: page smoothly scrolls to `#produkter` section AND pre-filters the `AccessoryGrid`
- Trust badges row: e-mærket · 36 mdr. garanti · 14 dages returret · Hurtig levering

**Section 2: Kategori-grid**
- Heading: "Shop efter kategori"
- 6 rich category cards in a responsive grid (2 cols mobile, 3 tablet, 6 desktop)
- Each card: large emoji/SVG icon, category name, short description, product count, "Se alle →" arrow
- Outlet card: red "SALE" badge
- Cards link to `/tilbehoer/[category]`

**Section 3: Cross-sell banner**
- Background: `bg-green-eco/10` with green border
- Text: "Køb cover + skærmbeskyttelse og spar 15% på begge"
- CTA: "Se covers" → `/tilbehoer/covers`
- Note: requires a discount mechanic at cart level (out of scope for this task — banner only for now)

**Section 4: Product grid** (id="produkter")
- `AccessoryGrid` with `externalModel` from device picker state
- If no model selected: shows all products (existing behaviour)
- If model selected: pre-filtered and labelled "Tilbehør til [model]"

**Section 5: Klarna banner**
- Use `KlarnaMicroBanner` (the new static/prop-free component) here — not the existing `KlarnaBanner` which requires a `priceAmount` prop. The hub page has no single product price to pass.

**Section 6: USP section**
- 4 cards: e-mærket certificeret, 36 måneders garanti, 14 dages returret, Hurtig levering
- Charcoal background, white text, green icons

**Section 7: TrustBar**

---

### `/tilbehoer/[category]` Category Pages

**Architecture change:** Convert from pure server component to a hybrid. The static metadata/SEO parts remain server-side. The interactive section (hero with picker + grid) becomes a single `"use client"` component `TilbehoerCategoryClient` that manages device picker state.

**`TilbehoerCategoryClient` props:**
```ts
interface TilbehoerCategoryClientProps {
  category: TilbehoerCategory;
  initialCount: number; // product count from server
}
```

**Section 1: TilbehoerCategoryHero**
- (see component spec above)
- Manages `selectedModel` state, passes to both hero picker and grid

**Section 2: AccessoryGrid**
- `externalModel={selectedModel}`
- Existing search/brand/inStore filters remain

**Section 3: KlarnaMicroBanner**
- Rendered below the product grid

**Section 4: CategoryFaq**
- Questions from `category.faq` in config
- Only rendered if `category.faq` has entries

**Section 5: TrustBar**

---

## Config Additions to `tilbehoer-config.ts`

Add to `TilbehoerCategory` interface:
```ts
icon: string;           // emoji or SVG name for category card
heroDescription: string; // longer description for hero (1-2 sentences)
faq: { q: string; a: string }[]; // 3 questions per category
```

**FAQ content per category:**

**covers:**
1. Q: "Hvad er forskellen på TPU og hardcase?" A: "TPU covers er bløde og absorberer stød bedre. Hardcases er stivere og giver mere kantbeskyttelse. Vi anbefaler TPU til daglig brug og hybrid-cases til maksimal beskyttelse."
2. Q: "Passer et cover til iPhone 15 på iPhone 15 Pro?" A: "Nej — iPhone 15 og 15 Pro har forskellig kamerahul-placering og knap-layout. Vælg altid cover der er specifikt til din model."
3. Q: "Understøtter coverene MagSafe?" A: "Vores MagSafe-kompatible covers er mærket med 'MagSafe' og har den nødvendige magnet-ring. Tjek produktbeskrivelsen for din model."

**skaermbeskyttelse:**
1. Q: "Hvad er forskellen på hærdet glas og plastfolie?" A: "Hærdet glas (panserglas) er hårdere, skraber ikke og giver en skarpere touchfornemmelse. Plastfolie er tyndere og billigere men slides hurtigere."
2. Q: "Dækker skærmbeskyttelsen hele skærmen?" A: "Edge-to-edge modeller dækker hele skærmen inkl. kanter. Tjek om din model er kompatibel med edge-to-edge eller flat-skærm-variant."
3. Q: "Kan jeg sætte panserglas på med cover på?" A: "Ja, de fleste panserglas-modeller er designet til at fungere med tynde covers. Tjek produktets kompatibilitets-noter."

**opladere:**
1. Q: "Hvad er forskellen på USB-C og Lightning?" A: "iPhone 15 og nyere bruger USB-C. Ældre iPhones (14 og tidligere) bruger Lightning. Samsung og de fleste Android-telefoner bruger USB-C."
2. Q: "Hvad er hurtigopladning og har jeg brug for det?" A: "Hurtigopladning (f.eks. 20W, 45W eller 65W) lader din telefon markant hurtigere end standard 5W. Din telefon skal understøtte hurtigopladning for at drage nytte af det."
3. Q: "Virker trådløs opladning med alle telefoner?" A: "Trådløs opladning (Qi-standard) virker med alle iPhones fra iPhone 8 og frem samt de fleste Samsung Galaxy-modeller fra 2018 og frem."

**lyd:**
1. Q: "Hvad er forskellen på in-ear og on-ear høretelefoner?" A: "In-ear (earbuds) sidder i øregangen og er kompakte til sport og pendling. On-ear/over-ear giver typisk bedre lydkvalitet og er bedre til hjemmetbrug og kontoret."
2. Q: "Understøtter alle earbuds noise cancelling?" A: "Nej — aktiv støjreduktion (ANC) er en premium-funktion. Tjek produktspecifikationerne for ANC hvis det er vigtigt for dig."
3. Q: "Virker trådløse earbuds med alle telefoner?" A: "Ja, alle Bluetooth earbuds virker med iPhone, Samsung og Android-telefoner. Apple AirPods giver dog ekstra funktioner (Siri, automatisk pausering) med iPhone."

**holdere:**
1. Q: "Hvad er den bedste bilholder til min telefon?" A: "Det afhænger af din bil. Ventilationsholere passer til de fleste biler og er nemme at montere. Magnetiske holdere kræver en metalplate bag coverret men er hurtige at sætte telefonen i."
2. Q: "Er MagSafe bilholdere bedre end klips-holdere?" A: "MagSafe-holdere (til iPhone 12 og nyere) sidder solidt og er meget nemme at bruge med én hånd. Klips-holdere virker med alle telefoner uanset model."
3. Q: "Virker skrivebords-standere med alle telefoner?" A: "Ja, justerbare standere passer til alle telefonstørrelser fra 4\" til 7\". Tjek at stativets bredde passer til din telefons bredde."

---

## Data Flow

```
DevicePicker (client)
  → selectedModel: string (e.g. "iPhone 15")
  → passed to AccessoryGrid as externalModel
  → AccessoryGrid passes model to /api/accessories?model=iPhone+15
  → API: WHERE 'iPhone 15' = ANY(compatible_models)
```

No URL changes needed — all filtering is client-side state within the page component.

---

## Responsive Behaviour

- **Mobile:** DevicePicker shows brand chips in 2-row wrap, model chips in 3-col grid
- **Tablet:** Brand chips in single row, model chips in 4-col grid
- **Desktop:** Brand chips inline, model chips inline wrap

Category card grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`
Hero: full viewport width, min-height `min-h-[420px] sm:min-h-[480px]`

---

## Out of Scope

- Actual 15% cross-sell discount mechanic (cart logic) — banner only
- E-mærket application
- SEO landing pages per device (e.g. `/covers-til-iphone-15`)
- Server-side rendered product count per category card (static count shown, updates client-side)
