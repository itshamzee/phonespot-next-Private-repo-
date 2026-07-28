# Opkøb-automatisering — Plan 2 af 3: prisforslag, afvisning og kø-tilstand

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gøre admin i stand til at afvikle et lead på få sekunder — forudfyldt prisforslag med begrundelse, afvisning med dansk email i ét klik, og en tastaturdrevet kø der springer videre til næste lead — uden at noget endnu sendes automatisk.

**Architecture:** En ny server-route `GET /api/trade-in/suggest` kører motoren fra Plan 1 og leverer forslag + breakdown til admin-UI. Afvisning får sit eget hjem i `buyback_declines` og sin egen route, så `contact_inquiries` ikke fyldes med opkøbs-kolonner. Kø-tilstanden er en selvstændig side der genbruger de samme to routes.

**Tech Stack:** TypeScript (strict), Vitest 4, Next.js App Router, Supabase, Resend.

## Global Constraints

- **Alle beløb er heltal i øre.** Input i admin er kroner og konverteres ved kanten.
- **Ingen `any`.** Brug `unknown` + narrowing eller typede interfaces.
- **Ingen emojis** i kode, UI, emails eller commit-beskeder.
- **Alt kundevendt og admin-vendt tekst er dansk.** Kode og commits på engelsk.
- **Aldrig "Panserglas"** i kundevendt tekst — brug "beskyttelsesglas".
- **Aldrig "Foxway", "Foneday" eller "dropship"** i kundevendt tekst.
- Emails følger `src/lib/email/offer-email.ts` i opbygning og `src/lib/email/brand.ts` i udseende.
- Tests co-lokeres i `src/lib/buyback/__tests__/`.
- Commit efter hver task.
- **Alle kommandoer køres fra** `C:/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next`.
- Migrationer er **håndkørte** i Supabase SQL-editoren.
- **Forudsætter Plan 1 er merget.** `estimateBuyback`, `readLeadDevices`, `logBuybackEvent`, `roundOfferDown` og `lookupFallbackBaseOre` findes.

## Filstruktur

| Fil | Ansvar |
|---|---|
| `src/lib/buyback/suggest.ts` | Kør motoren for et helt lead (flere enheder) og læg beløbene sammen |
| `src/lib/buyback/breakdown.ts` | Ren: `PricingResult` → dansk étlinjes-forklaring |
| `src/app/api/trade-in/suggest/route.ts` | `GET ?inquiry_id=` → forslag + breakdown |
| `src/app/api/trade-in/decline/route.ts` | `POST` → afvis lead, send email, log |
| `src/lib/email/decline-email.ts` | Dansk afvisningsemail, én variant per årsag |
| `src/lib/buyback/decline-reasons.ts` | Ren: årsagskoder, danske labels og emailtekster |
| `src/lib/supabase/trade-in-types.ts` | `deriveTradeInStatus()` får afvist-gren |
| `src/app/(admin)/admin/opkoeb/[id]/page.tsx` | Forudfyldt beløb, breakdown, afvis-knap |
| `src/app/(admin)/admin/opkoeb/ko/page.tsx` | Kø-tilstand |
| `src/app/(admin)/admin/opkoeb/priser/page.tsx` | Rediger `buyback_prices` + CSV-indsæt |
| `supabase/migrations/20260728_buyback_declines.sql` | Afvisningstabel |

---

## Task 1: Forslag for et helt lead

Motoren prissætter én enhed. Et lead kan rumme flere, men tilbuddet er ét beløb. Denne task lægger dem sammen ærligt: kan bare én enhed ikke prissættes, er hele leadet manuelt.

**Files:**
- Create: `src/lib/buyback/suggest.ts`
- Test: `src/lib/buyback/__tests__/suggest.test.ts`

**Interfaces:**
- Producerer:
  ```ts
  interface LeadSuggestion {
    status: "ok" | "manual";
    manualReason?: string;
    totalAimOre: number;      // 0 når manual
    totalFloorOre: number;    // 0 når manual
    perDevice: { label: string; result: PricingResult }[];
    suggestDecline: boolean;  // true ved iCloud-lås
  }
  suggestForLead(client, metadata: unknown, settings): Promise<LeadSuggestion>
  ```

- [ ] **Step 1: Skriv den fejlende test**

Create `src/lib/buyback/__tests__/suggest.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { suggestForLead } from "../suggest";
import { DEFAULT_BUYBACK_SETTINGS } from "../settings";
import { makeFakeClient } from "./fake-supabase";

const dev = { deviceType: "Telefon", brand: "Apple", model: "iPhone 12", storage: "128GB", ram: "", useCustom: false, brandCustom: "", modelCustom: "" };
const good = { screen: "Perfekt", back: "Perfekt", battery: "God (80%+)", allWorking: "Ja", brokenParts: [], cloudLocked: "Nej" };

const tables = {
  product_templates: [{ id: "t1", model: "iPhone 12", base_price_a: 250000 }],
  devices: [{ selling_price: 300000, status: "listed", storage: "128GB" }],
  foneday_catalog: [
    { category: "Display", quality: "Refurbished", price_dkk: 33000, in_stock: true, model_codes: ["iPhone 12"], suitable_for: "Apple iPhone 12", title: "Display Refurbished iPhone 12" },
  ],
  buyback_prices: [],
};

describe("suggestForLead", () => {
  it("suggests the aim offer for a single perfect device", async () => {
    const { client } = makeFakeClient(tables);
    const s = await suggestForLead(client, { devices: [{ device: dev, condition: good }] }, DEFAULT_BUYBACK_SETTINGS);
    expect(s.status).toBe("ok");
    expect(s.totalAimOre).toBe(180000);
    expect(s.totalFloorOre).toBe(210000);
    expect(s.perDevice).toHaveLength(1);
    expect(s.perDevice[0].label).toBe("Apple iPhone 12 128GB");
  });

  it("sums two devices", async () => {
    const { client } = makeFakeClient(tables);
    const s = await suggestForLead(
      client,
      { devices: [{ device: dev, condition: good }, { device: dev, condition: good }] },
      DEFAULT_BUYBACK_SETTINGS,
    );
    expect(s.totalAimOre).toBe(360000);
    expect(s.perDevice).toHaveLength(2);
  });

  it("goes manual if any single device cannot be priced", async () => {
    const { client } = makeFakeClient(tables);
    const unknown = { ...dev, model: "" };
    const s = await suggestForLead(
      client,
      { devices: [{ device: dev, condition: good }, { device: unknown, condition: good }] },
      DEFAULT_BUYBACK_SETTINGS,
    );
    expect(s.status).toBe("manual");
    expect(s.totalAimOre).toBe(0);
    expect(s.manualReason).toBeTruthy();
  });

  it("suggests declining an iCloud-locked device", async () => {
    const { client } = makeFakeClient(tables);
    const s = await suggestForLead(client, { devices: [{ device: dev, condition: { ...good, cloudLocked: "Ja" } }] }, DEFAULT_BUYBACK_SETTINGS);
    expect(s.status).toBe("manual");
    expect(s.suggestDecline).toBe(true);
  });

  it("goes manual with an explicit reason when the lead has no devices", async () => {
    const { client } = makeFakeClient(tables);
    const s = await suggestForLead(client, {}, DEFAULT_BUYBACK_SETTINGS);
    expect(s.status).toBe("manual");
    expect(s.manualReason).toMatch(/ingen enheder/i);
  });
});
```

