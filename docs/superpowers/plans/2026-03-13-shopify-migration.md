# Shopify Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all Shopify admin functionality and migrate storefront product pages to Supabase, enabling full cancellation of Shopify subscription.

**Architecture:** 5 sequential phases — Product Management → Orders Upgrade → Draft Orders → Abandoned Checkout Recovery → Storefront Migration. Each phase produces working features. All data lives in Supabase (PostgreSQL), payments via Stripe, emails via Resend, SMS via GatewayAPI.

**Tech Stack:** Next.js 16 (App Router, Turbopack), Supabase (PostgreSQL + Storage), Stripe, Resend, GatewayAPI, Vitest, Tailwind CSS, @react-email/components

**Spec:** `docs/superpowers/specs/2026-03-13-shopify-migration-design.md`

---

## File Map

### Phase A — Product Management
```
Create: src/lib/supabase/migrations/004_product_management.sql
Modify: src/lib/supabase/platform-types.ts (add new fields to ProductTemplate, SkuProduct)
Create: src/app/api/platform/images/upload/route.ts
Create: src/app/api/platform/images/[key]/route.ts
Create: src/components/platform/product-image-uploader.tsx
Create: src/app/(admin)/admin/platform/products/page.tsx
Create: src/components/platform/product-template-list.tsx
Create: src/components/platform/product-template-form.tsx
Create: src/components/platform/sku-product-list.tsx
Create: src/components/platform/sku-product-form.tsx
Create: src/app/api/platform/templates/[id]/route.ts (new [id] directory — GET/PUT/DELETE)
Create: src/app/api/platform/sku/[id]/route.ts (PUT/DELETE — GET exists)
Create: src/app/api/platform/sku-product-templates/route.ts
```

### Phase B — Orders Upgrade
```
Create: src/lib/supabase/migrations/005_orders_upgrade.sql
Modify: src/lib/supabase/platform-types.ts (add payment_status, fulfillment_status to Order)
Modify: src/components/admin/orders/order-list.tsx (new columns, filters, tabs)
Modify: src/app/(admin)/admin/platform/orders/page.tsx (new filter bar)
Modify: src/components/admin/orders/order-detail.tsx (2-column layout, fulfillment card)
Create: src/components/admin/orders/fulfillment-card.tsx
Create: src/components/admin/orders/payment-card.tsx
Create: src/components/admin/orders/order-timeline.tsx
Create: src/components/admin/orders/order-actions-dropdown.tsx
Create: src/app/api/shipping/orders/[id]/fulfill/route.ts
Create: src/lib/email/templates/shipping-notification.tsx
```

### Phase C — Draft Orders
```
Create: src/lib/supabase/migrations/006_draft_orders.sql
Modify: src/lib/supabase/platform-types.ts (add DraftOrder type)
Create: src/app/api/platform/draft-orders/route.ts (GET list, POST create)
Create: src/app/api/platform/draft-orders/[id]/route.ts (GET, PUT, DELETE)
Create: src/app/api/platform/draft-orders/[id]/send/route.ts (send invoice)
Create: src/app/api/platform/draft-orders/[id]/mark-paid/route.ts
Create: src/lib/draft-orders/convert.ts (draft → order conversion logic)
Create: src/app/(admin)/admin/platform/draft-orders/page.tsx
Create: src/app/(admin)/admin/platform/draft-orders/new/page.tsx
Create: src/app/(admin)/admin/platform/draft-orders/[id]/page.tsx
Create: src/components/platform/draft-order-list.tsx
Create: src/components/platform/draft-order-form.tsx
Create: src/components/platform/line-item-editor.tsx
Create: src/lib/email/templates/invoice-email.tsx
Modify: src/lib/stripe/webhook.ts (handle draft_order_id in metadata)
Modify: src/app/api/repairs/checkout/route.ts (use draft_orders instead of Shopify)
Modify: src/app/api/intake/route.ts (use draft_orders instead of Shopify)
```

### Phase D — Abandoned Checkout Recovery
```
Create: src/lib/supabase/migrations/007_abandoned_checkout.sql
Modify: src/lib/supabase/platform-types.ts (add recovery fields to Order)
Create: src/lib/sms/gateway-api.ts
Create: src/app/api/sms/send/route.ts (if not exists, update if exists)
Modify: src/app/api/cron/release-reservations/route.ts (mark abandoned)
Create: src/app/api/cron/recovery/route.ts
Create: src/lib/email/templates/abandoned-cart-email.tsx
Create: src/app/checkout/recover/[token]/page.tsx
Create: src/app/(admin)/admin/platform/abandoned-checkouts/page.tsx
Create: src/components/platform/abandoned-checkout-list.tsx
Modify: vercel.json (add cron schedule for recovery)
```

### Phase E — Storefront Migration
```
Create: src/lib/supabase/migrations/008_search_vectors.sql
Create: src/lib/supabase/product-queries.ts (Supabase queries replacing Shopify)
Modify: src/app/iphones/page.tsx (Shopify → Supabase)
Modify: src/app/ipads/page.tsx (Shopify → Supabase)
Modify: src/app/smartphones/page.tsx (Shopify → Supabase)
Modify: src/app/smartwatches/page.tsx (Shopify → Supabase)
Modify: src/app/baerbare/page.tsx (Shopify → Supabase)
Create: src/app/refurbished/[slug]/page.tsx (new product detail page)
Modify: src/app/tilbehoer/page.tsx (Shopify → Supabase)
Modify: src/app/tilbehoer/[category]/page.tsx
Create: src/app/tilbehoer/[category]/[slug]/page.tsx
Modify: src/app/api/search/route.ts (Shopify → Supabase full-text)
Create: src/components/product/category-hero.tsx
Create: src/components/product/sidebar-filters.tsx
Create: src/components/product/product-grid-card.tsx
Create: src/components/product/device-detail.tsx
Create: src/components/product/grade-selector.tsx
Create: src/components/product/storage-selector.tsx
Create: src/components/product/color-selector.tsx
Create: src/components/product/specifications-table.tsx
Create: src/components/product/accessory-detail.tsx
Create: scripts/export-shopify-orders.ts
```

---

## Chunk 1: Phase A — Product Management

### Task A1: Database Migration for Product Management

**Files:**
- Create: `src/lib/supabase/migrations/004_product_management.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 004_product_management.sql
-- Adds product management columns to product_templates and sku_products
-- and creates the sku_product_templates join table.

-- ── product_templates: new columns ──────────────────────────────────
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS short_description text;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS specifications jsonb DEFAULT '{}';
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS base_price_a integer;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS base_price_b integer;
ALTER TABLE product_templates ADD COLUMN IF NOT EXISTS base_price_c integer;

-- Add CHECK constraint for status (separate step for IF NOT EXISTS safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_templates_status_check'
  ) THEN
    ALTER TABLE product_templates ADD CONSTRAINT product_templates_status_check
      CHECK (status IN ('draft', 'published'));
  END IF;
END $$;

-- Update category CHECK to include 'console'
ALTER TABLE product_templates DROP CONSTRAINT IF EXISTS product_templates_category_check;
ALTER TABLE product_templates ADD CONSTRAINT product_templates_category_check
  CHECK (category IN ('iphone', 'smartphone', 'ipad', 'tablet', 'smartwatch', 'laptop', 'console', 'accessory', 'other'));

-- ── sku_products: new columns ───────────────────────────────────────
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS short_description text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]';
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE sku_products ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

-- Add unique constraint on slug (only if column was just created, skip on re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sku_products_slug_unique'
  ) THEN
    ALTER TABLE sku_products ADD CONSTRAINT sku_products_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- Add status CHECK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sku_products_status_check'
  ) THEN
    ALTER TABLE sku_products ADD CONSTRAINT sku_products_status_check
      CHECK (status IN ('draft', 'published'));
  END IF;
END $$;

-- Migrate is_active → status
UPDATE sku_products SET status = CASE WHEN is_active THEN 'published' ELSE 'draft' END
WHERE status IS NULL;

-- ── sku_product_templates join table ────────────────────────────────
CREATE TABLE IF NOT EXISTS sku_product_templates (
  sku_product_id uuid NOT NULL REFERENCES sku_products(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES product_templates(id) ON DELETE CASCADE,
  PRIMARY KEY (sku_product_id, template_id)
);

-- Index for reverse lookups (accessories for a template)
CREATE INDEX IF NOT EXISTS idx_sku_product_templates_template
  ON sku_product_templates(template_id);
```

