# Opkøb-automatisering — Plan 1 af 3: motoren i drift + hændelseslog

> **Status: gennemført 2026-07-28.** Task 1 afdækkede to fejl der var større end
> planen forudsatte — `model_codes` indeholder producentens varenumre, ikke
> modelnavne, og kategori-matchningen var så løs at tape kunne blive prisen på et
> bagglas. Begge er rettet; se commit `5bbbd3c` og specens afsnit 1.
> Migrationerne er **ikke** kørt: samlet i
> `supabase/migrations/KØR-DENNE-2026-07-28-opkoeb.sql` til Supabase SQL-editoren.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Få prismotoren fra `feat/buyback-pricing-engine` i drift på `main` med de fire kendte overbuds-fejl lukket, en fallback-pristabel, afrundede beløb, og en fælles hændelseslog med live-feed i admin — så systemet begynder at *fortælle* før det begynder at *handle*.

**Architecture:** Al ny logik lever i `src/lib/buyback/` (rene funktioner adskilt fra DB-I/O, som i `src/lib/foxway/`). Hændelser skrives gennem én helper `logBuybackEvent()` til tabellen `buyback_events`, som senere planer læser fra. Ingen automatisk afsendelse i denne plan — motoren regner, admin sender stadig selv.

**Tech Stack:** TypeScript (strict), Vitest 4, Next.js App Router, Supabase (`createAdminClient()` service-role til skrivning, `createBrowserClient()` til realtime i admin).

## Global Constraints

- **Alle beløb er heltal i øre.** 1 kr = 100 øre. `foneday_catalog.price_dkk` er allerede øre. `price_eur` ignoreres.
- **Ingen `any`.** Brug `unknown` + narrowing eller typede interfaces.
- **Ingen emojis** i kode, UI eller commit-beskeder.
- **Dansk i alt kundevendt og admin-vendt tekst.** Kode, kommentarer og commits på engelsk.
- **Aldrig "Foxway", "Foneday" eller "dropship" i kundevendt UI.** Foneday må gerne nævnes i admin og i kode.
- Tests co-lokeres i `src/lib/buyback/__tests__/`.
- Commit efter hver task.
- **Alle kommandoer køres fra** `C:/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next`.
- Kommandoer: én testfil `npx vitest run src/lib/buyback/__tests__/<fil>.test.ts` · typecheck `npx tsc --noEmit` · lint `npm run lint`.
- Migrationer er **håndkørte** — der er ingen migration-runner. Filen lægges i `supabase/migrations/` og køres i Supabase SQL-editoren.

## Filstruktur

| Fil | Ansvar |
|---|---|
| `src/lib/buyback/fault-mapping.ts` | *(findes)* Tilstand → `FaultType[]`. Udvides med `unpriceableBrokenParts()` |
| `src/lib/buyback/base-value.ts` | *(findes)* Egen salgspris. Rettes til `.limit(1)` og kalder fallback |
| `src/lib/buyback/fallback-prices.ts` | **Ny.** Opslag i `buyback_prices` når egen salgspris mangler |
| `src/lib/buyback/rounding.ts` | **Ny.** Ren: rund beløb ned til nærmeste 50 kr |
| `src/lib/buyback/pricing.ts` | *(findes)* Anvender afrunding før rentabilitets-tjek |
| `src/lib/buyback/estimate.ts` | *(findes)* Kalder `unpriceableBrokenParts()` før DB-opslag |
| `src/lib/buyback/lead-devices.ts` | **Ny.** Ren: læs `metadata.devices[]` og gammel `metadata.device` |
| `src/lib/buyback/events.ts` | **Ny.** `logBuybackEvent()` + `BuybackEventType` |
| `src/components/admin/BuybackFeed.tsx` | **Ny.** Live-feed over `buyback_events` |
| `supabase/migrations/20260728_buyback_prices.sql` | **Ny.** Fallback-pristabel |
| `supabase/migrations/20260728_buyback_events.sql` | **Ny.** Hændelseslog |

---

## Task 1: Merge motoren og grund keyword-kortene mod virkelige data

`feat/buyback-pricing-engine` er 11 commits der aldrig kom på `main`. Den skal ind først, og `faultCategoryKeywords` for `back_glass` og `charging` er skrevet mod **gættede** Foneday-kategorinavne. Rammer de forbi, resolver de fejl aldrig, og en enhed med knust bagglas prissættes som fejlfri.

**Files:**
- Modify: `src/lib/buyback/fault-mapping.ts`

- [ ] **Step 1: Merge branchen til main**

```bash
git checkout main
git merge --no-ff feat/buyback-pricing-engine -m "merge: buyback pricing engine (Plan 1 of 3)"
npx vitest run src/lib/buyback
```
Forventet: alle buyback-tests grønne efter merge.

- [ ] **Step 2: Hent de virkelige kategori- og kvalitetsstrenge**

Kør i Supabase SQL-editoren:

```sql
select 'category' as kind, category as value, count(*) from foneday_catalog group by category
union all
select 'quality' as kind, quality as value, count(*) from foneday_catalog group by quality
order by kind, count desc;
```

- [ ] **Step 3: Kontrollér at hver fejltype faktisk rammer noget**

Kør i SQL-editoren. Hver række skal give et antal > 0:

```sql
select 'screen'   as fault, count(*) from foneday_catalog where lower(category || ' ' || coalesce(title,'')) ~ 'display|lcd|scherm|screen'
union all
select 'back_glass', count(*) from foneday_catalog where lower(category || ' ' || coalesce(title,'')) ~ 'back|rear|housing|achterkant'
union all
select 'battery',    count(*) from foneday_catalog where lower(category || ' ' || coalesce(title,'')) ~ 'battery|batterij|accu'
union all
select 'charging',   count(*) from foneday_catalog where lower(category || ' ' || coalesce(title,'')) ~ 'charging|charge connector|dock|laad';
```

- [ ] **Step 4: Ret keyword-kortene til de virkelige strenge**

Åbn `src/lib/buyback/fault-mapping.ts` og erstat kommentarblokken øverst med de **faktisk observerede** kategorier og kvaliteter fra Step 2. Udvid `faultCategoryKeywords` med de ord der optræder i virkeligheden men mangler i kortet.

