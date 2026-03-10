# Admin Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add service info tooltips, redesigned PDFs with editable previews, SEO setup wizard, and improved intake form to the PhoneSpot admin system.

**Architecture:** Four independent feature areas sharing a Supabase backend. Service tooltips add columns to `repair_services` and new UI components used in both public and admin views. PDFs get a preview modal and redesigned templates. SEO wizard replaces the existing admin page. Intake form becomes a multi-step wizard with new fields (signature, photos, priority, estimated completion).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS (custom design system), Supabase (PostgreSQL), @react-pdf/renderer, canvas API for signature/annotations.

---

## Phase 1: Service Info Tooltips

### Task 1: Add columns to repair_services table

**Files:**
- Create: `src/lib/supabase/migrations/add-service-info-columns.sql`

**Step 1: Write the migration SQL**

```sql
-- Add service info columns for tooltips
ALTER TABLE repair_services
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS warranty_info text,
  ADD COLUMN IF NOT EXISTS includes text,
  ADD COLUMN IF NOT EXISTS estimated_time_label text;
```

Note: `estimated_minutes` already exists. `estimated_time_label` is a human-readable label like "30-60 min" for display.

**Step 2: Run migration in Supabase**

Go to Supabase dashboard SQL Editor, paste and run the migration.

**Step 3: Update TypeScript types**

Modify `src/lib/supabase/types.ts` — add to the `RepairService` interface:

```typescript
description: string | null;
warranty_info: string | null;
includes: string | null;
estimated_time_label: string | null;
```

**Step 4: Commit**

```bash
git add src/lib/supabase/migrations/add-service-info-columns.sql src/lib/supabase/types.ts
git commit -m "feat: add service info columns to repair_services"
```

---

### Task 2: Update services API to handle new fields

**Files:**
- Modify: `src/app/api/admin/services/[id]/route.ts`

**Step 1: Extend PATCH handler allowed fields**

In the PATCH handler, find the `allowedFields` array (currently: `name`, `slug`, `model_id`, `price_dkk`, `estimated_minutes`, `sort_order`, `active`) and add:

```typescript
const allowedFields = [
  "name", "slug", "model_id", "price_dkk", "estimated_minutes",
  "sort_order", "active",
  "description", "warranty_info", "includes", "estimated_time_label",
];
```

**Step 2: Create public endpoint for service info**

Create: `src/app/api/services/[id]/route.ts`

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("repair_services")
    .select("id, name, description, includes, estimated_time_label, warranty_info, estimated_minutes, price_dkk")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
```

**Step 3: Test manually**

```bash
curl http://localhost:3000/api/services/<some-service-id>
```

Expected: JSON with service info fields (null initially).

**Step 4: Commit**

```bash
git add src/app/api/admin/services/[id]/route.ts src/app/api/services/[id]/route.ts
git commit -m "feat: extend services API with info fields"
```

---

### Task 3: Build ServiceInfoTooltip component

**Files:**
- Create: `src/components/repair/service-info-tooltip.tsx`

**Step 1: Create the tooltip component**

This is a client component that shows a popover on click with service details.

```tsx
"use client";

import { useState, useRef, useEffect } from "react";

interface ServiceInfo {
  description?: string | null;
  includes?: string | null;
  estimated_time_label?: string | null;
  warranty_info?: string | null;
  estimated_minutes?: number | null;
}

