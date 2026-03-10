# Trade-In & Slutseddel System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete device buyback system — admin sends offers, customers accept via email links, slutsedler (bills of sale) are auto-generated as PDF.

**Architecture:** Extends existing `contact_inquiries` with 3 new tables (`trade_in_offers`, `trade_in_receipts`, `trade_in_receipt_items`) + a yearly counter table. Reuses Resend email, Supabase auth, and existing admin layout. Customer accept flow is token-based (no login).

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (PostgreSQL), Resend, @react-pdf/renderer, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-10-trade-in-slutseddel-design.md`

---

## File Structure

### New files to create:

**Database:**
- `supabase/migrations/20260310_trade_in_system.sql` — Schema for all trade-in tables

**TypeScript types:**
- `src/lib/supabase/trade-in-types.ts` — Type definitions for trade-in domain

**API routes:**
- `src/app/api/trade-in/offers/route.ts` — GET (list) + POST (create & send offer)
- `src/app/api/trade-in/accept/route.ts` — POST (customer accepts, token-based)
- `src/app/api/trade-in/reject/route.ts` — POST (customer rejects, token-based)
- `src/app/api/trade-in/offer-status/route.ts` — GET (validate token, public)
- `src/app/api/trade-in/receipts/route.ts` — GET (list) + POST (create draft)
- `src/app/api/trade-in/receipts/[id]/route.ts` — PATCH (update) + DELETE (draft only)
- `src/app/api/trade-in/receipts/[id]/confirm/route.ts` — POST (confirm + gen PDF)
- `src/app/api/trade-in/receipts/[id]/pay/route.ts` — POST (mark paid)
- `src/app/api/trade-in/receipts/[id]/pdf/route.ts` — GET (generate/download PDF)

**PDF template:**
- `src/lib/pdf/slutseddel.tsx` — React PDF component for slutseddel

**Email template:**
- `src/lib/email/offer-email.ts` — HTML email template for offers

**Customer pages:**
- `src/app/saelg-din-enhed/accepter/page.tsx` — Accept offer form
- `src/app/saelg-din-enhed/afvis/page.tsx` — Reject offer form

**Admin pages:**
- `src/app/(admin)/admin/opkoeb/page.tsx` — Trade-in list view
- `src/app/(admin)/admin/opkoeb/[id]/page.tsx` — Detail view + offer management
- `src/app/(admin)/admin/opkoeb/[id]/slutseddel/page.tsx` — Receipt editor

### Files to modify:

- `src/lib/supabase/types.ts` — Add trade-in type exports
- `src/app/(admin)/admin/layout.tsx` — Add "Opkøb" nav item

---

## Chunk 1: Database & Types

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260310_trade_in_system.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- ============================================================
-- Trade-In & Slutseddel System
-- ============================================================

-- 1. Yearly counter for receipt numbers
CREATE TABLE IF NOT EXISTS trade_in_receipt_counters (
  year integer PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);

-- 2. Receipt number generator (SS-YYYY-NNNN, resets yearly)
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS text AS $$
DECLARE
  current_year integer;
  next_num integer;
BEGIN
  current_year := extract(year from now())::integer;
  INSERT INTO trade_in_receipt_counters (year, last_number)
  VALUES (current_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = trade_in_receipt_counters.last_number + 1
  RETURNING last_number INTO next_num;
  RETURN 'SS-' || current_year || '-' || lpad(next_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Trade-in offers
CREATE TABLE IF NOT EXISTS trade_in_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES contact_inquiries(id) ON DELETE CASCADE,
  offer_amount integer NOT NULL CHECK (offer_amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  token_expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  admin_note text,
  customer_response_note text,
  responded_at timestamptz,
  seller_name text,
  seller_address text,
  seller_postal_city text,
  seller_bank_reg text,
  seller_bank_account text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trade_in_offers_inquiry ON trade_in_offers(inquiry_id);
CREATE INDEX idx_trade_in_offers_token ON trade_in_offers(token);
CREATE INDEX idx_trade_in_offers_status ON trade_in_offers(status);

-- 4. Trade-in receipts (slutsedler)
CREATE TABLE IF NOT EXISTS trade_in_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text UNIQUE NOT NULL DEFAULT generate_receipt_number(),
  inquiry_id uuid REFERENCES contact_inquiries(id),
  offer_id uuid REFERENCES trade_in_offers(id),
  store_location_id uuid REFERENCES store_locations(id),
  seller_name text NOT NULL,
  seller_address text,
  seller_postal_city text,
  seller_phone text,
  seller_email text,
  seller_bank_reg text,
  seller_bank_account text,
  buyer_company text NOT NULL DEFAULT 'Phonego ApS',
  buyer_cvr text NOT NULL DEFAULT '38688766',
  buyer_address text,
  buyer_postal_city text,
  buyer_email text NOT NULL DEFAULT 'ha@phonespot.dk',
  buyer_phone text,
  total_amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'paid', 'completed')),
  staff_initials text,
  pdf_url text,
  delivery_method text CHECK (delivery_method IN ('shipping', 'in_store')),
  confirmed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trade_in_receipts_inquiry ON trade_in_receipts(inquiry_id);
CREATE INDEX idx_trade_in_receipts_offer ON trade_in_receipts(offer_id);
CREATE INDEX idx_trade_in_receipts_status ON trade_in_receipts(status);

-- 5. Trade-in receipt items (devices on a slutseddel)
CREATE TABLE IF NOT EXISTS trade_in_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES trade_in_receipts(id) ON DELETE CASCADE,
  imei_serial text,
  brand text NOT NULL,
  model text NOT NULL,
  storage text,
  ram text,
  condition_grade text CHECK (condition_grade IN ('Perfekt', 'God', 'Acceptabel', 'Defekt')),
  color text,
  condition_notes text,
  price integer NOT NULL CHECK (price > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trade_in_receipt_items_receipt ON trade_in_receipt_items(receipt_id);

-- 6. Updated_at trigger function (reusable)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trade_in_offers_updated_at
  BEFORE UPDATE ON trade_in_offers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trade_in_receipts_updated_at
  BEFORE UPDATE ON trade_in_receipts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trade_in_receipt_items_updated_at
  BEFORE UPDATE ON trade_in_receipt_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. RLS Policies
ALTER TABLE trade_in_receipt_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_in_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_in_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_in_receipt_items ENABLE ROW LEVEL SECURITY;

-- Authenticated users (admin) get full access
CREATE POLICY "Authenticated full access" ON trade_in_receipt_counters
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON trade_in_offers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON trade_in_receipts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON trade_in_receipt_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Apply migration to Supabase**

Run the migration against your Supabase instance via the dashboard SQL editor or CLI:
```bash
# If using Supabase CLI:
npx supabase db push
# Or copy-paste the SQL into Supabase Dashboard > SQL Editor
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260310_trade_in_system.sql
git commit -m "feat(trade-in): add database migration for offers, receipts, and receipt items"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `src/lib/supabase/trade-in-types.ts`
- Modify: `src/lib/supabase/types.ts`

- [ ] **Step 1: Create trade-in type definitions**

Create `src/lib/supabase/trade-in-types.ts`:

