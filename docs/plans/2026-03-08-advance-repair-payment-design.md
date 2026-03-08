# Advance Repair Payment Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow customers to pay for repair services online in advance via Shopify Draft Orders, with Klarna, card, and MobilePay support.

**Architecture:** Extend the existing BookingWizard with two new steps (date picker + confirm & pay). Payment creates a Shopify Draft Order via Admin API, redirects to Shopify hosted checkout. A webhook confirms payment and updates the Supabase ticket.

**Tech Stack:** Next.js App Router, Shopify Admin API (Draft Orders), Supabase, Tailwind CSS v4

---

## Context

PhoneSpot is a Danish phone repair shop. The current booking flow at `/reparation/booking` uses a 4-step wizard (Device, Services, Details, Confirm) that creates a repair ticket in Supabase with no payment. This feature adds online advance payment as a competitive differentiator — most Danish repair shops don't offer this.

## Flow

The wizard expands from 4 steps to 5:

1. **Enhed** — Select brand and model (existing)
2. **Reparation** — Select services, see prices and discounts (existing)
3. **Detaljer** — Customer name, email, phone, problem description (existing)
4. **Dato** (NEW) — Pick a preferred drop-off date
5. **Bekraeft & Betal** (NEW) — Summary with two CTAs: "Betal nu" or "Betal i butikken"

## Step 4: Dato

- Date picker component (weekdays Mon-Sat only)
- Minimum date: tomorrow (next business day)
- Maximum date: 14 days ahead
- Info text below picker: "Bemaerk: Nogle reservedele har vi ikke paa lager, men vi har dag-til-dag levering og kan have dem klar til naeste dag. Vi kontakter dig hvis din valgte dato skal justeres."

## Step 5: Bekraeft & Betal

- Full order summary: device, services, discount, total, customer info, chosen date
- Two action buttons:
  - **"Betal nu"** (primary, green) — Creates Draft Order, redirects to Shopify checkout
  - **"Betal i butikken"** (secondary, outlined) — Creates ticket without payment (current behavior)
- Trust signals: Klarna logo, card icons, MobilePay, "Sikker betaling"

## API Routes

### POST /api/repairs/checkout

**Input:** Same as current `/api/repairs` plus `preferred_date`.

**Process:**
1. Create repair ticket in Supabase (status: `modtaget`, `paid: false`)
2. Create Shopify Draft Order via Admin API:
   - Custom line items from selected services (name + price)
   - Customer email for receipt
   - Note with ticket ID reference
3. Store `shopify_draft_order_id` on the ticket
4. Return `{ invoiceUrl, ticketId }`

**Frontend** redirects to `invoiceUrl` (Shopify hosted checkout with Klarna, cards, MobilePay).

### POST /api/webhooks/shopify-orders

**Trigger:** Shopify `orders/paid` webhook.

**Process:**
1. Verify Shopify webhook HMAC signature
2. Extract `draft_order_id` from the order
3. Find matching repair ticket in Supabase
4. Update ticket: `paid = true`, `paid_at = now()`, `shopify_order_id = order.id`
5. Return 200

### Shopify Draft Order checkout redirect

After payment, Shopify redirects to a configurable URL. We set this to `/reparation/bekraeftelse?ticket={id}`.

## Confirmation Page

**Route:** `/reparation/bekraeftelse`

Shows:
- Success icon and "Tak! Din reparation er betalt"
- Ticket ID (first 8 chars)
- Selected services list
- Preferred drop-off date
- Total paid amount
- "Vi kontakter dig inden din valgte dato for at bekraefte"
- Trust signals (livstidsgaranti, etc.)

## Database

No schema changes needed. Existing columns on `repair_tickets`:
- `paid` (boolean)
- `paid_at` (timestamptz)
- `shopify_draft_order_id` (text)
- `shopify_order_id` (text)
- `booking_details` (jsonb) — stores `preferred_date` here

## Admin Side

No new admin pages. Existing ticket detail page already shows paid status. The preferred drop-off date is visible in `booking_details`.

## Payment Methods

Shopify Draft Order checkout automatically uses whatever payment methods are enabled in the Shopify store settings. Currently expected: Klarna, Visa/Mastercard, MobilePay.

## Edge Cases

- **Customer abandons Shopify checkout:** Ticket exists in Supabase with `paid: false`. Admin can see it and follow up, or it stays as an unpaid booking request.
- **Webhook fails:** Retry logic built into Shopify (automatic retries for 48h). Ticket stays `paid: false` until webhook succeeds.
- **Parts not in stock:** Info text on date step sets expectation. Admin contacts customer to adjust date if needed.
- **Refunds:** Handled through Shopify admin (standard Shopify refund flow).