- [ ] **Step 2: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/suggest.test.ts`
Forventet: FAIL — `Cannot find module '../suggest'`.

- [ ] **Step 3: Implementér**

Create `src/lib/buyback/suggest.ts`:

```ts
import type { createAdminClient } from "@/lib/supabase/admin";
import type { BuybackSettings, PricingResult } from "./types";
import { readLeadDevices } from "./lead-devices";
import { estimateBuyback } from "./estimate";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export interface LeadSuggestion {
  status: "ok" | "manual";
  manualReason?: string;
  totalAimOre: number;
  totalFloorOre: number;
  perDevice: { label: string; result: PricingResult }[];
  suggestDecline: boolean;
}

// A lead may hold several devices but an offer is a single amount. If even one
// device cannot be priced, the whole lead is manual — a partial sum would be a
// number nobody could defend.
export async function suggestForLead(
  client: SupabaseAdmin,
  metadata: unknown,
  settings: BuybackSettings,
): Promise<LeadSuggestion> {
  const leadDevices = readLeadDevices(metadata);

  if (leadDevices.length === 0) {
    return {
      status: "manual",
      manualReason: "Ingen enheder på henvendelsen",
      totalAimOre: 0,
      totalFloorOre: 0,
      perDevice: [],
      suggestDecline: false,
    };
  }

  const perDevice = [];
  for (const entry of leadDevices) {
    const result = await estimateBuyback(client, entry.device, entry.condition, settings);
    const label = [entry.device.brand, entry.device.model, entry.device.storage]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");
    perDevice.push({ label: label || "Ukendt enhed", result });
  }

  const suggestDecline = leadDevices.some(
    (entry) => entry.condition.cloudLocked.trim().toLowerCase() === "ja",
  );

  const failed = perDevice.find((entry) => entry.result.status === "manual");
  if (failed) {
    return {
      status: "manual",
      manualReason: `${failed.label}: ${failed.result.manualReason ?? "kan ikke prissættes"}`,
      totalAimOre: 0,
      totalFloorOre: 0,
      perDevice,
      suggestDecline,
    };
  }

  return {
    status: "ok",
    totalAimOre: perDevice.reduce((sum, e) => sum + e.result.aimOfferOre, 0),
    totalFloorOre: perDevice.reduce((sum, e) => sum + e.result.floorOfferOre, 0),
    perDevice,
    suggestDecline,
  };
}
```

- [ ] **Step 4: Kør testen og se den passere**

Run: `npx vitest run src/lib/buyback/__tests__/suggest.test.ts`
Forventet: PASS (5 tests).

- [ ] **Step 5: Typecheck og commit**

```bash
npx tsc --noEmit
git add src/lib/buyback/suggest.ts src/lib/buyback/__tests__/suggest.test.ts
git commit -m "feat(buyback): per-lead price suggestion across multiple devices"
```

---

## Task 2: Læsbar begrundelse

Admin skal aldrig gætte hvorfor tallet blev som det blev. Én linje er nok, men den skal være rigtig.

**Files:**
- Create: `src/lib/buyback/breakdown.ts`
- Test: `src/lib/buyback/__tests__/breakdown.test.ts`

**Interfaces:**
- Producerer: `explainPricing(result: PricingResult): string` — dansk étlinjes-forklaring. Tom streng ved `status: "manual"`.

- [ ] **Step 1: Skriv den fejlende test**

Create `src/lib/buyback/__tests__/breakdown.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { explainPricing } from "../breakdown";
import type { PricingResult } from "../types";

function result(o: Partial<PricingResult> = {}): PricingResult {
  return {
    status: "ok",
    saleValueOre: 300000,
    faults: [],
    totalDeductionOre: 0,
    targetMarginPct: 0.4,
    floorMarginOre: 90000,
    aimOfferOre: 180000,
    floorOfferOre: 210000,
    ceilingOfferOre: null,
    expectedMarginUpsideOre: 0,
    ...o,
  };
}

describe("explainPricing", () => {
  it("explains a device with no faults", () => {
    expect(explainPricing(result())).toBe("Egen salgspris 3.000 − margin 1.200 = 1.800 kr");
  });

  it("names each fault deduction", () => {
    const r = result({
      faults: [{ type: "screen", partPriceOre: 33000, cleaningProbability: 0 }],
      totalDeductionOre: 33000,
      aimOfferOre: 145000,
    });
    expect(explainPricing(r)).toBe("Egen salgspris 3.000 − margin 1.200 − skærm 330 = 1.450 kr");
  });

  it("lists several faults in order", () => {
    const r = result({
      faults: [
        { type: "screen", partPriceOre: 33000, cleaningProbability: 0 },
        { type: "battery", partPriceOre: 13000, cleaningProbability: 0 },
      ],
      totalDeductionOre: 46000,
      aimOfferOre: 130000,
    });
    expect(explainPricing(r)).toContain("− skærm 330 − batteri 130");
  });

  it("returns an empty string for a manual result", () => {
    expect(explainPricing(result({ status: "manual", manualReason: "iCloud-låst" }))).toBe("");
  });
});
```

- [ ] **Step 2: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/breakdown.test.ts`
Forventet: FAIL — `Cannot find module '../breakdown'`.

