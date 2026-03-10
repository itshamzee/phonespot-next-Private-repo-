# PhoneSpot Slagelse Store Integration — Design Document

**Date:** 2026-03-05
**Status:** Approved

## Goal

Integrate the PhoneSpot Slagelse physical store (VestsjællandsCentret 10, 4200 Slagelse) into the website with a dedicated store page, per-location inventory visibility, click & collect, and a full repair management admin panel backed by Supabase.

## Architecture Overview

Three workstreams:
1. **Store page & shared config** — centralize store data, build `/butik` page
2. **Inventory & pickup** — add `storeAvailability` from Shopify Storefront API to product pages
3. **Repair admin panel** — Supabase-backed repair ticket system with customer-facing form and admin dashboard

Tech stack: Next.js App Router, Shopify Storefront API (GraphQL), Supabase (Postgres + Auth), Resend (email).

---

## 1. Shared Store Config

### Problem
Store data (address, hours, phone) is hardcoded in 4+ files: `store-location.tsx`, `footer.tsx`, `kontakt/page.tsx`, `json-ld.tsx`. Changes require updating each file manually.

### Solution
Create `src/lib/store-config.ts` as single source of truth:

```typescript
export const STORE = {
  name: "PhoneSpot Slagelse",
  company: "PhoneSpot ApS",
  mall: "VestsjællandsCentret",
  street: "VestsjællandsCentret 10",
  city: "Slagelse",
  zip: "4200",
  country: "Danmark",
  countryCode: "DK",
  phone: "+45 XX XX XX XX", // Update when phone is set up
  email: "info@phonespot.dk",
  locationId: "90389381464", // Shopify location ID
  hours: {
    weekdays: "10:00 – 18:00",
    saturday: "10:00 – 16:00",
    sunday: "Lukket",
  },
  googleMapsUrl: "https://maps.google.com/?q=VestsjællandsCentret+10,+4200+Slagelse",
  googleMapsEmbed: "https://www.google.com/maps/embed?pb=!1m18!...", // Full embed URL
  coordinates: { lat: 55.4028, lng: 11.3531 }, // Approximate
};
```

### Files to refactor
- `src/components/ui/store-location.tsx` — import from config
- `src/components/layout/footer.tsx` — import from config
- `src/app/kontakt/page.tsx` — import from config
- `src/components/seo/json-ld.tsx` — import from config

---

## 2. Dedicated Store Page (`/butik`)

### URL
`/butik`

### Page sections (top to bottom)

1. **Hero** — "Besøg PhoneSpot Slagelse" heading, "VestsjællandsCentret" badge, short welcome text
2. **Google Maps embed** — interactive iframe, full width
3. **Info grid** — two cards side by side:
   - Left: Address with map pin icon
   - Right: Opening hours
4. **Services section** — 3 cards:
   - Reparation: "Få din enhed repareret samme dag" → links to `/reparation`
   - Personlig rådgivning: "Få hjælp til at vælge den rette refurbished enhed"
   - Afprøv produkter: "Se og prøv vores produkter før du køber"
5. **Photo gallery** — 3-4 placeholder images (swap for real store photos later)
6. **CTA section** — "Har du spørgsmål?" with link to `/kontakt` and phone number
7. **TrustBar** — existing component

### SEO
- LocalBusiness JSON-LD with full address, hours, geo coordinates
- Meta title: "PhoneSpot Slagelse — Besøg os i VestsjællandsCentret"
- Meta description: "Besøg PhoneSpot i VestsjællandsCentret, Slagelse. Reparation, personlig rådgivning og refurbished elektronik med 36 mdr. garanti."

### Navigation
- Add "Butik" to footer links (Service column)
- Compact StoreLocation badge in header can link to `/butik`

---

## 3. Store Availability on Product Pages

### Shopify Storefront API
Add `storeAvailability` field to the product variant GraphQL query:

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

### Product type update
Add to `ProductVariant` in `types.ts`:

```typescript
storeAvailability?: Array<{
  available: boolean;
  pickUpTime?: string;
  location: { id: string; name: string };
}>;
```

### UI — Store availability badge
On product pages, below the price or near the "Tilføj til kurv" button:

- **In stock:** Green badge — "På lager i Slagelse — Klar til afhentning i dag"
- **Not in stock:** Gray text — "Ikke tilgængelig i butikken — Bestil online med levering"

