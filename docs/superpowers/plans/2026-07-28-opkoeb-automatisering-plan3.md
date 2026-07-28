# Opkøb-automatisering — Plan 3 af 3: auto-send, hold-vindue og alarmer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lade systemet sende bud selv inden for en sikkerhedsramme, med et 15-minutters hold-vindue hvor admin kan tage over, og med alarmer der sikrer at intet nogensinde sker i tavshed.

**Architecture:** Auto-flowet hænger på `POST /api/contact`, som allerede modtager leadet serverside. Hold-vinduet bygger på Resends `scheduledAt` + `emails.cancel()`, så der ikke skal bruges cron til afsendelse. Alle beslutninger skrives til `buyback_events` fra Plan 1; SMS og morgenmail læser derfra.

**Tech Stack:** TypeScript (strict), Vitest 4, Next.js App Router, Supabase, Resend v6.9.3 (`scheduledAt`, `emails.update`, `emails.cancel`), GatewayAPI via `src/lib/sms/gateway-api.ts`.

## Global Constraints

- **Alle beløb er heltal i øre.**
- **Ingen `any`.** Brug `unknown` + narrowing eller typede interfaces.
- **Ingen emojis** nogen steder.
- **Alt kundevendt og admin-vendt tekst er dansk.**
- **`autoSendEnabled` fødes slået fra.** Automatikken må ikke kunne tændes af en deploy — kun af et menneske i admin, efter afsender-preflight.
- **Prissætning må aldrig vælte kundens indsendelse.** Hele auto-blokken i `/api/contact` kører i try/catch.
- Tests co-lokeres i `src/lib/buyback/__tests__/`.
- **Alle kommandoer køres fra** `C:/Users/Lenovo/Documents/GitHub/phonespot.dk/phonespot-next`.
- Migrationer er **håndkørte** i Supabase SQL-editoren.
- **Forudsætter Plan 1 og Plan 2 er merget.**

## Filstruktur

| Fil | Ansvar |
|---|---|
| `src/lib/buyback/settings.ts` | *(findes)* Udvides med automatik-felter |
| `src/lib/buyback/auto-send.ts` | Ren: `shouldAutoSend()` — sikkerhedsrammen |
| `src/lib/buyback/dispatch.ts` | Opret tilbud + planlæg mail + log. Kaldes fra `/api/contact` |
| `src/app/api/contact/route.ts` | Kalder `dispatchAutoOffer()` efter et `saelg-enhed`-lead |
| `src/app/api/trade-in/takeover/route.ts` | `POST` → aflys planlagt mail, flyt til manuel kø |
| `src/app/api/webhooks/resend/route.ts` | Leveringsstatus → `buyback_events` + auto-pause |
| `src/lib/buyback/pause.ts` | Auto-pause: sæt, ophæv, og de tre udløsere |
| `src/lib/buyback/alerts.ts` | SMS ved `critical` |
| `src/lib/email/buyback-digest.ts` | Daglig driftsmail |
| `src/app/api/cron/buyback-digest/route.ts` | Kører morgenmailen |
| `src/app/(admin)/admin/opkoeb/indstillinger/page.tsx` | Kill-switch, loft, hold-vindue, marginer, SMS |
| `src/app/(admin)/admin/opkoeb/page.tsx` | Panel-opbygning: toplinje, hold-vindue, kræver-dig |
| `supabase/migrations/20260728_trade_in_offers_auto.sql` | Nye kolonner på `trade_in_offers` |

---

## Task 1: Udvid indstillingerne

**Files:**
- Modify: `src/lib/buyback/types.ts`
- Modify: `src/lib/buyback/settings.ts`
- Test: `src/lib/buyback/__tests__/settings.test.ts`

**Interfaces:**
- Ændrer: `BuybackSettings` får `autoSendEnabled: boolean`, `autoSendMaxOre: number`, `holdMinutes: number`, `smsAcceptThresholdOre: number`, `smsRecipient: string`, `digestRecipient: string`, `fromAddress: string`, `pausedReason: string | null`, `feedLastSeenAt: string | null`.

- [ ] **Step 1: Skriv den fejlende test**

Tilføj til `src/lib/buyback/__tests__/settings.test.ts`:

```ts
it("ships with automation off and safe defaults", () => {
  expect(DEFAULT_BUYBACK_SETTINGS.autoSendEnabled).toBe(false);
  expect(DEFAULT_BUYBACK_SETTINGS.autoSendMaxOre).toBe(400000);
  expect(DEFAULT_BUYBACK_SETTINGS.holdMinutes).toBe(15);
  expect(DEFAULT_BUYBACK_SETTINGS.smsAcceptThresholdOre).toBe(300000);
  expect(DEFAULT_BUYBACK_SETTINGS.pausedReason).toBeNull();
});

it("lets app_settings turn automation on without touching the rest", async () => {
  const { client } = makeFakeClient({
    app_settings: [{ key: "buyback", value: { autoSendEnabled: true } }],
  });
  const s = await loadBuybackSettings(client);
  expect(s.autoSendEnabled).toBe(true);
  expect(s.autoSendMaxOre).toBe(400000);
  expect(s.holdMinutes).toBe(15);
});
```

- [ ] **Step 2: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/settings.test.ts`
Forventet: FAIL — `autoSendEnabled` er `undefined`.

- [ ] **Step 3: Udvid typen**

I `src/lib/buyback/types.ts`, tilføj til `BuybackSettings`:

```ts
  // Automation. autoSendEnabled ships false on purpose: automation is turned on
  // by a person in admin after the sender preflight, never by a deploy.
  autoSendEnabled: boolean;
  autoSendMaxOre: number;          // offers above this are always reviewed
  holdMinutes: number;             // window before a scheduled offer email goes
  smsAcceptThresholdOre: number;   // SMS when a customer accepts above this
  smsRecipient: string;            // Danish mobile, +45…
  digestRecipient: string;         // where the daily operations email goes
  fromAddress: string;             // sender for buyback mail; changeable without deploy
  pausedReason: string | null;     // non-null means automation has stopped itself
  feedLastSeenAt: string | null;   // ISO timestamp for the admin unread badge
