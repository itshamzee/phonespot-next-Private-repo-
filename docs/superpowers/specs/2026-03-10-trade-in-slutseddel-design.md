# PhoneSpot Trade-In & Slutseddel System — Design Spec

## Overview

A complete device buyback system for PhoneSpot. Customers submit their used devices via the existing sell-device wizard. Admin reviews, sends price offers via email. Customers accept digitally (token-based link), provide bank details and address. Upon receiving the device, admin creates a slutseddel (bill of sale) compliant with Danish brugtmomsordning. PDF generated and sent to both parties.

## Business Context

- **Buyer entity**: Phonego ApS, CVR 38688766, ha@phonespot.dk
- **Store locations**: Slagelse (Vestsjællandscentret 10A, 103, 4200 Slagelse), Vejle (opening April 2026)
- **Delivery methods**: Free shipping label or in-store drop-off
- **Pricing**: Manual admin valuation (no automatic estimates)
- **Legal**: Brugtmomsordning (momslovens §70), sequential receipt numbers

## Architecture Decision

**Approach: Extend existing `contact_inquiries` system.** Sell-device submissions already land in `contact_inquiries` with `source: "saelg-enhed"` and structured metadata. New tables for offers, receipts, and receipt items are additive. Reuses existing Resend email, Gateway API SMS, inquiry_messages, and mail_log infrastructure.

---

## 1. Database Schema

### 1.1 `trade_in_offers`

Tracks price offers sent to customers.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK (gen_random_uuid) | |
| inquiry_id | uuid FK → contact_inquiries | The sell-device inquiry |
| offer_amount | integer NOT NULL | Price in Danish ore (1600 kr = 160000) |
| status | text NOT NULL DEFAULT 'pending' | pending, accepted, rejected, expired |
| token | uuid NOT NULL UNIQUE (gen_random_uuid) | Unique token for accept/reject link |
| token_expires_at | timestamptz NOT NULL | Token expiry (7 days from creation) |
| admin_note | text | Internal note about pricing rationale |
| customer_response_note | text | Customer's note when rejecting |
| responded_at | timestamptz | When the customer responded |
| seller_name | text | Customer name (from accept form) |
| seller_address | text | Customer address (from accept form) |
| seller_postal_city | text | Customer postal + city (from accept form) |
| seller_bank_reg | text | Bank reg number (from accept form) |
| seller_bank_account | text | Bank account number (from accept form) |
| created_by | text | Admin who created the offer |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

**Indexes:** inquiry_id, token, status

**Note:** Customer details (address, bank) are stored directly on the accepted offer. When creating a receipt, these fields are copied to the receipt. This avoids ambiguity about where accept-flow data lives.

### 1.2 `trade_in_receipts`

The slutseddel (bill of sale).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK (gen_random_uuid) | |
| receipt_number | text UNIQUE NOT NULL | SS-2026-0001 format |
| inquiry_id | uuid FK → contact_inquiries | |
| offer_id | uuid FK → trade_in_offers | The accepted offer |
| store_location_id | uuid FK → store_locations | Which store handled it |
| seller_name | text NOT NULL | Customer's full name |
| seller_address | text | |
| seller_postal_city | text | |
| seller_phone | text | |
| seller_email | text | |
| seller_bank_reg | text | Bank registration number |
| seller_bank_account | text | Bank account number |
| buyer_company | text NOT NULL DEFAULT 'Phonego ApS' | |
| buyer_cvr | text NOT NULL DEFAULT '38688766' | |
| buyer_address | text | Auto-filled from store location |
| buyer_postal_city | text | |
| buyer_email | text NOT NULL DEFAULT 'ha@phonespot.dk' | |
| buyer_phone | text | |
| total_amount | integer NOT NULL | Total price in ore |
| status | text NOT NULL DEFAULT 'draft' | draft, confirmed, paid, completed |
| staff_initials | text | Employee who processed it |
| pdf_url | text | URL to generated PDF in Supabase Storage |
| confirmed_at | timestamptz | |
| delivery_method | text | 'shipping' or 'in_store' (from inquiry metadata) |
| paid_at | timestamptz | |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