```typescript
/* ------------------------------------------------------------------ */
/*  Trade-In & Slutseddel Types                                        */
/* ------------------------------------------------------------------ */

export type TradeInOfferStatus = "pending" | "accepted" | "rejected" | "expired";

export interface TradeInOffer {
  id: string;
  inquiry_id: string;
  offer_amount: number; // in Danish øre (160000 = 1.600 kr)
  status: TradeInOfferStatus;
  token: string;
  token_expires_at: string;
  admin_note: string | null;
  customer_response_note: string | null;
  responded_at: string | null;
  seller_name: string | null;
  seller_address: string | null;
  seller_postal_city: string | null;
  seller_bank_reg: string | null;
  seller_bank_account: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TradeInReceiptStatus = "draft" | "confirmed" | "paid" | "completed";

export interface TradeInReceipt {
  id: string;
  receipt_number: string;
  inquiry_id: string | null;
  offer_id: string | null;
  store_location_id: string | null;
  seller_name: string;
  seller_address: string | null;
  seller_postal_city: string | null;
  seller_phone: string | null;
  seller_email: string | null;
  seller_bank_reg: string | null;
  seller_bank_account: string | null;
  buyer_company: string;
  buyer_cvr: string;
  buyer_address: string | null;
  buyer_postal_city: string | null;
  buyer_email: string;
  buyer_phone: string | null;
  total_amount: number;
  status: TradeInReceiptStatus;
  staff_initials: string | null;
  pdf_url: string | null;
  delivery_method: "shipping" | "in_store" | null;
  confirmed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeInReceiptItem {
  id: string;
  receipt_id: string;
  imei_serial: string | null;
  brand: string;
  model: string;
  storage: string | null;
  ram: string | null;
  condition_grade: "Perfekt" | "God" | "Acceptabel" | "Defekt" | null;
  color: string | null;
  condition_notes: string | null;
  price: number;
  created_at: string;
  updated_at: string;
}

/* ---- Derived trade-in status for admin list view ---- */
export type TradeInDerivedStatus =
  | "ny"
  | "tilbud_sendt"
  | "accepteret"
  | "afvist"
  | "modtaget"
  | "betalt"
  | "lukket";

/* ---- Helper: format øre to DKK string ---- */
export function formatDKK(ore: number): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    minimumFractionDigits: 2,
  }).format(ore / 100);
}

/* ---- Helper: derive trade-in status from inquiry + offers + receipts ---- */
export function deriveTradeInStatus(
  inquiryStatus: string,
  offers: Pick<TradeInOffer, "status">[],
  receipts: Pick<TradeInReceipt, "status">[],
): TradeInDerivedStatus {
  // Check receipts first (further along in pipeline)
  if (receipts.some((r) => r.status === "paid" || r.status === "completed")) return "betalt";
  if (receipts.some((r) => r.status === "draft" || r.status === "confirmed")) return "modtaget";

  // Check offers
  if (offers.some((o) => o.status === "accepted")) return "accepteret";
  if (offers.some((o) => o.status === "pending")) return "tilbud_sendt";
  if (offers.length > 0 && offers.every((o) => o.status === "rejected" || o.status === "expired")) return "afvist";

  // Check inquiry
  if (inquiryStatus === "lukket") return "lukket";

  return "ny";
}
```

- [ ] **Step 2: Add re-export to types.ts**

Add to the bottom of `src/lib/supabase/types.ts`:

```typescript
// Trade-in types
export type {
  TradeInOffer,
  TradeInOfferStatus,
  TradeInReceipt,
  TradeInReceiptStatus,
  TradeInReceiptItem,
  TradeInDerivedStatus,
} from "./trade-in-types";
export { formatDKK, deriveTradeInStatus } from "./trade-in-types";
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd phonespot-next && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/trade-in-types.ts src/lib/supabase/types.ts
git commit -m "feat(trade-in): add TypeScript type definitions for offers, receipts, and items"
```

---

## Chunk 2: Offer API Routes & Email

### Task 3: Offer Email Template

**Files:**
- Create: `src/lib/email/offer-email.ts`

- [ ] **Step 1: Create the email template**

```typescript
/* ------------------------------------------------------------------ */
/*  Trade-In Offer Email Template                                      */
/* ------------------------------------------------------------------ */

interface OfferEmailParams {
  customerName: string;
  deviceType: string;
  brand: string;
  model: string;
  storage: string | null;
  conditionSummary: string;
  offerAmountKr: string; // formatted, e.g. "4.500,00 kr."
  acceptUrl: string;
  rejectUrl: string;
}

export function buildOfferEmailHtml(params: OfferEmailParams): string {
  const {
    customerName,
    deviceType,
    brand,
    model,
    storage,
    conditionSummary,
    offerAmountKr,
    acceptUrl,
    rejectUrl,
  } = params;

  const deviceLine = [brand, model, storage].filter(Boolean).join(" — ");

  return `<!DOCTYPE html>