- [ ] **Step 3: Implementér**

Create `src/lib/buyback/breakdown.ts`:

```ts
import type { FaultType, PricingResult } from "./types";

const FAULT_LABEL: Record<FaultType, string> = {
  screen: "skærm",
  back_glass: "bagglas",
  battery: "batteri",
  charging: "ladestik",
};

function kr(ore: number): string {
  return new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(Math.round(ore / 100));
}

// One line an admin can read at a glance and defend to a customer. Amounts are
// whole kroner: the øre precision is noise in this context.
export function explainPricing(result: PricingResult): string {
  if (result.status !== "ok" || result.saleValueOre == null) return "";

  const marginOre = result.saleValueOre - result.totalDeductionOre - result.aimOfferOre;
  const parts = [`Egen salgspris ${kr(result.saleValueOre)}`, `− margin ${kr(marginOre)}`];

  for (const fault of result.faults) {
    parts.push(`− ${FAULT_LABEL[fault.type]} ${kr(fault.partPriceOre)}`);
  }

  return `${parts.join(" ")} = ${kr(result.aimOfferOre)} kr`;
}
```

- [ ] **Step 4: Kør testen og se den passere**

Run: `npx vitest run src/lib/buyback/__tests__/breakdown.test.ts`
Forventet: PASS (4 tests).

- [ ] **Step 5: Typecheck og commit**

```bash
npx tsc --noEmit
git add src/lib/buyback/breakdown.ts src/lib/buyback/__tests__/breakdown.test.ts
git commit -m "feat(buyback): human-readable pricing breakdown"
```

---

## Task 3: Forslags-route

**Files:**
- Create: `src/app/api/trade-in/suggest/route.ts`

**Interfaces:**
- Consumes: `suggestForLead`, `explainPricing`, `loadBuybackSettings`.
- Producerer: `GET /api/trade-in/suggest?inquiry_id=<uuid>` →
  ```json
  { "status": "ok", "totalAimKr": 1800, "totalFloorKr": 2100,
    "suggestDecline": false, "manualReason": null,
    "devices": [{ "label": "Apple iPhone 12 128GB", "explanation": "...", "aimKr": 1800 }] }
  ```

- [ ] **Step 1: Skriv routen**

Create `src/app/api/trade-in/suggest/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBuybackSettings } from "@/lib/buyback/settings";
import { suggestForLead } from "@/lib/buyback/suggest";
import { explainPricing } from "@/lib/buyback/breakdown";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const inquiryId = searchParams.get("inquiry_id");
  if (!inquiryId) {
    return NextResponse.json({ error: "inquiry_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("id, metadata")
    .eq("id", inquiryId)
    .maybeSingle();

  if (!inquiry) {
    return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
  }

  const settings = await loadBuybackSettings(supabase);
  const suggestion = await suggestForLead(supabase, inquiry.metadata, settings);

  return NextResponse.json({
    status: suggestion.status,
    manualReason: suggestion.manualReason ?? null,
    suggestDecline: suggestion.suggestDecline,
    totalAimKr: Math.round(suggestion.totalAimOre / 100),
    totalFloorKr: Math.round(suggestion.totalFloorOre / 100),
    devices: suggestion.perDevice.map((entry) => ({
      label: entry.label,
      explanation: explainPricing(entry.result),
      manualReason: entry.result.manualReason ?? null,
      aimKr: Math.round(entry.result.aimOfferOre / 100),
    })),
  });
}
```

- [ ] **Step 2: Verificér mod et rigtigt lead**

```bash
npm run dev
```

Find et lead-id: `select id from contact_inquiries where source = 'saelg-enhed' order by created_at desc limit 3;`

```bash
curl "http://localhost:3000/api/trade-in/suggest?inquiry_id=<id>"
```
Forventet: JSON med enten `status: "ok"` og et beløb, eller `status: "manual"` med en dansk `manualReason`. Begge er korrekte svar — noter hvilke der er hvad, det er første rigtige signal på hvor stor den manuelle kø bliver.

- [ ] **Step 3: Commit**

```bash
npx tsc --noEmit
npm run lint
git add src/app/api/trade-in/suggest/route.ts
git commit -m "feat(api): price suggestion endpoint for buyback leads"
```

---

## Task 4: Afvisningstabel og årsager

**Files:**
- Create: `supabase/migrations/20260728_buyback_declines.sql`
- Create: `src/lib/buyback/decline-reasons.ts`
- Test: `src/lib/buyback/__tests__/decline-reasons.test.ts`

**Interfaces:**
- Producerer:
  ```ts
  type DeclineReasonCode = "ikke_koeb_stand" | "vandskade" | "skaerm_knust" | "icloud_laast" | "for_gammel_model" | "mangler_info";
  const DECLINE_REASONS: { code: DeclineReasonCode; label: string; body: string }[];
  function isDeclineReasonCode(value: unknown): value is DeclineReasonCode;
  function declineReason(code: DeclineReasonCode): { code; label; body };
  ```

- [ ] **Step 1: Skriv migrationen**

Create `supabase/migrations/20260728_buyback_declines.sql`:

```sql
-- Admin-side declines for buyback leads. Kept out of contact_inquiries so the
-- shared inquiries table does not grow buyback-specific columns.
-- Hand-applied: run in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS buyback_declines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id  uuid NOT NULL REFERENCES contact_inquiries(id) ON DELETE CASCADE,
  reason_code text NOT NULL,
  note        text,
  email_sent  boolean NOT NULL DEFAULT false,
  declined_at timestamptz NOT NULL DEFAULT now(),
  declined_by text
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_buyback_declines_inquiry
  ON buyback_declines (inquiry_id);
```

- [ ] **Step 2: Kør migrationen**

Kør indholdet i Supabase SQL-editoren. Bekræft:

```sql
select count(*) from buyback_declines;
```
Forventet: `0` uden fejl.

- [ ] **Step 3: Skriv den fejlende test**