Giver en fejltype 0 træf i Step 3, er kortet forkert — tilføj de rigtige ord og kør Step 3 igen indtil alle fire er > 0.

Tilsvarende for kvalitet: `faultQualityKeywords` er `["service", "pulled", "refurbished"]`. Bekræft at disse tre ord dækker de kvalitetstrin vi vil betragte som originale, og at aftermarket-trin (`FDX`, `OEM-Equivalent`) **ikke** matcher.

- [ ] **Step 5: Kør testene og commit**

```bash
npx vitest run src/lib/buyback
npx tsc --noEmit
git add src/lib/buyback/fault-mapping.ts
git commit -m "fix(buyback): ground fault category keywords in real Foneday catalog data"
```

---

## Task 2: Uprissættelige defekte dele skal give manuel behandling

Wizardens `brokenParts` rummer ti dele der ikke har en `FaultType`. I dag ignorerer `conditionToFaults` dem, så en telefon med dødt kamera og knuste knapper prissættes som fejlfri. Det er den direkte vej til et for højt automatisk bud.

De **prissættelige** dele er `Opladning` og `Skærm-touch`. Alle andre er uprissættelige: `Kamera`, `Højtaler`, `Mikrofon`, `WiFi`, `Bluetooth`, `Knapper`, `Face ID`, `Tastatur`, `Trackpad`, `USB-porte`.

**Files:**
- Modify: `src/lib/buyback/fault-mapping.ts`
- Modify: `src/lib/buyback/estimate.ts`
- Test: `src/lib/buyback/__tests__/fault-mapping.test.ts`
- Test: `src/lib/buyback/__tests__/estimate.test.ts`

**Interfaces:**
- Producerer: `unpriceableBrokenParts(condition: BuybackCondition): string[]` — returnerer de rapporterede dele der ikke kan prissættes, i den rækkefølge kunden angav dem.

- [ ] **Step 1: Skriv den fejlende test**

Tilføj til `src/lib/buyback/__tests__/fault-mapping.test.ts`:

```ts
import { conditionToFaults, unpriceableBrokenParts, faultCategoryKeywords, faultQualityKeywords } from "../fault-mapping";

describe("unpriceableBrokenParts", () => {
  it("returns nothing when no parts are reported", () => {
    expect(unpriceableBrokenParts(cond())).toEqual([]);
  });

  it("returns nothing for parts we can price", () => {
    expect(unpriceableBrokenParts(cond({ brokenParts: ["Opladning"] }))).toEqual([]);
    expect(unpriceableBrokenParts(cond({ brokenParts: ["Skærm-touch"] }))).toEqual([]);
  });

  it("flags a broken camera", () => {
    expect(unpriceableBrokenParts(cond({ brokenParts: ["Kamera"] }))).toEqual(["Kamera"]);
  });

  it("flags every unpriceable wizard part", () => {
    const parts = ["Kamera", "Højtaler", "Mikrofon", "WiFi", "Bluetooth", "Knapper", "Face ID", "Tastatur", "Trackpad", "USB-porte"];
    expect(unpriceableBrokenParts(cond({ brokenParts: parts }))).toEqual(parts);
  });

  it("separates priceable from unpriceable in a mixed list", () => {
    expect(unpriceableBrokenParts(cond({ brokenParts: ["Opladning", "Kamera"] }))).toEqual(["Kamera"]);
  });

  it("treats an unrecognised part as unpriceable", () => {
    expect(unpriceableBrokenParts(cond({ brokenParts: ["Vandskade"] }))).toEqual(["Vandskade"]);
  });
});
```

- [ ] **Step 2: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/fault-mapping.test.ts`
Forventet: FAIL — `unpriceableBrokenParts is not a function`.

- [ ] **Step 3: Implementér funktionen**

Tilføj nederst i `src/lib/buyback/fault-mapping.ts`:

```ts
// Wizard broken-part labels we can actually put a price on. Everything else the
// customer can tick (Kamera, Højtaler, Mikrofon, WiFi, Bluetooth, Knapper,
// Face ID, Tastatur, Trackpad, USB-porte) has no Foneday part lookup, so a
// device reporting one must never be auto-priced — it would be priced as if the
// fault did not exist.
export function unpriceableBrokenParts(condition: BuybackCondition): string[] {
  return (condition.brokenParts ?? []).filter((part) => {
    const lower = part.toLowerCase();
    return !BROKEN_PART_TO_FAULT.some((m) => lower.includes(m.match));
  });
}
```

- [ ] **Step 4: Kør testen og se den passere**

Run: `npx vitest run src/lib/buyback/__tests__/fault-mapping.test.ts`
Forventet: PASS.

- [ ] **Step 5: Skriv den fejlende test for orkestratoren**

Tilføj til `src/lib/buyback/__tests__/estimate.test.ts`:

```ts
it("flags manual when a reported broken part cannot be priced", async () => {
  const { client } = makeFakeClient(baseTables);
  const r = await estimateBuyback(
    client,
    device(),
    condition({ allWorking: "Nej", brokenParts: ["Kamera"] }),
    DEFAULT_BUYBACK_SETTINGS,
  );
  expect(r.status).toBe("manual");
  expect(r.manualReason).toMatch(/kamera/i);
});

it("still prices a device whose only broken part is chargeable", async () => {
  const { client } = makeFakeClient(baseTables);
  const r = await estimateBuyback(
    client,
    device(),
    condition({ allWorking: "Nej", brokenParts: ["Opladning"] }),
    DEFAULT_BUYBACK_SETTINGS,
  );
  expect(r.status).toBe("ok");
  expect(r.totalDeductionOre).toBe(6000);
});
```

- [ ] **Step 6: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/estimate.test.ts`
Forventet: FAIL — første test giver `status: "ok"` i stedet for `"manual"`.

- [ ] **Step 7: Kobl den ind i orkestratoren**

I `src/lib/buyback/estimate.ts`, udvid importen og indsæt tjekket i short-circuit-blokken:

```ts
import { conditionToFaults, unpriceableBrokenParts } from "./fault-mapping";
```

Erstat short-circuit-blokken med:

```ts
  const unpriceable = unpriceableBrokenParts(condition);

  const earlyInputs: PricingInputs = {
    saleValueOre: null,
    faults: [],
    isApple,
    knownModel,
    cloudLocked,
  };
  if (cloudLocked || !isApple || !knownModel) {
    return computeBuybackPrice(earlyInputs, settings);
  }
  // Reported faults we have no part price for must never be auto-priced: the
  // device would be valued as if the fault did not exist.
  if (unpriceable.length > 0) {
    return {
      ...computeBuybackPrice(earlyInputs, settings),
      status: "manual",
      manualReason: `Defekte dele kan ikke prissættes: ${unpriceable.join(", ")}`,
    };
  }
```

- [ ] **Step 8: Kør hele suiten, typecheck og commit**

```bash
npx vitest run src/lib/buyback
npx tsc --noEmit
git add src/lib/buyback/fault-mapping.ts src/lib/buyback/estimate.ts src/lib/buyback/__tests__/fault-mapping.test.ts src/lib/buyback/__tests__/estimate.test.ts
git commit -m "fix(buyback): unpriceable broken parts force manual pricing"
```

---

## Task 3: Gør basisværdi-opslaget robust mod dubletter

`lookupBaseValueOre` bruger `.maybeSingle()` på `.eq("model", model)`. Findes der to `product_templates` med samme `model`-streng, svarer PostgREST 406 og opslaget kaster midt i prissætningen.

**Files:**
- Modify: `src/lib/buyback/base-value.ts`
- Test: `src/lib/buyback/__tests__/base-value.test.ts`

- [ ] **Step 1: Skriv den fejlende test**

Tilføj til `src/lib/buyback/__tests__/base-value.test.ts`:

```ts
it("uses the first template when two share a model name", async () => {
  const { client, calls } = makeFakeClient({
    product_templates: [
      { id: "t1", model: "iPhone 12", base_price_a: 250000 },
      { id: "t2", model: "iPhone 12", base_price_a: 999000 },
    ],
    devices: [],
  });
  expect(await lookupBaseValueOre(client, "iPhone 12", "128GB")).toBe(250000);
  const call = calls.find((c) => c.table === "product_templates");
  expect(call?.ops).toContainEqual(["limit", 1]);
});
```

- [ ] **Step 2: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/base-value.test.ts`
Forventet: FAIL — `limit` blev aldrig kaldt.

- [ ] **Step 3: Skift til `.limit(1)` og første række**

I `src/lib/buyback/base-value.ts`, erstat template-opslaget:

```ts
  const { data: templates } = await client
    .from("product_templates")
    .select("id, model, base_price_a")
    .eq("model", model)
    .limit(1);

  const tpl = ((templates ?? []) as TemplateRow[])[0];
  if (!tpl) return null;
```

- [ ] **Step 4: Kør testen og se den passere**

Run: `npx vitest run src/lib/buyback/__tests__/base-value.test.ts`
Forventet: PASS (alle tests i filen).

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit
git add src/lib/buyback/base-value.ts src/lib/buyback/__tests__/base-value.test.ts
git commit -m "fix(buyback): tolerate duplicate template model names in base-value lookup"
```

---

## Task 4: Fallback-pristabel

Når vi ikke selv har modellen til salg, har motoren ingen basisværdi og alt går manuelt. `buyback_prices` er en håndholdt tabel admin selv fylder, som træder til i det tilfælde.

**Files:**
- Create: `supabase/migrations/20260728_buyback_prices.sql`
- Create: `src/lib/buyback/fallback-prices.ts`
- Modify: `src/lib/buyback/base-value.ts`
- Test: `src/lib/buyback/__tests__/fallback-prices.test.ts`

**Interfaces:**
- Producerer: `lookupFallbackBaseOre(client, device: BuybackDevice): Promise<number | null>`
- Ændrer: `lookupBaseValueOre(client, model, storage)` → uændret signatur; kaldes stadig af `estimate.ts`. Fallback kaldes fra `estimate.ts`, ikke inde i `base-value.ts`, så de to kilder forbliver adskilte og testbare hver for sig.

- [ ] **Step 1: Skriv migrationen**

Create `supabase/migrations/20260728_buyback_prices.sql`:

```sql
-- Fallback base prices for buyback. Used ONLY when we have no refurbished sale
-- price of our own for the model (no listed device, no template base_price_a).
-- Hand-applied: run in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS buyback_prices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type text NOT NULL,
  brand       text NOT NULL,
  model       text NOT NULL,
  storage     text,
  ram         text,
  base_price  integer NOT NULL,           -- ØRE, device in perfect condition
  active      boolean NOT NULL DEFAULT true,
  note        text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_buyback_prices_variant
  ON buyback_prices (
    lower(trim(device_type)),
    lower(trim(brand)),
    lower(trim(model)),
    lower(trim(coalesce(storage, ''))),
    lower(trim(coalesce(ram, '')))
  );

CREATE INDEX IF NOT EXISTS idx_buyback_prices_lookup
  ON buyback_prices (lower(trim(brand)), lower(trim(model)))
  WHERE active;
```

- [ ] **Step 2: Kør migrationen**

Kør filens indhold i Supabase SQL-editoren. Bekræft:

```sql
select column_name, data_type from information_schema.columns where table_name = 'buyback_prices' order by ordinal_position;
```
Forventet: de 10 kolonner ovenfor.

- [ ] **Step 3: Skriv den fejlende test**