<html lang="da">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#3A3D38;padding:30px 40px;text-align:center;">
            <img src="https://phonespot.dk/brand/logos/phonespot-wordmark-white.svg" alt="PhoneSpot" height="36" style="height:36px;"/>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 20px;font-size:16px;color:#3A3D38;">Hej ${customerName},</p>
            <p style="margin:0 0 20px;font-size:16px;color:#3A3D38;">
              Tak for din henvendelse. Vi har vurderet din ${deviceType.toLowerCase()}:
            </p>
            <table width="100%" style="background:#f9f7f4;border-radius:8px;padding:16px;margin:0 0 20px;">
              <tr><td style="padding:12px 16px;">
                <p style="margin:0 0 6px;font-size:14px;color:#666;">${deviceLine}</p>
                <p style="margin:0;font-size:14px;color:#666;">Stand: ${conditionSummary}</p>
              </td></tr>
            </table>
            <p style="margin:0 0 8px;font-size:14px;color:#666;text-transform:uppercase;letter-spacing:1px;">Vores tilbud</p>
            <p style="margin:0 0 30px;font-size:36px;font-weight:700;color:#3A3D38;">${offerAmountKr}</p>
            <!-- Accept button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
              <tr><td align="center">
                <a href="${acceptUrl}" style="display:inline-block;background:#5A8C6F;color:#ffffff;font-size:16px;font-weight:700;padding:16px 48px;border-radius:8px;text-decoration:none;">
                  Acceptér tilbud
                </a>
              </td></tr>
            </table>
            <!-- Reject link -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 30px;">
              <tr><td align="center">
                <a href="${rejectUrl}" style="font-size:14px;color:#999;text-decoration:underline;">
                  Afvis tilbud
                </a>
              </td></tr>
            </table>
            <p style="margin:0;font-size:13px;color:#999;">Tilbuddet er gyldigt i 7 dage.</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f7f4;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#999;">
              PhoneSpot · Vestsjællandscentret 10A, 103 · 4200 Slagelse · ha@phonespot.dk
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildOfferEmailSubject(model: string, amountKr: string): string {
  return `Dit tilbud fra PhoneSpot — ${amountKr} for din ${model}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/email/offer-email.ts
git commit -m "feat(trade-in): add offer email HTML template"
```

---

### Task 4: Offers API (GET + POST)

**Files:**
- Create: `src/app/api/trade-in/offers/route.ts`

- [ ] **Step 1: Implement the offers API route**

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { Resend } from "resend";
import { buildOfferEmailHtml, buildOfferEmailSubject } from "@/lib/email/offer-email";
import { formatDKK } from "@/lib/supabase/trade-in-types";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://phonespot.dk";

/* GET /api/trade-in/offers?inquiry_id=xxx */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const inquiryId = searchParams.get("inquiry_id");
  if (!inquiryId) return NextResponse.json({ error: "inquiry_id required" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("trade_in_offers")
    .select("*")
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/* POST /api/trade-in/offers — create offer and send email */
export async function POST(req: Request) {
  const body = await req.json();
  const { inquiry_id, offer_amount, admin_note, created_by } = body;

  if (!inquiry_id || !offer_amount) {
    return NextResponse.json({ error: "inquiry_id and offer_amount required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // 1. Expire any existing pending offers for this inquiry
  await supabase
    .from("trade_in_offers")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("inquiry_id", inquiry_id)
    .eq("status", "pending");

  // 2. Create new offer
  const { data: offer, error: offerErr } = await supabase
    .from("trade_in_offers")
    .insert({
      inquiry_id,
      offer_amount,
      admin_note: admin_note || null,
      created_by: created_by || null,
    })
    .select()
    .single();

  if (offerErr || !offer) {
    return NextResponse.json({ error: offerErr?.message || "Failed to create offer" }, { status: 500 });
  }

  // 3. Fetch the inquiry for customer details + device metadata
  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("*")
    .eq("id", inquiry_id)
    .single();

  if (!inquiry) {
    return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
  }

  // 4. Build email
  const metadata = (inquiry.metadata || {}) as Record<string, any>;
  const device = metadata.device || {};
  const condition = metadata.condition || {};
  const amountKr = formatDKK(offer_amount);

  const conditionParts = [
    condition.screen ? `Skærm: ${condition.screen}` : null,
    condition.back ? `Bagside: ${condition.back}` : null,
    condition.battery ? `Batteri: ${condition.battery}` : null,
  ].filter(Boolean).join(", ");

  const acceptUrl = `${BASE_URL}/saelg-din-enhed/accepter?token=${offer.token}`;
  const rejectUrl = `${BASE_URL}/saelg-din-enhed/afvis?token=${offer.token}`;

  const emailHtml = buildOfferEmailHtml({
    customerName: inquiry.name,
    deviceType: device.deviceType || "enhed",
    brand: device.brand || "",
    model: device.model || "",
    storage: device.storage || null,
    conditionSummary: conditionParts || "Ikke angivet",
    offerAmountKr: amountKr,
    acceptUrl,
    rejectUrl,
  });

  const subject = buildOfferEmailSubject(
    device.model || "enhed",
    amountKr,
  );

  // 5. Send email via Resend
  try {
    const emailResult = await resend.emails.send({
      from: "PhoneSpot <noreply@phonespot.dk>",
      to: inquiry.email,
      replyTo: "ha@phonespot.dk",
      subject,
      html: emailHtml,
    });

    // Log to mail_log
    await supabase.from("mail_log").insert({
      inquiry_id,
      to_email: inquiry.email,
      subject,
      body: emailHtml,
      status: "delivered",
      resend_id: emailResult.data?.id || null,
    });
  } catch (emailErr) {
    // Log failure but don't fail the offer creation
    await supabase.from("mail_log").insert({
      inquiry_id,
      to_email: inquiry.email,
      subject,
      body: emailHtml,
      status: "failed",
    });
  }

  // 6. Update inquiry status
  await supabase
    .from("contact_inquiries")
    .update({ status: "besvaret" })
    .eq("id", inquiry_id);

  // 7. Log as inquiry message
  await supabase.from("inquiry_messages").insert({
    inquiry_id,
    sender: "staff",
    channel: "email",
    body: `Tilbud sendt: ${amountKr}${admin_note ? ` (note: ${admin_note})` : ""}`,
    staff_name: created_by || "System",
  });

  return NextResponse.json(offer, { status: 201 });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd phonespot-next && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/trade-in/offers/route.ts
git commit -m "feat(trade-in): add offers API with email sending"
```

---

### Task 5: Offer Status API (Token Validation)

**Files:**
- Create: `src/app/api/trade-in/offer-status/route.ts`

- [ ] **Step 1: Implement token validation endpoint**

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/* GET /api/trade-in/offer-status?token=xxx — public, no auth */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const supabase = createServerClient();

  const { data: offer, error } = await supabase
    .from("trade_in_offers")
    .select("id, inquiry_id, offer_amount, status, token_expires_at, responded_at")
    .eq("token", token)
    .single();

  if (error || !offer) {
    return NextResponse.json({ error: "invalid_token", message: "Ugyldigt link." }, { status: 404 });
  }

  // Check if already responded
  if (offer.status === "accepted") {
    return NextResponse.json({ error: "already_accepted", message: "Du har allerede accepteret dette tilbud." }, { status: 410 });
  }
  if (offer.status === "rejected") {
    return NextResponse.json({ error: "already_rejected", message: "Du har allerede afvist dette tilbud." }, { status: 410 });
  }
  if (offer.status === "expired") {
    return NextResponse.json({ error: "expired", message: "Dit tilbud er desværre udløbet." }, { status: 410 });
  }

  // Check expiry
  if (new Date(offer.token_expires_at) < new Date()) {
    // Auto-expire
    await supabase
      .from("trade_in_offers")
      .update({ status: "expired" })
      .eq("id", offer.id);
    return NextResponse.json({ error: "expired", message: "Dit tilbud er desværre udløbet." }, { status: 410 });
  }

  // Fetch inquiry for pre-fill data
  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("name, email, phone, metadata")
    .eq("id", offer.inquiry_id)
    .single();

  const metadata = (inquiry?.metadata || {}) as Record<string, any>;

  return NextResponse.json({
    offer_id: offer.id,
    offer_amount: offer.offer_amount,
    expires_at: offer.token_expires_at,
    prefill: {
      name: inquiry?.name || "",
      email: inquiry?.email || "",
      phone: inquiry?.phone || "",
      device: metadata.device || {},
      condition: metadata.condition || {},
      deliveryMethod: metadata.deliveryMethod || "",
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/trade-in/offer-status/route.ts
git commit -m "feat(trade-in): add token validation endpoint for offer status"
```

---

### Task 6: Accept & Reject API Routes

**Files:**
- Create: `src/app/api/trade-in/accept/route.ts`
- Create: `src/app/api/trade-in/reject/route.ts`

- [ ] **Step 1: Implement accept endpoint**

Create `src/app/api/trade-in/accept/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/* POST /api/trade-in/accept — customer accepts offer via token */
export async function POST(req: Request) {
  const body = await req.json();
  const { token, seller_name, seller_address, seller_postal_city, seller_bank_reg, seller_bank_account } = body;

  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
  if (!seller_name || !seller_bank_reg || !seller_bank_account) {
    return NextResponse.json({ error: "Navn og bankoplysninger er påkrævet" }, { status: 400 });
  }

  const supabase = createServerClient();

  // 1. Validate token
  const { data: offer, error } = await supabase
    .from("trade_in_offers")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (error || !offer) {
    return NextResponse.json({ error: "Token er ugyldigt eller udløbet" }, { status: 400 });
  }

  if (new Date(offer.token_expires_at) < new Date()) {
    await supabase.from("trade_in_offers").update({ status: "expired" }).eq("id", offer.id);
    return NextResponse.json({ error: "Tilbuddet er udløbet" }, { status: 410 });
  }

  // 2. Update offer with customer details + accepted status
  const { error: updateErr } = await supabase
    .from("trade_in_offers")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
      seller_name,
      seller_address: seller_address || null,
      seller_postal_city: seller_postal_city || null,
      seller_bank_reg,
      seller_bank_account,
    })
    .eq("id", offer.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // 3. Fetch inquiry for context
  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("*")
    .eq("id", offer.inquiry_id)
    .single();

  // 4. Send confirmation email to customer
  if (inquiry) {
    const metadata = (inquiry.metadata || {}) as Record<string, any>;
    const deliveryMethod = metadata.deliveryMethod || "";
    const deliveryText = deliveryMethod === "Aflever i butik"
      ? "Du har valgt at aflevere i butikken. Vi kontakter dig med detaljer."
      : "Vi sender et gratis forsendelseslabel til din email inden for 24 timer.";

    try {
      await resend.emails.send({
        from: "PhoneSpot <noreply@phonespot.dk>",
        to: inquiry.email,
        replyTo: "ha@phonespot.dk",
        subject: "Tilbud accepteret — PhoneSpot",
        html: `<p>Hej ${seller_name},</p>
<p>Tak! Du har accepteret vores tilbud. ${deliveryText}</p>
<p>Med venlig hilsen,<br>PhoneSpot</p>`,
      });
    } catch { /* email failure is non-fatal */ }

    // 5. Notify admin
    try {
      await resend.emails.send({
        from: "PhoneSpot <noreply@phonespot.dk>",
        to: "ha@phonespot.dk",
        subject: `Tilbud accepteret: ${inquiry.name} — ${metadata.device?.model || "enhed"}`,
        html: `<p>${inquiry.name} har accepteret tilbuddet.</p>
<p>Bankinfo: Reg ${seller_bank_reg}, Konto ${seller_bank_account}</p>
<p><a href="https://phonespot.dk/admin/opkoeb/${offer.inquiry_id}">Se henvendelse</a></p>`,
      });
    } catch { /* email failure is non-fatal */ }

    // 6. Log message
    await supabase.from("inquiry_messages").insert({
      inquiry_id: offer.inquiry_id,
      sender: "customer",
      channel: "email",
      body: "Tilbud accepteret",
    });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Implement reject endpoint**

Create `src/app/api/trade-in/reject/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/* POST /api/trade-in/reject — customer rejects offer via token */
export async function POST(req: Request) {
  const body = await req.json();
  const { token, customer_response_note } = body;

  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const supabase = createServerClient();

  const { data: offer, error } = await supabase
    .from("trade_in_offers")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (error || !offer) {
    return NextResponse.json({ error: "Token er ugyldigt eller udløbet" }, { status: 400 });
  }

  if (new Date(offer.token_expires_at) < new Date()) {
    await supabase.from("trade_in_offers").update({ status: "expired" }).eq("id", offer.id);
    return NextResponse.json({ error: "Tilbuddet er udløbet" }, { status: 410 });
  }

  // Update offer
  await supabase
    .from("trade_in_offers")
    .update({
      status: "rejected",
      responded_at: new Date().toISOString(),
      customer_response_note: customer_response_note || null,
    })
    .eq("id", offer.id);

  // Fetch inquiry and notify admin
  const { data: inquiry } = await supabase
    .from("contact_inquiries")
    .select("name, email, metadata")
    .eq("id", offer.inquiry_id)
    .single();

  if (inquiry) {
    const metadata = (inquiry.metadata || {}) as Record<string, any>;
    try {
      await resend.emails.send({
        from: "PhoneSpot <noreply@phonespot.dk>",
        to: "ha@phonespot.dk",
        subject: `Tilbud afvist: ${inquiry.name} — ${metadata.device?.model || "enhed"}`,
        html: `<p>${inquiry.name} har afvist tilbuddet.</p>
${customer_response_note ? `<p>Kundens kommentar: ${customer_response_note}</p>` : ""}
<p><a href="https://phonespot.dk/admin/opkoeb/${offer.inquiry_id}">Se henvendelse</a></p>`,
      });
    } catch { /* non-fatal */ }

    await supabase.from("inquiry_messages").insert({
      inquiry_id: offer.inquiry_id,
      sender: "customer",
      channel: "email",
      body: `Tilbud afvist${customer_response_note ? `: ${customer_response_note}` : ""}`,
    });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd phonespot-next && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/trade-in/accept/route.ts src/app/api/trade-in/reject/route.ts
git commit -m "feat(trade-in): add accept and reject API endpoints with email notifications"
```

---

## Chunk 3: Receipt API Routes & PDF

### Task 7: Receipts API (CRUD)

**Files:**
- Create: `src/app/api/trade-in/receipts/route.ts`
- Create: `src/app/api/trade-in/receipts/[id]/route.ts`
- Create: `src/app/api/trade-in/receipts/[id]/confirm/route.ts`
- Create: `src/app/api/trade-in/receipts/[id]/pay/route.ts`

- [ ] **Step 1: Implement receipts list + create**

Create `src/app/api/trade-in/receipts/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/* GET /api/trade-in/receipts?inquiry_id=xxx */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const inquiryId = searchParams.get("inquiry_id");
  if (!inquiryId) return NextResponse.json({ error: "inquiry_id required" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("trade_in_receipts")
    .select("*, trade_in_receipt_items(*)")
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/* POST /api/trade-in/receipts — create draft receipt */
export async function POST(req: Request) {
  const body = await req.json();
  const { inquiry_id, offer_id, store_location_id, seller_name, seller_address, seller_postal_city, seller_phone, seller_email, seller_bank_reg, seller_bank_account, buyer_address, buyer_postal_city, buyer_phone, delivery_method, staff_initials, items } = body;

  if (!seller_name) {
    return NextResponse.json({ error: "seller_name required" }, { status: 400 });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "At least one item required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Calculate total from items
  const totalAmount = items.reduce((sum: number, item: { price: number }) => sum + item.price, 0);

  // Create receipt (receipt_number auto-generated by DB default)
  const { data: receipt, error: receiptErr } = await supabase
    .from("trade_in_receipts")
    .insert({
      inquiry_id: inquiry_id || null,
      offer_id: offer_id || null,
      store_location_id: store_location_id || null,
      seller_name,
      seller_address: seller_address || null,
      seller_postal_city: seller_postal_city || null,
      seller_phone: seller_phone || null,
      seller_email: seller_email || null,
      seller_bank_reg: seller_bank_reg || null,
      seller_bank_account: seller_bank_account || null,
      buyer_address: buyer_address || null,
      buyer_postal_city: buyer_postal_city || null,
      buyer_phone: buyer_phone || null,
      total_amount: totalAmount,
      delivery_method: delivery_method || null,
      staff_initials: staff_initials || null,
    })
    .select()
    .single();

  if (receiptErr || !receipt) {
    return NextResponse.json({ error: receiptErr?.message || "Failed to create receipt" }, { status: 500 });
  }

  // Insert items
  const itemRows = items.map((item: any) => ({
    receipt_id: receipt.id,
    imei_serial: item.imei_serial || null,
    brand: item.brand,
    model: item.model,
    storage: item.storage || null,
    ram: item.ram || null,
    condition_grade: item.condition_grade || null,
    color: item.color || null,
    condition_notes: item.condition_notes || null,
    price: item.price,
  }));

  const { error: itemsErr } = await supabase
    .from("trade_in_receipt_items")
    .insert(itemRows);

  if (itemsErr) {
    // Cleanup: delete the receipt if items failed
    await supabase.from("trade_in_receipts").delete().eq("id", receipt.id);
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  // Fetch complete receipt with items
  const { data: complete } = await supabase
    .from("trade_in_receipts")
    .select("*, trade_in_receipt_items(*)")
    .eq("id", receipt.id)
    .single();

  return NextResponse.json(complete, { status: 201 });
}
```

- [ ] **Step 2: Implement receipt update + delete**

Create `src/app/api/trade-in/receipts/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/* PATCH /api/trade-in/receipts/[id] — update draft receipt */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { items, ...receiptFields } = body;

  const supabase = createServerClient();

  // Check receipt exists and is draft
  const { data: existing } = await supabase
    .from("trade_in_receipts")
    .select("status")
    .eq("id", id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "draft") {
    return NextResponse.json({ error: "Can only edit draft receipts" }, { status: 400 });
  }

  // Update receipt fields
  if (Object.keys(receiptFields).length > 0) {
    // Recalculate total if items provided
    if (items && Array.isArray(items)) {
      receiptFields.total_amount = items.reduce((sum: number, i: { price: number }) => sum + i.price, 0);
    }
    const { error } = await supabase
      .from("trade_in_receipts")
      .update(receiptFields)
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Replace items if provided
  if (items && Array.isArray(items)) {
    // Delete existing items
    await supabase.from("trade_in_receipt_items").delete().eq("receipt_id", id);
    // Insert new items
    const itemRows = items.map((item: any) => ({
      receipt_id: id,
      imei_serial: item.imei_serial || null,
      brand: item.brand,
      model: item.model,
      storage: item.storage || null,
      ram: item.ram || null,
      condition_grade: item.condition_grade || null,
      color: item.color || null,
      condition_notes: item.condition_notes || null,
      price: item.price,
    }));
    await supabase.from("trade_in_receipt_items").insert(itemRows);
  }

  // Return updated receipt
  const { data } = await supabase
    .from("trade_in_receipts")
    .select("*, trade_in_receipt_items(*)")
    .eq("id", id)
    .single();

  return NextResponse.json(data);
}

/* DELETE /api/trade-in/receipts/[id] — delete draft only */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("trade_in_receipts")
    .select("status")
    .eq("id", id)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "draft") {
    return NextResponse.json({ error: "Can only delete draft receipts" }, { status: 400 });
  }

  await supabase.from("trade_in_receipts").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Implement confirm endpoint**

Create `src/app/api/trade-in/receipts/[id]/confirm/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://phonespot.dk";

/* POST /api/trade-in/receipts/[id]/confirm — confirm receipt + generate PDF */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  // Fetch receipt with items
  const { data: receipt } = await supabase
    .from("trade_in_receipts")
    .select("*, trade_in_receipt_items(*)")
    .eq("id", id)
    .single();

  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (receipt.status !== "draft") {
    return NextResponse.json({ error: "Receipt already confirmed" }, { status: 400 });
  }

  // Generate PDF via internal API
  const pdfRes = await fetch(`${BASE_URL}/api/trade-in/receipts/${id}/pdf`, {
    headers: { "x-internal-key": process.env.SUPABASE_SERVICE_ROLE_KEY || "" },
  });

  let pdfUrl: string | null = null;

  if (pdfRes.ok) {
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

    // Upload to Supabase Storage
    const fileName = `${receipt.receipt_number}.pdf`;
    const { data: uploadData } = await supabase.storage
      .from("slutsedler")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadData) {
      const { data: urlData } = supabase.storage
        .from("slutsedler")
        .getPublicUrl(fileName);
      pdfUrl = urlData.publicUrl;
    }

    // Send PDF to both parties
    const attachments = [{ filename: `Slutseddel-${receipt.receipt_number}.pdf`, content: pdfBuffer }];

    if (receipt.seller_email) {
      try {
        await resend.emails.send({
          from: "PhoneSpot <noreply@phonespot.dk>",
          to: receipt.seller_email,
          subject: `Slutseddel ${receipt.receipt_number} — PhoneSpot`,
          html: `<p>Hej ${receipt.seller_name},</p><p>Vedhæftet finder du din slutseddel.</p><p>Med venlig hilsen,<br>PhoneSpot</p>`,
          attachments,
        });
      } catch { /* non-fatal */ }
    }

    try {
      await resend.emails.send({
        from: "PhoneSpot <noreply@phonespot.dk>",
        to: "ha@phonespot.dk",
        subject: `Slutseddel bekræftet: ${receipt.receipt_number}`,
        html: `<p>Slutseddel ${receipt.receipt_number} er bekræftet for ${receipt.seller_name}.</p>`,
        attachments,
      });
    } catch { /* non-fatal */ }
  }

  // Update receipt status
  const { data: updated, error } = await supabase
    .from("trade_in_receipts")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      pdf_url: pdfUrl,
    })
    .eq("id", id)
    .select("*, trade_in_receipt_items(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(updated);
}
```

- [ ] **Step 4: Implement pay endpoint**

Create `src/app/api/trade-in/receipts/[id]/pay/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/* POST /api/trade-in/receipts/[id]/pay — mark receipt as paid */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: receipt } = await supabase
    .from("trade_in_receipts")
    .select("status")
    .eq("id", id)
    .single();

  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (receipt.status !== "confirmed") {
    return NextResponse.json({ error: "Receipt must be confirmed before marking as paid" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("trade_in_receipts")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd phonespot-next && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/trade-in/receipts/
git commit -m "feat(trade-in): add receipts CRUD, confirm, and pay API endpoints"
```

---

### Task 8: Slutseddel PDF Template

**Files:**
- Create: `src/lib/pdf/slutseddel.tsx`
- Create: `src/app/api/trade-in/receipts/[id]/pdf/route.ts`

- [ ] **Step 1: Create the PDF component**

Create `src/lib/pdf/slutseddel.tsx`:

```tsx
import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { TradeInReceipt, TradeInReceiptItem } from "@/lib/supabase/trade-in-types";

const c = {
  charcoal: "#3A3D38",
  green: "#5A8C6F",
  gray: "#666666",
  lightGray: "#E5E5E5",
  bg: "#FAFAFA",
  white: "#FFFFFF",
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: c.charcoal },
  // Header
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: c.green },
  headerRight: { alignItems: "flex-end" },
  receiptNum: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  date: { fontSize: 10, color: c.gray },
  // Parties
  partiesRow: { flexDirection: "row", marginBottom: 24, gap: 20 },
  partyBox: { flex: 1, padding: 12, backgroundColor: c.bg, borderRadius: 4 },
  partyLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: c.green, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 8 },
  partyName: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  partyLine: { fontSize: 9, color: c.gray, marginBottom: 2 },
  // Table
  tableHeader: { flexDirection: "row", backgroundColor: c.charcoal, padding: 8, borderRadius: 4 },
  tableHeaderText: { color: c.white, fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase" as const },
  tableRow: { flexDirection: "row", padding: 8, borderBottomWidth: 1, borderBottomColor: c.lightGray },
  tableCell: { fontSize: 9 },
  // Column widths
  colNum: { width: 24 },
  colImei: { width: 110 },
  colBrand: { width: 70 },
  colModel: { width: 90 },
  colStorage: { width: 55 },
  colGrade: { width: 55 },
  colPrice: { width: 70, textAlign: "right" as const },
  // Total
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12, paddingRight: 8 },
  totalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", marginRight: 20 },
  totalAmount: { fontSize: 12, fontFamily: "Helvetica-Bold", color: c.green },
  // Bank
  bankSection: { marginTop: 20, padding: 12, backgroundColor: c.bg, borderRadius: 4 },
  bankLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: c.green, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 6 },
  bankRow: { flexDirection: "row", gap: 40 },
  bankItem: { fontSize: 9, color: c.gray },
  bankValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  // Footer
  footer: { marginTop: 30, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.lightGray },
  legalText: { fontSize: 7.5, color: c.gray, marginBottom: 4, lineHeight: 1.4 },
  signatureRow: { flexDirection: "row", marginTop: 24, gap: 40 },
  signatureLine: { flex: 1, borderTopWidth: 1, borderTopColor: c.charcoal, paddingTop: 4 },
  signatureLabel: { fontSize: 8, color: c.gray },
  staffLine: { marginTop: 16, fontSize: 8, color: c.gray },
});

function formatDKK(ore: number): string {
  return new Intl.NumberFormat("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(ore / 100) + " kr";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface SlutseddelProps {
  receipt: TradeInReceipt;
  items: TradeInReceiptItem[];
}

export function SlutseddelDocument({ receipt, items }: SlutseddelProps) {
  const isShipping = receipt.delivery_method === "shipping";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>SLUTSEDDEL</Text>
          <View style={s.headerRight}>
            <Text style={s.receiptNum}>{receipt.receipt_number}</Text>
            <Text style={s.date}>{formatDate(receipt.confirmed_at || receipt.created_at)}</Text>
          </View>
        </View>

        {/* Parties */}
        <View style={s.partiesRow}>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Køber</Text>
            <Text style={s.partyName}>{receipt.buyer_company}</Text>
            <Text style={s.partyLine}>CVR: {receipt.buyer_cvr}</Text>
            {receipt.buyer_address && <Text style={s.partyLine}>{receipt.buyer_address}</Text>}
            {receipt.buyer_postal_city && <Text style={s.partyLine}>{receipt.buyer_postal_city}</Text>}
            <Text style={s.partyLine}>{receipt.buyer_email}</Text>
            {receipt.buyer_phone && <Text style={s.partyLine}>Tlf: {receipt.buyer_phone}</Text>}
          </View>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Sælger</Text>
            <Text style={s.partyName}>{receipt.seller_name}</Text>
            {receipt.seller_address && <Text style={s.partyLine}>{receipt.seller_address}</Text>}
            {receipt.seller_postal_city && <Text style={s.partyLine}>{receipt.seller_postal_city}</Text>}
            {receipt.seller_phone && <Text style={s.partyLine}>Tlf: {receipt.seller_phone}</Text>}
            {receipt.seller_email && <Text style={s.partyLine}>{receipt.seller_email}</Text>}
          </View>
        </View>

        {/* Device Table */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.colNum]}>#</Text>
          <Text style={[s.tableHeaderText, s.colImei]}>IMEI/Serienr.</Text>
          <Text style={[s.tableHeaderText, s.colBrand]}>Fabrikant</Text>
          <Text style={[s.tableHeaderText, s.colModel]}>Model</Text>
          <Text style={[s.tableHeaderText, s.colStorage]}>Lagerplads</Text>
          <Text style={[s.tableHeaderText, s.colGrade]}>Stand</Text>
          <Text style={[s.tableHeaderText, s.colPrice]}>Pris</Text>
        </View>
        {items.map((item, i) => (
          <View key={item.id} style={s.tableRow}>
            <Text style={[s.tableCell, s.colNum]}>{i + 1}</Text>
            <Text style={[s.tableCell, s.colImei]}>{item.imei_serial || "—"}</Text>
            <Text style={[s.tableCell, s.colBrand]}>{item.brand}</Text>
            <Text style={[s.tableCell, s.colModel]}>{item.model}</Text>
            <Text style={[s.tableCell, s.colStorage]}>{item.storage || "—"}</Text>
            <Text style={[s.tableCell, s.colGrade]}>{item.condition_grade || "—"}</Text>
            <Text style={[s.tableCell, s.colPrice]}>{formatDKK(item.price)}</Text>
          </View>
        ))}

        {/* Total */}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total:</Text>
          <Text style={s.totalAmount}>{formatDKK(receipt.total_amount)}</Text>
        </View>

        {/* Bank Details */}
        {(receipt.seller_bank_reg || receipt.seller_bank_account) && (
          <View style={s.bankSection}>
            <Text style={s.bankLabel}>Sælgers bankoplysninger</Text>
            <View style={s.bankRow}>
              <Text style={s.bankItem}>Reg.nr: <Text style={s.bankValue}>{receipt.seller_bank_reg || "—"}</Text></Text>
              <Text style={s.bankItem}>Kontonr: <Text style={s.bankValue}>{receipt.seller_bank_account || "—"}</Text></Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.legalText}>
            Sælger bekræfter at ovenstående enhed(er) er sælgers ejendom og ikke er stjålet eller pansat.
          </Text>
          <Text style={s.legalText}>
            Køb sker i henhold til brugtmomsordningen jf. momslovens §70.
          </Text>

          {isShipping ? (
            <Text style={[s.legalText, { marginTop: 12 }]}>
              Digital bekræftelse modtaget {receipt.confirmed_at ? formatDate(receipt.confirmed_at) : "—"}
            </Text>
          ) : (
            <View style={s.signatureRow}>
              <View style={s.signatureLine}>
                <Text style={s.signatureLabel}>Sælgers underskrift</Text>
              </View>
              <View style={s.signatureLine}>
                <Text style={s.signatureLabel}>Købers underskrift</Text>
              </View>
            </View>
          )}

          {receipt.staff_initials && (
            <Text style={s.staffLine}>Behandlet af: {receipt.staff_initials}</Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Create the PDF API route**

Create `src/app/api/trade-in/receipts/[id]/pdf/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { SlutseddelDocument } from "@/lib/pdf/slutseddel";

/* GET /api/trade-in/receipts/[id]/pdf — generate and return PDF */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: receipt } = await supabase
    .from("trade_in_receipts")
    .select("*")
    .eq("id", id)
    .single();

  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: items } = await supabase
    .from("trade_in_receipt_items")
    .select("*")
    .eq("receipt_id", id)
    .order("created_at", { ascending: true });

  const pdfBuffer = await renderToBuffer(
    React.createElement(SlutseddelDocument, {
      receipt,
      items: items || [],
    }),
  );

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Slutseddel-${receipt.receipt_number}.pdf"`,
    },
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd phonespot-next && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/pdf/slutseddel.tsx src/app/api/trade-in/receipts/[id]/pdf/route.ts
git commit -m "feat(trade-in): add slutseddel PDF template and generation endpoint"
```

---

## Chunk 4: Customer-Facing Accept/Reject Pages

### Task 9: Accept Offer Page

**Files:**
- Create: `src/app/saelg-din-enhed/accepter/page.tsx`

- [ ] **Step 1: Create the accept page**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { formatDKK } from "@/lib/supabase/trade-in-types";

type PageState = "loading" | "form" | "success" | "error";

interface OfferData {
  offer_id: string;
  offer_amount: number;
  expires_at: string;
  prefill: {
    name: string;
    email: string;
    phone: string;
    device: { deviceType?: string; brand?: string; model?: string; storage?: string };
    condition: Record<string, string>;
    deliveryMethod: string;
  };
}

export default function AccepterPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    seller_name: "",
    seller_address: "",
    seller_postal_city: "",
    seller_bank_reg: "",
    seller_bank_account: "",
    confirmed: false,
  });

  useEffect(() => {
    if (!token) { setState("error"); setErrorMsg("Ugyldigt link."); return; }

    fetch(`/api/trade-in/offer-status?token=${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          setErrorMsg(data.message || "Ugyldigt link.");
          setState("error");
          return;
        }
        const data: OfferData = await res.json();
        setOffer(data);
        setForm((prev) => ({ ...prev, seller_name: data.prefill.name }));
        setState("form");
      })
      .catch(() => { setState("error"); setErrorMsg("Kunne ikke indlæse tilbud."); });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.confirmed || !form.seller_bank_reg || !form.seller_bank_account) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/trade-in/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...form }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Noget gik galt");
      }
      setState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Kunne ikke acceptere tilbud");
      setState("error");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyles = "w-full rounded-xl border border-soft-grey bg-white px-4 py-3.5 text-charcoal placeholder:text-gray/50 focus:border-green-eco focus:outline-none focus:ring-2 focus:ring-green-eco/20 transition-all";

  if (state === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-eco border-t-transparent" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10">
          <h1 className="font-display text-2xl font-bold text-charcoal">Tilbud ikke tilgængeligt</h1>
          <p className="mt-4 text-gray">{errorMsg}</p>
          <p className="mt-6 text-sm text-gray">
            Kontakt os på <a href="mailto:ha@phonespot.dk" className="text-green-eco underline">ha@phonespot.dk</a> for hjælp.
          </p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    const isInStore = offer?.prefill.deliveryMethod === "Aflever i butik";
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="rounded-2xl border border-green-eco/20 bg-green-eco/5 p-10">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-eco shadow-lg shadow-green-eco/25">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="h-10 w-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-charcoal">Tilbud accepteret!</h1>
          <p className="mt-4 text-gray">
            {isInStore
              ? "Vi kontakter dig med detaljer om aflevering i butikken."
              : "Vi sender et gratis forsendelseslabel til din email inden for 24 timer."}
          </p>
        </div>
      </div>
    );
  }

  // Form state
  const device = offer?.prefill.device;
  const deviceLine = [device?.brand, device?.model, device?.storage].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-charcoal">Acceptér tilbud</h1>
        <p className="mt-2 text-gray">Udfyld dine oplysninger for at acceptere</p>
      </div>

      {/* Offer summary */}
      <div className="mb-8 rounded-2xl border border-green-eco/20 bg-green-eco/5 p-6 text-center">
        <p className="text-sm text-gray">{deviceLine}</p>
        <p className="mt-2 font-display text-4xl font-bold text-charcoal">
          {offer ? formatDKK(offer.offer_amount) : ""}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-charcoal">Fulde navn *</label>
          <input
            type="text"
            required
            value={form.seller_name}
            onChange={(e) => setForm({ ...form, seller_name: e.target.value })}
            className={inputStyles}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-charcoal">Adresse</label>
          <input
            type="text"
            placeholder="Gadenavn og nr."
            value={form.seller_address}
            onChange={(e) => setForm({ ...form, seller_address: e.target.value })}
            className={inputStyles}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-charcoal">Postnr. og by</label>
          <input
            type="text"
            placeholder="f.eks. 4200 Slagelse"
            value={form.seller_postal_city}
            onChange={(e) => setForm({ ...form, seller_postal_city: e.target.value })}
            className={inputStyles}
          />
        </div>

        <div className="h-px bg-soft-grey" />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-charcoal">Reg.nr. *</label>
            <input
              type="text"
              required
              placeholder="4-cifret"
              maxLength={4}
              value={form.seller_bank_reg}
              onChange={(e) => setForm({ ...form, seller_bank_reg: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              className={inputStyles}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-charcoal">Kontonr. *</label>
            <input
              type="text"
              required
              placeholder="Op til 10 cifre"
              maxLength={10}
              value={form.seller_bank_account}
              onChange={(e) => setForm({ ...form, seller_bank_account: e.target.value.replace(/\D/g, "").slice(0, 10) })}
              className={inputStyles}
            />
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-soft-grey p-4 transition-colors hover:border-green-eco/30">
          <input
            type="checkbox"
            checked={form.confirmed}
            onChange={(e) => setForm({ ...form, confirmed: e.target.checked })}
            className="mt-0.5 h-5 w-5 rounded border-gray accent-green-eco"
          />
          <span className="text-sm text-charcoal">
            Jeg bekræfter at enheden er min ejendom og ikke er stjålet eller pansat.
          </span>
        </label>

        <button
          type="submit"
          disabled={!form.confirmed || !form.seller_bank_reg || !form.seller_bank_account || submitting}
          className="w-full rounded-xl bg-green-eco px-6 py-4 font-display text-lg font-bold text-white transition-all hover:brightness-110 hover:shadow-lg hover:shadow-green-eco/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Sender..." : "Acceptér tilbud"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/saelg-din-enhed/accepter/page.tsx
git commit -m "feat(trade-in): add customer offer accept page with bank details form"
```

---

### Task 10: Reject Offer Page

**Files:**
- Create: `src/app/saelg-din-enhed/afvis/page.tsx`

- [ ] **Step 1: Create the reject page**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

type PageState = "loading" | "form" | "success" | "error";

export default function AfvisPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setState("error"); setErrorMsg("Ugyldigt link."); return; }

    fetch(`/api/trade-in/offer-status?token=${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          setErrorMsg(data.message || "Ugyldigt link.");
          setState("error");
          return;
        }
        setState("form");
      })
      .catch(() => { setState("error"); setErrorMsg("Kunne ikke indlæse tilbud."); });
  }, [token]);

  async function handleReject() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/trade-in/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, customer_response_note: comment || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Noget gik galt");
      }
      setState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Kunne ikke afvise tilbud");
      setState("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-eco border-t-transparent" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10">
          <h1 className="font-display text-2xl font-bold text-charcoal">Tilbud ikke tilgængeligt</h1>
          <p className="mt-4 text-gray">{errorMsg}</p>
          <p className="mt-6 text-sm text-gray">
            Kontakt os på <a href="mailto:ha@phonespot.dk" className="text-green-eco underline">ha@phonespot.dk</a> for hjælp.
          </p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="rounded-2xl border border-soft-grey bg-white p-10">
          <h1 className="font-display text-2xl font-bold text-charcoal">Tilbud afvist</h1>
          <p className="mt-4 text-gray">
            Vi har registreret dit svar. Hvis du ændrer mening eller ønsker et nyt tilbud,
            er du velkommen til at kontakte os.
          </p>
          <a
            href="mailto:ha@phonespot.dk"
            className="mt-6 inline-block text-sm font-medium text-green-eco underline"
          >
            Kontakt os
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-2xl border border-soft-grey bg-white p-8">
        <h1 className="font-display text-2xl font-bold text-charcoal">Afvis tilbud</h1>
        <p className="mt-2 text-gray">
          Er du sikker på du vil afvise tilbuddet? Du kan evt. skrive en kommentar,
          så kan vi måske finde en bedre løsning.
        </p>

        <textarea
          placeholder="Valgfri kommentar — f.eks. 'Prisen er for lav' eller 'Jeg har fundet en bedre pris'"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mt-6 w-full rounded-xl border border-soft-grey bg-white px-4 py-3.5 text-charcoal placeholder:text-gray/50 focus:border-green-eco focus:outline-none focus:ring-2 focus:ring-green-eco/20 transition-all"
        />

        <div className="mt-6 flex gap-3">
          <a
            href="/"
            className="flex-1 rounded-xl border border-soft-grey bg-white px-4 py-3 text-center text-sm font-bold text-charcoal transition-colors hover:bg-sand"
          >
            Annuller
          </a>
          <button
            type="button"
            onClick={handleReject}
            disabled={submitting}
            className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-red-600 disabled:opacity-50"
          >
            {submitting ? "Sender..." : "Afvis tilbud"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/saelg-din-enhed/afvis/page.tsx
git commit -m "feat(trade-in): add customer offer reject page"
```

---

## Chunk 5: Admin Pages

### Task 11: Add Navigation Item

**Files:**
- Modify: `src/app/(admin)/admin/layout.tsx`

- [ ] **Step 1: Add "Opkøb" to NAV_ITEMS**

Find the `NAV_ITEMS` array in the admin layout and add a new entry after "Henvendelser":

```typescript
{ href: "/admin/opkoeb", label: "Opkøb", icon: /* banknotes icon SVG */ },
```

The exact icon SVG to use (banknotes/money):
```tsx
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
</svg>
```

Look at how existing nav items are structured and follow the same pattern exactly.

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/layout.tsx
git commit -m "feat(trade-in): add Opkøb nav item to admin sidebar"
```

---

### Task 12: Admin List Page (`/admin/opkoeb`)

**Files:**
- Create: `src/app/(admin)/admin/opkoeb/page.tsx`

- [ ] **Step 1: Create the trade-in list page**

Follow the exact same patterns as `src/app/(admin)/admin/henvendelser/page.tsx` — it's a "use client" component with `createBrowserClient()`, state management, filters, and a data table.

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { ContactInquiry } from "@/lib/supabase/types";
import type { TradeInOffer, TradeInDerivedStatus } from "@/lib/supabase/trade-in-types";
import { deriveTradeInStatus, formatDKK } from "@/lib/supabase/trade-in-types";

const STATUS_CONFIG: Record<TradeInDerivedStatus, { label: string; color: string }> = {
  ny: { label: "Ny", color: "bg-blue-100 text-blue-700" },
  tilbud_sendt: { label: "Tilbud sendt", color: "bg-yellow-100 text-yellow-700" },
  accepteret: { label: "Accepteret", color: "bg-green-100 text-green-700" },
  afvist: { label: "Afvist", color: "bg-red-100 text-red-700" },
  modtaget: { label: "Modtaget", color: "bg-purple-100 text-purple-700" },
  betalt: { label: "Betalt", color: "bg-emerald-100 text-emerald-800" },
  lukket: { label: "Lukket", color: "bg-stone-100 text-stone-600" },
};

interface TradeInRow {
  inquiry: ContactInquiry;
  offers: Pick<TradeInOffer, "status" | "offer_amount" | "created_at">[];
  receipts: { status: string }[];
  derivedStatus: TradeInDerivedStatus;
}

export default function OpkoebPage() {
  const [rows, setRows] = useState<TradeInRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TradeInDerivedStatus | "alle">("alle");
  const [search, setSearch] = useState("");

  const supabase = createBrowserClient();

  const loadData = useCallback(async () => {
    setLoading(true);

    // Fetch all sell-device inquiries
    const { data: inquiries } = await supabase
      .from("contact_inquiries")
      .select("*")
      .eq("source", "saelg-enhed")
      .order("created_at", { ascending: false });

    if (!inquiries) { setLoading(false); return; }

    // Fetch all offers and receipts for these inquiries
    const ids = inquiries.map((i) => i.id);

    const { data: allOffers } = await supabase
      .from("trade_in_offers")
      .select("inquiry_id, status, offer_amount, created_at")
      .in("inquiry_id", ids);

    const { data: allReceipts } = await supabase
      .from("trade_in_receipts")
      .select("inquiry_id, status")
      .in("inquiry_id", ids);

    const result: TradeInRow[] = inquiries.map((inquiry) => {
      const offers = (allOffers || []).filter((o) => o.inquiry_id === inquiry.id);
      const receipts = (allReceipts || []).filter((r) => r.inquiry_id === inquiry.id);
      return {
        inquiry,
        offers,
        receipts,
        derivedStatus: deriveTradeInStatus(inquiry.status, offers, receipts),
      };
    });

    setRows(result);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = rows.filter((row) => {
    if (filter !== "alle" && row.derivedStatus !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const meta = (row.inquiry.metadata || {}) as Record<string, any>;
      const device = meta.device || {};
      const haystack = [row.inquiry.name, row.inquiry.email, device.brand, device.model].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-stone-800">Opkøb</h1>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Søg kunde eller enhed..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as TradeInDerivedStatus | "alle")}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
          >
            <option value="alle">Alle</option>
            {(Object.keys(STATUS_CONFIG) as TradeInDerivedStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
          <p className="text-stone-500">Ingen henvendelser fundet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="px-4 py-3 text-left font-semibold text-stone-600">Kunde</th>
                <th className="px-4 py-3 text-left font-semibold text-stone-600">Enhed</th>
                <th className="px-4 py-3 text-left font-semibold text-stone-600">Levering</th>
                <th className="px-4 py-3 text-left font-semibold text-stone-600">Tilbud</th>
                <th className="px-4 py-3 text-left font-semibold text-stone-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-stone-600">Dato</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const meta = (row.inquiry.metadata || {}) as Record<string, any>;
                const device = meta.device || {};
                const latestOffer = row.offers.find((o) => o.status === "pending" || o.status === "accepted")
                  || row.offers[0];
                const statusCfg = STATUS_CONFIG[row.derivedStatus];

                return (
                  <tr key={row.inquiry.id} className="border-b border-stone-50 transition-colors hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/opkoeb/${row.inquiry.id}`} className="font-medium text-stone-800 hover:text-green-700">
                        {row.inquiry.name}
                      </Link>
                      <p className="text-xs text-stone-400">{row.inquiry.email}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {device.brand} {device.model}
                      {device.storage && <span className="ml-1 text-stone-400">· {device.storage}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-stone-500">
                        {meta.deliveryMethod === "Aflever i butik" ? "Butik" : "Forsendelse"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-700">
                      {latestOffer ? formatDKK(latestOffer.offer_amount) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-400">
                      {new Date(row.inquiry.created_at).toLocaleDateString("da-DK")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/opkoeb/page.tsx
git commit -m "feat(trade-in): add admin trade-in list page with status filtering"
```

---

### Task 13: Admin Detail Page (`/admin/opkoeb/[id]`)

**Files:**
- Create: `src/app/(admin)/admin/opkoeb/[id]/page.tsx`

This is the largest admin page. It shows device info from the inquiry metadata, allows sending offers, shows offer history, and links to the slutseddel editor.

- [ ] **Step 1: Create the detail page**

Create `src/app/(admin)/admin/opkoeb/[id]/page.tsx` — a "use client" component following the existing henvendelser detail pattern:

Key sections:
1. **Header** with customer name, email, phone, date
2. **Device info card** extracted from `inquiry.metadata.device` and `inquiry.metadata.condition`
3. **Send offer section** — amount input + admin note + submit button
4. **Offer history table** — all offers for this inquiry with status badges
5. **"Opret slutseddel" button** — only visible when an accepted offer exists, links to `/admin/opkoeb/[id]/slutseddel`
6. **Message thread** — reuses the existing inquiry_messages display and reply pattern

The page fetches:
- `contact_inquiries` by id
- `trade_in_offers` by inquiry_id
- `trade_in_receipts` by inquiry_id
- `inquiry_messages` by inquiry_id

Send offer calls `POST /api/trade-in/offers` with `{ inquiry_id, offer_amount, admin_note, created_by }`.

This file will be ~400 lines. Follow the henvendelser page pattern exactly: `createBrowserClient()`, state hooks, fetch functions, inline event handlers, Tailwind styling with stone/green color scheme.

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/opkoeb/[id]/page.tsx
git commit -m "feat(trade-in): add admin detail page with offer management"
```

---

### Task 14: Admin Slutseddel Editor (`/admin/opkoeb/[id]/slutseddel`)

**Files:**
- Create: `src/app/(admin)/admin/opkoeb/[id]/slutseddel/page.tsx`

- [ ] **Step 1: Create the receipt editor page**

Create `src/app/(admin)/admin/opkoeb/[id]/slutseddel/page.tsx` — a "use client" component:

Key sections:
1. **Auto-filled seller info** from the accepted offer's seller_* fields
2. **Auto-filled buyer info** (Phonego ApS, CVR 38688766, ha@phonespot.dk) with store address from store_locations
3. **Device items** — first item auto-filled from inquiry metadata, admin adds IMEI/serial and adjusts price. "+1 enhed" button to add more rows.
4. **Staff initials** input
5. **Total** computed from items
6. **Actions**: "Gem kladde" (POST/PATCH receipts), "Bekræft og generer PDF" (POST confirm), "Registrer betaling" (POST pay)

The page first checks if a receipt already exists for this inquiry. If yes, loads it for editing. If no, shows create form.

On "Bekræft og generer PDF":
1. Save/update receipt via API
2. Call `/api/trade-in/receipts/[id]/confirm`
3. Show success with link to download PDF

On "Registrer betaling":
1. Call `/api/trade-in/receipts/[id]/pay`
2. Show "Betalt" badge with timestamp

This file will be ~350 lines. Follow the same UI patterns: stone/green colors, rounded-xl cards, text-sm inputs.

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/opkoeb/[id]/slutseddel/page.tsx
git commit -m "feat(trade-in): add admin slutseddel editor with PDF generation and payment tracking"
```

---

## Chunk 6: Integration & Polish

### Task 15: Create Supabase Storage Bucket

- [ ] **Step 1: Create the `slutsedler` bucket**

In the Supabase Dashboard:
1. Go to Storage
2. Create new bucket: `slutsedler`
3. Set it to **public** (so PDFs can be linked)
4. Or alternatively, create via SQL:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('slutsedler', 'slutsedler', true);
```

- [ ] **Step 2: Verify bucket exists**

Test by navigating to Supabase Dashboard > Storage and confirming the `slutsedler` bucket appears.

---

### Task 16: Add NEXT_PUBLIC_SITE_URL env variable

- [ ] **Step 1: Ensure env variable is set**

Add to `.env.local` (and Vercel environment variables):

```
NEXT_PUBLIC_SITE_URL=https://phonespot.dk
```

This is used for generating accept/reject URLs in offer emails.

---

### Task 17: End-to-End Manual Test

- [ ] **Step 1: Test the full flow**

1. Submit a sell-device form on `/saelg-din-enhed`
2. Verify it appears in `/admin/opkoeb` with status "Ny"
3. Open the detail page, send an offer (e.g. 250000 øre = 2.500 kr)
4. Check email arrives at the customer address with accept/reject buttons
5. Click "Acceptér tilbud" in the email
6. Fill in address and bank details on the accept page
7. Verify status changes to "Accepteret" in admin
8. Open the slutseddel editor — verify auto-fill of all customer + device data
9. Add IMEI/serial number, confirm staff initials
10. Click "Bekræft og generer PDF" — verify PDF is generated and emailed
11. Click "Registrer betaling" — verify status changes to "Betalt"

- [ ] **Step 2: Test error states**

1. Try accessing accept page with expired token
2. Try accessing accept page with already-used token
3. Try rejecting an offer and verifying admin gets notified
4. Try sending a second offer after first was rejected

---

### Task 18: Final Commit & Deploy

- [ ] **Step 1: Verify build**

```bash
cd phonespot-next && npm run build
```

- [ ] **Step 2: Commit any remaining changes**

```bash
git add -A
git commit -m "feat(trade-in): complete trade-in and slutseddel system"
```

- [ ] **Step 3: Push and deploy**

```bash
git push origin feat/headless-nextjs
```

Vercel auto-deploys from the branch.