Create `src/lib/buyback/__tests__/decline-reasons.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { DECLINE_REASONS, declineReason, isDeclineReasonCode } from "../decline-reasons";

describe("decline reasons", () => {
  it("covers the six agreed codes", () => {
    expect(DECLINE_REASONS.map((r) => r.code)).toEqual([
      "ikke_koeb_stand", "vandskade", "skaerm_knust", "icloud_laast", "for_gammel_model", "mangler_info",
    ]);
  });

  it("gives every reason a Danish label and body", () => {
    for (const reason of DECLINE_REASONS) {
      expect(reason.label.length).toBeGreaterThan(0);
      expect(reason.body.length).toBeGreaterThan(20);
    }
  });

  it("never mentions internal suppliers in customer-facing text", () => {
    for (const reason of DECLINE_REASONS) {
      expect(reason.body.toLowerCase()).not.toContain("foneday");
      expect(reason.body.toLowerCase()).not.toContain("foxway");
    }
  });

  it("recognises valid codes and rejects everything else", () => {
    expect(isDeclineReasonCode("vandskade")).toBe(true);
    expect(isDeclineReasonCode("noget_andet")).toBe(false);
    expect(isDeclineReasonCode(null)).toBe(false);
  });

  it("looks up a reason by code", () => {
    expect(declineReason("icloud_laast").label).toMatch(/icloud/i);
  });
});
```

- [ ] **Step 4: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/decline-reasons.test.ts`
Forventet: FAIL — `Cannot find module '../decline-reasons'`.

- [ ] **Step 5: Implementér**

Create `src/lib/buyback/decline-reasons.ts`:

```ts
export type DeclineReasonCode =
  | "ikke_koeb_stand"
  | "vandskade"
  | "skaerm_knust"
  | "icloud_laast"
  | "for_gammel_model"
  | "mangler_info";

export interface DeclineReason {
  code: DeclineReasonCode;
  label: string; // shown in admin
  body: string;  // the paragraph the customer reads
}

// One paragraph per reason, in PhoneSpot's tone: direct, no apology theatre, no
// blame. The customer gets a real explanation, not a form letter.
export const DECLINE_REASONS: DeclineReason[] = [
  {
    code: "ikke_koeb_stand",
    label: "Stand for dårlig",
    body: "Vi har set på oplysningerne om din enhed, og desværre er standen for dårlig til at vi kan købe den. Omkostningen ved at sætte den i stand overstiger det, vi kan sælge den for bagefter.",
  },
  {
    code: "vandskade",
    label: "Vandskade",
    body: "Din enhed har vandskade, og dem køber vi desværre ikke. Vandskader udvikler sig ofte over tid, og vi kan ikke stå inde for enheden med den garanti vi giver på alt hvad vi sælger.",
  },
  {
    code: "skaerm_knust",
    label: "Skærm knust",
    body: "Skærmen på din enhed er knust, og prisen på en original erstatningsskærm er desværre højere end det, enheden er værd for os bagefter.",
  },
  {
    code: "icloud_laast",
    label: "iCloud-låst",
    body: "Din enhed er låst til en iCloud- eller Google-konto. Vi kan hverken slette den eller sælge den videre, så længe låsen sidder på. Får du slået låsen fra, er du meget velkommen til at sende enheden ind igen.",
  },
  {
    code: "for_gammel_model",
    label: "For gammel model",
    body: "Din enhed er af en ældre model, som vi ikke længere køber. Der er desværre ikke efterspørgsel nok på den til at vi kan give en fair pris.",
  },
  {
    code: "mangler_info",
    label: "Mangler oplysninger",
    body: "Vi mangler oplysninger om din enhed for at kunne give en pris. Skriv gerne til os med model, lagerplads og stand, så kigger vi på den igen.",
  },
];

export function isDeclineReasonCode(value: unknown): value is DeclineReasonCode {
  return typeof value === "string" && DECLINE_REASONS.some((r) => r.code === value);
}

export function declineReason(code: DeclineReasonCode): DeclineReason {
  const found = DECLINE_REASONS.find((r) => r.code === code);
  if (!found) throw new Error(`Unknown decline reason: ${code}`);
  return found;
}
```

- [ ] **Step 6: Kør testen og se den passere**

Run: `npx vitest run src/lib/buyback/__tests__/decline-reasons.test.ts`
Forventet: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
npx tsc --noEmit
git add supabase/migrations/20260728_buyback_declines.sql src/lib/buyback/decline-reasons.ts src/lib/buyback/__tests__/decline-reasons.test.ts
git commit -m "feat(buyback): decline reasons and declines table"
```

---

## Task 5: Afvisningsemail

**Files:**
- Create: `src/lib/email/decline-email.ts`
- Test: `src/lib/buyback/__tests__/decline-email.test.ts`

**Interfaces:**
- Consumes: `declineReason()` fra Task 4, `src/lib/email/brand.ts`.
- Producerer: `buildDeclineEmailHtml({ customerName, deviceLabel, reasonCode }): string` og `buildDeclineEmailSubject(deviceLabel: string): string`.

- [ ] **Step 1: Læs den eksisterende skabelon**

Åbn `src/lib/email/offer-email.ts` og noter hvordan den bruger `src/lib/email/brand.ts` (wrapper, farver, footer). Afvisningsmailen skal se ud som en søskende til den, ikke som en fremmed.

- [ ] **Step 2: Skriv den fejlende test**

Create `src/lib/buyback/__tests__/decline-email.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildDeclineEmailHtml, buildDeclineEmailSubject } from "@/lib/email/decline-email";

const base = { customerName: "Mette", deviceLabel: "Apple iPhone 12 128GB", reasonCode: "vandskade" as const };

describe("decline email", () => {
  it("greets the customer by name", () => {
    expect(buildDeclineEmailHtml(base)).toContain("Mette");
  });

  it("names the device", () => {
    expect(buildDeclineEmailHtml(base)).toContain("Apple iPhone 12 128GB");
  });

  it("carries the reason paragraph", () => {
    expect(buildDeclineEmailHtml(base)).toContain("vandskade");
  });

  it("contains no accept or reject links", () => {
    const html = buildDeclineEmailHtml(base);
    expect(html).not.toContain("/accepter");
    expect(html).not.toContain("/afvis");
  });

  it("names the device in the subject", () => {
    expect(buildDeclineEmailSubject("Apple iPhone 12 128GB")).toContain("iPhone 12");
  });

  it("uses no emojis", () => {
    expect(buildDeclineEmailHtml(base)).toMatch(/^[\s\S]*$/u);
    expect(/\p{Extended_Pictographic}/u.test(buildDeclineEmailHtml(base))).toBe(false);
  });
});
```