export function ServiceInfoTooltip({ info }: { info: ServiceInfo }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const hasContent = info.description || info.includes || info.estimated_time_label || info.warranty_info;
  if (!hasContent) return null;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-charcoal/10 text-xs font-bold text-charcoal/50 transition-colors hover:bg-charcoal/20 hover:text-charcoal"
        aria-label="Vis info om denne ydelse"
      >
        i
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-soft-grey bg-white p-4 shadow-lg">
          <div className="absolute -top-2 left-3 h-4 w-4 rotate-45 border-l border-t border-soft-grey bg-white" />

          {info.description && (
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/40">Beskrivelse</p>
              <p className="mt-1 text-sm text-charcoal/80">{info.description}</p>
            </div>
          )}
          {info.includes && (
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/40">Inkluderer</p>
              <p className="mt-1 text-sm text-charcoal/80">{info.includes}</p>
            </div>
          )}
          {(info.estimated_time_label || info.estimated_minutes) && (
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/40">Estimeret tid</p>
              <p className="mt-1 text-sm text-charcoal/80">
                {info.estimated_time_label ?? `${info.estimated_minutes} min`}
              </p>
            </div>
          )}
          {info.warranty_info && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/40">Garanti</p>
              <p className="mt-1 text-sm text-charcoal/80">{info.warranty_info}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/repair/service-info-tooltip.tsx
git commit -m "feat: add ServiceInfoTooltip component"
```

---

### Task 4: Add service info edit modal to admin prisliste

**Files:**
- Modify: `src/app/(admin)/admin/prisliste/[brandSlug]/[modelSlug]/page.tsx`

**Step 1: Add state and modal for editing service info**

In the existing service editor page, add a state variable for the currently-editing service and an edit modal. The page already has inline price editing — follow the same pattern.

Add state:
```typescript
const [editingInfo, setEditingInfo] = useState<string | null>(null); // service id
const [infoForm, setInfoForm] = useState({
  description: "",
  warranty_info: "",
  includes: "",
  estimated_time_label: "",
});
```

Add an "i" button in each service row (next to the delete button). On click:
1. Set `editingInfo` to the service ID
2. Pre-fill `infoForm` from the service's current values

Add the modal JSX (rendered conditionally when `editingInfo` is not null):

```tsx
{editingInfo && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" onClick={() => setEditingInfo(null)} />
    <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
      <h3 className="mb-4 font-display text-lg font-bold text-charcoal">Rediger ydelsesinfo</h3>
      <p className="mb-4 text-sm text-gray">Denne info vises som tooltip på reparationssiden og i admin.</p>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Beskrivelse</label>
          <textarea
            className="w-full rounded-lg border border-soft-grey p-3 text-sm focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            rows={2}
            value={infoForm.description}
            onChange={(e) => setInfoForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Hvad indebærer denne reparation..."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Inkluderer</label>
          <textarea
            className="w-full rounded-lg border border-soft-grey p-3 text-sm focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            rows={2}
            value={infoForm.includes}
            onChange={(e) => setInfoForm((f) => ({ ...f, includes: e.target.value }))}
            placeholder="Reservedele, arbejdsløn, test..."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Estimeret tid</label>
          <input
            type="text"
            className="w-full rounded-lg border border-soft-grey p-3 text-sm focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            value={infoForm.estimated_time_label}
            onChange={(e) => setInfoForm((f) => ({ ...f, estimated_time_label: e.target.value }))}
            placeholder="30-60 min"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-charcoal">Garanti</label>
          <input
            type="text"
            className="w-full rounded-lg border border-soft-grey p-3 text-sm focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco"
            value={infoForm.warranty_info}
            onChange={(e) => setInfoForm((f) => ({ ...f, warranty_info: e.target.value }))}
            placeholder="Livstidsgaranti på reservedelen"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={() => setEditingInfo(null)} className="rounded-full border border-soft-grey px-5 py-2 text-sm hover:bg-sand">Annuller</button>
        <button type="button" onClick={() => saveServiceInfo(editingInfo)} className="rounded-full bg-green-eco px-5 py-2 text-sm font-semibold text-white hover:opacity-90">Gem</button>
      </div>
    </div>
  </div>
)}
```

Add the save function:
```typescript
async function saveServiceInfo(serviceId: string) {
  try {
    const res = await fetch(`/api/admin/services/${serviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: infoForm.description || null,
        warranty_info: infoForm.warranty_info || null,
        includes: infoForm.includes || null,
        estimated_time_label: infoForm.estimated_time_label || null,
      }),
    });
    if (!res.ok) throw new Error("Failed");
    setEditingInfo(null);
    loadServices();
  } catch {
    alert("Kunne ikke gemme info");
  }
}
```

**Step 2: Test manually**

Navigate to admin prisliste brand model. Click the info button on a service. Fill in fields, save. Verify data persists on reload.

**Step 3: Commit**

```bash
git add src/app/(admin)/admin/prisliste/[brandSlug]/[modelSlug]/page.tsx
git commit -m "feat: add service info edit modal to admin prisliste"
```

---

### Task 5: Add tooltips to public repair model page

**Files:**
- Modify: `src/app/reparation/[brand]/[model]/page.tsx`
- Modify: `src/lib/supabase/repairs.ts`

**Step 1: Update the services query to include new columns**

In `src/lib/supabase/repairs.ts`, find `getServicesByModel` and update the select:

```typescript
export async function getServicesByModel(modelId: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("repair_services")
    .select("id, name, slug, price_dkk, estimated_minutes, sort_order, description, warranty_info, includes, estimated_time_label")
    .eq("model_id", modelId)
    .eq("active", true)
    .order("sort_order");
  return data ?? [];
}
```

**Step 2: Import and add ServiceInfoTooltip**

```typescript
import { ServiceInfoTooltip } from "@/components/repair/service-info-tooltip";
```

In the service table, next to each service name:

```tsx
<span className="flex items-center">
  {service.name}
  <ServiceInfoTooltip info={service} />
</span>
```

**Step 3: Commit**

```bash
git add src/app/reparation/[brand]/[model]/page.tsx src/lib/supabase/repairs.ts
git commit -m "feat: add service info tooltips to public repair pages"
```

---

### Task 6: Add tooltips to admin intake repair step

**Files:**
- Modify: `src/app/(admin)/admin/indlevering/steps/repair-step.tsx`

**Step 1: Import and add ServiceInfoTooltip**

```typescript
import { ServiceInfoTooltip } from "@/components/repair/service-info-tooltip";
```

Next to each service name in the grid:
```tsx
<span className="flex items-center">
  {service.name}
  <ServiceInfoTooltip info={service} />
</span>
```

**Step 2: Commit**

```bash
git add src/app/(admin)/admin/indlevering/steps/repair-step.tsx
git commit -m "feat: add service info tooltips to admin intake form"
```

---

## Phase 2: PDF Redesign + Editable Cases

### Task 7: Redesign intake receipt PDF template

**Files:**
- Modify: `src/lib/pdf/intake-receipt.tsx`

**Step 1: Redesign the PDF layout**

Rewrite the `IntakeReceiptDocument` component with:

- **Header:** PhoneSpot text logo, document title "Indleveringsbevis", date, ticket ID in large format
- **Brand colors:** charcoal (#2D2D2D) background header, green-eco (#22C55E) accents, sand (#F5F0EB) section backgrounds
- **Customer section:** Clean card with name, phone, email, company/CVR
- **Device section:** Brand, model, serial, color, condition notes
- **Checklist:** Two-column layout, color-coded status (green OK, red FEJL, gray N/A)
- **Services table:** Clean table with borders, service name, price, total row
- **Terms:** Small print section with Danish terms
- **Footer:** PhoneSpot contact info, CVR, warranty statement

Use `@react-pdf/renderer` `StyleSheet.create()` for all styles. Key color values:

```typescript
const colors = {
  charcoal: "#2D2D2D",
  greenEco: "#22C55E",
  sand: "#F5F0EB",
  gray: "#6B7280",
  white: "#FFFFFF",
  softGrey: "#E5E7EB",
};
```

**Step 2: Test by generating a PDF**

```bash
curl http://localhost:3000/api/pdf/intake-receipt/<ticket-id> -o test-receipt.pdf
```

**Step 3: Commit**

```bash
git add src/lib/pdf/intake-receipt.tsx
git commit -m "feat: redesign intake receipt PDF template"
```

---

### Task 8: Redesign workshop report PDF template

**Files:**
- Modify: `src/lib/pdf/workshop-report.tsx`

**Step 1: Redesign with same design language as intake receipt**

- Header with ticket ID prominent
- Customer and device info
- Checklist with status indicators
- Repairs performed with checkboxes
- Internal notes box
- Technician signature area (blank lines)
- Footer with contact and branding

**Step 2: Test**

```bash
curl http://localhost:3000/api/pdf/workshop-report/<ticket-id> -o test-report.pdf
```

**Step 3: Commit**

```bash
git add src/lib/pdf/workshop-report.tsx
git commit -m "feat: redesign workshop report PDF template"
```

---

### Task 9: Build PDF preview modal with editable fields

**Files:**
- Create: `src/components/admin/pdf-preview-modal.tsx`

**Step 1: Create the modal component**

A client component with:
- Pre-filled form fields from ticket data (customer, device, services, notes)
- All fields editable — changes are PDF-only, not saved to ticket
- "Generer PDF" button sends edited data to a POST endpoint
- Service list with editable names and prices, total calculation

Key interface:
```typescript
interface PDFPreviewData {
  ticketId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  companyName?: string;
  cvr?: string;
  deviceBrand: string;
  deviceModel: string;
  serialNumber?: string;
  deviceColor?: string;
  conditionNotes?: string;
  services: { name: string; price: number }[];
  internalNotes: string;
  checklist?: { label: string; status: string }[];
}
```

The modal POSTs to `/api/pdf/{type}/{ticketId}` with the edited data, receives a PDF blob, and opens it in a new tab.

**Step 2: Commit**

```bash
git add src/components/admin/pdf-preview-modal.tsx
git commit -m "feat: add PDF preview modal with editable fields"
```

---

### Task 10: Add POST handler to PDF API routes for editable data

**Files:**
- Modify: `src/app/api/pdf/intake-receipt/[ticketId]/route.ts`
- Modify: `src/app/api/pdf/workshop-report/[ticketId]/route.ts`

**Step 1: Add POST handler to intake receipt route**

The existing GET handler fetches data from Supabase. Add a POST handler that accepts edited data directly and renders the PDF template with that data instead.

**Step 2: Same for workshop report route**

**Step 3: Commit**

```bash
git add src/app/api/pdf/intake-receipt/[ticketId]/route.ts src/app/api/pdf/workshop-report/[ticketId]/route.ts
git commit -m "feat: add POST handlers for PDF generation with custom data"
```

---

### Task 11: Integrate PDF preview modal into admin ticket views

**Files:**
- Find and modify admin pages where "Generer PDF" buttons exist

**Step 1: Find PDF generation buttons**

Search for references to `/api/pdf/` in admin pages. Replace direct PDF links with opening the `PDFPreviewModal`.

**Step 2: Add modal state and render**

```typescript
import { PDFPreviewModal } from "@/components/admin/pdf-preview-modal";

const [pdfModal, setPdfModal] = useState<{ type: "intake-receipt" | "workshop-report" } | null>(null);
```

Replace direct PDF button with: `onClick={() => setPdfModal({ type: "intake-receipt" })}`

Render modal conditionally, mapping ticket data to `PDFPreviewData`.

**Step 3: Test full flow**

Open ticket, click Indleveringsbevis, verify modal opens, edit a field, generate, verify PDF reflects edits.

**Step 4: Commit**

```bash
git add <modified-files>
git commit -m "feat: integrate PDF preview modal into admin ticket views"
```

---

## Phase 3: SEO Setup Wizard

### Task 12: Create admin_settings table

**Files:**
- Create: `src/lib/supabase/migrations/create-admin-settings.sql`
- Modify: `src/lib/supabase/types.ts`

**Step 1: Write migration**

```sql
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
```

**Step 2: Run in Supabase**

**Step 3: Add type**

```typescript
export interface AdminSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}
```

**Step 4: Commit**

```bash
git add src/lib/supabase/migrations/create-admin-settings.sql src/lib/supabase/types.ts
git commit -m "feat: create admin_settings table"
```

---

### Task 13: Build SEO wizard component and integrate

**Files:**
- Create: `src/components/admin/seo-wizard.tsx`
- Modify: `src/app/(admin)/admin/seo/page.tsx`

**Step 1: Create the 3-step wizard**

A client component with steps:

1. **Verify domain** — Show DNS TXT record with copy button, meta tag alternative, "Check verification" button
2. **Submit sitemap** — Show sitemap URL, "Submit to Google" button, skip option
3. **Status dashboard** — 3 KPI cards (domain verified, sitemap submitted, pages indexed), "Connect Google Account" button for future API integration

Use the project's design patterns: rounded-2xl cards, green-eco buttons, soft-grey borders, charcoal text.

**Step 2: Integrate into SEO admin page**

Add "Setup" as first tab. Show wizard content when Setup tab is active. Keep existing keyword/page/audit tabs as-is.

**Step 3: Create placeholder API routes**

Create: `src/app/api/admin/seo/verify/route.ts`
Create: `src/app/api/admin/seo/submit-sitemap/route.ts`

These are placeholder routes. Full Google Search Console API integration requires OAuth setup (env vars `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) to be configured later.

**Step 4: Commit**

```bash
git add src/components/admin/seo-wizard.tsx src/app/(admin)/admin/seo/page.tsx src/app/api/admin/seo/
git commit -m "feat: add SEO setup wizard to admin"
```

---

## Phase 4: Intake Form Improvements

### Task 14: Add new columns to repair_tickets table

**Files:**
- Create: `src/lib/supabase/migrations/add-intake-improvements.sql`
- Modify: `src/lib/supabase/types.ts`

**Step 1: Write migration**

```sql
ALTER TABLE repair_tickets
  ADD COLUMN IF NOT EXISTS estimated_completion timestamptz,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS customer_signature text,
  ADD COLUMN IF NOT EXISTS device_photos jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_price numeric;
```

**Step 2: Run in Supabase**

**Step 3: Update RepairTicket type**

```typescript
estimated_completion: string | null;
priority: "normal" | "haster" | "express";
customer_signature: string | null;
device_photos: string[];
estimated_price: number | null;
```

**Step 4: Commit**

```bash
git add src/lib/supabase/migrations/add-intake-improvements.sql src/lib/supabase/types.ts
git commit -m "feat: add intake improvement columns to repair_tickets"
```

---

### Task 15: Add priority selector to intake form

**Files:**
- Modify: `src/app/(admin)/admin/indlevering/steps/repair-step.tsx`
- Modify: `src/app/(admin)/admin/indlevering/page.tsx` (form state)

**Step 1: Add `priority` to form state** (default: `"normal"`)

**Step 2: Add priority selector UI** — Three pill buttons (Normal/gray, Haster/amber, Express/red) with ring highlight on active.

**Step 3: Include priority in ticket creation payload**

**Step 4: Commit**

```bash
git add src/app/(admin)/admin/indlevering/
git commit -m "feat: add priority selector to intake form"
```

---

### Task 16: Add estimated completion to intake form

**Files:**
- Modify: `src/app/(admin)/admin/indlevering/steps/repair-step.tsx`
- Modify: `src/app/(admin)/admin/indlevering/page.tsx`

**Step 1: Add `estimatedCompletion` to form state**

**Step 2: Add datetime-local input** after priority selector. Show calculated estimate based on selected services' `estimated_minutes`.

**Step 3: Auto-suggest** — When services change and no manual override, calculate total minutes + 1hr buffer and set suggested datetime.

**Step 4: Commit**

```bash
git add src/app/(admin)/admin/indlevering/
git commit -m "feat: add estimated completion with auto-suggestion to intake"
```

---

### Task 17: Add estimated price display to summary step

**Files:**
- Modify: `src/app/(admin)/admin/indlevering/steps/summary-step.tsx`

**Step 1: Add prominent total price card** — Sum of selected + custom services, displayed in a sand-bg rounded card.

**Step 2: Include `estimated_price` in ticket creation payload**

**Step 3: Commit**

```bash
git add src/app/(admin)/admin/indlevering/
git commit -m "feat: add estimated price to intake summary"
```

---

### Task 18: Build signature pad component

**Files:**
- Create: `src/components/admin/signature-pad.tsx`

**Step 1: Create canvas-based signature component**

- Canvas element with mouse and touch event handlers
- Drawing with 2px charcoal strokes, round line caps
- "Ryd" (clear) button and "Bekræft underskrift" button
- `onSave` callback returns canvas data URL (PNG)
- Responsive width, touch-action: none for mobile

**Step 2: Commit**

```bash
git add src/components/admin/signature-pad.tsx
git commit -m "feat: add signature pad component"
```

---

### Task 19: Add signature to intake summary step

**Files:**
- Modify: `src/app/(admin)/admin/indlevering/steps/summary-step.tsx`
- Modify: `src/app/(admin)/admin/indlevering/page.tsx`

**Step 1: Add `customerSignature` to form state** (null initially)

**Step 2: Render SignaturePad** in summary step before submit. Once signed, show thumbnail with "Signer igen" option.

**Step 3: Include `customer_signature` in ticket creation payload**

**Step 4: Commit**

```bash
git add src/app/(admin)/admin/indlevering/
git commit -m "feat: add customer signature to intake form"
```

---

### Task 20: Build photo annotator component

**Files:**
- Create: `src/components/admin/photo-annotator.tsx`

**Step 1: Create canvas overlay for drawing on photos**

- Full-screen modal with loaded image on canvas
- Tool selector: Freehand / Circle / Arrow
- Color selector: Red, Amber, Blue
- Reset, Cancel, Save buttons
- On save, returns annotated image as data URL
- Image loaded via `new Image()` with crossOrigin

**Step 2: Commit**

```bash
git add src/components/admin/photo-annotator.tsx
git commit -m "feat: add photo annotator component"
```

---

### Task 21: Integrate photo annotations into device step

**Files:**
- Modify: `src/app/(admin)/admin/indlevering/steps/device-step.tsx`

**Step 1: Add "Annoter" button per uploaded photo** — opens PhotoAnnotator modal

**Step 2: On save**, replace original photo with annotated version in the photos array

**Step 3: Store annotated photos** as base64 data URLs in `device_photos` jsonb column. For production, consider uploading to Supabase Storage.

**Step 4: Commit**

```bash
git add src/app/(admin)/admin/indlevering/steps/device-step.tsx
git commit -m "feat: add photo annotation support to intake device step"
```

---

### Task 22: Build label print component

**Files:**
- Create: `src/components/admin/label-print.tsx`

**Step 1: Create printable label component**

A button that opens a new window with a minimal HTML page sized for 62mm x 29mm labels. Contains:
- Ticket ID (short, bold)
- Device brand + model
- Customer name
- Date

Uses `window.open()` to create a new window, builds DOM elements with `createElement/appendChild`, sets print-optimized styles via a `<style>` tag, then calls `window.print()`.

**Step 2: Commit**

```bash
git add src/components/admin/label-print.tsx
git commit -m "feat: add label print component"
```

---

### Task 23: Add label print and final integrations to intake success

**Files:**
- Modify: `src/app/(admin)/admin/indlevering/steps/summary-step.tsx`

**Step 1: Show label print on success** — After ticket creation, render LabelPrint button with ticket data.

**Step 2: Ensure all new fields are included in ticket creation**

Verify the submit function sends: `priority`, `estimated_completion`, `customer_signature`, `device_photos`, `estimated_price`.

**Step 3: Test the complete intake flow**

1. Admin ny indlevering
2. Fill in customer info, next
3. Add device, upload photo, annotate, next
4. Select services, set priority, check estimated completion, next
5. Review summary, sign, submit
6. Verify success screen shows label print button
7. Print label, generate PDF preview

**Step 4: Commit**

```bash
git add src/app/(admin)/admin/indlevering/
git commit -m "feat: integrate label print and all new fields into intake flow"
```

---

## Phase 5: Final Integration & Polish

### Task 24: Add priority indicators to admin dashboard

**Files:**
- Find and modify the admin ticket list/dashboard page

**Step 1: Add priority badge to ticket cards**

```tsx
{ticket.priority === "haster" && (
  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Haster</span>
)}
{ticket.priority === "express" && (
  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">Express</span>
)}
```

**Step 2: Commit**

```bash
git add <modified-files>
git commit -m "feat: add priority indicators to admin ticket list"
```

---

### Task 25: Add signature to PDF templates

**Files:**
- Modify: `src/lib/pdf/intake-receipt.tsx`

**Step 1: Include signature image in intake receipt**

If `customer_signature` is present, render it as an `<Image>` element in the PDF using `@react-pdf/renderer`.

**Step 2: Commit**

```bash
git add src/lib/pdf/intake-receipt.tsx
git commit -m "feat: include customer signature in intake receipt PDF"
```

---

### Task 26: End-to-end testing

**Step 1: Test service info tooltips**
- Admin: edit service info, save, verify persists
- Public: verify tooltip appears on repair model page
- Admin intake: verify tooltip appears on service selection

**Step 2: Test PDF flow**
- Open ticket, click Indleveringsbevis, modal opens, edit field, generate, verify PDF
- Same for Vaerkstedsrapport

**Step 3: Test SEO wizard**
- Navigate to admin/seo, verify Setup tab shows, walk through steps

**Step 4: Test intake form**
- Full flow: customer, device with photo annotation, services with priority, summary with signature, submit, print label

**Step 5: Commit any fixes**

```bash
git add .
git commit -m "fix: polish and fix issues from end-to-end testing"
```