Create `src/lib/buyback/__tests__/fallback-prices.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { lookupFallbackBaseOre } from "../fallback-prices";
import { makeFakeClient } from "./fake-supabase";
import type { BuybackDevice } from "../types";

function device(o: Partial<BuybackDevice> = {}): BuybackDevice {
  return {
    deviceType: "Telefon", brand: "Apple", model: "iPhone 12", storage: "128GB",
    ram: "", useCustom: false, brandCustom: "", modelCustom: "", ...o,
  };
}

const rows = [
  { device_type: "Telefon", brand: "Apple", model: "iPhone 12", storage: "128GB", ram: null, base_price: 250000, active: true },
  { device_type: "Telefon", brand: "Apple", model: "iPhone 12", storage: "256GB", ram: null, base_price: 290000, active: true },
  { device_type: "Telefon", brand: "Apple", model: "iPhone 11", storage: null, ram: null, base_price: 150000, active: true },
  { device_type: "Telefon", brand: "Apple", model: "iPhone X", storage: "64GB", ram: null, base_price: 90000, active: false },
];

describe("lookupFallbackBaseOre", () => {
  it("matches on device type, brand, model and storage", async () => {
    const { client } = makeFakeClient({ buyback_prices: rows });
    expect(await lookupFallbackBaseOre(client, device())).toBe(250000);
  });

  it("matches the right storage variant", async () => {
    const { client } = makeFakeClient({ buyback_prices: rows });
    expect(await lookupFallbackBaseOre(client, device({ storage: "256GB" }))).toBe(290000);
  });

  it("ignores case and surrounding whitespace", async () => {
    const { client } = makeFakeClient({ buyback_prices: rows });
    expect(await lookupFallbackBaseOre(client, device({ brand: "  apple ", model: "IPHONE 12" }))).toBe(250000);
  });

  it("matches a row with no storage when the device has none", async () => {
    const { client } = makeFakeClient({ buyback_prices: rows });
    expect(await lookupFallbackBaseOre(client, device({ model: "iPhone 11", storage: "" }))).toBe(150000);
  });

  it("ignores inactive rows", async () => {
    const { client } = makeFakeClient({ buyback_prices: rows });
    expect(await lookupFallbackBaseOre(client, device({ model: "iPhone X", storage: "64GB" }))).toBeNull();
  });

  it("returns null when nothing matches", async () => {
    const { client } = makeFakeClient({ buyback_prices: rows });
    expect(await lookupFallbackBaseOre(client, device({ model: "iPhone 99" }))).toBeNull();
  });

  it("returns null when the table is empty", async () => {
    const { client } = makeFakeClient({ buyback_prices: [] });
    expect(await lookupFallbackBaseOre(client, device())).toBeNull();
  });
});
```

- [ ] **Step 4: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/fallback-prices.test.ts`
Forventet: FAIL — `Cannot find module '../fallback-prices'`.

- [ ] **Step 5: Implementér opslaget**

Create `src/lib/buyback/fallback-prices.ts`:

```ts
import type { createAdminClient } from "@/lib/supabase/admin";
import type { BuybackDevice } from "./types";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

interface FallbackPriceRow {
  device_type: string | null;
  brand: string | null;
  model: string | null;
  storage: string | null;
  ram: string | null;
  base_price: number | null;
  active: boolean | null;
}