```

- [ ] **Step 4: Udvid defaults**

I `src/lib/buyback/settings.ts`, tilføj til `DEFAULT_BUYBACK_SETTINGS`:

```ts
  autoSendEnabled: false,
  autoSendMaxOre: 400000,
  holdMinutes: 15,
  smsAcceptThresholdOre: 300000,
  smsRecipient: "",
  digestRecipient: "",
  fromAddress: "PhoneSpot <info@phonespot.dk>",
  pausedReason: null,
  feedLastSeenAt: null,
```

- [ ] **Step 5: Kør testen og commit**

```bash
npx vitest run src/lib/buyback
npx tsc --noEmit
git add src/lib/buyback/types.ts src/lib/buyback/settings.ts src/lib/buyback/__tests__/settings.test.ts
git commit -m "feat(buyback): automation settings with automation off by default"
```

---

## Task 2: Sikkerhedsrammen

**Files:**
- Create: `src/lib/buyback/auto-send.ts`
- Test: `src/lib/buyback/__tests__/auto-send.test.ts`

**Interfaces:**
- Producerer: `shouldAutoSend(suggestion: LeadSuggestion, deviceCount: number, settings: BuybackSettings): { send: boolean; reason: string }` — `reason` er altid en dansk sætning, også når `send` er sand.

- [ ] **Step 1: Skriv den fejlende test**

Create `src/lib/buyback/__tests__/auto-send.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { shouldAutoSend } from "../auto-send";
import { DEFAULT_BUYBACK_SETTINGS } from "../settings";
import type { LeadSuggestion } from "../suggest";
import type { BuybackSettings } from "../types";

const on: BuybackSettings = { ...DEFAULT_BUYBACK_SETTINGS, autoSendEnabled: true };

function suggestion(o: Partial<LeadSuggestion> = {}): LeadSuggestion {
  return { status: "ok", totalAimOre: 180000, totalFloorOre: 210000, perDevice: [], suggestDecline: false, ...o };
}

describe("shouldAutoSend", () => {
  it("sends a single priced device inside the cap", () => {
    expect(shouldAutoSend(suggestion(), 1, on).send).toBe(true);
  });

  it("never sends while automation is off", () => {
    const r = shouldAutoSend(suggestion(), 1, DEFAULT_BUYBACK_SETTINGS);
    expect(r.send).toBe(false);
    expect(r.reason).toMatch(/slået fra/i);
  });

  it("never sends while paused", () => {
    const r = shouldAutoSend(suggestion(), 1, { ...on, pausedReason: "Foneday-katalog er 4 dage gammelt" });
    expect(r.send).toBe(false);
    expect(r.reason).toMatch(/pause/i);
  });

  it("never sends a manual result", () => {
    const r = shouldAutoSend(suggestion({ status: "manual", manualReason: "iCloud-låst" }), 1, on);
    expect(r.send).toBe(false);
    expect(r.reason).toContain("iCloud-låst");
  });

  it("never sends above the cap", () => {
    const r = shouldAutoSend(suggestion({ totalAimOre: 400001 }), 1, on);
    expect(r.send).toBe(false);
    expect(r.reason).toMatch(/loft/i);
  });

  it("sends at exactly the cap", () => {
    expect(shouldAutoSend(suggestion({ totalAimOre: 400000 }), 1, on).send).toBe(true);
  });

  it("never sends a multi-device lead", () => {
    const r = shouldAutoSend(suggestion(), 2, on);
    expect(r.send).toBe(false);
    expect(r.reason).toMatch(/flere enheder/i);
  });

  it("never sends a zero or negative amount", () => {
    expect(shouldAutoSend(suggestion({ totalAimOre: 0 }), 1, on).send).toBe(false);
  });
});
```

- [ ] **Step 2: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/auto-send.test.ts`
Forventet: FAIL — `Cannot find module '../auto-send'`.

- [ ] **Step 3: Implementér**

Create `src/lib/buyback/auto-send.ts`:

```ts
import type { LeadSuggestion } from "./suggest";
import type { BuybackSettings } from "./types";

export interface AutoSendDecision {
  send: boolean;
  reason: string; // Danish, always populated — it is logged either way
}

// The safety envelope. Every condition must hold. Falling outside it is not an
// error: it is a lead for the manual queue, and the reason says which.
export function shouldAutoSend(
  suggestion: LeadSuggestion,
  deviceCount: number,
  settings: BuybackSettings,
): AutoSendDecision {
  if (!settings.autoSendEnabled) {
    return { send: false, reason: "Automatikken er slået fra" };
  }
  if (settings.pausedReason) {
    return { send: false, reason: `Automatikken er på pause: ${settings.pausedReason}` };
  }
  if (suggestion.status !== "ok") {
    return { send: false, reason: suggestion.manualReason ?? "Kunne ikke prissættes" };
  }
  if (deviceCount !== 1) {
    return { send: false, reason: "Henvendelsen rummer flere enheder" };
  }
  if (suggestion.totalAimOre <= 0) {
    return { send: false, reason: "Beregnet bud er nul" };
  }
  if (suggestion.totalAimOre > settings.autoSendMaxOre) {
    return {
      send: false,
      reason: `Bud over loftet (${Math.round(settings.autoSendMaxOre / 100)} kr)`,
    };
  }
  return { send: true, reason: "Inden for sikkerhedsrammen" };
}
```

- [ ] **Step 4: Kør testen og commit**

```bash
npx vitest run src/lib/buyback/__tests__/auto-send.test.ts
npx tsc --noEmit
git add src/lib/buyback/auto-send.ts src/lib/buyback/__tests__/auto-send.test.ts
git commit -m "feat(buyback): auto-send safety envelope"
```

---

## Task 3: Nye kolonner på tilbud

**Files:**
- Create: `supabase/migrations/20260728_trade_in_offers_auto.sql`
- Modify: `src/lib/supabase/trade-in-types.ts`

- [ ] **Step 1: Skriv migrationen**

Create `supabase/migrations/20260728_trade_in_offers_auto.sql`:

```sql
-- Automation columns on trade_in_offers. Hand-applied in the SQL editor.

ALTER TABLE trade_in_offers
  ADD COLUMN IF NOT EXISTS auto_sent         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pricing_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS scheduled_send_at timestamptz,
  ADD COLUMN IF NOT EXISTS resend_email_id   text,
  ADD COLUMN IF NOT EXISTS send_state        text NOT NULL DEFAULT 'sent';

-- Existing rows were all sent by hand at creation time.
UPDATE trade_in_offers SET send_state = 'sent' WHERE send_state IS NULL;

CREATE INDEX IF NOT EXISTS idx_trade_in_offers_scheduled
  ON trade_in_offers (scheduled_send_at)
  WHERE send_state = 'scheduled';
```

- [ ] **Step 2: Kør migrationen**

Kør i SQL-editoren. Bekræft:

```sql
select column_name from information_schema.columns
where table_name = 'trade_in_offers' and column_name in
  ('auto_sent','pricing_breakdown','scheduled_send_at','resend_email_id','send_state');
```
Forventet: fem rækker.

- [ ] **Step 3: Udvid typen**

I `src/lib/supabase/trade-in-types.ts`, tilføj til `TradeInOffer`:

```ts
  auto_sent: boolean;
  pricing_breakdown: unknown | null;
  scheduled_send_at: string | null;
  resend_email_id: string | null;
  send_state: "scheduled" | "sent" | "cancelled" | "failed";
```

- [ ] **Step 4: Typecheck og commit**

```bash
npx tsc --noEmit
git add supabase/migrations/20260728_trade_in_offers_auto.sql src/lib/supabase/trade-in-types.ts
git commit -m "feat(buyback): automation columns on trade_in_offers"
```

---

## Task 4: Afsendelse med hold-vindue

**Files:**
- Create: `src/lib/buyback/dispatch.ts`
- Modify: `src/app/api/contact/route.ts`

**Interfaces:**
- Producerer: `dispatchAutoOffer(client, inquiry: { id, name, email, metadata }): Promise<void>` — kaster aldrig.

- [ ] **Step 1: Implementér afsenderen**

Create `src/lib/buyback/dispatch.ts`:

```ts
import { Resend } from "resend";
import type { createAdminClient } from "@/lib/supabase/admin";
import { loadBuybackSettings } from "./settings";
import { suggestForLead } from "./suggest";
import { explainPricing } from "./breakdown";
import { shouldAutoSend } from "./auto-send";
import { readLeadDevices } from "./lead-devices";
import { logBuybackEvent } from "./events";
import { buildOfferEmailHtml, buildOfferEmailSubject } from "@/lib/email/offer-email";
import { formatDKK } from "@/lib/supabase/trade-in-types";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://phonespot.dk";

interface LeadInquiry {
  id: string;
  name: string;
  email: string;
  metadata: unknown;
}

// Prices a fresh buyback lead and, if it sits inside the safety envelope,
// schedules the offer email with a hold window so admin can take over.
// Never throws: a pricing problem must not cost us the customer's submission.
export async function dispatchAutoOffer(client: SupabaseAdmin, inquiry: LeadInquiry): Promise<void> {
  try {
    const settings = await loadBuybackSettings(client);
    const leadDevices = readLeadDevices(inquiry.metadata);
    const suggestion = await suggestForLead(client, inquiry.metadata, settings);
    const decision = shouldAutoSend(suggestion, leadDevices.length, settings);

    const first = leadDevices[0]?.device;
    const label = first
      ? [first.brand, first.model, first.storage].map((p) => p.trim()).filter(Boolean).join(" ")
      : "Ukendt enhed";

    // iCloud-locked is the one state that never depends on judgement: we cannot
    // wipe or resell the device, so it is declined automatically through the same
    // path an admin would use.
    if (suggestion.suggestDecline && settings.autoSendEnabled && !settings.pausedReason) {
      await fetch(`${BASE_URL}/api/trade-in/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry_id: inquiry.id, reason_code: "icloud_laast", auto: true }),
      });
      return;
    }

    if (!decision.send) {
      await logBuybackEvent(client, {
        type: "manual",
        severity: "info",
        summary: `${label} kræver manuel behandling: ${decision.reason}`,
        inquiryId: inquiry.id,
        detail: { reason: decision.reason },
      });
      return;
    }

    const amountOre = suggestion.totalAimOre;
    const sendAt = new Date(Date.now() + settings.holdMinutes * 60_000);

    const { data: offer, error } = await client
      .from("trade_in_offers")
      .insert({
        inquiry_id: inquiry.id,
        offer_amount: amountOre,
        auto_sent: true,
        send_state: "scheduled",
        scheduled_send_at: sendAt.toISOString(),
        pricing_breakdown: {
          explanation: suggestion.perDevice.map((d) => `${d.label}: ${explainPricing(d.result)}`),
          floorOfferOre: suggestion.totalFloorOre,
          aimOfferOre: suggestion.totalAimOre,
        },
        created_by: "System",
      })
      .select("id, token")
      .single();

    if (error || !offer) {
      await logBuybackEvent(client, {
        type: "error",
        severity: "critical",
        summary: `Kunne ikke oprette automatisk bud på ${label}`,
        inquiryId: inquiry.id,
        detail: { error: error?.message },
      });
      return;
    }

    const amountKr = formatDKK(amountOre);
    const condition = leadDevices[0]?.condition;
    const html = buildOfferEmailHtml({
      customerName: inquiry.name,
      deviceType: first?.deviceType || "enhed",
      brand: first?.brand || "",
      model: first?.model || "",
      storage: first?.storage || null,
      conditionSummary: [
        condition?.screen ? `Skærm: ${condition.screen}` : null,
        condition?.back ? `Bagside: ${condition.back}` : null,
        condition?.battery ? `Batteri: ${condition.battery}` : null,
      ].filter(Boolean).join(", ") || "Ikke angivet",
      offerAmountKr: amountKr,
      acceptUrl: `${BASE_URL}/saelg-din-enhed/accepter?token=${offer.token}`,
      rejectUrl: `${BASE_URL}/saelg-din-enhed/afvis?token=${offer.token}`,
    });

    const subject = buildOfferEmailSubject(first?.model || "enhed", amountKr);

    const sent = await resend.emails.send({
      from: settings.fromAddress,
      to: inquiry.email,
      replyTo: "info@phonespot.dk",
      subject,
      html,
      scheduledAt: sendAt.toISOString(),
    });

    if (sent.error || !sent.data) {
      await client.from("trade_in_offers")
        .update({ send_state: "failed" })
        .eq("id", offer.id);
      await logBuybackEvent(client, {
        type: "error",
        severity: "critical",
        summary: `Tilbudsmail på ${label} kunne ikke planlægges`,
        inquiryId: inquiry.id,
        offerId: offer.id,
        detail: { error: sent.error?.message },
      });
      return;
    }

    await client.from("trade_in_offers")
      .update({ resend_email_id: sent.data.id })
      .eq("id", offer.id);

    await client.from("mail_log").insert({
      inquiry_id: inquiry.id,
      to_email: inquiry.email,
      subject,
      body: html,
      status: "scheduled",
      resend_id: sent.data.id,
    });

    await logBuybackEvent(client, {
      type: "scheduled",
      severity: "info",
      summary: `${label}: bud på ${amountKr} sendes om ${settings.holdMinutes} min.`,
      inquiryId: inquiry.id,
      offerId: offer.id,
      detail: { amountOre, sendAt: sendAt.toISOString() },
    });
  } catch (err) {
    await logBuybackEvent(client, {
      type: "error",
      severity: "critical",
      summary: "Automatisk prissætning fejlede",
      inquiryId: inquiry.id,
      detail: { error: err instanceof Error ? err.message : String(err) },
    });
  }
}
```

- [ ] **Step 2: Kobl den på kontakt-routen**

I `src/app/api/contact/route.ts`, efter at henvendelsen er gemt og lige før svaret returneres:

```ts
  if (source === "saelg-enhed" && inserted) {
    // Deliberately awaited: a serverless function may be frozen the moment the
    // response is returned, and a detached promise would be lost.
    await dispatchAutoOffer(createAdminClient(), {
      id: inserted.id,
      name: inserted.name,
      email: inserted.email,
      metadata: inserted.metadata,
    });
  }