- [ ] **Step 3: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/decline-email.test.ts`
Forventet: FAIL — `Cannot find module '@/lib/email/decline-email'`.

- [ ] **Step 4: Implementér**

Create `src/lib/email/decline-email.ts`. Brug samme wrapper-funktion fra `brand.ts` som `offer-email.ts` gør — hvis den hedder noget andet end nedenstående, ret kaldet til det den faktisk hedder:

```ts
import { declineReason, type DeclineReasonCode } from "@/lib/buyback/decline-reasons";

interface DeclineEmailInput {
  customerName: string;
  deviceLabel: string;
  reasonCode: DeclineReasonCode;
}

export function buildDeclineEmailSubject(deviceLabel: string): string {
  return `Vedrørende din ${deviceLabel}`;
}

// Terminal email: there is nothing for the customer to click. No token, no
// links — the conversation continues by reply if they want it to.
export function buildDeclineEmailHtml({ customerName, deviceLabel, reasonCode }: DeclineEmailInput): string {
  const reason = declineReason(reasonCode);

  return `
    <p>Hej ${customerName},</p>
    <p>Tak fordi du tilbød os din ${deviceLabel}.</p>
    <p>${reason.body}</p>
    <p>Du er altid velkommen til at skrive til os, hvis du har spørgsmål, eller hvis du har andre enheder du gerne vil sælge.</p>
    <p>Venlig hilsen<br />PhoneSpot</p>
  `;
}
```

Wrap returværdien i den samme brand-wrapper som `offer-email.ts` bruger, så headeren, farverne og footeren følger med.

- [ ] **Step 5: Kør testen og se den passere**

Run: `npx vitest run src/lib/buyback/__tests__/decline-email.test.ts`
Forventet: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
npx tsc --noEmit
git add src/lib/email/decline-email.ts src/lib/buyback/__tests__/decline-email.test.ts
git commit -m "feat(email): Danish buyback decline email"
```

---

## Task 6: Afvisnings-route og status-gren

**Files:**
- Create: `src/app/api/trade-in/decline/route.ts`
- Modify: `src/lib/supabase/trade-in-types.ts`
- Test: `src/lib/buyback/__tests__/derive-status.test.ts`

**Interfaces:**
- Producerer: `POST /api/trade-in/decline` med body `{ inquiry_id, reason_code, declined_by?, auto? }` → `201` med `{ id, email_sent }`.
- Ændrer: `deriveTradeInStatus(inquiryStatus, offers, receipts, declines)` — fjerde parameter `declines: { id: string }[]`, default `[]` så eksisterende kaldesteder ikke brækker.

- [ ] **Step 1: Skriv den fejlende test for status-grenen**

Create `src/lib/buyback/__tests__/derive-status.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { deriveTradeInStatus } from "@/lib/supabase/trade-in-types";

describe("deriveTradeInStatus with declines", () => {
  it("is afvist when a decline exists and there is no offer", () => {
    expect(deriveTradeInStatus("ny", [], [], [{ id: "d1" }])).toBe("afvist");
  });

  it("is afvist when a decline exists after a pending offer", () => {
    expect(deriveTradeInStatus("ny", [{ status: "pending" }], [], [{ id: "d1" }])).toBe("afvist");
  });

  it("keeps accepted ahead of a decline", () => {
    expect(deriveTradeInStatus("ny", [{ status: "accepted" }], [], [{ id: "d1" }])).toBe("accepteret");
  });

  it("keeps a paid receipt ahead of a decline", () => {
    expect(deriveTradeInStatus("ny", [], [{ status: "paid" }], [{ id: "d1" }])).toBe("betalt");
  });

  it("behaves as before when no declines are passed", () => {
    expect(deriveTradeInStatus("ny", [{ status: "pending" }], [])).toBe("tilbud_sendt");
    expect(deriveTradeInStatus("ny", [], [])).toBe("ny");
  });
});
```