**Indexes:** receipt_number, inquiry_id, offer_id, status

**Note:** `total_amount` is always computed from the sum of `trade_in_receipt_items.price` at save/confirm time. Application logic enforces this — no independent editing of total.

### 1.3 `trade_in_receipt_items`

Individual devices on a receipt. Supports multiple devices per slutseddel.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK (gen_random_uuid) | |
| receipt_id | uuid FK → trade_in_receipts ON DELETE CASCADE | |
| imei_serial | text | IMEI or serial number |
| brand | text NOT NULL | Manufacturer |
| model | text NOT NULL | Model name |
| storage | text | Storage capacity |
| ram | text | RAM (nullable, mainly for laptops) |
| condition_grade | text | Perfekt, God, Acceptabel, Defekt |
| color | text | Device color (optional) |
| condition_notes | text | Free-text notes about condition |
| price | integer NOT NULL | Price for this device in ore (CHECK > 0) |
| created_at | timestamptz DEFAULT now() | |
| updated_at | timestamptz DEFAULT now() | |

**Indexes:** receipt_id

**Note on condition_grade:** Admin manually assigns a single grade (Perfekt/God/Acceptabel/Defekt) based on the granular wizard data (screen, back, battery, broken parts). The wizard condition details are available in the inquiry metadata for reference.

### 1.4 Receipt Number Sequence

```sql
-- Per-year counter table instead of global sequence
CREATE TABLE trade_in_receipt_counters (
  year integer PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);

-- Function to generate SS-YYYY-NNNN format, resets each year
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS text AS $$
DECLARE
  current_year integer;
  next_num integer;
BEGIN
  current_year := extract(year from now())::integer;

  INSERT INTO trade_in_receipt_counters (year, last_number)
  VALUES (current_year, 1)
  ON CONFLICT (year) DO UPDATE SET last_number = trade_in_receipt_counters.last_number + 1
  RETURNING last_number INTO next_num;

  RETURN 'SS-' || current_year || '-' || lpad(next_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql;
```

### 1.5 RLS Policies

All new tables: RLS enabled. Authenticated users get full CRUD (same pattern as existing tables). Public access only via token-based API routes (offer accept/reject).

---

## 2. Customer Accept Flow

### 2.1 Flow

1. Admin sends offer → email with two buttons sent via Resend
2. "Accepter tilbud" → `GET /saelg-din-enhed/accepter?token=<uuid>`
3. Page validates token (not expired, status still pending)
4. Shows offer summary + form fields:
   - Full name (pre-filled from inquiry)
   - Address + postal/city
   - Phone (pre-filled)
   - Email (pre-filled)
   - Bank reg.nr + account number
   - Checkbox: ownership confirmation
5. Submit → `POST /api/trade-in/accept`
   - Updates offer status to `accepted`
   - Stores customer address + bank details on the offer record (seller_* fields)
   - Sends confirmation email to customer
   - Notifies admin via email
6. Confirmation page with next steps based on delivery method

### 2.2 Reject Flow

1. "Afvis tilbud" → `GET /saelg-din-enhed/afvis?token=<uuid>`
2. Shows simple page: "Tilbud afvist" + optional comment textarea
3. Submit → `POST /api/trade-in/reject`
   - Updates offer status to `rejected`
   - Stores customer_response_note
   - Notifies admin who can send new offer or close

### 2.3 Token Security

- UUID v4, cryptographically random
- Expires after 7 days
- Single-use: cannot be reused after accept/reject
- No authentication required (token IS the auth)
- Rate-limited: max 5 attempts per token per hour

### 2.4 Error States (Customer-Facing)

When a token is invalid, expired, or already used, the accept/reject pages show a friendly error:

- **Expired token**: "Dit tilbud er desværre udløbet. Kontakt os på ha@phonespot.dk eller ring til os, så sender vi et nyt tilbud."
- **Already accepted**: "Du har allerede accepteret dette tilbud. Tjek din email for bekræftelse."
- **Already rejected**: "Du har allerede afvist dette tilbud. Kontakt os hvis du har ændret mening."
- **Invalid token**: "Ugyldigt link. Kontakt os på ha@phonespot.dk for hjælp."

### 2.5 Multiple Offers Per Inquiry

- Creating a new offer automatically expires any existing `pending` offers for the same inquiry
- Only one offer can be `pending` at a time per inquiry
- Offer history is preserved — admin and customer can see all previous offers
- Expired offers show as "Udløbet" in the admin offer history

### 2.6 Offer Email Template

```
Subject: Dit tilbud fra PhoneSpot — [amount] kr. for din [model]

Hej [name],

Tak for din henvendelse. Vi har vurderet din [device_type]:
  - [brand] [model] — [storage]
  - Stand: [condition_summary]

Vores tilbud: [amount] kr.

[ACCEPTÉR TILBUD]  (green button)
[AFVIS TILBUD]     (gray text link)

Tilbuddet er gyldigt i 7 dage.

Med venlig hilsen,
PhoneSpot
```

---

## 3. Admin Panel

### 3.1 Routes

- `/admin/opkoeb` — List all trade-in inquiries
- `/admin/opkoeb/[id]` — Single inquiry detail + offer management
- `/admin/opkoeb/[id]/slutseddel` — Receipt editor

### 3.2 List View (`/admin/opkoeb`)

Table showing all `contact_inquiries` where `source = 'saelg-enhed'`:

| Column | Source |
|--------|--------|
| Kunde | inquiry name |
| Enhed | metadata.device.brand + model |
| Stand | metadata.condition summary |
| Levering | metadata.deliveryMethod |
| Tilbud | Latest offer amount or "—" |
| Status | Derived from inquiry + offer status |
| Dato | inquiry created_at |

**Statuses (derived):**
- `Ny` (blue) — no offers sent
- `Tilbud sendt` (yellow) — pending offer exists
- `Accepteret` (green) — offer accepted
- `Afvist` (red) — offer rejected, can re-offer
- `Modtaget` (purple) — device received, receipt in draft
- `Betalt` (dark green) — receipt confirmed and paid
- `Lukket` (gray) — case closed

**Filters:** Status, date range, delivery method, device type

### 3.3 Detail View (`/admin/opkoeb/[id]`)

**Left column — Device info from metadata:**
- Device type, brand, model, storage, RAM
- Screen, back, battery condition
- Broken parts, cloud lock status
- Delivery method + preferred store

**Right column — Actions:**
1. **Send tilbud** — Amount input + internal note → creates offer, sends email
2. **Offer history** — Table of all offers with status, amount, date
3. **Opret slutseddel** button — Only visible after accepted offer. Pre-fills receipt editor.

**Below — Message thread** using existing `inquiry_messages` system.

### 3.4 Receipt Editor (`/admin/opkoeb/[id]/slutseddel`)

Form auto-filled from inquiry + accepted offer + customer accept data:

**Auto-filled (seller/customer):**
- Name, address, postal/city, phone, email, bank reg+account

**Auto-filled (buyer/PhoneSpot):**
- Phonego ApS, CVR 38688766, ha@phonespot.dk
- Store address from selected location

**Auto-filled (device from metadata):**
- Brand, model, storage, RAM, condition grade

**Admin fills in:**
- IMEI/serial number
- Adjusted price per item (if different from offer)
- Staff initials
- Can add more devices via "+1 enhed" button

**Actions:**
- "Gem kladde" — saves without finalizing
- "Bekræft og generer PDF" — locks receipt, generates PDF, sends to both parties
- "Registrer betaling" — marks as paid with timestamp

---

## 4. Slutseddel PDF

### 4.1 Layout (A4)