Uses the `pickUpTime` string from Shopify when available.

### Click & collect
Shopify's native local pickup handles this at checkout when the Slagelse location has "Local pickup" enabled in Shopify admin settings. No custom checkout code needed — it appears as a shipping option automatically.

**Prerequisite:** Enable "Local pickup" for the Slagelse location in Shopify Admin → Settings → Shipping and delivery → Local pickup.

---

## 4. Repair Admin Panel

### Customer-facing: Repair request form

Update `/reparation` page with a form:

**Fields:**
- Navn (name) — required
- Email — required
- Telefon (phone) — required
- Enhedstype (device type) — select: iPhone, iPad, Samsung, MacBook, Andet
- Model — text input (e.g., "iPhone 14 Pro")
- Beskrivelse af problem (issue description) — textarea, required
- Ønsket service — select: Skærmudskiftning, Batteri, Vandskade, Andet

**On submit:**
- Creates a row in Supabase `repair_tickets` table
- Sends confirmation email to customer via Resend
- Sends notification email to PhoneSpot staff

### Admin dashboard: `/admin/reparationer`

**Authentication:** Supabase Auth with email/password. Simple — one or two admin accounts.

**Views:**

#### Ticket list (main view)
- Table/card list of all repair tickets
- Filter by status: Modtaget → Tilbud sendt → Godkendt → I gang → Færdig → Afhentet
- Search by customer name, email, or device model
- Sort by date (newest first)
- Color-coded status badges

#### Ticket detail view
- Full customer info and device details
- **Quote creation:** Set price (DKK), estimated repair time (days), internal notes
- **Send quote:** Button sends email to customer with price + accept link
- **Status updates:** Move through pipeline with one click
- **Auto-emails:** Customer notified at each status change:
  - "Tilbud sendt" → email with quote details + accept/decline link
  - "Godkendt" → confirmation email
  - "Færdig" → "Din enhed er klar til afhentning" email
- **Repair history log:** Timeline of all status changes and notes

### Supabase schema

```sql
-- Repair tickets
CREATE TABLE repair_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  device_type TEXT NOT NULL,
  device_model TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  service_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'modtaget',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Repair quotes
CREATE TABLE repair_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES repair_tickets(id) ON DELETE CASCADE,
  price_dkk INTEGER NOT NULL,
  estimated_days INTEGER,
  notes TEXT,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Status change log
CREATE TABLE repair_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES repair_tickets(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Email templates (via Resend)

1. **Repair request confirmation** → sent to customer on submission
2. **New ticket notification** → sent to PhoneSpot staff
3. **Quote sent** → includes price, estimated time, accept/decline links
4. **Repair started** → "Vi er gået i gang med din reparation"
5. **Repair complete** → "Din enhed er klar til afhentning i VestsjællandsCentret"

---

## 5. Environment Variables (new)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Already exists
RESEND_API_KEY=xxx
```

---

## Files Overview

### New files
- `src/lib/store-config.ts` — shared store data
- `src/app/butik/page.tsx` — store landing page
- `src/lib/supabase/client.ts` — Supabase client
- `src/lib/supabase/types.ts` — database types
- `src/app/reparation/repair-form.tsx` — customer repair request form (client component)
- `src/app/api/repairs/route.ts` — API: create repair ticket
- `src/app/api/repairs/[id]/quote/route.ts` — API: send quote
- `src/app/api/repairs/[id]/status/route.ts` — API: update status
- `src/app/admin/reparationer/page.tsx` — admin ticket list
- `src/app/admin/reparationer/[id]/page.tsx` — admin ticket detail
- `src/app/admin/layout.tsx` — admin layout with auth guard
- `src/components/product/store-availability-badge.tsx` — inventory badge

### Modified files
- `src/components/ui/store-location.tsx` — use shared config
- `src/components/layout/footer.tsx` — use shared config, add Butik link
- `src/app/kontakt/page.tsx` — use shared config
- `src/components/seo/json-ld.tsx` — use shared config
- `src/lib/shopify/queries.ts` — add storeAvailability to product query
- `src/lib/shopify/types.ts` — add storeAvailability to variant type
- `src/app/reparation/page.tsx` — add repair request form
- Product page components — show store availability badge