- [ ] **Step 2: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/derive-status.test.ts`
Forventet: FAIL — fjerde argument ignoreres, første test giver `"ny"`.

- [ ] **Step 3: Udvid `deriveTradeInStatus`**

I `src/lib/supabase/trade-in-types.ts`, erstat funktionen:

```ts
export function deriveTradeInStatus(
  inquiryStatus: string,
  offers: Pick<TradeInOffer, "status">[],
  receipts: Pick<TradeInReceipt, "status">[],
  declines: { id: string }[] = [],
): TradeInDerivedStatus {
  // Money already moved or the deal is agreed — a later decline cannot undo that.
  if (receipts.some((r) => r.status === "paid" || r.status === "completed")) return "betalt";
  if (receipts.some((r) => r.status === "draft" || r.status === "confirmed")) return "modtaget";
  if (offers.some((o) => o.status === "accepted")) return "accepteret";
  // An admin decline outranks a pending offer: it is the newer decision.
  if (declines.length > 0) return "afvist";
  if (offers.some((o) => o.status === "pending")) return "tilbud_sendt";
  if (offers.length > 0 && offers.every((o) => o.status === "rejected" || o.status === "expired")) return "afvist";
  if (inquiryStatus === "lukket") return "lukket";
  return "ny";
}
```

- [ ] **Step 4: Kør testen og se den passere**

Run: `npx vitest run src/lib/buyback/__tests__/derive-status.test.ts`
Forventet: PASS (5 tests).

- [ ] **Step 5: Skriv routen**

Create `src/app/api/trade-in/decline/route.ts`:

```ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDeclineReasonCode, declineReason } from "@/lib/buyback/decline-reasons";
import { buildDeclineEmailHtml, buildDeclineEmailSubject } from "@/lib/email/decline-email";
import { readLeadDevices } from "@/lib/buyback/lead-devices";
import { logBuybackEvent } from "@/lib/buyback/events";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const body = await req.json();
  const { inquiry_id, reason_code, declined_by, auto } = body;

  if (!inquiry_id || !isDeclineReasonCode(reason_code)) {
    return NextResponse.json({ error: "inquiry_id and a valid reason_code required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("id, name, email, metadata")
    .eq("id", inquiry_id)
    .maybeSingle();

  if (!inquiry) return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });

  // A decline is terminal — declining twice must not send a second email.
  const { data: existing } = await supabase
    .from("buyback_declines")
    .select("id")
    .eq("inquiry_id", inquiry_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ id: existing.id, email_sent: false, already: true }, { status: 200 });
  }

  const first = readLeadDevices(inquiry.metadata)[0]?.device;
  const deviceLabel = first
    ? [first.brand, first.model, first.storage].map((p) => p.trim()).filter(Boolean).join(" ")
    : "enhed";

  const subject = buildDeclineEmailSubject(deviceLabel);
  const html = buildDeclineEmailHtml({
    customerName: inquiry.name,
    deviceLabel,
    reasonCode: reason_code,
  });

  let emailSent = false;
  try {
    const sent = await resend.emails.send({
      from: "PhoneSpot <info@phonespot.dk>",
      to: inquiry.email,
      replyTo: "info@phonespot.dk",
      subject,
      html,
    });
    emailSent = !sent.error;
    await supabase.from("mail_log").insert({
      inquiry_id,
      to_email: inquiry.email,
      subject,
      body: html,
      status: emailSent ? "delivered" : "failed",
      resend_id: sent.data?.id ?? null,
    });
  } catch {
    await supabase.from("mail_log").insert({
      inquiry_id, to_email: inquiry.email, subject, body: html, status: "failed",
    });
  }

  const { data: decline, error } = await supabase
    .from("buyback_declines")
    .insert({
      inquiry_id,
      reason_code,
      email_sent: emailSent,
      declined_by: auto === true ? "system" : (declined_by || "Admin"),
    })
    .select("id")
    .single();

  if (error || !decline) {
    return NextResponse.json({ error: error?.message || "Failed to record decline" }, { status: 500 });
  }

  await supabase.from("contact_inquiries").update({ status: "lukket" }).eq("id", inquiry_id);

  await supabase.from("inquiry_messages").insert({
    inquiry_id,
    sender: "staff",
    channel: "email",
    body: `Afvist: ${declineReason(reason_code).label}`,
    staff_name: auto === true ? "System" : (declined_by || "Admin"),
  });

  await logBuybackEvent(supabase, {
    type: auto === true ? "auto_declined" : "declined",
    severity: emailSent ? "info" : "warn",
    summary: emailSent
      ? `${deviceLabel} afvist (${declineReason(reason_code).label})`
      : `${deviceLabel} afvist (${declineReason(reason_code).label}) — mailen kunne ikke sendes`,
    inquiryId: inquiry_id,
  });

  return NextResponse.json({ id: decline.id, email_sent: emailSent }, { status: 201 });
}
```

- [ ] **Step 6: Ret kaldestederne så afvisninger tælles med**

`deriveTradeInStatus` kaldes i `src/app/(admin)/admin/opkoeb/page.tsx` og i `src/app/(admin)/admin/opkoeb/[id]/page.tsx`. Begge steder skal hente afvisninger og give dem videre.

I listesiden, ved siden af de eksisterende `allOffers`/`allReceipts`-opslag:

```ts
    const { data: allDeclines } = await supabase
      .from("buyback_declines")
      .select("id, inquiry_id")
      .in("inquiry_id", ids);
```

og i `result`-map'en:

```ts
      const declines = (allDeclines || []).filter((d) => d.inquiry_id === inquiry.id);
      return {
        inquiry,
        offers,
        receipts,
        derivedStatus: deriveTradeInStatus(inquiry.status, offers, receipts, declines),
      };
```

Gør det tilsvarende på detaljesiden.

- [ ] **Step 7: Verificér ende til ende**

```bash
npm run dev
```

```bash
curl -X POST http://localhost:3000/api/trade-in/decline \
  -H "Content-Type: application/json" \
  -d '{"inquiry_id":"<test-id>","reason_code":"for_gammel_model","declined_by":"Test"}'
```

Forventet: `201` med `email_sent: true`. Leadet står nu som **Afvist** på `/admin/opkoeb`, der ligger en `buyback_events`-linje i feedet, og mailen er i `mail_log`. Kald samme kommando igen — forventet `200` med `already: true` og ingen ny mail.

- [ ] **Step 8: Typecheck, lint og commit**

```bash
npx vitest run src/lib/buyback
npx tsc --noEmit
npm run lint
git add src/app/api/trade-in/decline/route.ts src/lib/supabase/trade-in-types.ts src/lib/buyback/__tests__/derive-status.test.ts "src/app/(admin)/admin/opkoeb/page.tsx" "src/app/(admin)/admin/opkoeb/[id]/page.tsx"
git commit -m "feat(buyback): admin decline with Danish email and status branch"
```

---

## Task 7: Forslag og afvisning på detaljesiden

**Files:**
- Modify: `src/app/(admin)/admin/opkoeb/[id]/page.tsx`

- [ ] **Step 1: Hent forslaget når siden loader**

Tilføj state og et kald til `/api/trade-in/suggest` i den eksisterende load-funktion:

```ts
  const [suggestion, setSuggestion] = useState<{
    status: "ok" | "manual";
    manualReason: string | null;
    suggestDecline: boolean;
    totalAimKr: number;
    totalFloorKr: number;
    devices: { label: string; explanation: string; manualReason: string | null; aimKr: number }[];
  } | null>(null);

  const loadSuggestion = useCallback(async () => {
    const res = await fetch(`/api/trade-in/suggest?inquiry_id=${inquiryId}`);
    if (res.ok) setSuggestion(await res.json());
  }, [inquiryId]);