function key(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

// Hand-maintained fallback base price (øre) for a device in perfect condition.
// Only consulted when we have no refurbished sale price of our own. Matching is
// case- and whitespace-insensitive because the wizard stores free-form strings.
export async function lookupFallbackBaseOre(
  client: SupabaseAdmin,
  device: BuybackDevice,
): Promise<number | null> {
  const { data, error } = await client
    .from("buyback_prices")
    .select("device_type, brand, model, storage, ram, base_price, active")
    .eq("active", true);

  if (error || !data) return null;

  const match = (data as FallbackPriceRow[]).find(
    (row) =>
      row.active === true &&
      row.base_price != null &&
      row.base_price > 0 &&
      key(row.device_type) === key(device.deviceType) &&
      key(row.brand) === key(device.brand) &&
      key(row.model) === key(device.model) &&
      key(row.storage) === key(device.storage) &&
      key(row.ram) === key(device.ram),
  );

  return match?.base_price ?? null;
}
```

- [ ] **Step 6: Kør testen og se den passere**

Run: `npx vitest run src/lib/buyback/__tests__/fallback-prices.test.ts`
Forventet: PASS (7 tests).

- [ ] **Step 7: Skriv den fejlende test for kæden i orkestratoren**

Tilføj til `src/lib/buyback/__tests__/estimate.test.ts`:

```ts
it("falls back to buyback_prices when we have no sale price of our own", async () => {
  const { client } = makeFakeClient({
    ...baseTables,
    product_templates: [],
    devices: [],
    buyback_prices: [
      { device_type: "Telefon", brand: "Apple", model: "iPhone 12", storage: "128GB", ram: null, base_price: 200000, active: true },
    ],
  });
  const r = await estimateBuyback(client, device(), condition(), DEFAULT_BUYBACK_SETTINGS);
  expect(r.status).toBe("ok");
  expect(r.saleValueOre).toBe(200000);
});

it("prefers our own sale price over the fallback table", async () => {
  const { client } = makeFakeClient({
    ...baseTables,
    buyback_prices: [
      { device_type: "Telefon", brand: "Apple", model: "iPhone 12", storage: "128GB", ram: null, base_price: 200000, active: true },
    ],
  });
  const r = await estimateBuyback(client, device(), condition(), DEFAULT_BUYBACK_SETTINGS);
  expect(r.saleValueOre).toBe(300000);
});
```

- [ ] **Step 8: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/estimate.test.ts`
Forventet: FAIL — første test giver `status: "manual"`.

- [ ] **Step 9: Kæd fallbacken ind**

I `src/lib/buyback/estimate.ts`, tilføj importen:

```ts
import { lookupFallbackBaseOre } from "./fallback-prices";
```

og erstat linjen der henter basisværdien:

```ts
  // Our own refurbished sale price is the honest base. The hand-maintained
  // fallback table only covers models we do not sell ourselves.
  const saleValueOre =
    (await lookupBaseValueOre(client, templateModel, device.storage)) ??
    (await lookupFallbackBaseOre(client, device));
```

- [ ] **Step 10: Kør hele suiten, typecheck og commit**

```bash
npx vitest run src/lib/buyback
npx tsc --noEmit
npm run lint
git add supabase/migrations/20260728_buyback_prices.sql src/lib/buyback/fallback-prices.ts src/lib/buyback/estimate.ts src/lib/buyback/__tests__/fallback-prices.test.ts src/lib/buyback/__tests__/estimate.test.ts
git commit -m "feat(buyback): hand-maintained fallback base prices"
```

---

## Task 5: Afrund tilbud ned til nærmeste 50 kr

Et bud på 1.847,32 kr afslører at en maskine har regnet. Afrunding nedad holder marginen og får tallet til at ligne noget et menneske har skrevet.

**Files:**
- Create: `src/lib/buyback/rounding.ts`
- Modify: `src/lib/buyback/pricing.ts`
- Test: `src/lib/buyback/__tests__/rounding.test.ts`
- Test: `src/lib/buyback/__tests__/pricing.test.ts`

**Interfaces:**
- Producerer: `OFFER_ROUNDING_ORE: number` (5000) og `roundOfferDown(ore: number): number`

- [ ] **Step 1: Skriv den fejlende test**

Create `src/lib/buyback/__tests__/rounding.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { roundOfferDown, OFFER_ROUNDING_ORE } from "../rounding";

describe("roundOfferDown", () => {
  it("rounds to whole 50 kr steps", () => {
    expect(OFFER_ROUNDING_ORE).toBe(5000);
  });

  it("rounds 1470 kr down to 1450 kr", () => {
    expect(roundOfferDown(147000)).toBe(145000);
  });

  it("leaves an exact multiple untouched", () => {
    expect(roundOfferDown(145000)).toBe(145000);
  });

  it("rounds an amount below one step down to zero", () => {
    expect(roundOfferDown(4900)).toBe(0);
  });

  it("never returns a negative amount", () => {
    expect(roundOfferDown(-1)).toBe(0);
  });
});
```

- [ ] **Step 2: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/rounding.test.ts`
Forventet: FAIL — `Cannot find module '../rounding'`.

- [ ] **Step 3: Implementér**

Create `src/lib/buyback/rounding.ts`:

```ts
// Offers are rounded down to whole 50 kr steps so the amount reads as written
// rather than computed. Rounding DOWN also means rounding never costs margin.
export const OFFER_ROUNDING_ORE = 5000;

export function roundOfferDown(ore: number): number {
  if (ore <= 0) return 0;
  return Math.floor(ore / OFFER_ROUNDING_ORE) * OFFER_ROUNDING_ORE;
}
```

- [ ] **Step 4: Kør testen og se den passere**

Run: `npx vitest run src/lib/buyback/__tests__/rounding.test.ts`
Forventet: PASS (5 tests).

- [ ] **Step 5: Skriv den fejlende test for prissætningen**

Tilføj til `src/lib/buyback/__tests__/pricing.test.ts`:

```ts
it("rounds both offers down to 50 kr steps", () => {
  const r = computeBuybackPrice(
    inputs({ saleValueOre: 300000, faults: [{ type: "screen", partPriceOre: 33333 }] }),
    settings,
  );
  expect(r.aimOfferOre % 5000).toBe(0);
  expect(r.floorOfferOre % 5000).toBe(0);
  expect(r.aimOfferOre).toBe(145000); // 180000 − 33333 = 146667 → 145000
});

it("flags manual when rounding leaves nothing to offer", () => {
  const r = computeBuybackPrice(
    inputs({ saleValueOre: 100000, faults: [{ type: "screen", partPriceOre: 58000 }] }),
    settings,
  );
  expect(r.status).toBe("manual");
});
```

- [ ] **Step 6: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/pricing.test.ts`
Forventet: FAIL — `aimOfferOre` er 146667.

- [ ] **Step 7: Anvend afrundingen før rentabilitets-tjekket**

I `src/lib/buyback/pricing.ts`, tilføj importen:

```ts
import { roundOfferDown } from "./rounding";
```

og erstat de to beregnede tilbud plus tjekket:

```ts
  // Round before the profitability check: an offer that only survives on
  // sub-50-kr precision is not an offer we should send.
  const aimOfferOre = roundOfferDown(sale - aimMarginOre - totalDeductionOre);
  const floorOfferOre = roundOfferDown(sale - floorMarginOre - totalDeductionOre);

  if (floorOfferOre <= 0 || aimOfferOre <= 0) {
    return manual("Enheden er for lidt værd til et rentabelt opkøb");
  }
```

- [ ] **Step 8: Kør hele suiten og ret de forventede tal**

Run: `npx vitest run src/lib/buyback`

Eksisterende tests der brugte runde tal (180000, 147000, 210000, 60000) er allerede multipla af 5000 og skal fortsat passere. Fejler en test på et tal der ikke er et multiplum, er den forventede værdi forældet — ret den til det afrundede tal, ikke koden.

- [ ] **Step 9: Typecheck og commit**

```bash
npx tsc --noEmit
git add src/lib/buyback/rounding.ts src/lib/buyback/pricing.ts src/lib/buyback/__tests__/rounding.test.ts src/lib/buyback/__tests__/pricing.test.ts
git commit -m "feat(buyback): round offers down to whole 50 kr steps"
```

---

## Task 6: Læs enheder fra begge metadata-former

Wizarden har sendt `metadata.devices[]` siden multi-enheds-opdateringen, men admin-listen og `POST /api/trade-in/offers` læser stadig `metadata.device` (ental). Mærke og model står derfor tomt på alle nyere leads, og tilbudsemailen skriver "enhed". Motoren har brug for samme læsning, så den hører hjemme i `src/lib/buyback/`.

**Files:**
- Create: `src/lib/buyback/lead-devices.ts`
- Modify: `src/app/(admin)/admin/opkoeb/page.tsx`
- Modify: `src/app/api/trade-in/offers/route.ts`
- Test: `src/lib/buyback/__tests__/lead-devices.test.ts`

**Interfaces:**
- Producerer: `readLeadDevices(metadata: unknown): LeadDevice[]` hvor `LeadDevice = { device: BuybackDevice; condition: BuybackCondition }`. Returnerer altid et array; tom ved ukendt form.

- [ ] **Step 1: Skriv den fejlende test**

Create `src/lib/buyback/__tests__/lead-devices.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readLeadDevices } from "../lead-devices";

const dev = { deviceType: "Telefon", brand: "Apple", model: "iPhone 12", storage: "128GB", ram: "", useCustom: false, brandCustom: "", modelCustom: "" };
const con = { screen: "Perfekt", back: "Perfekt", battery: "God (80%+)", allWorking: "Ja", brokenParts: [], cloudLocked: "Nej" };

describe("readLeadDevices", () => {
  it("reads the current devices[] shape", () => {
    const r = readLeadDevices({ devices: [{ device: dev, condition: con }] });
    expect(r).toHaveLength(1);
    expect(r[0].device.model).toBe("iPhone 12");
  });

  it("reads multiple devices in order", () => {
    const second = { ...dev, model: "iPhone 13" };
    const r = readLeadDevices({ devices: [{ device: dev, condition: con }, { device: second, condition: con }] });
    expect(r.map((e) => e.device.model)).toEqual(["iPhone 12", "iPhone 13"]);
  });

  it("reads the legacy device/condition shape", () => {
    const r = readLeadDevices({ device: dev, condition: con });
    expect(r).toHaveLength(1);
    expect(r[0].device.model).toBe("iPhone 12");
  });

  it("prefers devices[] when both shapes are present", () => {
    const r = readLeadDevices({ devices: [{ device: dev, condition: con }], device: { ...dev, model: "gammel" }, condition: con });
    expect(r[0].device.model).toBe("iPhone 12");
  });

  it("returns an empty array for null, undefined and junk", () => {
    expect(readLeadDevices(null)).toEqual([]);
    expect(readLeadDevices(undefined)).toEqual([]);
    expect(readLeadDevices("nope")).toEqual([]);
    expect(readLeadDevices({})).toEqual([]);
  });

  it("skips entries without a device object", () => {
    expect(readLeadDevices({ devices: [{ condition: con }] })).toEqual([]);
  });

  it("defaults missing condition fields rather than throwing", () => {
    const r = readLeadDevices({ devices: [{ device: dev }] });
    expect(r).toHaveLength(1);
    expect(r[0].condition.brokenParts).toEqual([]);
  });
});
```

- [ ] **Step 2: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/lead-devices.test.ts`
Forventet: FAIL — `Cannot find module '../lead-devices'`.

- [ ] **Step 3: Implementér læseren**

Create `src/lib/buyback/lead-devices.ts`:

```ts
import type { BuybackCondition, BuybackDevice } from "./types";

export interface LeadDevice {
  device: BuybackDevice;
  condition: BuybackCondition;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toDevice(raw: unknown): BuybackDevice | null {
  if (!isRecord(raw)) return null;
  return {
    deviceType: str(raw.deviceType),
    brand: str(raw.brand),
    model: str(raw.model),
    storage: str(raw.storage),
    ram: str(raw.ram),
    useCustom: raw.useCustom === true,
    brandCustom: str(raw.brandCustom),
    modelCustom: str(raw.modelCustom),
  };
}

function toCondition(raw: unknown): BuybackCondition {
  const r = isRecord(raw) ? raw : {};
  return {
    screen: str(r.screen),
    back: str(r.back),
    battery: str(r.battery),
    allWorking: str(r.allWorking),
    brokenParts: Array.isArray(r.brokenParts) ? r.brokenParts.filter((p): p is string => typeof p === "string") : [],
    cloudLocked: str(r.cloudLocked),
  };
}

// contact_inquiries.metadata has two historical shapes: the current
// `devices: [{ device, condition }]` written by the multi-device wizard, and the
// older flat `{ device, condition }`. Everything that reads a buyback lead goes
// through here so neither shape is silently dropped.
export function readLeadDevices(metadata: unknown): LeadDevice[] {
  if (!isRecord(metadata)) return [];

  if (Array.isArray(metadata.devices)) {
    return metadata.devices
      .map((entry) => {
        const source = isRecord(entry) ? entry : {};
        const device = toDevice(source.device);
        return device ? { device, condition: toCondition(source.condition) } : null;
      })
      .filter((entry): entry is LeadDevice => entry !== null);
  }

  const device = toDevice(metadata.device);
  return device ? [{ device, condition: toCondition(metadata.condition) }] : [];
}
```

- [ ] **Step 4: Kør testen og se den passere**

Run: `npx vitest run src/lib/buyback/__tests__/lead-devices.test.ts`
Forventet: PASS (7 tests).

- [ ] **Step 5: Brug den i admin-listen**

I `src/app/(admin)/admin/opkoeb/page.tsx`, tilføj importen:

```ts
import { readLeadDevices } from "@/lib/buyback/lead-devices";
```

Erstat i `filtered`-filteret:

```ts
      const q = search.toLowerCase();
      const leadDevices = readLeadDevices(row.inquiry.metadata);
      const haystack = [
        row.inquiry.name,
        row.inquiry.email,
        ...leadDevices.flatMap((e) => [e.device.brand, e.device.model]),
      ].join(" ").toLowerCase();
```

og erstat i rækkens render (linjerne der i dag laver `const device = meta.device || {}` og skriver `{device.brand} {device.model}`):

```ts
              const meta = (row.inquiry.metadata || {}) as Record<string, unknown>;
              const leadDevices = readLeadDevices(meta);
              const first = leadDevices[0]?.device;
              const extraCount = Math.max(0, leadDevices.length - 1);
```

```tsx
                    <p className="mt-0.5 truncate text-xs text-charcoal/35">
                      {first ? `${first.brand} ${first.model}` : "Ukendt enhed"}
                      {first?.storage && ` \· ${first.storage}`}
                      {extraCount > 0 && ` \· +${extraCount} enhed${extraCount > 1 ? "er" : ""}`}
                      {` \· ${meta.deliveryMethod === "Aflever i butik" ? "Butik" : "Forsendelse"}`}
                    </p>
```

- [ ] **Step 6: Brug den i tilbuds-routen**

I `src/app/api/trade-in/offers/route.ts`, tilføj importen:

```ts
import { readLeadDevices } from "@/lib/buyback/lead-devices";
```

Erstat blok 4's udtræk af enhed og stand:

```ts
  const leadDevices = readLeadDevices(inquiry.metadata);
  const device = leadDevices[0]?.device;
  const condition = leadDevices[0]?.condition;
  const amountKr = formatDKK(offer_amount);

  const conditionParts = [
    condition?.screen ? `Skærm: ${condition.screen}` : null,
    condition?.back ? `Bagside: ${condition.back}` : null,
    condition?.battery ? `Batteri: ${condition.battery}` : null,
  ].filter(Boolean).join(", ");

  const extraDevices = Math.max(0, leadDevices.length - 1);
```

og i `buildOfferEmailHtml`-kaldet:

```ts
    deviceType: device?.deviceType || "enhed",
    brand: device?.brand || "",
    model: extraDevices > 0 ? `${device?.model ?? ""} (+${extraDevices} enhed${extraDevices > 1 ? "er" : ""})` : (device?.model || ""),
    storage: device?.storage || null,
```

og i `buildOfferEmailSubject`-kaldet: `device?.model || "enhed"`.

- [ ] **Step 7: Verificér i browseren**

```bash
npm run dev
```
Åbn `/admin/opkoeb`. Forventet: mærke og model står nu på rækkerne — også på leads oprettet efter multi-enheds-wizarden. Leads med flere enheder viser `+1 enhed`.

- [ ] **Step 8: Typecheck, lint og commit**

```bash
npx tsc --noEmit
npm run lint
git add src/lib/buyback/lead-devices.ts src/lib/buyback/__tests__/lead-devices.test.ts "src/app/(admin)/admin/opkoeb/page.tsx" src/app/api/trade-in/offers/route.ts
git commit -m "fix(buyback): read both metadata device shapes in admin list and offer email"
```

---

## Task 7: Hændelseslog

Én append-only tabel hvor alt systemet gør står i rækkefølge. Den er kilden til live-feedet nu, og til SMS og morgenmail i Plan 3. Én skrivning, tre aftagere.

**Files:**
- Create: `supabase/migrations/20260728_buyback_events.sql`
- Create: `src/lib/buyback/events.ts`
- Test: `src/lib/buyback/__tests__/events.test.ts`

**Interfaces:**
- Producerer:
  - `type BuybackEventType = "priced" | "scheduled" | "sent" | "cancelled" | "taken_over" | "manual" | "auto_declined" | "declined" | "delivered" | "bounced" | "accepted" | "rejected" | "paused" | "resumed" | "error"`
  - `type BuybackEventSeverity = "info" | "warn" | "critical"`
  - `logBuybackEvent(client, event: BuybackEventInput): Promise<void>` — kaster aldrig.

- [ ] **Step 1: Skriv migrationen**

Create `supabase/migrations/20260728_buyback_events.sql`:

```sql
-- Append-only log of everything the buyback system does. Feeds the admin live
-- feed, the SMS alerts and the daily operations email.
-- Hand-applied: run in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS buyback_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid REFERENCES contact_inquiries(id) ON DELETE SET NULL,
  offer_id   uuid REFERENCES trade_in_offers(id) ON DELETE SET NULL,
  type       text NOT NULL,
  severity   text NOT NULL DEFAULT 'info',
  summary    text NOT NULL,
  detail     jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyback_events_created_at
  ON buyback_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_buyback_events_inquiry
  ON buyback_events (inquiry_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_buyback_events_severity
  ON buyback_events (severity, created_at DESC)
  WHERE severity <> 'info';
```

- [ ] **Step 2: Kør migrationen og slå realtime til**

Kør filens indhold i SQL-editoren, og derefter:

```sql
alter publication supabase_realtime add table buyback_events;
```

Bekræft:

```sql
select tablename from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'buyback_events';
```
Forventet: én række.

- [ ] **Step 3: Skriv den fejlende test**

Create `src/lib/buyback/__tests__/events.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { logBuybackEvent } from "../events";
import { makeFakeClient } from "./fake-supabase";

describe("logBuybackEvent", () => {
  it("inserts the event into buyback_events", async () => {
    const { client, calls } = makeFakeClient({ buyback_events: [] });
    await logBuybackEvent(client, {
      type: "priced",
      summary: "iPhone 12 128GB prissat til 1.450 kr",
      inquiryId: "inq-1",
    });
    const call = calls.find((c) => c.table === "buyback_events");
    expect(call).toBeTruthy();
    const insert = call?.ops.find(([op]) => op === "insert");
    expect(insert?.[1]).toMatchObject({
      type: "priced",
      severity: "info",
      summary: "iPhone 12 128GB prissat til 1.450 kr",
      inquiry_id: "inq-1",
    });
  });

  it("defaults severity to info and optional ids to null", async () => {
    const { client, calls } = makeFakeClient({ buyback_events: [] });
    await logBuybackEvent(client, { type: "resumed", summary: "Automatik genstartet" });
    const insert = calls.find((c) => c.table === "buyback_events")?.ops.find(([op]) => op === "insert");
    expect(insert?.[1]).toMatchObject({ severity: "info", inquiry_id: null, offer_id: null, detail: null });
  });

  it("carries severity and detail through", async () => {
    const { client, calls } = makeFakeClient({ buyback_events: [] });
    await logBuybackEvent(client, {
      type: "bounced",
      severity: "critical",
      summary: "Tilbudsmail bouncede",
      detail: { email: "kunde@example.com" },
    });
    const insert = calls.find((c) => c.table === "buyback_events")?.ops.find(([op]) => op === "insert");
    expect(insert?.[1]).toMatchObject({ severity: "critical", detail: { email: "kunde@example.com" } });
  });

  it("never throws when the insert fails", async () => {
    const client = { from: vi.fn(() => { throw new Error("db down"); }) } as never;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(logBuybackEvent(client, { type: "error", summary: "noget gik galt" })).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
```

- [ ] **Step 4: Udvid test-mocken med `insert`**

`makeFakeClient` i `src/lib/buyback/__tests__/fake-supabase.ts` mangler `insert`. Tilføj den til `chain`, ved siden af `select`:

```ts
      insert: (...a: unknown[]) => record("insert", ...a),
```

- [ ] **Step 5: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/events.test.ts`
Forventet: FAIL — `Cannot find module '../events'`.

- [ ] **Step 6: Implementér loggeren**

Create `src/lib/buyback/events.ts`:

```ts
import type { createAdminClient } from "@/lib/supabase/admin";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type BuybackEventType =
  | "priced"       // engine produced a result
  | "scheduled"    // offer email queued with a hold window
  | "sent"         // offer email left the building
  | "cancelled"    // scheduled offer cancelled before sending
  | "taken_over"   // admin took a lead out of automation
  | "manual"       // lead fell outside the safety envelope
  | "auto_declined"
  | "declined"
  | "delivered"    // Resend webhook
  | "bounced"      // Resend webhook
  | "accepted"     // customer accepted
  | "rejected"     // customer rejected
  | "paused"       // automation stopped itself
  | "resumed"
  | "error";

export type BuybackEventSeverity = "info" | "warn" | "critical";

export interface BuybackEventInput {
  type: BuybackEventType;
  summary: string; // Danish one-liner, reused verbatim in feed, SMS and digest
  severity?: BuybackEventSeverity;
  inquiryId?: string | null;
  offerId?: string | null;
  detail?: unknown;
}

// Writes one row to buyback_events. Logging must never break the operation it
// describes, so every failure is swallowed and reported to the server console.
export async function logBuybackEvent(
  client: SupabaseAdmin,
  event: BuybackEventInput,
): Promise<void> {
  try {
    await client.from("buyback_events").insert({
      inquiry_id: event.inquiryId ?? null,
      offer_id: event.offerId ?? null,
      type: event.type,
      severity: event.severity ?? "info",
      summary: event.summary,
      detail: event.detail ?? null,
    });
  } catch (err) {
    console.warn("[buyback] failed to log event", event.type, err);
  }
}
```

- [ ] **Step 7: Kør testen og se den passere**

Run: `npx vitest run src/lib/buyback/__tests__/events.test.ts`
Forventet: PASS (4 tests).

- [ ] **Step 8: Typecheck og commit**

```bash
npx vitest run src/lib/buyback
npx tsc --noEmit
git add supabase/migrations/20260728_buyback_events.sql src/lib/buyback/events.ts src/lib/buyback/__tests__/events.test.ts src/lib/buyback/__tests__/fake-supabase.ts
git commit -m "feat(buyback): append-only event log"
```

---

## Task 8: Live-feed i admin

Feedet er det synlige bevis på at intet sker i tavshed. Det bygges nu, mens der kun er få hændelsestyper, så det står klar når automatikken tændes i Plan 3.

**Files:**
- Create: `src/components/admin/BuybackFeed.tsx`
- Modify: `src/app/(admin)/admin/opkoeb/page.tsx`

**Interfaces:**
- Consumes: `buyback_events`-tabellen fra Task 7.
- Producerer: `<BuybackFeed limit={number} />` — selvstændig klientkomponent, henter selv sine data.

- [ ] **Step 1: Byg komponenten**

Create `src/components/admin/BuybackFeed.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { BuybackEventSeverity, BuybackEventType } from "@/lib/buyback/events";

interface FeedRow {
  id: string;
  inquiry_id: string | null;
  type: BuybackEventType;
  severity: BuybackEventSeverity;
  summary: string;
  created_at: string;
}

const SEVERITY_STYLE: Record<BuybackEventSeverity, { dot: string; text: string }> = {
  info: { dot: "bg-charcoal/20", text: "text-charcoal/60" },
  warn: { dot: "bg-amber-500", text: "text-amber-700" },
  critical: { dot: "bg-rose-500", text: "text-rose-700" },
};

function relativeTime(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "lige nu";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `for ${minutes} min. siden`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `for ${hours} t. siden`;
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

export default function BuybackFeed({ limit = 12 }: { limit?: number }) {
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from("buyback_events")
      .select("id, inquiry_id, type, severity, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    setRows((data ?? []) as FeedRow[]);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    load();
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("buyback-events-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "buyback_events" }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  if (loading) return null;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-black/[0.03] px-5 py-3">
        <h3 className="text-[13px] font-semibold text-charcoal">Aktivitet</h3>
        <span className="text-[11px] text-charcoal/30">Opdateres automatisk</span>
      </header>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-charcoal/30">Ingen aktivitet endnu.</p>
      ) : (
        <ul className="divide-y divide-black/[0.03]">
          {rows.map((row) => {
            const style = SEVERITY_STYLE[row.severity] ?? SEVERITY_STYLE.info;
            return (
              <li key={row.id} className="flex items-center gap-3 px-5 py-2.5">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
                <p className={`min-w-0 flex-1 truncate text-[13px] ${style.text}`}>{row.summary}</p>
                <span className="shrink-0 text-[11px] text-charcoal/25">{relativeTime(row.created_at)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Sæt den ind på opkøbssiden**

I `src/app/(admin)/admin/opkoeb/page.tsx`, tilføj importen:

```ts
import BuybackFeed from "@/components/admin/BuybackFeed";
```

og indsæt komponenten mellem headeren og søgefeltet:

```tsx
      <BuybackFeed limit={12} />
```

- [ ] **Step 3: Verificér med rigtige data**

Indsæt tre testhændelser i SQL-editoren:

```sql
insert into buyback_events (type, severity, summary) values
  ('priced',   'info',     'iPhone 12 128GB prissat til 1.450 kr'),
  ('manual',   'warn',     'iPhone 99 kunne ikke prissættes — ukendt model'),
  ('bounced',  'critical', 'Tilbudsmail bouncede til kunde@example.com');
```

```bash
npm run dev
```

Åbn `/admin/opkoeb`. Forventet: de tre linjer står nyeste først, med grå, gul og rød prik. Indsæt en fjerde række i SQL-editoren mens siden er åben — den skal dukke op uden genindlæsning.

- [ ] **Step 4: Ryd testdata**

```sql
delete from buyback_events where summary like '%example.com%' or summary like 'iPhone 99%' or summary like 'iPhone 12 128GB prissat%';
```

- [ ] **Step 5: Typecheck, lint og commit**

```bash
npx tsc --noEmit
npm run lint
git add src/components/admin/BuybackFeed.tsx "src/app/(admin)/admin/opkoeb/page.tsx"
git commit -m "feat(admin): live buyback activity feed"
```

---

## Færdig-kriterier for Plan 1

- `npx vitest run src/lib/buyback` → alt grønt. `npx tsc --noEmit` → ingen fejl. `npm run lint` → rent.
- `estimateBuyback()` returnerer `manual` for iCloud-låst, ikke-Apple, tom model, uprissættelig defekt del, manglende basisværdi og urentabel enhed — og et afrundet `aimOfferOre` i alle andre tilfælde.
- Basisværdien tages fra egen salgspris, ellers fra `buyback_prices`, ellers `null`.
- `/admin/opkoeb` viser mærke og model på alle leads, uanset metadata-form, og har et live-feed der opdaterer sig selv.
- `logBuybackEvent()` findes og kaster aldrig.

## Hvad der bevidst IKKE er med

- **Prisforslag i admin-UI og kø-tilstand** → Plan 2.
- **Afvisning med email** → Plan 2.
- **Auto-send, hold-vindue, Resend-webhook, auto-pause** → Plan 3.
- **SMS-alarmer og daglig driftsmail** → Plan 3.
- **Admin-side til at redigere `buyback_prices`** → Plan 2. Tabellen fyldes indtil da via SQL-editoren.
