# Shopify Admin Replacement & Storefront Migration

**Date:** 2026-03-13
**Status:** Design
**Goal:** Replace all Shopify admin functionality and migrate storefront product pages to Supabase, enabling full cancellation of Shopify subscription.

---

## Context

PhoneSpot.dk currently runs a hybrid setup:
- **Custom platform (Supabase + Next.js + Stripe):** cart, checkout, orders, inventory, POS, warranty, repairs, GDPR, B2B, trade-in, feeds
- **Shopify:** product catalog pages, search, draft orders/invoicing, abandoned checkout recovery

The custom platform handles operations and commerce. Shopify is still needed for product data display and certain admin workflows. This spec covers everything needed to fully eliminate the Shopify dependency.

### Existing Schema Notes

The following columns **already exist** and must not be re-created:
- `product_templates`: `slug TEXT NOT NULL UNIQUE`, `description TEXT`, `images TEXT[]`
- `sku_products`: `description TEXT`, `category TEXT`, `images TEXT[]`, `is_active BOOLEAN`
- `orders`: `type TEXT CHECK ('online', 'pos')`

Where this spec adds new columns, they are truly new. Existing columns are migrated rather than duplicated.

---

## Phase A: Product Management Admin

### A1: Product Template Editor

**Page:** `/admin/platform/products`

Two-tab layout:

**Tab 1: Enheder (Device Templates)**

Manages `product_templates` — the model definitions (e.g. "iPhone 15 Pro Max 256GB").

**List view:**
- Table: thumbnail, model name, brand, category, storage options, status (published/draft), device count
- Filters: brand, category (iphone/smartphone/ipad/tablet/laptop/smartwatch/console), status
- Search by model name
- "Opret skabelon" (create template) button

**Create/Edit form:**
- Brand (dropdown from existing brands + add new)
- Model name, display name
- Category: iphone, smartphone, ipad, tablet, laptop, smartwatch, console, accessory, other
  (matches existing CHECK constraint, adding `console` if not present)