```

Kald `loadSuggestion()` i samme `useEffect` som resten af siden loader i.

- [ ] **Step 2: Forudfyld beløbsfeltet**

Når `suggestion.status === "ok"` og feltet endnu ikke er rørt af admin, sæt beløbsfeltets startværdi til `suggestion.totalAimKr`. Brug en `touched`-flag så et forslag der kommer ind efter admin er begyndt at taste ikke overskriver.

- [ ] **Step 3: Vis begrundelsen under feltet**

```tsx
{suggestion?.status === "ok" && (
  <div className="mt-2 rounded-lg bg-charcoal/[0.03] px-3 py-2">
    {suggestion.devices.map((d) => (
      <p key={d.label} className="text-[12px] text-charcoal/50">
        <span className="font-medium text-charcoal/70">{d.label}:</span> {d.explanation}
      </p>
    ))}
    <p className="mt-1 text-[12px] text-charcoal/40">
      Forhandlingsgulv: {suggestion.totalFloorKr.toLocaleString("da-DK")} kr
    </p>
  </div>
)}
{suggestion?.status === "manual" && (
  <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700">
    Kan ikke prissættes automatisk: {suggestion.manualReason}
  </p>
)}
```

- [ ] **Step 4: Tilføj afvis-knappen**

En knap **Afvis lead** ved siden af "Send tilbud". Den folder en årsagsliste ud bygget af `DECLINE_REASONS`, og et klik på en årsag kalder `POST /api/trade-in/decline`. Er `suggestion.suggestDecline` sand, forvælges `icloud_laast`.

Knappen skjules helt når `derivedStatus` er `accepteret`, `modtaget` eller `betalt` — der er afvisning ikke længere en mulighed.

- [ ] **Step 5: Verificér i browseren**

```bash
npm run dev
```
Åbn et lead. Forventet: beløbet er forudfyldt med begrundelse under, eller der står en gul linje med årsagen til at det ikke kunne prissættes. Afvis-knappen viser seks årsager og sender mailen.

- [ ] **Step 6: Typecheck, lint og commit**

```bash
npx tsc --noEmit
npm run lint
git add "src/app/(admin)/admin/opkoeb/[id]/page.tsx"
git commit -m "feat(admin): prefilled price suggestion and decline on buyback detail"
```

---

## Task 8: Kø-tilstand

**Files:**
- Create: `src/app/(admin)/admin/opkoeb/ko/page.tsx`
- Modify: `src/app/(admin)/admin/opkoeb/page.tsx`

- [ ] **Step 1: Byg siden**

Create `src/app/(admin)/admin/opkoeb/ko/page.tsx`. Krav:

- Hент alle leads med `source = 'saelg-enhed'` hvor `deriveTradeInStatus(...) === "ny"`, sorteret ældste først. Hentes **én gang** ved indlæsning; køen ændrer sig ikke under dig.
- Vis én ad gangen med tælleren `3 af 11` øverst.
- Kompakt oversigt: kundenavn, enhed(er), og stand som farvekodede chips — grøn for Perfekt / God (80%+), gul for Små ridser / Okay (60-80%), rød for Revnet / Virker ikke / Dårligt (<60%) / defekte dele. `preferredStore` vises som grå chip.
- Beløbsfelt forudfyldt fra `/api/trade-in/suggest`, med breakdown under.
- Tastatur: `Enter` sender tilbud med det viste beløb · `A` åbner årsagslisten · `1`–`6` vælger årsag når listen er åben · `Esc` lukker listen, eller forlader køen hvis listen er lukket.
- Efter både bud og afvisning: gå straks til næste lead. Ved sidste lead vis "Køen er tom" med link tilbage til listen.
- Kunne leadet ikke prissættes automatisk, står feltet tomt og knappen **Gem som basispris** vises ved siden af. Den skriver det indtastede beløb til `buyback_prices` for den model. Er enheden i perfekt stand (skærm og bagside `Perfekt`, batteri `God (80%+)`, `allWorking: "Ja"`), gemmes beløbet som `base_price` direkte. Er den ikke, gemmes den opjusterede basis `beløb ÷ (1 − samlet fradrag)`, så en allerede nedskrevet pris ikke ender som "perfekt"-pris. Knappen viser det beregnede basisbeløb inden den gemmer.
- Tastaturgenveje må ikke udløses mens fokus står i beløbsfeltet, bortset fra `Enter`.

- [ ] **Step 2: Tilføj indgangen fra listen**

I `src/app/(admin)/admin/opkoeb/page.tsx`, ved siden af overskriften:

```tsx
{statusCounts.ny > 0 && (
  <Link
    href="/admin/opkoeb/ko"
    className="rounded-lg bg-charcoal px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
  >
    Behandl kø ({statusCounts.ny})
  </Link>
)}
```

- [ ] **Step 3: Verificér med rigtige leads**

```bash
npm run dev
```
Åbn `/admin/opkoeb` og klik **Behandl kø**. Kør tre leads igennem: ét med `Enter`, ét med `A` + årsag, og forlad med `Esc`. Forventet: tælleren tæller op, hvert lead skifter status på listen bagefter, og feedet har en linje per handling.

- [ ] **Step 4: Typecheck, lint og commit**

```bash
npx tsc --noEmit
npm run lint
git add "src/app/(admin)/admin/opkoeb/ko/page.tsx" "src/app/(admin)/admin/opkoeb/page.tsx"
git commit -m "feat(admin): keyboard-driven buyback queue"
```

---

## Task 9: Side til basispriser

**Files:**
- Create: `src/app/(admin)/admin/opkoeb/priser/page.tsx`
- Create: `src/lib/buyback/price-csv.ts`
- Test: `src/lib/buyback/__tests__/price-csv.test.ts`

**Interfaces:**
- Producerer: `parsePriceCsv(text: string): { rows: ParsedPriceRow[]; errors: string[] }` hvor `ParsedPriceRow = { deviceType, brand, model, storage, ram, basePriceOre }`. Input-prisen er **kroner**; output er øre.

- [ ] **Step 1: Skriv den fejlende test**

Create `src/lib/buyback/__tests__/price-csv.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parsePriceCsv } from "../price-csv";