```

Tilpas variabelnavnene til dem routen faktisk bruger for den indsatte række. Bruger routen ikke allerede `createAdminClient`, importér den.

- [ ] **Step 3: Verificér med automatikken slået fra**

```bash
npm run dev
```

Send et rigtigt lead gennem `/saelg-din-enhed`. Forventet: leadet gemmes som altid, og der står præcis én ny linje i feedet: *"… kræver manuel behandling: Automatikken er slået fra"*. Ingen mail.

- [ ] **Step 4: Verificér med automatikken slået til**

Sæt midlertidigt automatikken til i SQL-editoren:

```sql
update app_settings
set value = coalesce(value, '{}'::jsonb) || '{"autoSendEnabled": true, "holdMinutes": 15}'::jsonb
where key = 'buyback';
```

Send et nyt lead på en model I har til salg, i perfekt stand. Forventet: feedet siger *"bud på X kr sendes om 15 min."*, `trade_in_offers` har en række med `send_state = 'scheduled'` og et `resend_email_id`, og mailen står som planlagt i Resend-dashboardet.

Slå den fra igen bagefter:

```sql
update app_settings set value = value || '{"autoSendEnabled": false}'::jsonb where key = 'buyback';
```

- [ ] **Step 5: Typecheck, lint og commit**

```bash
npx tsc --noEmit
npm run lint
git add src/lib/buyback/dispatch.ts src/app/api/contact/route.ts
git commit -m "feat(buyback): auto-price new leads and schedule offers with a hold window"
```

---

## Task 5: Tag over

**Files:**
- Create: `src/app/api/trade-in/takeover/route.ts`

**Interfaces:**
- Producerer: `POST /api/trade-in/takeover` med body `{ offer_id, action: "cancel" | "send_now" }`.

- [ ] **Step 1: Skriv routen**

Create `src/app/api/trade-in/takeover/route.ts`:

```ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { logBuybackEvent } from "@/lib/buyback/events";
import { formatDKK } from "@/lib/supabase/trade-in-types";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { offer_id, action } = await req.json();

  if (!offer_id || (action !== "cancel" && action !== "send_now")) {
    return NextResponse.json({ error: "offer_id and action (cancel|send_now) required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: offer } = await supabase
    .from("trade_in_offers")
    .select("id, inquiry_id, offer_amount, resend_email_id, send_state")
    .eq("id", offer_id)
    .maybeSingle();

  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  if (offer.send_state !== "scheduled") {
    return NextResponse.json({ error: "Tilbuddet er ikke længere planlagt" }, { status: 409 });
  }
  if (!offer.resend_email_id) {
    return NextResponse.json({ error: "Tilbuddet har ingen planlagt mail" }, { status: 409 });
  }

  if (action === "cancel") {
    await resend.emails.cancel(offer.resend_email_id);
    await supabase
      .from("trade_in_offers")
      .update({ status: "expired", send_state: "cancelled" })
      .eq("id", offer.id);
    await logBuybackEvent(supabase, {
      type: "taken_over",
      severity: "info",
      summary: `Bud på ${formatDKK(offer.offer_amount)} stoppet inden afsendelse`,
      inquiryId: offer.inquiry_id,
      offerId: offer.id,
    });
    return NextResponse.json({ ok: true, action });
  }

  await resend.emails.update(offer.resend_email_id, { scheduledAt: new Date().toISOString() });
  await supabase
    .from("trade_in_offers")
    .update({ send_state: "sent", scheduled_send_at: new Date().toISOString() })
    .eq("id", offer.id);
  await logBuybackEvent(supabase, {
    type: "sent",
    severity: "info",
    summary: `Bud på ${formatDKK(offer.offer_amount)} sendt manuelt før tid`,
    inquiryId: offer.inquiry_id,
    offerId: offer.id,
  });

  return NextResponse.json({ ok: true, action });
}
```

- [ ] **Step 2: Verificér**

Med et planlagt tilbud fra Task 4:

```bash
curl -X POST http://localhost:3000/api/trade-in/takeover \
  -H "Content-Type: application/json" -d '{"offer_id":"<id>","action":"cancel"}'
```
Forventet: `{ ok: true }`, mailen er væk fra Resend-dashboardet, tilbuddet står `cancelled`, og feedet har en `taken_over`-linje. Gentag kaldet — forventet `409`.

- [ ] **Step 3: Commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/api/trade-in/takeover/route.ts
git commit -m "feat(buyback): take over a scheduled offer before it sends"
```

---

## Task 6: Auto-pause

**Files:**
- Create: `src/lib/buyback/pause.ts`
- Test: `src/lib/buyback/__tests__/pause.test.ts`

**Interfaces:**
- Producerer:
  - `catalogStaleReason(lastSyncedAt: string | null, now: Date): string | null` — ren
  - `pauseAutomation(client, reason: string): Promise<void>`
  - `resumeAutomation(client): Promise<void>`

- [ ] **Step 1: Skriv den fejlende test**

Create `src/lib/buyback/__tests__/pause.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { catalogStaleReason } from "../pause";

const now = new Date("2026-08-01T09:00:00Z");

describe("catalogStaleReason", () => {
  it("is fine when the catalog synced today", () => {
    expect(catalogStaleReason("2026-08-01T06:00:00Z", now)).toBeNull();
  });

  it("is fine at just under three days", () => {
    expect(catalogStaleReason("2026-07-29T10:00:00Z", now)).toBeNull();
  });

  it("flags a catalog older than three days", () => {
    const reason = catalogStaleReason("2026-07-28T06:00:00Z", now);
    expect(reason).toMatch(/katalog/i);
    expect(reason).toMatch(/4 dage|3 dage/);
  });

  it("flags a catalog that never synced", () => {
    expect(catalogStaleReason(null, now)).toMatch(/aldrig/i);
  });
});
```

- [ ] **Step 2: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/pause.test.ts`
Forventet: FAIL — `Cannot find module '../pause'`.

- [ ] **Step 3: Implementér**

Create `src/lib/buyback/pause.ts`:

```ts
import type { createAdminClient } from "@/lib/supabase/admin";
import { logBuybackEvent } from "./events";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

const MAX_CATALOG_AGE_DAYS = 3;

// Parts prices drive every deduction. A stale catalog means silently wrong
// offers, which is worse than no offers at all.
export function catalogStaleReason(lastSyncedAt: string | null, now: Date): string | null {
  if (!lastSyncedAt) return "Foneday-kataloget er aldrig synkroniseret";
  const ageDays = Math.floor((now.getTime() - new Date(lastSyncedAt).getTime()) / 86_400_000);
  if (ageDays > MAX_CATALOG_AGE_DAYS) {
    return `Foneday-kataloget er ${ageDays} dage gammelt`;
  }
  return null;
}

export async function pauseAutomation(client: SupabaseAdmin, reason: string): Promise<void> {
  const { data } = await client.from("app_settings").select("value").eq("key", "buyback").maybeSingle();
  const value = (data?.value ?? {}) as Record<string, unknown>;
  if (value.pausedReason === reason) return; // already paused for this reason

  await client
    .from("app_settings")
    .upsert({ key: "buyback", value: { ...value, pausedReason: reason } }, { onConflict: "key" });

  await logBuybackEvent(client, {
    type: "paused",
    severity: "critical",
    summary: `Automatikken er sat på pause: ${reason}`,
  });
}

export async function resumeAutomation(client: SupabaseAdmin): Promise<void> {
  const { data } = await client.from("app_settings").select("value").eq("key", "buyback").maybeSingle();
  const value = (data?.value ?? {}) as Record<string, unknown>;

  await client
    .from("app_settings")
    .upsert({ key: "buyback", value: { ...value, pausedReason: null } }, { onConflict: "key" });

  await logBuybackEvent(client, { type: "resumed", severity: "info", summary: "Automatikken er genstartet" });
}
```

- [ ] **Step 4: Kald stale-tjekket før hver auto-afsendelse**

I `src/lib/buyback/dispatch.ts`, umiddelbart efter `loadBuybackSettings`:

```ts
    const { data: sync } = await client
      .from("app_settings")
      .select("value")
      .eq("key", "foneday")
      .maybeSingle();
    const lastSyncedAt = ((sync?.value ?? {}) as { lastSyncedAt?: string }).lastSyncedAt ?? null;
    const stale = catalogStaleReason(lastSyncedAt, new Date());
    if (stale && settings.autoSendEnabled && !settings.pausedReason) {
      await pauseAutomation(client, stale);
      settings.pausedReason = stale;
    }
```

Nøglen og feltnavnet skal matche det `src/lib/foneday/sync.ts` faktisk skriver — slå det op og ret hvis det hedder noget andet.

- [ ] **Step 5: Kør testen og commit**

```bash
npx vitest run src/lib/buyback
npx tsc --noEmit
git add src/lib/buyback/pause.ts src/lib/buyback/__tests__/pause.test.ts src/lib/buyback/dispatch.ts
git commit -m "feat(buyback): pause automation on a stale parts catalog"
```

---

## Task 7: Leveringsstatus fra Resend

**Files:**
- Create: `src/app/api/webhooks/resend/route.ts`

- [ ] **Step 1: Skriv webhooken**

Create `src/app/api/webhooks/resend/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logBuybackEvent } from "@/lib/buyback/events";
import { pauseAutomation } from "@/lib/buyback/pause";
import { sendCriticalAlert } from "@/lib/buyback/alerts";

interface ResendWebhookBody {
  type?: string;
  data?: { email_id?: string; to?: string[] };
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as ResendWebhookBody;
  const emailId = body.data?.email_id;
  const recipient = body.data?.to?.[0] ?? "ukendt modtager";
  if (!emailId) return NextResponse.json({ ok: true });

  const supabase = createAdminClient();

  const { data: offer } = await supabase
    .from("trade_in_offers")
    .select("id, inquiry_id")
    .eq("resend_email_id", emailId)
    .maybeSingle();

  if (!offer) return NextResponse.json({ ok: true }); // not a buyback mail

  if (body.type === "email.sent" || body.type === "email.delivered") {
    await supabase.from("trade_in_offers").update({ send_state: "sent" }).eq("id", offer.id);
    await logBuybackEvent(supabase, {
      type: "delivered",
      severity: "info",
      summary: `Tilbudsmail leveret til ${recipient}`,
      inquiryId: offer.inquiry_id,
      offerId: offer.id,
    });
    return NextResponse.json({ ok: true });
  }

  if (body.type === "email.bounced" || body.type === "email.complained") {
    await supabase.from("trade_in_offers").update({ send_state: "failed" }).eq("id", offer.id);
    const summary = `Tilbudsmail bouncede til ${recipient}`;
    await logBuybackEvent(supabase, {
      type: "bounced",
      severity: "critical",
      summary,
      inquiryId: offer.inquiry_id,
      offerId: offer.id,
      detail: body,
    });
    await pauseAutomation(supabase, "En tilbudsmail bouncede");
    await sendCriticalAlert(supabase, summary);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Registrér webhooken i Resend**

I Resend-dashboardet: peg en webhook på `https://phonespot.dk/api/webhooks/resend` for hændelserne `email.sent`, `email.delivered`, `email.bounced`, `email.complained`. Sæt `RESEND_WEBHOOK_SECRET` i Vercel og send den som headeren `x-webhook-secret` hvis Resend tillader custom headers; gør den ikke, så lad `RESEND_WEBHOOK_SECRET` være usat, så tjekket springes over.

- [ ] **Step 3: Commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/api/webhooks/resend/route.ts
git commit -m "feat(buyback): react to Resend delivery status"
```

---

## Task 8: SMS-alarmer

**Files:**
- Create: `src/lib/buyback/alerts.ts`

**Interfaces:**
- Consumes: `sendSms({ to, message })` fra `src/lib/sms/gateway-api.ts`.
- Producerer: `sendCriticalAlert(client, message: string): Promise<void>` — kaster aldrig.

- [ ] **Step 1: Implementér**

Create `src/lib/buyback/alerts.ts`:

```ts
import type { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms/gateway-api";
import { loadBuybackSettings } from "./settings";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

// One errand per SMS: what happened, and where to look. Never throws — an alert
// that fails must not take down the thing it was warning about.
export async function sendCriticalAlert(client: SupabaseAdmin, message: string): Promise<void> {
  try {
    const settings = await loadBuybackSettings(client);
    if (!settings.smsRecipient) return;
    await sendSms({
      to: settings.smsRecipient,
      message: `PhoneSpot opkøb: ${message}. Se /admin/opkoeb`,
    });
  } catch (err) {
    console.warn("[buyback] failed to send critical alert", err);
  }
}
```

- [ ] **Step 2: Send alarm ved accept over tærsklen**

I `src/app/api/trade-in/accept/route.ts`, efter at accepten er registreret:

```ts
  const settings = await loadBuybackSettings(supabase);
  await logBuybackEvent(supabase, {
    type: "accepted",
    severity: "info",
    summary: `Kunde accepterede ${formatDKK(offer.offer_amount)}`,
    inquiryId: offer.inquiry_id,
    offerId: offer.id,
  });
  if (offer.offer_amount >= settings.smsAcceptThresholdOre) {
    await sendCriticalAlert(supabase, `kunde accepterede ${formatDKK(offer.offer_amount)}`);
  }
```

- [ ] **Step 3: Send alarm ved kundeafvisning**

Tilsvarende i `src/app/api/trade-in/reject/route.ts`, med `type: "rejected"` og et `summary` der nævner forhandlingsgulvet fra `pricing_breakdown.floorOfferOre` hvis det findes, så beskeden er handlingsanvisende:

```ts
  const floorOre = (offer.pricing_breakdown as { floorOfferOre?: number } | null)?.floorOfferOre;
  const summary = floorOre
    ? `Kunde afviste ${formatDKK(offer.offer_amount)} — gulv er ${formatDKK(floorOre)}`
    : `Kunde afviste ${formatDKK(offer.offer_amount)}`;
```

Tre afviste auto-bud i træk betyder at en prisforudsætning er skredet, ikke at tre kunder var svære. Efter `rejected`-hændelsen er skrevet, tjek de seneste tre:

```ts
  const { data: recent } = await supabase
    .from("buyback_events")
    .select("type")
    .in("type", ["rejected", "accepted"])
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(3);

  const threeInARow = (recent ?? []).length === 3 && (recent ?? []).every((e) => e.type === "rejected");
  if (threeInARow) {
    await pauseAutomation(supabase, "Tre auto-bud afvist i træk");
    await sendCriticalAlert(supabase, "tre auto-bud afvist i træk — automatikken er sat på pause");
  }
```

- [ ] **Step 4: Verificér**

Sæt `smsRecipient` i indstillingerne til dit eget nummer og kald:

```bash
curl -X POST http://localhost:3000/api/trade-in/decline -H "Content-Type: application/json" -d '{"inquiry_id":"<id>","reason_code":"vandskade"}'
```

Alarmer udløses ikke af afvisning — brug i stedet en manuel `pauseAutomation`-kald-test, eller sæt `smsAcceptThresholdOre` til `0` og accepter et testtilbud. Forventet: én SMS.

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit && npm run lint
git add src/lib/buyback/alerts.ts src/app/api/trade-in/accept/route.ts src/app/api/trade-in/reject/route.ts
git commit -m "feat(buyback): SMS alerts on critical buyback events"
```

---

## Task 9: Daglig driftsmail

**Files:**
- Create: `src/lib/email/buyback-digest.ts`
- Create: `src/app/api/cron/buyback-digest/route.ts`
- Modify: `vercel.json`
- Test: `src/lib/buyback/__tests__/buyback-digest.test.ts`

**Interfaces:**
- Producerer: `buildDigestHtml(data: DigestData): string` og `collectDigestData(client): Promise<DigestData>` hvor

```ts
interface DigestData {
  toPay: { sellerName: string; bankReg: string; bankAccount: string; amountKr: number; receiptNumber: string }[];
  toReceive: { customerName: string; deviceLabel: string; daysInTransit: number; tracking: string | null }[];
  waiting: { total: number; oldestDays: number; biggest: { label: string; reason: string }[] };
  yesterday: { sent: number; accepted: number; rejected: number; acceptRatePct: number };
  problems: { summary: string; severity: string }[];
}
```

- [ ] **Step 1: Skriv den fejlende test for skabelonen**

Create `src/lib/buyback/__tests__/buyback-digest.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildDigestHtml } from "@/lib/email/buyback-digest";

const empty = {
  toPay: [], toReceive: [],
  waiting: { total: 0, oldestDays: 0, biggest: [] },
  yesterday: { sent: 0, accepted: 0, rejected: 0, acceptRatePct: 0 },
  problems: [],
};

describe("buildDigestHtml", () => {
  it("puts payouts first with reg and account number", () => {
    const html = buildDigestHtml({
      ...empty,
      toPay: [{ sellerName: "Mette Hansen", bankReg: "1234", bankAccount: "5678901234", amountKr: 1800, receiptNumber: "PS-001" }],
    });
    expect(html).toContain("Mette Hansen");
    expect(html).toContain("1234");
    expect(html).toContain("5678901234");
    expect(html.indexOf("Skal betales")).toBeLessThan(html.indexOf("Venter på dig"));
  });

  it("lists devices in transit with their age", () => {
    const html = buildDigestHtml({
      ...empty,
      toReceive: [{ customerName: "Jens", deviceLabel: "iPhone 12", daysInTransit: 4, tracking: "12345" }],
    });
    expect(html).toContain("iPhone 12");
    expect(html).toContain("4");
  });

  it("says so plainly when there is nothing to do", () => {
    expect(buildDigestHtml(empty)).toContain("Intet at gøre");
  });

  it("shows problems when there are any", () => {
    const html = buildDigestHtml({ ...empty, problems: [{ summary: "Tilbudsmail bouncede", severity: "critical" }] });
    expect(html).toContain("Tilbudsmail bouncede");
  });

  it("uses no emojis", () => {
    expect(/\p{Extended_Pictographic}/u.test(buildDigestHtml(empty))).toBe(false);
  });
});
```

- [ ] **Step 2: Kør testen og se den fejle**

Run: `npx vitest run src/lib/buyback/__tests__/buyback-digest.test.ts`
Forventet: FAIL — `Cannot find module '@/lib/email/buyback-digest'`.

- [ ] **Step 3: Implementér skabelon og indsamling**

Create `src/lib/email/buyback-digest.ts` med `DigestData`-typen ovenfor, `buildDigestHtml()` og `collectDigestData()`.

`buildDigestHtml` skriver sektionerne i denne rækkefølge, og springer tomme sektioner over. Er alle tomme, er indholdet linjen *"Intet at gøre i dag."*:

1. **Skal betales** — tabel: sælger, reg.nr, kontonr, beløb, slutseddelnummer
2. **Skal markeres modtaget** — kunde, enhed, dage undervejs, tracking
3. **Venter på dig** — antal, ældste i dage, de tre største med årsag
4. **Kørte automatisk i går** — sendt / accepteret / afvist / acceptrate
5. **Problemer** — `summary` for hver `warn` og `critical` siden i går

`collectDigestData` henter:
- `toPay`: `trade_in_receipts` med `status = 'confirmed'`, joinet med sælgerens bankoplysninger
- `toReceive`: accepterede tilbud uden slutseddel, med `created_at` som udgangspunkt for `daysInTransit`
- `waiting`: leads hvor `deriveTradeInStatus(...) === "ny"`
- `yesterday`: optælling af `buyback_events` med `type` i `sent`, `accepted`, `rejected` det seneste døgn
- `problems`: `buyback_events` med `severity <> 'info'` det seneste døgn

- [ ] **Step 4: Kør testen og se den passere**

Run: `npx vitest run src/lib/buyback/__tests__/buyback-digest.test.ts`
Forventet: PASS (5 tests).

- [ ] **Step 5: Skriv cron-routen**

Create `src/app/api/cron/buyback-digest/route.ts` efter mønstret i `src/app/api/cron/foneday-sync/route.ts` (samme autorisationstjek). Den henter `collectDigestData`, bygger HTML'en, og sender til `settings.digestRecipient` via Resend fra `settings.fromAddress`. Er `digestRecipient` tom, springes afsendelsen over og der logges en `warn`-hændelse.

- [ ] **Step 6: Tilføj cron-slot**

I `vercel.json`, tilføj:

```json
    {
      "path": "/api/cron/buyback-digest",
      "schedule": "0 7 * * *"
    }
```

Afviser Vercel-planen en femte cron, fjern posten igen og kald i stedet `collectDigestData` + afsendelse i slutningen af `/api/cron/foneday-sync`, som kører kl. 06:00. Noter hvilken løsning der blev brugt i en kommentar i routen.

- [ ] **Step 7: Verificér**

```bash
curl http://localhost:3000/api/cron/buyback-digest
```
Forventet: mailen lander hos `digestRecipient` med de sektioner der faktisk har indhold.

- [ ] **Step 8: Commit**

```bash
npx vitest run src/lib/buyback
npx tsc --noEmit && npm run lint
git add src/lib/email/buyback-digest.ts src/app/api/cron/buyback-digest/route.ts src/lib/buyback/__tests__/buyback-digest.test.ts vercel.json
git commit -m "feat(buyback): daily operations digest"
```

---

## Task 10: Indstillingsside

**Files:**
- Create: `src/app/(admin)/admin/opkoeb/indstillinger/page.tsx`
- Create: `src/app/api/admin/buyback/settings/route.ts`
- Create: `src/app/api/admin/buyback/preflight/route.ts`

- [ ] **Step 1: Skriv settings-routen**

Create `src/app/api/admin/buyback/settings/route.ts` efter mønstret i `src/app/api/admin/foneday/settings/route.ts`: `GET` returnerer de flettede indstillinger, `PATCH` fletter et delvist objekt ind i `app_settings`-rækken med `key = 'buyback'`.

- [ ] **Step 2: Skriv preflight-routen**

Create `src/app/api/admin/buyback/preflight/route.ts`: `POST` sender en testmail fra `settings.fromAddress` til `settings.digestRecipient` med emnet *"PhoneSpot opkøb — test af afsender"*, og returnerer Resends svar råt, inklusive eventuel fejl. Det er den knap der afgør om automatikken må tændes.

- [ ] **Step 3: Byg siden**

Create `src/app/(admin)/admin/opkoeb/indstillinger/page.tsx` med to faner:

**Automatik**
- Kill-switch med tydelig tilstand. Er `pausedReason` sat, vises den i rødt over kontakten med en **Genstart automatik**-knap.
- Ved siden af kill-switchen, når `autoSendEnabled` er falsk: *"Verificér afsender først"* og knappen **Send testmail** (preflight). Resultatet vises råt under knappen.
- Felter: beløbsloft (kr), hold-vindue (minutter), målmargin (%), gulvmargin (%), mindste gulvmargin (kr), SMS-modtager, SMS-tærskel (kr), modtager af morgenmail, afsenderadresse.
- Cleaning-sandsynligheder per fejltype som fire tal mellem 0 og 1.

**Basispriser**
- Genbrug tabellen og CSV-indsæt fra Plan 2's `/admin/opkoeb/priser`. Flyt siden hertil som en fane, og lad den gamle rute redirecte.

- [ ] **Step 4: Verificér**

```bash
npm run dev
```
Åbn `/admin/opkoeb/indstillinger`. Send testmailen. Skift beløbsloftet, genindlæs, og bekræft at værdien holder.

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit && npm run lint
git add "src/app/(admin)/admin/opkoeb/indstillinger/page.tsx" src/app/api/admin/buyback/settings/route.ts src/app/api/admin/buyback/preflight/route.ts
git commit -m "feat(admin): buyback automation settings with sender preflight"
```

---

## Task 11: Panel-opbygning af opkøbssiden

**Files:**
- Modify: `src/app/(admin)/admin/opkoeb/page.tsx`

- [ ] **Step 1: Byg toplinjen**

Over feedet: fire tal og kill-switchens tilstand.

```tsx
<div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
  <StatTile label="Kræver dig" value={statusCounts.ny ?? 0} tone={(statusCounts.ny ?? 0) > 0 ? "attention" : "calm"} />
  <StatTile label="Sendes nu" value={scheduledCount} tone={scheduledCount > 0 ? "pending" : "calm"} />
  <StatTile label="Auto-sendt i dag" value={autoSentToday} tone="calm" />
  <StatTile label="Acceptrate 7 dage" value={`${acceptRate7d}%`} tone="calm" />
</div>
```

`StatTile` er en lille lokal komponent i samme fil: label i småt gråt over et stort tal, hvid boks med samme radius og skygge som resten af siden. `attention` giver rød accent, `pending` gul, `calm` ingen.

Er automatikken på pause, står `pausedReason` som en rød banner øverst med **Genstart automatik**.

- [ ] **Step 2: Sektionen "Sendes om lidt"**

Hent tilbud med `send_state = 'scheduled'`. For hver: enhed, beløb, nedtælling til `scheduled_send_at`, og knapperne **Tag over** og **Send nu** der kalder `/api/trade-in/takeover`. Sektionen skjules helt når der ingen er.

Nedtællingen opdateres hvert 30. sekund; når den rammer nul, genindlæses listen.

- [ ] **Step 3: Sektionen "Kræver din handling"**

Leads med udledt status `ny`, med `manualReason` som undertekst i stedet for blot "Ny". Årsagen hentes fra den seneste `buyback_events`-række af typen `manual` for det lead. Sektionen har **Behandl kø**-knappen fra Plan 2.

- [ ] **Step 4: Gør resten sekundært**

De eksisterende statusfaner og den flade liste flyttes ned under feedet i en sammenklappelig sektion med overskriften **Alle henvendelser**, lukket som udgangspunkt.

- [ ] **Step 5: Verificér**

```bash
npm run dev
```
Forventet: siden åbner på det der kræver dig. Er der intet i kø og intet planlagt, er skærmen rolig og viser kun tallene, feedet og den lukkede liste.

- [ ] **Step 6: Commit**

```bash
npx tsc --noEmit && npm run lint
git add "src/app/(admin)/admin/opkoeb/page.tsx"
git commit -m "feat(admin): rebuild buyback page as a monitoring panel"
```

---

## Task 12: Ibrugtagning

Ingen kode. Rækkefølgen her er den der afgør om automatikken tændes sikkert.

- [ ] **Step 1: Kør alle migrationer i produktion**

`20260728_buyback_prices.sql`, `20260728_buyback_events.sql`, `20260728_buyback_declines.sql`, `20260728_trade_in_offers_auto.sql` — og `alter publication supabase_realtime add table buyback_events;`.

- [ ] **Step 2: Udfyld indstillingerne**

På `/admin/opkoeb/indstillinger`: SMS-nummer, modtager af morgenmail, afsenderadresse. Lad automatikken være slået fra.

- [ ] **Step 3: Verificér afsenderen**

Tryk **Send testmail**. Kommer den ikke frem, er afsenderen suppresset i Resend — ryd suppressionen i Resend-dashboardet eller skift til en anden verificeret adresse, og prøv igen. **Gå ikke videre før testmailen ankommer.**

- [ ] **Step 4: Kør en uge i skyggedrift**

Lad automatikken være slået fra og brug kø-tilstanden fra Plan 2 manuelt. Sammenlign hver dag motorens forslag med det du selv ville have budt. Justér marginer og loft i indstillingerne indtil forslagene er dem du selv ville sende.

- [ ] **Step 5: Tænd med et lavt loft**

Sæt beløbsloftet til 1.500 kr og slå automatikken til. Kun de billigste og mest forudsigelige leads sendes automatisk. Hæv loftet i trin på 500 kr, en uge ad gangen, så længe acceptraten i morgenmailen holder.

- [ ] **Step 6: Skriv resultatet ned**

Noter det endelige loft, marginerne og acceptraten i `docs/superpowers/specs/2026-07-28-opkoeb-automatisering-design.md` under "Åbne beslutninger", så tallene ikke kun findes i databasen.

---

## Færdig-kriterier for Plan 3

- `npx vitest run src/lib/buyback` → alt grønt. `npx tsc --noEmit` → ingen fejl. `npm run lint` → rent.
- Et lead der lander inden for sikkerhedsrammen får et planlagt bud med 15 minutters hold-vindue, og admin kan både aflyse og fremskynde det.
- Et lead uden for rammen lander i "Kræver din handling" med en dansk årsag.
- Bounce, forældet katalog eller en fejl i prissætningen sætter automatikken på pause og sender en SMS.
- Morgenmailen kl. 07 viser hvem der skal have penge, hvad der er undervejs, og hvad der venter.
- Automatikken kan ikke tændes af en deploy — kun af et menneske, efter afsender-preflight.
