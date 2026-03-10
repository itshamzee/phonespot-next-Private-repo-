# Admin Improvements Design

**Date:** 2026-03-10
**Status:** Approved

## Overview

Four improvements to the PhoneSpot admin system:
1. Service info tooltips (public + admin)
2. PDF redesign with editable cases
3. SEO setup wizard
4. Intake form (ny indlevering) improvements

---

## 1. Service Info Tooltips

### Database Changes

Add columns to `repair_services` table in Supabase:
- `description` (text, nullable) — What the service involves
- `warranty_info` (text, nullable) — Warranty terms for this service
- `includes` (text, nullable) — What's included (parts, labor, etc.)
- `estimated_time` (text, nullable) — e.g. "30-60 min"

### Admin (Prisliste)

- Add an edit icon/button on each service row in the prisliste
- Opens a modal with fields: description, what's included, estimated time, warranty info
- Save updates via `PATCH /api/admin/services/[id]`

### Public (Reparation Pages)

- Add ⓘ icon next to each service name
- On hover/click: show a popover/tooltip with:
  - Description
  - What's included
  - Estimated time
  - Warranty info
- Graceful fallback: if no info is set, don't show the icon

### Admin (Intake Form)

- Same ⓘ tooltip appears next to service names in the intake form service selector
- Helps staff explain services to customers

---

## 2. PDF Redesign + Editable Cases

### Editable Content Before Generation

- When clicking "Generer PDF", open a `PDFPreviewModal`
- Pre-filled with ticket data: customer info, device, services, notes, prices
- All fields are editable — changes apply only to the PDF, not the ticket
- "Generer" button creates the PDF with the edited content

### PDF Design (Both Indleveringsbevis & Værkstedsrapport)

- PhoneSpot logo at top
- Brand colors: charcoal (#2D2D2D), green-eco (#22C55E), sand (#F5F0EB)
- Clean section layout with subtle dividers
- Improved typography and spacing
- QR code linking to ticket status page
- Footer: contact info, CVR number, warranty terms, website

### Indleveringsbevis Sections
1. Header (logo, document title, date, ticket ID)
2. Customer info (name, phone, email)
3. Device info (type, model, IMEI/serial, condition notes)
4. Selected services with prices
5. Total estimated price
6. Terms & conditions
7. Signature area
8. Footer

### Værkstedsrapport Sections
1. Header (logo, document title, date, ticket ID)
2. Customer info
3. Device info
4. Work performed (services completed, parts used)
5. Technician notes
6. Quality check results
7. Final price breakdown
8. Footer

---

## 3. SEO Setup Wizard

### Location
Existing `/admin/seo` page — replace placeholder content with wizard.

### 3-Step Wizard

**Step 1: Verify Domain**
- Show the DNS TXT record value for Google Search Console verification
- Copy button for the record value
- Instructions for adding to DNS
- "Check Verification" button to test

**Step 2: Submit Sitemap**
- Show the sitemap URL (`https://phonespot.dk/sitemap.xml`)
- One-click "Submit to Google" button
- Uses Google Search Console API

**Step 3: Status Dashboard**
- Domain verification status (verified/pending)
- Pages indexed count
- Top search queries (if available)
- Last crawl date

### Auth Flow
- "Connect Google Account" button → Google OAuth consent
- Store refresh token in Supabase (`admin_settings` table)
- Server-side API calls to Google Search Console API
- Environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

---

## 4. Intake Form (Ny Indlevering) Improvements

### Layout Change
- Convert from single long form to multi-step wizard
- Steps: Customer → Device → Services → Details → Confirmation
- Progress indicator at top

### New Features

**Estimated Completion**
- Date/time picker in the Details step
- Auto-suggest based on selected services' `estimated_time`
- Stored in `repair_tickets.estimated_completion` (new column, timestamptz)

**Priority Levels**
- Dropdown: Normal (gray) / Haster (amber) / Express (red)
- Stored in `repair_tickets.priority` (new column, text, default 'normal')
- Visual indicator on ticket cards in admin dashboard

**Customer Signature**
- Canvas-based signature pad in the Confirmation step
- Stored as base64 in `repair_tickets.customer_signature` (new column, text)
- Included in the Indleveringsbevis PDF

**Print Labels**
- "Print Label" button after ticket creation
- Small label: device name, ticket ID, barcode/QR code
- Uses browser print dialog with label-sized CSS

**Photo Annotations**
- Upload device photos in the Device step
- Simple canvas overlay for drawing circles/arrows to mark existing damage
- Stored as annotated images in Supabase storage
- Referenced in `repair_tickets.device_photos` (new column, jsonb array of URLs)

**Price Estimate**
- Auto-calculated from selected services
- Shown in the Confirmation step
- Displayed to customer before signing
- Stored in `repair_tickets.estimated_price` (new column, numeric)

### UX Improvements
- Better mobile responsiveness
- Inline validation per step
- Summary card in confirmation step showing all entered data
- Success screen with ticket ID, QR code, and print options

---

## Database Schema Changes Summary

### `repair_services` table — new columns:
- `description` text
- `warranty_info` text
- `includes` text
- `estimated_time` text

### `repair_tickets` table — new columns:
- `estimated_completion` timestamptz
- `priority` text default 'normal'
- `customer_signature` text
- `device_photos` jsonb
- `estimated_price` numeric

### New table: `admin_settings`
- `id` uuid primary key
- `key` text unique
- `value` jsonb
- `updated_at` timestamptz

---

## New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ServiceInfoTooltip` | `src/components/repair/service-info-tooltip.tsx` | ⓘ popover for service details |
| `PDFPreviewModal` | `src/components/admin/pdf-preview-modal.tsx` | Editable fields before PDF generation |
| `IntakeWizard` | `src/components/admin/intake-wizard.tsx` | Multi-step intake form |
| `SignaturePad` | `src/components/admin/signature-pad.tsx` | Canvas signature capture |
| `PhotoAnnotator` | `src/components/admin/photo-annotator.tsx` | Draw on uploaded photos |
| `LabelPrint` | `src/components/admin/label-print.tsx` | Print device labels |
| `SEOWizard` | `src/components/admin/seo-wizard.tsx` | 3-step SEO setup |

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `PATCH` | `/api/admin/services/[id]` | Update service info fields (existing, extend) |
| `GET` | `/api/admin/services/[id]/info` | Get service tooltip data (public) |
| `POST` | `/api/admin/seo/verify` | Check domain verification status |
| `POST` | `/api/admin/seo/submit-sitemap` | Submit sitemap to Google |
| `GET` | `/api/admin/seo/status` | Get SEO dashboard data |
| `POST` | `/api/admin/tickets/[id]/photos` | Upload annotated photos |
| `GET` | `/api/admin/tickets/[id]/label` | Generate label data |