describe("parsePriceCsv", () => {
  it("parses a well-formed line and converts kroner to øre", () => {
    const { rows, errors } = parsePriceCsv("Telefon, Apple, iPhone 12, 128GB, 2500");
    expect(errors).toEqual([]);
    expect(rows[0]).toEqual({ deviceType: "Telefon", brand: "Apple", model: "iPhone 12", storage: "128GB", ram: "", basePriceOre: 250000 });
  });

  it("accepts tab-separated input pasted from a spreadsheet", () => {
    const { rows } = parsePriceCsv("Telefon\tApple\tiPhone 12\t128GB\t2500");
    expect(rows[0].basePriceOre).toBe(250000);
  });

  it("accepts Danish thousand separators and decimals", () => {
    expect(parsePriceCsv("Telefon, Apple, iPhone 12, 128GB, 2.500").rows[0].basePriceOre).toBe(250000);
    expect(parsePriceCsv("Telefon, Apple, iPhone 12, 128GB, 2500,50").rows[0].basePriceOre).toBe(250050);
  });

  it("treats an empty storage column as no storage", () => {
    expect(parsePriceCsv("Telefon, Apple, iPhone 12, , 2500").rows[0].storage).toBe("");
  });

  it("skips blank lines", () => {
    const { rows, errors } = parsePriceCsv("Telefon, Apple, iPhone 12, 128GB, 2500\n\n\n");
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it("reports a line with too few columns", () => {
    const { rows, errors } = parsePriceCsv("Telefon, Apple, 2500");
    expect(rows).toHaveLength(0);
    expect(errors[0]).toMatch(/linje 1/i);
  });

  it("reports a non-numeric price", () => {
    const { errors } = parsePriceCsv("Telefon, Apple, iPhone 12, 128GB, tobehundrede");
    expect(errors[0]).toMatch(/linje 1/i);
  });

  it("reports a negative price", () => {
    const { errors } = parsePriceCsv("Telefon, Apple, iPhone 12, 128GB, -100");
    expect(errors).toHaveLength(1);
  });

  it("keeps good lines and reports bad ones separately", () => {
    const { rows, errors } = parsePriceCsv("Telefon, Apple, iPhone 12, 128GB, 2500\nnoget vrøvl");
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/price-csv.test.ts`
Forventet: FAIL — `Cannot find module '../price-csv'`.

- [ ] **Step 3: Implementér**

Create `src/lib/buyback/price-csv.ts`:

```ts
export interface ParsedPriceRow {
  deviceType: string;
  brand: string;
  model: string;
  storage: string;
  ram: string;
  basePriceOre: number;
}

// Admin pastes rows straight out of a spreadsheet, so both comma and tab count
// as separators, and prices arrive in Danish notation (2.500 or 2500,50).
function parseKronerToOre(raw: string): number | null {
  const cleaned = raw.trim().replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const kroner = Number(cleaned);
  if (!Number.isFinite(kroner) || kroner < 0) return null;
  return Math.round(kroner * 100);
}

export function parsePriceCsv(text: string): { rows: ParsedPriceRow[]; errors: string[] } {
  const rows: ParsedPriceRow[] = [];
  const errors: string[] = [];

  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!line.trim()) return;

    const cells = line.split(/\t|,(?![^,]*$)|,/).map((c) => c.trim());
    const columns = line.includes("\t") ? line.split("\t").map((c) => c.trim()) : cells;

    if (columns.length < 5) {
      errors.push(`Linje ${index + 1}: mangler kolonner (type, mærke, model, lager, pris)`);
      return;
    }

    const [deviceType, brand, model, storage, price, ram] = columns;
    const basePriceOre = parseKronerToOre(price);

    if (!deviceType || !brand || !model) {
      errors.push(`Linje ${index + 1}: type, mærke og model skal udfyldes`);
      return;
    }
    if (basePriceOre === null) {
      errors.push(`Linje ${index + 1}: "${price}" er ikke en gyldig pris`);
      return;
    }

    rows.push({ deviceType, brand, model, storage: storage ?? "", ram: ram ?? "", basePriceOre });
  });

  return { rows, errors };
}
```

- [ ] **Step 4: Kør testen og se den passere**

Run: `npx vitest run src/lib/buyback/__tests__/price-csv.test.ts`
Forventet: PASS (9 tests). Fejler splittet på en af de kommaseparerede cases, forenkl `cells` til `line.split(",")` og kør igen — tab-varianten håndteres allerede separat.

- [ ] **Step 5: Byg siden**

Create `src/app/(admin)/admin/opkoeb/priser/page.tsx`. Krav:

- Tabel over `buyback_prices` sorteret på mærke, model, lager. Kolonner: type, mærke, model, lager, RAM, basispris i kroner, aktiv, note.
- Rediger inline: pris og aktiv-flag kan ændres direkte i rækken.
- Slet-knap per række med et `window.confirm` først.
- **Indsæt fra regneark**: et tekstfelt der kører `parsePriceCsv` ved indsættelse, viser en forhåndsvisning af rækker der bliver oprettet og en rød liste over fejllinjer, og gemmer først ved klik på "Gem N rækker". Konflikter på den unikke variant-nøgle opdaterer prisen i stedet for at fejle (`upsert` med `onConflict`).
- En note øverst: *"Basispriserne bruges kun når vi ikke selv har modellen til salg. Har vi den, vinder vores egen salgspris."*

- [ ] **Step 6: Verificér i browseren**

```bash
npm run dev
```
Åbn `/admin/opkoeb/priser`. Indsæt:

```
Telefon, Apple, iPhone 11, 64GB, 1200
Telefon, Apple, iPhone 11, 128GB, 1400
noget vrøvl
```
Forventet: to rækker i forhåndsvisningen, én fejllinje i rødt, og efter gem står de to i tabellen.

- [ ] **Step 7: Typecheck, lint og commit**

```bash
npx vitest run src/lib/buyback
npx tsc --noEmit
npm run lint
git add src/lib/buyback/price-csv.ts src/lib/buyback/__tests__/price-csv.test.ts "src/app/(admin)/admin/opkoeb/priser/page.tsx"
git commit -m "feat(admin): fallback base price table with spreadsheet paste"
```

---

## Færdig-kriterier for Plan 2

- `npx vitest run src/lib/buyback` → alt grønt. `npx tsc --noEmit` → ingen fejl. `npm run lint` → rent.
- Et lead på detaljesiden viser et forudfyldt beløb med begrundelse, eller en tydelig årsag til at det ikke kan prissættes.
- **Afvis lead** sender en dansk email, sætter status til Afvist, og virker både før og efter et tilbud — men ikke efter accept.
- `/admin/opkoeb/ko` kan afvikle en kø udelukkende med tastaturet.
- `/admin/opkoeb/priser` kan fyldes ved at indsætte fra et regneark.
- Intet sendes stadig automatisk. Admin trykker på hver eneste knap.

## Hvad der bevidst IKKE er med

- **Auto-send, hold-vindue, tag over, kill-switch** → Plan 3.
- **Resend-webhook og auto-pause** → Plan 3.
- **SMS-alarmer og daglig driftsmail** → Plan 3.
- **"Gem som basispris" fra et manuelt bud** → Plan 3, sammen med indstillingssiden.