- [ ] **Step 2: Run migration against Supabase**

Run in Supabase SQL editor or via CLI. Verify no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/migrations/004_product_management.sql
git commit -m "feat(db): add product management columns and sku_product_templates join table"
```

---

### Task A2: Update Platform Types

**Files:**
- Modify: `src/lib/supabase/platform-types.ts`

- [ ] **Step 1: Add new fields to ProductTemplate interface**

Add after existing fields in the `ProductTemplate` interface:

```typescript
// New product management fields
short_description: string | null;
meta_title: string | null;
meta_description: string | null;
specifications: Record<string, string>;
status: "draft" | "published";
base_price_a: number | null;  // øre
base_price_b: number | null;
base_price_c: number | null;
```

- [ ] **Step 2: Add new fields to SkuProduct interface**

Add after existing fields in the `SkuProduct` interface:

```typescript
// New product management fields
short_description: string | null;
meta_title: string | null;
meta_description: string | null;
slug: string | null;
variants: Array<{
  name: string;
  options: Array<{
    value: string;
    price_override: number | null;
    sku: string | null;
    image: string | null;
  }>;
}>;
barcode: string | null;
status: "draft" | "published";
```

- [ ] **Step 3: Add SkuProductTemplate type**

```typescript
export interface SkuProductTemplate {
  sku_product_id: string;
  template_id: string;
}
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: No new errors from these additions (they're additive)

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/platform-types.ts
git commit -m "feat(types): add product management fields to platform types"
```

---

### Task A3: Image Upload API

**Files:**
- Create: `src/app/api/platform/images/upload/route.ts`
- Create: `src/app/api/platform/images/[key]/route.ts`

- [ ] **Step 1: Create upload endpoint**

```typescript
// src/app/api/platform/images/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const BUCKET = "product-images";

export async function POST(request: NextRequest) {
  // NOTE: This route is only accessible from the admin panel (protected by middleware).
  // Uses createAdminClient for Storage operations, consistent with other platform API routes.
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const folder = formData.get("folder") as string | null; // e.g. "templates/uuid" or "sku/uuid"

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, and WebP images are allowed" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 10MB)" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = folder ? `${folder}/${fileName}` : fileName;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({
    url: urlData.publicUrl,
    path,
  }, { status: 201 });
}
```

- [ ] **Step 2: Create delete endpoint**

```typescript
// src/app/api/platform/images/[key]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "product-images";

type RouteParams = { params: Promise<{ key: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { key } = await params;
  const path = decodeURIComponent(key);

  const supabase = createAdminClient();

  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/platform/images/upload/route.ts src/app/api/platform/images/\[key\]/route.ts
git commit -m "feat(api): add image upload and delete endpoints for product images"
```

---

### Task A4: Product Image Uploader Component

**Files:**
- Create: `src/components/platform/product-image-uploader.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/platform/product-image-uploader.tsx
"use client";

import { useState, useCallback, useRef } from "react";

interface ProductImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder: string; // e.g. "templates/uuid"
  max?: number;
}

export function ProductImageUploader({
  images,
  onChange,
  folder,
  max = 8,
}: ProductImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).slice(0, max - images.length);
      if (fileArray.length === 0) return;

      setUploading(true);
      const newUrls: string[] = [];

      for (const file of fileArray) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        try {
          const res = await fetch("/api/platform/images/upload", {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            newUrls.push(data.url);
          }
        } catch {
          // skip failed uploads
        }
      }

      onChange([...images, ...newUrls]);
      setUploading(false);
    },
    [images, onChange, folder, max]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      upload(e.dataTransfer.files);
    }
  }

  function handleRemove(index: number) {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  }

  function handleReorder(from: number, to: number) {
    const updated = [...images];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onChange(updated);
  }

  return (
    <div className="space-y-3">
      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((url, i) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-50"
            >
              <img
                src={url}
                alt={`Product image ${i + 1}`}
                className="h-full w-full object-cover"
              />
              {i === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  Hoved
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => handleReorder(i, i - 1)}
                    className="rounded-lg bg-white/90 p-1.5 text-stone-700 hover:bg-white"
                    title="Flyt til venstre"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="rounded-lg bg-red-500/90 p-1.5 text-white hover:bg-red-600"
                  title="Fjern"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {i < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleReorder(i, i + 1)}
                    className="rounded-lg bg-white/90 p-1.5 text-stone-700 hover:bg-white"
                    title="Flyt til højre"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {images.length < max && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
            dragOver
              ? "border-green-500 bg-green-50"
              : "border-stone-300 bg-stone-50 hover:border-stone-400 hover:bg-stone-100"
          }`}
        >
          <svg
            className="mb-2 h-8 w-8 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
          <p className="text-sm font-medium text-stone-600">
            {uploading ? "Uploader…" : "Træk billeder hertil eller klik for at vælge"}
          </p>
          <p className="mt-1 text-xs text-stone-400">
            JPEG, PNG eller WebP · Max 10MB · {images.length}/{max} billeder
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => e.target.files && upload(e.target.files)}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/platform/product-image-uploader.tsx
git commit -m "feat(ui): add ProductImageUploader with drag-and-drop and reordering"
```

---

### Task A5: Product Template CRUD API

**Files:**
- Create: `src/app/api/platform/templates/[id]/route.ts` (new [id] directory — GET/PUT/DELETE)

- [ ] **Step 1: Read existing file to check what exists**

Read `src/app/api/platform/templates/[id]/route.ts` and `src/app/api/platform/templates/route.ts` to see what's already there.

- [ ] **Step 2: Add PUT and DELETE handlers**

If the `[id]/route.ts` file exists, add PUT and DELETE. If it doesn't exist, create it:

```typescript
// src/app/api/platform/templates/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("product_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("product_templates")
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("product_templates")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/platform/templates/\[id\]/route.ts
git commit -m "feat(api): add PUT/DELETE for product templates"
```

---

### Task A6: SKU Product CRUD API

**Files:**
- Modify: `src/app/api/platform/sku/[id]/route.ts` (add PUT, DELETE)
- Create: `src/app/api/platform/sku-product-templates/route.ts`

- [ ] **Step 1: Read existing SKU API to check what exists**

Read `src/app/api/platform/sku/[id]/route.ts` to see current state.

- [ ] **Step 2: Add PUT and DELETE to SKU endpoint**

Same pattern as templates — add PUT (update) and DELETE to the existing `[id]` route.

- [ ] **Step 3: Create sku-product-templates endpoint**

```typescript
// src/app/api/platform/sku-product-templates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const skuProductId = request.nextUrl.searchParams.get("sku_product_id");
  const templateId = request.nextUrl.searchParams.get("template_id");
  const supabase = createAdminClient();

  let query = supabase.from("sku_product_templates").select("*, template:product_templates(id, display_name, brand)");

  if (skuProductId) query = query.eq("sku_product_id", skuProductId);
  if (templateId) query = query.eq("template_id", templateId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { sku_product_id, template_id } = await request.json();

  if (!sku_product_id || !template_id) {
    return NextResponse.json({ error: "sku_product_id and template_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("sku_product_templates")
    .insert({ sku_product_id, template_id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const skuProductId = request.nextUrl.searchParams.get("sku_product_id");
  const templateId = request.nextUrl.searchParams.get("template_id");

  if (!skuProductId || !templateId) {
    return NextResponse.json({ error: "sku_product_id and template_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("sku_product_templates")
    .delete()
    .eq("sku_product_id", skuProductId)
    .eq("template_id", templateId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/platform/sku/\[id\]/route.ts src/app/api/platform/sku-product-templates/route.ts
git commit -m "feat(api): add SKU product CRUD and sku-product-templates endpoint"
```

---

### Task A7: Product Template List Component

**Files:**
- Create: `src/components/platform/product-template-list.tsx`

- [ ] **Step 1: Create the list component**

```typescript
// src/components/platform/product-template-list.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProductTemplate } from "@/lib/supabase/platform-types";
import { formatDKK } from "@/lib/platform/format";

interface Props {
  onEdit: (template: ProductTemplate) => void;
}

export function ProductTemplateList({ onEdit }: Props) {
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (brandFilter) params.set("brand", brandFilter);
    if (categoryFilter) params.set("category", categoryFilter);

    const res = await fetch(`/api/platform/templates?${params}`);
    if (res.ok) {
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, [search, brandFilter, categoryFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = statusFilter
    ? templates.filter((t) => t.status === statusFilter)
    : templates;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Søg efter model…"
          className="w-64 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/10"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
        >
          <option value="">Alle kategorier</option>
          <option value="iphone">iPhone</option>
          <option value="smartphone">Smartphone</option>
          <option value="ipad">iPad</option>
          <option value="tablet">Tablet</option>
          <option value="laptop">Laptop</option>
          <option value="smartwatch">Smartwatch</option>
          <option value="console">Konsol</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
        >
          <option value="">Alle statuser</option>
          <option value="published">Publiceret</option>
          <option value="draft">Kladde</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-stone-200 border-t-green-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-stone-400">
          Ingen produktskabeloner fundet
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/60 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                <th className="px-4 py-3">Billede</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Lagre</th>
                <th className="px-4 py-3">Pris (A)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-stone-50/50">
                  <td className="px-4 py-3">
                    {t.images?.[0] ? (
                      <img
                        src={t.images[0]}
                        alt={t.display_name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-stone-800">
                    {t.display_name}
                  </td>
                  <td className="px-4 py-3 text-stone-500">{t.brand}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">
                    {t.storage_options?.join(", ") ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {t.base_price_a ? formatDKK(t.base_price_a) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        t.status === "published"
                          ? "bg-green-50 text-green-700"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {t.status === "published" ? "Publiceret" : "Kladde"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onEdit(t)}
                      className="text-xs font-medium text-green-600 hover:underline"
                    >
                      Rediger
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/platform/product-template-list.tsx
git commit -m "feat(ui): add ProductTemplateList with filters and table"
```

---

### Task A8: Product Template Form Component

**Files:**
- Create: `src/components/platform/product-template-form.tsx`

- [ ] **Step 1: Create the form component**

This is a large form with all the fields from the spec. Key sections:
- Basic info (brand, model, display_name, category)
- Storage options (chip multi-select)
- Color options (chip multi-select)
- Pricing per grade (A/B/C)
- Description + short description
- SEO fields (meta_title, meta_description, slug)
- Images (using ProductImageUploader)
- Specifications (key-value pairs)
- Status toggle (draft/published)

```typescript
// src/components/platform/product-template-form.tsx
"use client";

import { useState } from "react";
import type { ProductTemplate } from "@/lib/supabase/platform-types";
import { ProductImageUploader } from "./product-image-uploader";

interface Props {
  template?: ProductTemplate | null;
  onSave: () => void;
  onCancel: () => void;
}

const CATEGORIES = [
  { value: "iphone", label: "iPhone" },
  { value: "smartphone", label: "Smartphone" },
  { value: "ipad", label: "iPad" },
  { value: "tablet", label: "Tablet" },
  { value: "laptop", label: "Laptop" },
  { value: "smartwatch", label: "Smartwatch" },
  { value: "console", label: "Konsol" },
  { value: "accessory", label: "Tilbehør" },
  { value: "other", label: "Andet" },
];

const STORAGE_OPTIONS = ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"];

export function ProductTemplateForm({ template, onSave, onCancel }: Props) {
  const isEdit = !!template;

  const [form, setForm] = useState({
    brand: template?.brand ?? "",
    model: template?.model ?? "",
    display_name: template?.display_name ?? "",
    category: template?.category ?? "smartphone",
    storage_options: template?.storage_options ?? [],
    colors: template?.colors ?? [],
    base_price_a: template?.base_price_a ? String(template.base_price_a / 100) : "",
    base_price_b: template?.base_price_b ? String(template.base_price_b / 100) : "",
    base_price_c: template?.base_price_c ? String(template.base_price_c / 100) : "",
    description: template?.description ?? "",
    short_description: template?.short_description ?? "",
    meta_title: template?.meta_title ?? "",
    meta_description: template?.meta_description ?? "",
    slug: template?.slug ?? "",
    images: template?.images ?? [],
    specifications: template?.specifications ?? {},
    status: template?.status ?? "draft",
  });

  const [newColor, setNewColor] = useState("");
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleStorage(opt: string) {
    set(
      "storage_options",
      form.storage_options.includes(opt)
        ? form.storage_options.filter((s) => s !== opt)
        : [...form.storage_options, opt]
    );
  }

  function addColor() {
    if (newColor.trim() && !form.colors.includes(newColor.trim())) {
      set("colors", [...form.colors, newColor.trim()]);
      setNewColor("");
    }
  }

  function addSpec() {
    if (newSpecKey.trim()) {
      set("specifications", { ...form.specifications, [newSpecKey.trim()]: newSpecValue.trim() });
      setNewSpecKey("");
      setNewSpecValue("");
    }
  }

  function generateSlug() {
    const slug = form.display_name
      .toLowerCase()
      .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    set("slug", slug);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      base_price_a: form.base_price_a ? Math.round(parseFloat(form.base_price_a) * 100) : null,
      base_price_b: form.base_price_b ? Math.round(parseFloat(form.base_price_b) * 100) : null,
      base_price_c: form.base_price_c ? Math.round(parseFloat(form.base_price_c) * 100) : null,
    };

    try {
      const url = isEdit
        ? `/api/platform/templates/${template.id}`
        : "/api/platform/templates";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Kunne ikke gemme");
      } else {
        onSave();
      }
    } catch {
      setError("Netværksfejl — prøv igen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section: Basic info */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Grundoplysninger
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Brand</label>
            <input
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Model</label>
            <input
              value={form.model}
              onChange={(e) => set("model", e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Visningsnavn</label>
            <input
              value={form.display_name}
              onChange={(e) => set("display_name", e.target.value)}
              onBlur={() => !form.slug && generateSlug()}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-green-500/50 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Kategori</label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Section: Storage options */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Lagerkapacitet
        </h3>
        <div className="flex flex-wrap gap-2">
          {STORAGE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggleStorage(opt)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                form.storage_options.includes(opt)
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </section>

      {/* Section: Colors */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Farver
        </h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {form.colors.map((color) => (
            <span
              key={color}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm"
            >
              {color}
              <button
                type="button"
                onClick={() => set("colors", form.colors.filter((c) => c !== color))}
                className="text-stone-400 hover:text-red-500"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColor())}
            placeholder="Tilføj farve…"
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addColor}
            className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-300"
          >
            Tilføj
          </button>
        </div>
      </section>

      {/* Section: Pricing per grade */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Priser pr. grade (DKK)
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {(["A", "B", "C"] as const).map((grade) => {
            const key = `base_price_${grade.toLowerCase()}` as keyof typeof form;
            return (
              <div key={grade}>
                <label className="mb-1 block text-xs font-semibold text-stone-500">
                  Grade {grade}
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={form[key] as string}
                  onChange={(e) => set(key, e.target.value as never)}
                  placeholder="0"
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Section: Description */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Beskrivelse
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Kort beskrivelse</label>
            <input
              value={form.short_description}
              onChange={(e) => set("short_description", e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
              maxLength={200}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Fuld beskrivelse</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={6}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Section: SEO */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          SEO
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">URL-slug</label>
            <div className="flex gap-2">
              <input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
                required
              />
              <button type="button" onClick={generateSlug} className="rounded-xl bg-stone-200 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-300">
                Generer
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Meta titel</label>
            <input
              value={form.meta_title}
              onChange={(e) => set("meta_title", e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
              maxLength={70}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-500">Meta beskrivelse</label>
            <textarea
              value={form.meta_description}
              onChange={(e) => set("meta_description", e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm"
              maxLength={160}
            />
          </div>
        </div>
      </section>

      {/* Section: Images */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Billeder
        </h3>
        <ProductImageUploader
          images={form.images}
          onChange={(imgs) => set("images", imgs)}
          folder={`templates/${template?.id ?? "new"}`}
          max={8}
        />
      </section>

      {/* Section: Specifications */}
      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-400">
          Specifikationer
        </h3>
        {Object.entries(form.specifications).length > 0 && (
          <div className="mb-4 space-y-2">
            {Object.entries(form.specifications).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="min-w-[120px] text-sm font-medium text-stone-600">{key}</span>
                <span className="text-sm text-stone-500">{value as string}</span>
                <button
                  type="button"
                  onClick={() => {
                    const specs = { ...form.specifications };
                    delete specs[key];
                    set("specifications", specs);
                  }}
                  className="ml-auto text-xs text-red-500 hover:underline"
                >
                  Fjern
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={newSpecKey}
            onChange={(e) => setNewSpecKey(e.target.value)}
            placeholder="Nøgle (f.eks. Skærm)"
            className="w-36 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
          />
          <input
            value={newSpecValue}
            onChange={(e) => setNewSpecValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSpec())}
            placeholder="Værdi (f.eks. 6.1 tommer)"
            className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addSpec}
            className="rounded-xl bg-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-300"
          >
            Tilføj
          </button>
        </div>
      </section>

      {/* Status + actions */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.status === "published"}
            onChange={(e) => set("status", e.target.checked ? "published" : "draft")}
            className="h-4 w-4 rounded border-stone-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-sm font-medium text-stone-700">Publiceret</span>
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-stone-200 bg-white px-6 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            Annuller
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-green-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-green-600/20 hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Gemmer…" : isEdit ? "Gem ændringer" : "Opret skabelon"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/platform/product-template-form.tsx
git commit -m "feat(ui): add ProductTemplateForm with all fields from spec"
```

---

### Task A9: SKU Product List & Form Components

**Files:**
- Create: `src/components/platform/sku-product-list.tsx`
- Create: `src/components/platform/sku-product-form.tsx`

- [ ] **Step 1: Create SkuProductList**

Same pattern as `ProductTemplateList` but for SKU products:
- Columns: thumbnail, title, category, selling_price, total stock, status
- Filters: category, status, search
- Use `formatDKK()` for price display

Follow the exact same structure as Task A7 but query `/api/platform/sku` and display SKU-specific columns.

- [ ] **Step 2: Create SkuProductForm**

Same pattern as `ProductTemplateForm` but for SKU products:
- Fields: title, short_description, description, category, selling_price, cost_price, images, variants, barcode, slug, meta_title, meta_description, status
- Compatible templates section: search and link product_templates via `/api/platform/sku-product-templates`
- Variant editor: add variant groups (name + options array)
- Use `ProductImageUploader` with folder `sku/{id}`

Follow the exact same structure as Task A8 but with SKU-specific fields.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/platform/sku-product-list.tsx src/components/platform/sku-product-form.tsx
git commit -m "feat(ui): add SkuProductList and SkuProductForm components"
```

---

### Task A10: Products Admin Page (Two-Tab Layout)

**Files:**
- Create: `src/app/(admin)/admin/platform/products/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// src/app/(admin)/admin/platform/products/page.tsx
"use client";

import { useState } from "react";
import type { ProductTemplate, SkuProduct } from "@/lib/supabase/platform-types";
import { ProductTemplateList } from "@/components/platform/product-template-list";
import { ProductTemplateForm } from "@/components/platform/product-template-form";
import { SkuProductList } from "@/components/platform/sku-product-list";
import { SkuProductForm } from "@/components/platform/sku-product-form";

type Tab = "templates" | "sku";
type View = "list" | "form";

export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>("templates");
  const [view, setView] = useState<View>("list");
  const [editTemplate, setEditTemplate] = useState<ProductTemplate | null>(null);
  const [editSku, setEditSku] = useState<SkuProduct | null>(null);

  function handleEditTemplate(t: ProductTemplate) {
    setEditTemplate(t);
    setView("form");
  }

  function handleEditSku(s: SkuProduct) {
    setEditSku(s);
    setView("form");
  }

  function handleBack() {
    setView("list");
    setEditTemplate(null);
    setEditSku(null);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Produkter</h1>
          <p className="mt-1 text-sm text-stone-400">
            Administrer enhedsskabeloner og tilbehør
          </p>
        </div>
        {view === "list" && (
          <button
            onClick={() => {
              setEditTemplate(null);
              setEditSku(null);
              setView("form");
            }}
            className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-green-600/20 hover:brightness-110"
          >
            {tab === "templates" ? "Opret skabelon" : "Opret produkt"}
          </button>
        )}
      </div>

      {/* Tabs */}
      {view === "list" && (
        <div className="flex gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1">
          <button
            onClick={() => setTab("templates")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === "templates"
                ? "bg-white text-stone-800 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Enheder
          </button>
          <button
            onClick={() => setTab("sku")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === "sku"
                ? "bg-white text-stone-800 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Tilbehør / SKU
          </button>
        </div>
      )}

      {/* Content */}
      {view === "list" ? (
        tab === "templates" ? (
          <ProductTemplateList onEdit={handleEditTemplate} />
        ) : (
          <SkuProductList onEdit={handleEditSku} />
        )
      ) : tab === "templates" ? (
        <ProductTemplateForm
          template={editTemplate}
          onSave={handleBack}
          onCancel={handleBack}
        />
      ) : (
        <SkuProductForm
          product={editSku}
          onSave={handleBack}
          onCancel={handleBack}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Test in browser**

Navigate to `http://localhost:3000/admin/platform/products`
Expected: Two-tab layout, empty list (no products yet), "Opret skabelon" button visible

- [ ] **Step 4: Commit**

```bash
git add src/app/\(admin\)/admin/platform/products/page.tsx
git commit -m "feat(admin): add products page with template and SKU tabs"
```

---

### Task A11: Phase A Integration Test

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: 0 source code errors

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All existing tests still pass

- [ ] **Step 3: Run build**

Run: `npx next build`
Expected: Build succeeds

- [ ] **Step 4: Manual test in browser**

1. Navigate to `/admin/platform/products`
2. Verify tabs switch between Enheder and Tilbehør
3. Click "Opret skabelon" — verify form renders with all sections
4. Fill in basic fields and try saving
5. Switch to Tilbehør tab, click "Opret produkt"
6. Test image upload (if Supabase Storage bucket exists)

- [ ] **Step 5: Commit Phase A complete**

```bash
git add -A
git commit -m "feat: complete Phase A — product management admin with templates, SKU products, and image upload"
```

---

## Chunk 2: Phase B — Orders Upgrade

### Task B1: Orders Database Migration

**Files:**
- Create: `src/lib/supabase/migrations/005_orders_upgrade.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 005_orders_upgrade.sql
-- Adds payment_status, fulfillment_status, and tracking fields to orders

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
      CHECK (payment_status IN ('pending', 'paid', 'refunded', 'partially_refunded'));
  END IF;
END $$;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_status text DEFAULT 'unfulfilled';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_fulfillment_status_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_status_check
      CHECK (fulfillment_status IN ('unfulfilled', 'processing', 'shipped', 'delivered', 'returned'));
  END IF;
END $$;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_order_id text;

-- Expand type CHECK to include 'draft' and 'shopify'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_type_check
  CHECK (type IN ('online', 'pos', 'draft', 'shopify'));

-- Backfill payment_status for existing orders
UPDATE orders SET payment_status = 'paid' WHERE status IN ('confirmed', 'shipped', 'picked_up', 'delivered') AND payment_status = 'pending';
UPDATE orders SET payment_status = 'refunded' WHERE status = 'refunded' AND payment_status = 'pending';

-- Backfill fulfillment_status for existing orders
UPDATE orders SET fulfillment_status = 'shipped' WHERE status = 'shipped' AND fulfillment_status = 'unfulfilled';
UPDATE orders SET fulfillment_status = 'delivered' WHERE status IN ('delivered', 'picked_up') AND fulfillment_status = 'unfulfilled';
```

- [ ] **Step 2: Run migration, verify no errors**

- [ ] **Step 3: Update platform types**

In `platform-types.ts`, update the `OrderType` union to include new types:

```typescript
export type OrderType = 'online' | 'pos' | 'draft' | 'shopify';
```

Add `shopify_order_id` to the `Order` interface (needed for Shopify history export in Phase E):

```typescript
shopify_order_id: string | null;
```

Add new fields to `Order` interface:

```typescript
payment_status: "pending" | "paid" | "refunded" | "partially_refunded";
fulfillment_status: "unfulfilled" | "processing" | "shipped" | "delivered" | "returned";
tracking_url: string | null;
internal_notes: string | null;
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/migrations/005_orders_upgrade.sql src/lib/supabase/platform-types.ts
git commit -m "feat(db): add payment_status, fulfillment_status, and tracking to orders"
```

---

### Task B2: Fulfillment Card Component

**Files:**
- Create: `src/components/admin/orders/fulfillment-card.tsx`

- [ ] **Step 1: Create the component**

A card showing fulfillment status with actions to mark as shipped/delivered. When "Marker som afsendt" is clicked, shows a modal to enter carrier and tracking number. Posts to `/api/shipping/orders/[id]/fulfill`.

- [ ] **Step 2: Run type check**
- [ ] **Step 3: Commit**

```bash
git add src/components/admin/orders/fulfillment-card.tsx
git commit -m "feat(ui): add FulfillmentCard with ship/deliver actions"
```

---

### Task B3: Payment Card Component

**Files:**
- Create: `src/components/admin/orders/payment-card.tsx`

- [ ] **Step 1: Create the component**

Shows payment status badge, Stripe payment link, and refund button. Stripe dashboard link format: `https://dashboard.stripe.com/payments/{stripe_payment_id}`. Uses existing refund dialog.

- [ ] **Step 2: Run type check**
- [ ] **Step 3: Commit**

```bash
git add src/components/admin/orders/payment-card.tsx
git commit -m "feat(ui): add PaymentCard with Stripe link and refund"
```

---

### Task B4: Order Timeline Component

**Files:**
- Create: `src/components/admin/orders/order-timeline.tsx`

- [ ] **Step 1: Create the component**

Fetches `activity_log` entries for the order (`entity_type = 'order'`, `entity_id = orderId`). Displays chronologically with icons per action type (created, paid, shipped, delivered, refunded).

- [ ] **Step 2: Run type check**
- [ ] **Step 3: Commit**

```bash
git add src/components/admin/orders/order-timeline.tsx
git commit -m "feat(ui): add OrderTimeline showing activity log entries"
```

---

### Task B5: Fulfillment API Endpoint

**Files:**
- Create: `src/app/api/shipping/orders/[id]/fulfill/route.ts`
- Create: `src/lib/email/templates/shipping-notification.tsx`

- [ ] **Step 1: Create fulfill endpoint**

```typescript
// POST body: { tracking_number, tracking_url?, carrier? }
// Updates: orders.fulfillment_status = 'shipped', orders.shipped_at = now()
//          orders.tracking_number, orders.tracking_url, orders.status = 'shipped'
// Logs to activity_log
// Optionally sends shipping notification email
```

- [ ] **Step 2: Create shipping notification email template**

Danish email template using @react-email/components:
- Subject: `Din ordre ${orderNumber} er afsendt`
- Body: order items, tracking number, tracking link, estimated delivery

- [ ] **Step 3: Run type check**
- [ ] **Step 4: Commit**

```bash
git add src/app/api/shipping/orders/\[id\]/fulfill/route.ts src/lib/email/templates/shipping-notification.tsx
git commit -m "feat(api): add order fulfillment endpoint with shipping notification email"
```

---

### Task B6: Enhanced Order List

**Files:**
- Modify: `src/components/admin/orders/order-list.tsx`
- Modify: `src/app/(admin)/admin/platform/orders/page.tsx`

- [ ] **Step 1: Read current order-list.tsx**

Understand existing columns, filters, and data fetching.

- [ ] **Step 2: Add new columns**

Add: payment_status badge, fulfillment_status badge, type/channel column.

- [ ] **Step 3: Add filter tabs with counts**

Add tabs: "Alle · Ubehandlet · Afsendt · Refunderet" with live counts from the data.

- [ ] **Step 4: Add search**

Search by order_number, customer name, or email.

- [ ] **Step 5: Add bulk actions**

Add checkbox column for multi-select. When orders are selected, show a bulk actions bar with:
- "Marker som afsendt" — bulk fulfill selected orders (POST to fulfill endpoint for each)
- "Eksporter CSV" — download selected orders as CSV (order_number, date, customer, total, status)
- "Print pakkelabels" — open print dialog with packing slip layout for all selected orders

- [ ] **Step 6: Run type check and tests**
- [ ] **Step 7: Commit**

```bash
git add src/components/admin/orders/order-list.tsx src/app/\(admin\)/admin/platform/orders/page.tsx
git commit -m "feat(ui): upgrade order list with status tabs, filters, bulk actions, and new columns"
```

---

### Task B7: Enhanced Order Detail (2-Column Layout)

**Files:**
- Modify: `src/components/admin/orders/order-detail.tsx`

- [ ] **Step 1: Read current order-detail.tsx**

Understand existing layout and what needs to change.

- [ ] **Step 2: Refactor to 2-column layout**

Left (wide): order items, FulfillmentCard, PaymentCard, OrderTimeline
Right (narrow): customer info, shipping address, internal notes, metadata

- [ ] **Step 3: Add internal notes**

Editable textarea that auto-saves on blur via PUT to `/api/shipping/orders/[id]`.

- [ ] **Step 4: Add actions dropdown**

Print invoice, print packing slip, resend confirmation, cancel order.

- [ ] **Step 5: Run type check and tests**
- [ ] **Step 6: Commit**

```bash
git add src/components/admin/orders/order-detail.tsx
git commit -m "feat(ui): upgrade order detail with 2-column layout, fulfillment, and timeline"
```

---

### Task B8: Phase B Integration Test

- [ ] **Step 1: Run full type check, all tests, and build**
- [ ] **Step 2: Manual test in browser**

1. `/admin/platform/orders` — verify new columns, tabs, filters, search
2. Click an order — verify 2-column layout, fulfillment card, payment card, timeline
3. Test "Marker som afsendt" flow

- [ ] **Step 3: Commit Phase B complete**

```bash
git add -A
git commit -m "feat: complete Phase B — enhanced orders with fulfillment tracking and timeline"
```

---

## Chunk 3: Phase C — Draft Orders

### Task C1: Draft Orders Database Migration

**Files:**
- Create: `src/lib/supabase/migrations/006_draft_orders.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 006_draft_orders.sql
-- Creates draft_orders table and adds draft_order_id to repair_tickets

CREATE TABLE IF NOT EXISTS draft_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  customer_email text,
  customer_name text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'converting', 'cancelled')),
  line_items jsonb NOT NULL DEFAULT '[]',
  subtotal integer NOT NULL DEFAULT 0,
  discount_amount integer DEFAULT 0,
  shipping_cost integer DEFAULT 0,
  tax_amount integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  currency text DEFAULT 'DKK',
  internal_note text,
  customer_note text,
  payment_url text,
  stripe_session_id text,
  paid_at timestamptz,
  converted_order_id uuid REFERENCES orders(id),
  repair_ticket_id uuid REFERENCES repair_tickets(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_draft_orders_status ON draft_orders(status);
CREATE INDEX IF NOT EXISTS idx_draft_orders_customer ON draft_orders(customer_id);

-- Add draft_order_id to repair_tickets (new reference, shopify_draft_order_id kept for now)
ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS draft_order_id uuid REFERENCES draft_orders(id);

-- Sequence for draft numbers
CREATE SEQUENCE IF NOT EXISTS draft_order_number_seq START WITH 1001;
```

- [ ] **Step 2: Add DraftOrder type to platform-types.ts**

```typescript
export interface DraftOrder {
  id: string;
  draft_number: string;
  customer_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  status: "draft" | "sent" | "paid" | "converting" | "cancelled";
  line_items: DraftLineItem[];
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  tax_amount: number;
  total: number;
  currency: string;
  internal_note: string | null;
  customer_note: string | null;
  payment_url: string | null;
  stripe_session_id: string | null;
  paid_at: string | null;
  converted_order_id: string | null;
  repair_ticket_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DraftLineItem {
  type: "device" | "sku" | "custom";
  id?: string;
  title: string;
  quantity: number;
  unit_price: number; // øre
  tax_rate: number;   // 0.25 for 25% moms, variable for brugtmoms
}
```

- [ ] **Step 3: Run migration, commit**

```bash
git add src/lib/supabase/migrations/006_draft_orders.sql src/lib/supabase/platform-types.ts
git commit -m "feat(db): add draft_orders table and DraftOrder types"
```

---

### Task C2: Draft Order Conversion Logic

**Files:**
- Create: `src/lib/draft-orders/convert.ts`

- [ ] **Step 1: Create the conversion function**

```typescript
// src/lib/draft-orders/convert.ts
// Handles the C4 flow: draft → order conversion with idempotency
```

Function `convertDraftToOrder(draftOrderId: string)`:
1. Fetch draft order, verify `converted_order_id IS NULL` and `status !== 'converting'`
2. Set status to `'converting'` atomically
3. Create order in `orders` table with `type: 'draft'`
4. Create `order_items` for each line item
5. Update device status to 'sold' if device items
6. Decrement SKU stock if SKU items
7. Generate warranty if applicable
8. Set `converted_order_id` and `status = 'paid'`
9. If `repair_ticket_id` set, update repair ticket
10. Log to `activity_log`
11. On failure after step 2, set status back to `'sent'`

- [ ] **Step 2: Run type check**
- [ ] **Step 3: Commit**

```bash
git add src/lib/draft-orders/convert.ts
git commit -m "feat: add draft order to order conversion with idempotency"
```

---

### Task C3: Draft Order API Routes

**Files:**
- Create: `src/app/api/platform/draft-orders/route.ts`
- Create: `src/app/api/platform/draft-orders/[id]/route.ts`
- Create: `src/app/api/platform/draft-orders/[id]/send/route.ts`
- Create: `src/app/api/platform/draft-orders/[id]/mark-paid/route.ts`

- [ ] **Step 1: Create list/create endpoint**

GET: list draft orders with optional status filter
POST: create draft order, auto-generate draft_number from sequence

- [ ] **Step 2: Create detail/update/delete endpoint**

GET by id, PUT to update, DELETE to cancel

- [ ] **Step 3: Create send-invoice endpoint**

POST: creates Stripe Checkout Session with `metadata: { draft_order_id }`, sends invoice email, sets status to 'sent'

- [ ] **Step 4: Create mark-paid endpoint**

POST: for cash/transfer payments, calls `convertDraftToOrder()` directly

- [ ] **Step 5: Run type check**
- [ ] **Step 6: Commit**

```bash
git add src/app/api/platform/draft-orders/
git commit -m "feat(api): add draft order CRUD, send-invoice, and mark-paid endpoints"
```

---

### Task C4: Invoice Email Template

**Files:**
- Create: `src/lib/email/templates/invoice-email.tsx`

- [ ] **Step 1: Create the template**

Using @react-email/components pattern (same as warranty-certificate.tsx):
- From: `ordre@phonespot.dk`
- Subject: `Faktura {draftNumber} fra PhoneSpot`
- Body: line items table with title, qty, unit price, line total. Summary with subtotal, tax, total. Customer note if present. "Betal nu" button linking to payment_url.

- [ ] **Step 2: Run type check**
- [ ] **Step 3: Commit**

```bash
git add src/lib/email/templates/invoice-email.tsx
git commit -m "feat(email): add invoice email template for draft orders"
```

---

### Task C5: Extend Stripe Webhook for Draft Orders

**Files:**
- Modify: `src/lib/stripe/webhook.ts`

- [ ] **Step 1: Read current webhook handler**
- [ ] **Step 2: Add draft order handling**

In `handleCheckoutCompleted`, check for `session.metadata?.draft_order_id`:
```typescript
if (session.metadata?.draft_order_id) {
  await convertDraftToOrder(session.metadata.draft_order_id);
  return;
}
// ... existing order handling
```

- [ ] **Step 3: Run type check and tests**
- [ ] **Step 4: Commit**

```bash
git add src/lib/stripe/webhook.ts
git commit -m "feat(stripe): handle draft order payments in webhook"
```

---

### Task C6: Draft Order Admin Pages

**Files:**
- Create: `src/components/platform/draft-order-list.tsx`
- Create: `src/components/platform/draft-order-form.tsx`
- Create: `src/components/platform/line-item-editor.tsx`
- Create: `src/app/(admin)/admin/platform/draft-orders/page.tsx`
- Create: `src/app/(admin)/admin/platform/draft-orders/new/page.tsx`
- Create: `src/app/(admin)/admin/platform/draft-orders/[id]/page.tsx`

- [ ] **Step 1: Create LineItemEditor component**

Reusable component for adding/editing line items:
- "Tilføj enhed" button — opens device search (barcode/model)
- "Tilføj produkt" button — opens SKU product search
- "Tilføj brugerdefineret" button — inline free-text with price
- Each item: title, quantity, unit price (editable), tax rate, calculated line total
- Remove button per item
- Running subtotal/tax/total calculation

- [ ] **Step 2: Create DraftOrderForm**

Customer search/create, LineItemEditor, discount, shipping, notes (internal + customer). Action buttons: Gem kladde, Send faktura, Marker som betalt.

- [ ] **Step 3: Create DraftOrderList**

Table with draft_number, date, customer, status badge, total. Filter tabs: draft/sent/paid/cancelled.

- [ ] **Step 4: Create admin pages**

List page, new page (wraps form), detail page (wraps form with existing data).

- [ ] **Step 5: Run type check and build**
- [ ] **Step 6: Commit**

```bash
git add src/components/platform/draft-order-list.tsx src/components/platform/draft-order-form.tsx src/components/platform/line-item-editor.tsx src/app/\(admin\)/admin/platform/draft-orders/
git commit -m "feat(admin): add draft orders pages with list, form, and line item editor"
```

---

### Task C7: Migrate Repair Invoicing from Shopify

**Files:**
- Modify: `src/app/api/repairs/checkout/route.ts`
- Modify: `src/app/api/intake/route.ts`

- [ ] **Step 1: Read current repair checkout route**

Understand how it creates Shopify draft orders.

- [ ] **Step 2: Replace Shopify draft order with custom draft order**

Instead of `createDraftOrder()` from Shopify admin client:
1. Create a `draft_orders` row with `repair_ticket_id`
2. Create Stripe Checkout Session with `metadata: { draft_order_id }`
3. Send invoice email
4. Update repair ticket with `draft_order_id`

- [ ] **Step 3: Same for intake route**
- [ ] **Step 4: Run type check**
- [ ] **Step 5: Commit**

```bash
git add src/app/api/repairs/checkout/route.ts src/app/api/intake/route.ts
git commit -m "feat: migrate repair invoicing from Shopify to custom draft orders"
```

---

### Task C8: Phase C Integration Test

- [ ] **Step 1: Run full type check, all tests, and build**
- [ ] **Step 2: Manual test**

1. `/admin/platform/draft-orders` — verify list renders
2. Click "Opret kladdeordre" — create a draft with custom line items
3. Test "Gem kladde" — verify it saves
4. Test "Send faktura" — verify Stripe session created (needs STRIPE_SECRET_KEY)
5. Test "Marker som betalt" — verify order appears in orders list

- [ ] **Step 3: Commit Phase C complete**

```bash
git add -A
git commit -m "feat: complete Phase C — draft orders with invoicing, Stripe integration, and repair migration"
```

---

## Chunk 4: Phase D — Abandoned Checkout Recovery

### Task D1: Abandoned Checkout Migration

**Files:**
- Create: `src/lib/supabase/migrations/007_abandoned_checkout.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 007_abandoned_checkout.sql
-- Adds abandoned checkout tracking and recovery fields to orders

-- Expand status CHECK to include 'abandoned'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'shipped', 'picked_up', 'delivered', 'cancelled', 'refunded', 'abandoned'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS abandoned_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recovery_status text DEFAULT 'none';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recovery_token text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recovery_email_sent_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recovery_sms_sent_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_recovery_status_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_recovery_status_check
      CHECK (recovery_status IN ('none', 'email_sent', 'sms_sent', 'both_sent', 'recovered'));
  END IF;
END $$;

-- Unique index on recovery_token (only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_recovery_token
  ON orders(recovery_token) WHERE recovery_token IS NOT NULL;
```

- [ ] **Step 2: Update Order type in platform-types.ts**

Update `OrderStatus` to include `'abandoned'`:

```typescript
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'picked_up' | 'delivered' | 'cancelled' | 'refunded' | 'abandoned';
```

Add recovery fields to the `Order` interface: `abandoned_at`, `recovery_status`, `recovery_token`, `recovery_email_sent_at`, `recovery_sms_sent_at`

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/migrations/007_abandoned_checkout.sql src/lib/supabase/platform-types.ts
git commit -m "feat(db): add abandoned checkout recovery fields to orders"
```

---

### Task D2: GatewayAPI SMS Integration

**Files:**
- Create: `src/lib/sms/gateway-api.ts`

- [ ] **Step 1: Create the SMS client**

```typescript
// src/lib/sms/gateway-api.ts

interface SendSmsParams {
  to: string;       // Danish phone number (+45XXXXXXXX or 45XXXXXXXX)
  message: string;
  sender?: string;
}

interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSms({
  to,
  message,
  sender,
}: SendSmsParams): Promise<SendSmsResult> {
  const token = process.env.GATEWAYAPI_TOKEN;
  if (!token) {
    console.warn("GATEWAYAPI_TOKEN not set, skipping SMS");
    return { success: false, error: "GATEWAYAPI_TOKEN not configured" };
  }

  // Normalize phone number to MSISDN format (no +, no spaces)
  const msisdn = to.replace(/[^0-9]/g, "").replace(/^0+/, "");
  const fullMsisdn = msisdn.startsWith("45") ? msisdn : `45${msisdn}`;

  const senderName = sender ?? process.env.SMS_SENDER_NAME ?? "PhoneSpot";

  try {
    const res = await fetch("https://gatewayapi.com/rest/mtsms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sender: senderName,
        message,
        recipients: [{ msisdn: parseInt(fullMsisdn, 10) }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `GatewayAPI error: ${res.status} ${text}` };
    }

    const data = await res.json();
    return { success: true, messageId: String(data.ids?.[0] ?? "") };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/sms/gateway-api.ts
git commit -m "feat: add GatewayAPI SMS integration"
```

---

### Task D3: Modify Reservation Release Cron

**Files:**
- Modify: `src/app/api/cron/release-reservations/route.ts`

- [ ] **Step 1: Read current cron**
- [ ] **Step 2: Add abandoned marking**

When releasing expired reservations:
1. Set `orders.status = 'abandoned'`
2. Set `orders.abandoned_at = now()`
3. Generate `recovery_token` (crypto.randomBytes(32).toString('hex'))
4. Release device reservations (existing logic)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/release-reservations/route.ts
git commit -m "feat: mark expired reservations as abandoned with recovery token"
```

---

### Task D4: Abandoned Cart Recovery Email

**Files:**
- Create: `src/lib/email/templates/abandoned-cart-email.tsx`

- [ ] **Step 1: Create the template**

- Subject: `Du glemte noget i din kurv hos PhoneSpot`
- Body: product images and names from order_items, "Gennemfør dit køb" button linking to `/checkout/recover/{token}`

- [ ] **Step 2: Commit**

```bash
git add src/lib/email/templates/abandoned-cart-email.tsx
git commit -m "feat(email): add abandoned cart recovery email template"
```

---

### Task D5: Recovery Cron

**Files:**
- Create: `src/app/api/cron/recovery/route.ts`

- [ ] **Step 1: Create the recovery cron**

Runs every 30 minutes. Finds abandoned orders and sends recovery email (after 1 hour) and SMS (after 3 hours, with marketing consent check and per-customer 24h throttle).

- [ ] **Step 2: Add to vercel.json cron schedule**

```json
{ "path": "/api/cron/recovery", "schedule": "*/30 * * * *" }
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/recovery/route.ts vercel.json
git commit -m "feat: add automated abandoned checkout recovery cron (email + SMS)"
```

---

### Task D6: Recovery Page

**Files:**
- Create: `src/app/checkout/recover/[token]/page.tsx`

- [ ] **Step 1: Create the page**

Server component that:
1. Looks up order by recovery_token
2. Checks item availability
3. If available: calls checkout API to create new Stripe session with re-reserved devices
4. If partially available: shows available items, lets customer proceed
5. If unavailable: shows "udsolgt" with link to similar products
6. If already recovered: shows success message

- [ ] **Step 2: Commit**

```bash
git add src/app/checkout/recover/\[token\]/page.tsx
git commit -m "feat: add checkout recovery page with atomic device re-reservation"
```

---

### Task D7: Abandoned Checkouts Admin Page

**Files:**
- Create: `src/app/(admin)/admin/platform/abandoned-checkouts/page.tsx`
- Create: `src/components/platform/abandoned-checkout-list.tsx`

- [ ] **Step 1: Create admin page and list component**

Table: date, customer, email, phone, items summary, total, recovery status badge.
Actions: "Send email", "Send SMS" buttons per row.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(admin\)/admin/platform/abandoned-checkouts/ src/components/platform/abandoned-checkout-list.tsx
git commit -m "feat(admin): add abandoned checkouts page with manual recovery actions"
```

---

### Task D8: Phase D Integration Test

- [ ] **Step 1: Run full type check, all tests, and build**
- [ ] **Step 2: Commit Phase D complete**

```bash
git add -A
git commit -m "feat: complete Phase D — abandoned checkout recovery with email, SMS, and admin page"
```

---

## Chunk 5: Phase E — Storefront Migration

### Task E1: Search Vector Migration

**Files:**
- Create: `src/lib/supabase/migrations/008_search_vectors.sql`

- [ ] **Step 1: Write the migration**

Add `search_vector tsvector` columns with GIN indexes and triggers for Danish full-text search on both `product_templates` and `sku_products`. See spec for exact SQL.

- [ ] **Step 2: Commit**

```bash
git add src/lib/supabase/migrations/008_search_vectors.sql
git commit -m "feat(db): add full-text search vectors with Danish stemming"
```

---

### Task E2: Supabase Product Queries Library

**Files:**
- Create: `src/lib/supabase/product-queries.ts`

- [ ] **Step 1: Create the query library**

```typescript
// src/lib/supabase/product-queries.ts
// Replaces all Shopify getCollectionProducts/getProduct calls

import { createServerClient } from "./client";
import type { ProductTemplate, SkuProduct } from "./platform-types";

interface TemplateWithStock extends ProductTemplate {
  device_count: number;
  min_price: number | null;
}

export async function getPublishedTemplates(
  category?: string,
  filters?: {
    brand?: string;
    storage?: string;
    grade?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  }
): Promise<TemplateWithStock[]> {
  // Query product_templates with status = 'published'
  // Join devices to get count and min price
  // Apply filters
  // Return sorted results
}

export async function getTemplateBySlug(slug: string): Promise<ProductTemplate | null> {
  // Single template by slug
}

export async function getAvailableDevices(templateId: string): Promise<Device[]> {
  // Devices with status = 'available' for a template
  // Grouped by grade/storage/color
}

export async function getPublishedSkuProducts(
  category?: string,
  templateId?: string
): Promise<SkuProduct[]> {
  // SKU products with status = 'published'
  // Optional filter by category or compatible template
}

export async function getSkuProductBySlug(slug: string): Promise<SkuProduct | null> {
  // Single SKU product by slug
}

export async function searchProducts(query: string): Promise<{
  templates: ProductTemplate[];
  skuProducts: SkuProduct[];
}> {
  // Full-text search using search_vector columns
  // Uses plainto_tsquery('danish', query)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/supabase/product-queries.ts
git commit -m "feat: add Supabase product query library replacing Shopify client"
```

---

### Task E3: PhoneHero-style UI Components

**Files:**
- Create: `src/components/product/category-hero.tsx`
- Create: `src/components/product/sidebar-filters.tsx`
- Create: `src/components/product/product-grid-card.tsx`
- Create: `src/components/product/device-detail.tsx`
- Create: `src/components/product/grade-selector.tsx`
- Create: `src/components/product/storage-selector.tsx`
- Create: `src/components/product/color-selector.tsx`
- Create: `src/components/product/specifications-table.tsx`
- Create: `src/components/product/accessory-detail.tsx`

- [ ] **Step 1: Create CategoryHero** — full-width gradient banner with title and product count
- [ ] **Step 2: Create SidebarFilters** — brand, model, storage, grade, price range, color, stock toggle
- [ ] **Step 3: Create ProductGridCard** — product image, model name, "fra X kr", grade badge, stock count
- [ ] **Step 4: Create GradeSelector** — A/B/C toggle with prices and tooltip explanations
- [ ] **Step 5: Create StorageSelector** — chip buttons for each storage option
- [ ] **Step 6: Create ColorSelector** — color swatches
- [ ] **Step 7: Create SpecificationsTable** — key-value table from specifications jsonb
- [ ] **Step 8: Create DeviceDetail** — full product detail page layout (gallery + info + below-fold)
- [ ] **Step 9: Create AccessoryDetail** — accessory product detail with variants

- [ ] **Step 10: Commit**

```bash
git add src/components/product/category-hero.tsx src/components/product/sidebar-filters.tsx src/components/product/product-grid-card.tsx src/components/product/device-detail.tsx src/components/product/grade-selector.tsx src/components/product/storage-selector.tsx src/components/product/color-selector.tsx src/components/product/specifications-table.tsx src/components/product/accessory-detail.tsx
git commit -m "feat(ui): add PhoneHero-style storefront components"
```

---

### Task E4: Migrate Category Pages

**Files:**
- Modify: `src/app/iphones/page.tsx`
- Modify: `src/app/ipads/page.tsx`
- Modify: `src/app/smartphones/page.tsx`
- Modify: `src/app/smartwatches/page.tsx`
- Modify: `src/app/baerbare/page.tsx`

- [ ] **Step 1: Read one existing category page**

Understand the current Shopify-based structure.

- [ ] **Step 2: Replace data source**

For each page:
1. Remove `import { getCollectionProducts } from "@/lib/shopify/client"`
2. Import `{ getPublishedTemplates } from "@/lib/supabase/product-queries"`
3. Replace `getCollectionProducts("iphones")` with `getPublishedTemplates("iphone")`
4. Use `CategoryHero`, `SidebarFilters`, `ProductGridCard` components
5. Keep SEO metadata (title, description, canonical)

- [ ] **Step 3: Repeat for all 5 category pages**
- [ ] **Step 4: Run type check**
- [ ] **Step 5: Commit**

```bash
git add src/app/iphones/ src/app/ipads/ src/app/smartphones/ src/app/smartwatches/ src/app/baerbare/
git commit -m "feat: migrate category pages from Shopify to Supabase with PhoneHero-style design"
```

---

### Task E5: New Product Detail Page

**Files:**
- Create: `src/app/refurbished/[slug]/page.tsx`

- [ ] **Step 1: Create the page**

Server component that:
1. Fetches template by slug via `getTemplateBySlug(slug)`
2. Fetches available devices via `getAvailableDevices(templateId)`
3. Fetches compatible accessories via `getPublishedSkuProducts(undefined, templateId)`
4. Renders `DeviceDetail` component with all data
5. Generates proper metadata for SEO

- [ ] **Step 2: Commit**

```bash
git add src/app/refurbished/\[slug\]/page.tsx
git commit -m "feat: add new product detail page with grade/storage/color selection"
```

---

### Task E6: Migrate Accessory Pages

**Files:**
- Modify: `src/app/tilbehoer/page.tsx`
- Modify: `src/app/tilbehoer/[category]/page.tsx`
- Create: `src/app/tilbehoer/[category]/[slug]/page.tsx`

- [ ] **Step 1: Migrate main tilbehoer page from Shopify to Supabase**
- [ ] **Step 2: Migrate category page**
- [ ] **Step 3: Create accessory detail page**
- [ ] **Step 4: Commit**

```bash
git add src/app/tilbehoer/
git commit -m "feat: migrate accessory pages from Shopify to Supabase"
```

---

### Task E7: Migrate Search

**Files:**
- Modify: `src/app/api/search/route.ts`

- [ ] **Step 1: Read current search route**
- [ ] **Step 2: Replace Shopify search with Supabase full-text search**

Use `searchProducts(query)` from product-queries.ts. Return combined results from templates and SKU products.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/search/route.ts
git commit -m "feat: migrate search from Shopify to Supabase full-text search"
```

---

### Task E8: Shopify Order History Export Script

**Files:**
- Create: `scripts/export-shopify-orders.ts`

- [ ] **Step 1: Create the export script**

One-time script that:
1. Fetches all orders from Shopify Admin API (paginated, 250 per page)
2. For each order: maps customer data, creates/finds customer in Supabase
3. Inserts order into `orders` table with `type: 'shopify'`
4. Logs progress

- [ ] **Step 2: Commit**

```bash
git add scripts/export-shopify-orders.ts
git commit -m "feat: add one-time Shopify order history export script"
```

---

### Task E9: Update Product Feeds

**Files:**
- Modify: `src/app/api/feeds/google/route.ts`
- Modify: `src/app/api/feeds/pricerunner/route.ts`

- [ ] **Step 1: Check if feeds already use Supabase**

The feeds may already query Supabase. If so, verify they use the new `status = 'published'` filter instead of `is_active = true`.

- [ ] **Step 2: Update if needed**
- [ ] **Step 3: Commit**

```bash
git add src/app/api/feeds/
git commit -m "feat: update product feeds to use new status column"
```

---

### Task E10: Phase E Integration Test & Cleanup

- [ ] **Step 1: Run full type check, all tests, and build**
- [ ] **Step 2: Remove Shopify imports**

Search for remaining `@/lib/shopify` imports. Remove any that are no longer used. Keep the Shopify client files for now (in case rollback needed), but remove unused imports from pages.

- [ ] **Step 3: Manual test**

1. Visit `/iphones` — verify PhoneHero-style layout with Supabase data
2. Click a product — verify detail page with grade/storage/color selectors
3. Visit `/tilbehoer` — verify accessories from Supabase
4. Test search — verify results come from Supabase
5. Verify product feeds still work

- [ ] **Step 4: Commit Phase E complete**

```bash
git add -A
git commit -m "feat: complete Phase E — storefront fully migrated from Shopify to Supabase"
```

---

## Final Checklist

After all phases are complete, go through the migration checklist from the spec:

- [ ] All product_templates have images, descriptions, prices, slugs
- [ ] All sku_products have images, descriptions, prices, slugs
- [ ] Category pages render from Supabase
- [ ] Product detail pages render from Supabase
- [ ] Search works from Supabase
- [ ] Draft orders work without Shopify
- [ ] Repair invoicing uses draft orders (not Shopify)
- [ ] Abandoned checkout recovery is active (email + SMS)
- [ ] Shopify order history exported to Supabase
- [ ] Product feeds updated to use new status column
- [ ] Email sending verified (Resend + phonespot.dk domain)
- [ ] SMS sending verified (GatewayAPI)
- [ ] Unused Shopify imports removed