Generated with `@react-pdf/renderer`.

**Header:**
- PhoneSpot logo (left)
- "SLUTSEDDEL" title (right, Barlow Condensed bold)
- Receipt number: SS-2026-0001
- Date: 10. marts 2026

**Two-column party info:**

| Køber | Sælger |
|-------|--------|
| Phonego ApS | [Customer name] |
| CVR: 38688766 | [Address] |
| [Store address] | [Postal + city] |
| [Store postal/city] | [Phone] |
| ha@phonespot.dk | [Email] |

**Device table:**

| # | IMEI/Serienr. | Fabrikant | Model | Lagerplads | Stand | Pris |
|---|---------------|-----------|-------|------------|-------|------|
| 1 | 353456789012345 | Apple | iPhone 14 Pro | 128GB | God | 4.500,00 kr |

**Total: 4.500,00 kr**

**Seller bank details:**
- Reg.nr: [xxxx]
- Kontonr: [xxxxxxxxxx]

**Legal footer:**
- "Sælger bekræfter at ovenstående enhed(er) er sælgers ejendom og ikke er stjålet eller pansat."
- "Køb sker i henhold til brugtmomsordningen jf. momslovens §70."
- Signature line (for in-store use), or "Digital bekræftelse modtaget [dato]" for shipped devices
- Staff initials

### 4.2 Storage & Delivery

- PDF rendered server-side via API route
- Stored in Supabase Storage bucket `slutsedler`
- URL saved to `trade_in_receipts.pdf_url`
- Sent as attachment via Resend to both customer email and ha@phonespot.dk

---

## 5. API Routes

### New routes:

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/trade-in/offers?inquiry_id=` | List offers for an inquiry |
| POST | `/api/trade-in/offers` | Create and send offer (admin) |
| POST | `/api/trade-in/accept` | Customer accepts offer (token-based) |
| POST | `/api/trade-in/reject` | Customer rejects offer (token-based) |
| GET | `/api/trade-in/offer-status?token=` | Validate token and get offer details (public) |
| GET | `/api/trade-in/receipts?inquiry_id=` | List receipts for an inquiry |
| POST | `/api/trade-in/receipts` | Create receipt draft (admin) |
| PATCH | `/api/trade-in/receipts/[id]` | Update receipt (admin) |
| POST | `/api/trade-in/receipts/[id]/confirm` | Confirm receipt + generate PDF (admin) |
| POST | `/api/trade-in/receipts/[id]/pay` | Mark as paid (admin) |
| DELETE | `/api/trade-in/receipts/[id]` | Delete draft receipt (only if status=draft) |
| GET | `/api/trade-in/receipts/[id]/pdf` | Generate/download PDF |

### Authentication:
- Admin routes: Require Supabase auth (same as existing admin routes)
- Accept/reject routes: Token-based (public, no auth)
- Offer-status route: Token-based (public, read-only)

---

## 6. Customer-Facing Pages

### New pages:

| Route | Purpose |
|-------|---------|
| `/saelg-din-enhed/accepter` | Accept offer form (token query param) |
| `/saelg-din-enhed/afvis` | Reject offer form (token query param) |

Both are public pages, no auth required. Token validates access.

---

## 7. What's NOT Included (Intentionally)

- **Automatic price estimation** — manual for now
- **Shipping label integration** — handled manually
- **Customer accounts/login** — token-based only
- **Automatic bank transfers** — manual process
- **CPR number collection** — not required per business decision
- **SMS notifications** — email only for now (SMS can be added later)

---

## 8. Tech Stack Summary

| Component | Technology |
|-----------|-----------|
| Database | Supabase (PostgreSQL) |
| Email | Resend (existing setup) |
| PDF | @react-pdf/renderer (existing dependency) |
| Frontend | Next.js 14 App Router + TypeScript |
| File storage | Supabase Storage |
| Auth (admin) | Supabase Auth (existing) |
| Auth (customer) | Token-based (no login) |