- Storage options (multi-select chips: 64GB, 128GB, 256GB, 512GB, 1TB)
- Color options (multi-select chips with color swatches)
- Base pricing per grade: A-pris, B-pris, C-pris (in DKK)
- Description (rich text — product highlights, what's included) — **exists, editable**
- SEO: meta title, meta description, URL slug — **slug exists, editable**
- Images: hero image + gallery (up to 8 images)
  - Upload to Supabase Storage bucket `product-images`
  - Drag to reorder
  - **Note:** existing `images TEXT[]` column stores URL strings. Keep as `TEXT[]`, no migration needed.
- Status: published / draft
- Specifications (key-value pairs): screen size, battery, processor, etc.

**Schema changes to `product_templates`:**
```sql
-- Only truly new columns (slug, description, images already exist as TEXT/TEXT[])
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS short_description text;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS specifications jsonb DEFAULT '{}';
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'published'));
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS base_price_a integer; -- øre
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS base_price_b integer;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS base_price_c integer;

-- Add 'console' to category CHECK if not present
ALTER TABLE product_templates DROP CONSTRAINT IF EXISTS product_templates_category_check;
ALTER TABLE product_templates ADD CONSTRAINT product_templates_category_check
  CHECK (category IN ('iphone', 'smartphone', 'ipad', 'tablet', 'smartwatch', 'laptop', 'console', 'accessory', 'other'));
```

**Tab 2: Tilbehør / SKU-produkter (Accessories)**

Manages `sku_products` — traditional inventory items with quantities.

**List view:**
- Table: thumbnail, title, category, price, total stock, status
- Filters: category (covers, screen protectors, chargers, audio, cables, outlet), status
- Search by title
- "Opret produkt" button

**Create/Edit form:**
- Title, short description, full description (rich text) — **description exists, editable**
- Category — **exists, editable**
- Price (sell price in DKK), cost price
- Images: up to 6 images (Supabase Storage) — **exists as TEXT[], keep as-is**
- Variants (optional): variant name (e.g. "Farve") + options (sort, hvid, blå)
  - Each variant can have its own price, SKU, image
- Compatible devices (link to product_templates — "Passer til iPhone 15 Pro Max")
- SEO: meta title, meta description, URL slug
- Status: published / draft — **migrates from `is_active` boolean**
- Barcode / SKU code

**Schema changes to `sku_products`:**
```sql
-- Only truly new columns (description, category, images already exist)
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS short_description text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]';
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS barcode text;

-- Migrate is_active → status (replaces boolean with richer state)
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'published'));
UPDATE sku_products SET status = CASE WHEN is_active THEN 'published' ELSE 'draft' END WHERE status IS NULL;
-- After verifying migration: ALTER TABLE sku_products DROP COLUMN is_active;

-- Compatible templates as join table (not uuid[] array)
CREATE TABLE IF NOT EXISTS sku_product_templates (
  sku_product_id uuid NOT NULL REFERENCES sku_products(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES product_templates(id) ON DELETE CASCADE,
  PRIMARY KEY (sku_product_id, template_id)
);
```

**Note:** `sku_product_templates` join table replaces the originally proposed `compatible_templates uuid[]` column. This enables proper foreign key constraints, cascade deletes, and efficient querying ("find all accessories for this template").

### A2: Image Upload System

**Supabase Storage setup:**
- Bucket: `product-images` (public read, authenticated write)
- Path structure: `templates/{template_id}/{filename}` and `sku/{sku_id}/{filename}`
- **No server-side image processing** — store originals and use `next/image` for on-the-fly optimization (avoids Vercel function size/memory limits with Sharp)
- Accepted formats: JPEG, PNG, WebP

**API routes:**
- `POST /api/platform/images/upload` — accepts multipart form data, stores in Supabase Storage, returns URL
- `DELETE /api/platform/images/[key]` — removes from storage

**Component:** `<ProductImageUploader>` — drag-and-drop zone, preview grid, reorder, delete

---

## Phase B: Orders Page Upgrade

### B1: Enhanced Orders List

**Page:** `/admin/platform/orders` (upgrade existing)

**Columns:**
| Column | Source |
|--------|--------|
| Ordre # | `orders.order_number` |
| Dato | `orders.created_at` |
| Kunde | `customers.name` |
| Betaling | `orders.payment_status` (pending/paid/refunded) |
| Fulfillment | `orders.fulfillment_status` (unfulfilled/fulfilled/shipped/delivered) |
| Total | `orders.total_amount` (formatted DKK) |
| Kanal | `orders.type` (online/pos/draft) |

**Filters bar:**
- Status tabs with counts: "Alle (45) · Ubehandlet (3) · Afsendt (12) · Refunderet (2)"
- Payment filter: all / paid / pending / refunded
- Channel: all / online / pos / draft
- Date range picker
- Search: order number, customer name, email

**Bulk actions:**
- Mark selected as fulfilled
- Export selected as CSV
- Print packing slips

**Schema changes to `orders`:**
```sql
-- Payment status: separate from order lifecycle status
-- Rules: status tracks lifecycle (confirmed→shipped→delivered),
-- payment_status tracks money (paid→partially_refunded→refunded)
-- When payment_status = 'partially_refunded', status stays as-is (confirmed/shipped/delivered)
-- When payment_status = 'refunded', status = 'refunded'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'paid', 'refunded', 'partially_refunded'));

-- Fulfillment: tracks physical shipping only (separate from order status)
-- Updated by: mark-as-shipped action, tracking webhook, manual admin action
-- order.status 'shipped'/'delivered' should be kept in sync with fulfillment_status
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_status text DEFAULT 'unfulfilled'
  CHECK (fulfillment_status IN ('unfulfilled', 'processing', 'shipped', 'delivered', 'returned'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes text;

-- Expand existing 'type' column to include 'draft' (instead of adding duplicate 'channel' column)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_type_check CHECK (type IN ('online', 'pos', 'draft'));
```

### B2: Enhanced Order Detail

**Page:** `/admin/platform/orders/[id]` (upgrade existing)

**Layout — 2-column:**

**Left column (wide):**
- Order items card: image, title, variant, quantity, unit price, line total
- Fulfillment card:
  - Status badge (unfulfilled → processing → shipped → delivered)
  - "Marker som afsendt" button → opens modal: carrier, tracking number
  - When shipped: shows tracking link, "Send forsendelsesmail" button
  - "Marker som leveret" button
- Payment card:
  - Status badge, Stripe payment ID (linked to Stripe dashboard)
  - Refund button (already built) with partial refund option
- Timeline: chronological activity log (order created → payment received → shipped → etc.)

**Right column (narrow):**
- Customer card: name, email, phone, link to customer profile
- Shipping address card
- Billing address card
- Internal notes (editable textarea, saves on blur)
- Order metadata: channel, created at, updated at

**Actions dropdown:**
- Print faktura (invoice PDF)
- Print pakkelabel (packing slip)
- Send ordrebekræftelse igen
- Annuller ordre

---

## Phase C: Draft Orders / Invoices

### C1: Draft Orders System

**New table: `draft_orders`**
```sql
CREATE TABLE draft_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_number text UNIQUE NOT NULL, -- D1001, D1002...
  customer_id uuid REFERENCES customers(id),
  customer_email text,
  customer_name text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'converting', 'cancelled')),
  -- 'converting' prevents double-click race conditions during payment processing
  line_items jsonb NOT NULL DEFAULT '[]',
  -- line_items: [{ type: 'device'|'sku'|'custom', id?, title, quantity, unit_price, tax_rate }]
  subtotal integer NOT NULL DEFAULT 0, -- øre
  discount_amount integer DEFAULT 0,
  shipping_cost integer DEFAULT 0,
  tax_amount integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  currency text DEFAULT 'DKK',
  internal_note text,
  customer_note text,
  payment_url text, -- Stripe checkout session URL
  stripe_session_id text,
  paid_at timestamptz,
  converted_order_id uuid REFERENCES orders(id),
  -- Repair ticket link (replaces shopify_draft_order_id on repair_tickets)
  repair_ticket_id uuid REFERENCES repair_tickets(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### C2: Draft Orders Admin Pages

**List page: `/admin/platform/draft-orders`**
- Table: Draft #, Date, Customer, Status, Total
- Filters: status tabs (draft/sent/paid/cancelled)
- "Opret kladdeordre" button

**Create/Edit page: `/admin/platform/draft-orders/new` and `/admin/platform/draft-orders/[id]`**

**Form layout:**
- **Customer section:** search existing customer or create new (name, email, phone)
- **Line items section:**
  - "Tilføj enhed" — search devices by barcode/model, adds with brugtmoms pricing
  - "Tilføj produkt" — search SKU products, add with quantity
  - "Tilføj brugerdefineret" — free text title + price (for repairs, services, custom work)
  - Each line: title, quantity, unit price (editable), tax rate, line total
  - Drag to reorder, delete button
- **Summary section:**
  - Subtotal, discount (manual amount or percentage), shipping, tax breakdown, total
- **Notes:** internal note (not shown to customer), customer note (shown on invoice)

**Actions:**
- **Gem kladde** — saves without sending
- **Send faktura** — creates Stripe Checkout Session with `mode: 'payment'` and `metadata: { draft_order_id }`, emails customer a payment link with invoice summary
- **Marker som betalt** — for cash/transfer payments, converts to order (with idempotency check)
- **Annuller** — sets status to cancelled

### C3: Invoice Email Template

Email sent when "Send faktura" is clicked:
- From: `ordre@phonespot.dk`
- Subject: `Faktura ${draftNumber} fra PhoneSpot`
- Body: line items table, total, customer note, "Betal nu" button (links to Stripe)

### C4: Draft → Order Conversion

**Idempotency:** Before converting, verify `draft_orders.converted_order_id IS NULL` AND `status != 'converting'`. Set `status = 'converting'` atomically before starting.

When a draft order is paid (via Stripe webhook or manual):
1. Set draft status to `'converting'` (prevents double execution)
2. Create entry in `orders` table with `type: 'draft'`
3. Create `order_items` for each line item
4. Update device status to 'sold' if device items
5. Decrement SKU stock if SKU items
6. Generate warranty if applicable
7. Set `draft_orders.converted_order_id` = new order ID
8. Set `draft_orders.status` = 'paid', `paid_at` = now()
9. If `repair_ticket_id` is set, update repair ticket payment status
10. Log to `activity_log`

If any step fails after step 1, set status back to `'sent'` and log the error.

### C5: Stripe Webhook Integration

The existing `checkout.session.completed` webhook handler at `src/lib/stripe/webhook.ts` must be extended:

```
If session.metadata.draft_order_id exists:
  → Run draft order conversion (C4)
Else if session.metadata.order_id exists:
  → Run existing order confirmation flow
```

This way both regular checkouts and draft order payments use the same webhook endpoint.

### C6: Repair Invoicing Migration

Replace Shopify draft order usage in repair system:
- `src/app/api/repairs/checkout/route.ts` — change from `createDraftOrder()` (Shopify) to creating a `draft_orders` row + Stripe session
- `src/app/api/intake/route.ts` — same change
- `repair_tickets` table: add `draft_order_id uuid REFERENCES draft_orders(id)`, deprecate `shopify_draft_order_id`
- Remove Shopify admin client dependency from repair flows

---

## Phase D: Abandoned Checkout Recovery

### D1: Tracking Abandoned Checkouts

**Scope:** We track abandoned checkouts at the order level — meaning the customer got far enough to create an order (entered email + started checkout). Pre-email abandonments (just browsing) are not tracked.

**Schema changes to `orders`:**
```sql
-- Add 'abandoned' to the orders status CHECK constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'shipped', 'picked_up', 'delivered', 'cancelled', 'refunded', 'abandoned'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS abandoned_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recovery_status text DEFAULT 'none'
  CHECK (recovery_status IN ('none', 'email_sent', 'sms_sent', 'both_sent', 'recovered'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recovery_token text UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recovery_email_sent_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recovery_sms_sent_at timestamptz;
```

**Modification to reservation release cron (`/api/cron/release-reservations`):**
Instead of just releasing expired reservations:
1. Set `orders.status` = 'abandoned'
2. Set `orders.abandoned_at` = now()
3. Generate `recovery_token` (random 32-byte hex)
4. Release device reservations
5. Recovery cron (D7) handles sending emails/SMS on schedule

### D2: Recovery Email

**Template:** "Du glemte noget i din kurv"
- Shows product images and names from the abandoned cart
- "Gennemfør dit køb" button → `/checkout/recover/[token]`
- Sent 1 hour after abandonment (via recovery cron)

### D3: Recovery SMS

**Via GatewayAPI.com:**
- Text: "Hej {name}, du har varer i din kurv hos PhoneSpot. Gennemfør dit køb her: {url} — PhoneSpot"
- Sent 3 hours after abandonment (only if email hasn't recovered)
- Max 160 chars per SMS
- **Requires marketing consent** — only send if customer has `marketing_consent = true` in customers table

### D4: Recovery Page

**Page:** `/checkout/recover/[token]`
- Looks up order by `recovery_token`
- Checks if items are still available (devices not sold, SKUs in stock)
- If available: calls `/api/checkout/session` directly to create a new checkout with re-reserved devices (atomic reservation, no race condition)
- If partially available: shows which items are still in stock, lets customer proceed with available items
- If fully unavailable: shows "Desværre er varerne udsolgt" with link to similar products
- If already recovered: shows "Denne ordre er allerede gennemført"
- On successful payment: set `recovery_status = 'recovered'` on original abandoned order

### D5: Admin Page

**Page:** `/admin/platform/abandoned-checkouts`
- Table: Date, Customer, Email, Phone, Items, Total, Recovery status, Recovered?
- Filters: status (not sent / email sent / SMS sent / recovered)
- Actions per row:
  - "Send recovery email" (manual trigger)
  - "Send recovery SMS" (manual trigger)
  - View cart contents

### D6: GatewayAPI Integration

**Library:** `src/lib/sms/gateway-api.ts`

```typescript
interface SendSmsParams {
  to: string;       // Danish phone number (+45...)
  message: string;
  sender?: string;  // Default: "PhoneSpot"
}
```

**API:** `POST https://gatewayapi.com/rest/mtsms`
- Auth: Bearer token (`GATEWAYAPI_TOKEN`)
- Payload: `{ sender, recipients: [{ msisdn }], message }`

**Env vars needed:**
```
GATEWAYAPI_TOKEN=your_token_here
SMS_SENDER_NAME=PhoneSpot
```

### D7: Automated Recovery Cron

**Route:** `POST /api/cron/recovery`
- Runs every 30 minutes (Vercel cron)
- Finds abandoned orders where:
  - `abandoned_at` > 1 hour ago AND `recovery_email_sent_at` IS NULL → send email
  - `abandoned_at` > 3 hours ago AND `recovery_sms_sent_at` IS NULL AND has phone AND `marketing_consent = true` → send SMS
- Updates `recovery_status` and timestamps
- Max 1 email + 1 SMS per abandoned checkout (no spam)
- **Per-customer throttle:** max 1 recovery email per 24 hours per email address (prevents spam from multiple abandoned carts)

---

## Phase E: Storefront Migration (PhoneHero-style)

### E1: Remove Shopify Dependency

All product pages switch from `getCollectionProducts()` (Shopify) to Supabase queries.

**Product listing pages** (`/iphones`, `/ipads`, `/smartphones`, etc.):
- Query `product_templates` WHERE `status = 'published'` AND `category = X`
- Join `devices` to get available units count and lowest price per template
- Group by template, show: image, model name, "fra X kr", available count

**Product detail page** (`/refurbished/[slug]`):
- Query `product_templates` by slug
- Query `devices` WHERE `template_id = X` AND `status = 'available'`
- Group by grade/storage/color for variant selection
- Each device is a unique unit with its own price

**Accessories pages** (`/tilbehoer`, `/tilbehoer/[category]`, `/tilbehoer/[category]/[device]`):
- Query `sku_products` WHERE `status = 'published'`
- Filter by category, join `sku_product_templates` for device compatibility
- Show stock availability from `sku_stock`

**Search** (`/api/search`):
- Replace Shopify search with Supabase full-text search
- Requires search vector setup:
```sql
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_product_templates_search ON product_templates USING GIN(search_vector);

-- Trigger to keep search_vector updated
CREATE OR REPLACE FUNCTION update_product_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('danish', coalesce(NEW.display_name, '') || ' ' || coalesce(NEW.brand, '') || ' ' || coalesce(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_templates_search_update
  BEFORE INSERT OR UPDATE ON product_templates
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- Same for sku_products
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_sku_products_search ON sku_products USING GIN(search_vector);
```

### E2: PhoneHero-style Category Pages

**Design inspiration from PhoneHero.dk:**

**Hero banner:**
- Full-width gradient background with category title
- Subtitle with product count ("23 iPhones på lager")
- Optional promotional text

**Sidebar filters (desktop — collapsible on mobile):**
- Brand (Apple, Samsung, etc.)
- Model series (iPhone 16, iPhone 15, etc.)
- Storage (64GB, 128GB, 256GB, etc.)
- Grade (A, B, C) with tooltip explanations
- Price range slider
- Color
- "På lager" toggle (default on)

**Product grid:**
- Cards: product image, model name, "fra X kr" price, grade badge, stock count badge
- Sort: price low→high, price high→low, newest, popularity
- Responsive: 2 cols mobile, 3 cols tablet, 4 cols desktop

**Brand logos bar:**
- Row of brand logos at top (Apple, Samsung, Huawei, etc.)
- Click to filter by brand

### E3: PhoneHero-style Product Detail Page

**Image gallery (left):**
- Large hero image with zoom on hover
- Thumbnail strip below (click to switch)
- If no product photos: show grade-specific placeholder

**Product info (right):**
- Model name + short description
- Grade selector: A / B / C with price for each
  - Tooltip explaining what each grade means
  - "A-grade: Næsten ny, minimale brugsspor"
- Storage selector: chips for each option with price adjustment
- Color selector: swatches
- Available units count: "3 på lager"
- Price (large, prominent): "2.499 kr"
  - Strikethrough original price if discounted
  - "Spar X kr vs. ny" comparison
- "Læg i kurv" button (green, full width)
- Trust badges: 2 års garanti, 14 dages returret, gratis fragt over 500 kr

**Below the fold:**
- Specifications table (from `specifications` jsonb)
- Description (from `description` field)
- "Hvad betyder grade A/B/C?" expandable section
- Compatible accessories (from `sku_product_templates` join)
- "Andre kunder kiggede også på" (similar models)

### E4: Accessory Pages Redesign

**Category page (`/tilbehoer/[category]`):**
- Grid of SKU products
- Filter by compatible device ("Vis tilbehør til iPhone 15 Pro Max")
- Sort by price, popularity

**Product detail (`/tilbehoer/[category]/[slug]`):**
- Image gallery
- Title, description
- Variant selector (if variants exist — color, size)
- Price, stock status
- "Læg i kurv" button
- Compatible devices list

### E5: Shopify Order History Export

One-time migration script to preserve historical data:
- Pull all orders from Shopify Admin API (paginated)
- Insert into `orders` table with `type: 'shopify'` (add to CHECK constraint)
- Map Shopify customer data to `customers` table (deduplicate by email)
- Store Shopify order ID in `shopify_order_id` column for reference
- This ensures warranty lookups, return requests, and accounting can reference historical orders

---

## Migration Checklist

Before cancelling Shopify:
- [ ] All product_templates have images, descriptions, prices, slugs
- [ ] All sku_products have images, descriptions, prices, slugs
- [ ] Category pages render from Supabase
- [ ] Product detail pages render from Supabase
- [ ] Search works from Supabase (full-text with Danish stemming)
- [ ] Draft orders work without Shopify
- [ ] Repair invoicing uses draft orders (not Shopify)
- [ ] Abandoned checkout recovery is active (email + SMS)
- [ ] Shopify order history exported to Supabase
- [ ] DNS/domain is pointed to Vercel (not Shopify)
- [ ] Product feeds (Google, PriceRunner) updated to use new columns
- [ ] Email sending verified (Resend + phonespot.dk domain)
- [ ] SMS sending verified (GatewayAPI)
- [ ] Shopify webhook endpoints removed or disabled
- [ ] Shopify admin client (`admin-client.ts`) imports removed

---

## Implementation Order

1. **Phase A** — Product Management (foundation, everything depends on this)
2. **Phase B** — Orders Page Upgrade (immediate admin improvement)
3. **Phase C** — Draft Orders (replaces Shopify drafts + repair invoicing)
4. **Phase D** — Abandoned Checkout Recovery (new capability)
5. **Phase E** — Storefront Migration (final step to cut Shopify)

---

## Env Vars Required

```env
# Already configured
RESEND_API_KEY=re_xxxxx
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
STRIPE_SECRET_KEY=sk_xxx

# New — need to add
GATEWAYAPI_TOKEN=xxx
SMS_SENDER_NAME=PhoneSpot
STRIPE_WEBHOOK_SECRET=whsec_xxx  # if not already set

# Resend setup steps:
# 1. Go to resend.com/domains → add phonespot.dk
# 2. Add DNS records (MX, TXT/SPF, CNAME/DKIM) to your domain
# 3. Verify domain in Resend dashboard
# 4. Replace placeholder API key with real one

# GatewayAPI setup steps:
# 1. Create account at gatewayapi.com
# 2. Buy SMS credits (~500 kr for ~2600 SMS)
# 3. Create API token in Settings → API Keys
# 4. Add token to env
```
