# Tilbehør System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete accessory management system with fast bulk creation, barcode support, click & collect reservations, and a redesigned public tilbehør page.

**Architecture:** New `accessories` and `reservations` tables in Supabase. Admin pages for CRUD + bulk creation with camera/barcode. Public API for product listing + reservation creation. SMS notifications via existing Gateway API. Store stock tracked separately from online stock.

**Tech Stack:** Next.js 16, Supabase (PostgreSQL + Storage), html5-qrcode (barcode scanning), Gateway API (SMS), Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-16-tilbehoer-system-design.md`

---

## Chunk 1: Database + Admin CRUD + Bulk Creation

### Task 1: Create Supabase tables via SQL

**Files:**
- Create: `src/lib/supabase/migrations/010_accessories_system.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Accessories table
CREATE TABLE IF NOT EXISTS accessories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  category text NOT NULL CHECK (category IN ('cover','screen_protector','charger','cable','audio','other')),
  brand text,
  compatible_models text[] DEFAULT '{}',
  price integer NOT NULL,
  cost_price integer DEFAULT 0,
  sku text UNIQUE,
  ean text,
  image_url text,
  description text,
  online_stock integer DEFAULT 0,
  store_stock integer DEFAULT 0,
  store_id text DEFAULT 'slagelse',
  status text DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_accessories_category ON accessories(category);
CREATE INDEX idx_accessories_status ON accessories(status);
CREATE INDEX idx_accessories_slug ON accessories(slug);
CREATE INDEX idx_accessories_ean ON accessories(ean);
CREATE INDEX idx_accessories_compatible ON accessories USING GIN(compatible_models);

-- Templates table
CREATE TABLE IF NOT EXISTS accessory_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  default_price integer,
  default_cost_price integer,
  image_url text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL CHECK (product_type IN ('accessory','device')),
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  store_id text NOT NULL DEFAULT 'slagelse',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','collected','expired','cancelled')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  ready_at timestamptz,
  collected_at timestamptz
);

CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_store ON reservations(store_id);
CREATE INDEX idx_reservations_product ON reservations(product_id);

-- RLS policies
ALTER TABLE accessories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published accessories" ON accessories FOR SELECT USING (status = 'published');
CREATE POLICY "Service role full access accessories" ON accessories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE accessory_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access templates" ON accessory_templates FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert reservations" ON reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read own reservations" ON reservations FOR SELECT USING (true);
CREATE POLICY "Service role full access reservations" ON reservations FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Run migration in Supabase SQL Editor**

Navigate to Supabase Dashboard → SQL Editor → paste and run.

- [ ] **Step 3: Commit migration file**

```bash
git add src/lib/supabase/migrations/010_accessories_system.sql
git commit -m "feat: add accessories, templates, reservations tables"
```

---

### Task 2: TypeScript types + Supabase queries

**Files:**
- Create: `src/lib/supabase/accessories.ts`
- Modify: `src/lib/supabase/platform-types.ts` (add types)

- [ ] **Step 1: Add types to platform-types.ts**

Add at the end of the file:

```typescript
// Accessories
export interface Accessory {
  id: string;
  name: string;
  slug: string;
  category: 'cover' | 'screen_protector' | 'charger' | 'cable' | 'audio' | 'other';
  brand: string | null;
  compatible_models: string[];
  price: number; // øre
  cost_price: number;
  sku: string | null;
  ean: string | null;
  image_url: string | null;
  description: string | null;
  online_stock: number;
  store_stock: number;
  store_id: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface AccessoryTemplate {
  id: string;
  name: string;
  category: string;
  default_price: number | null;
  default_cost_price: number | null;
  image_url: string | null;
  description: string | null;
  created_at: string;
}

export interface Reservation {
  id: string;
  product_type: 'accessory' | 'device';
  product_id: string;
  product_name: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  store_id: string;
  status: 'pending' | 'ready' | 'collected' | 'expired' | 'cancelled';
  created_at: string;
  expires_at: string;
  ready_at: string | null;
  collected_at: string | null;
}
```

- [ ] **Step 2: Create accessories query library**

Create `src/lib/supabase/accessories.ts`:

```typescript
import { createAdminClient } from "./admin";
import type { Accessory, AccessoryTemplate, Reservation } from "./platform-types";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function generateSku(category: string, brand: string): string {
  const prefix = category.slice(0, 3).toUpperCase();
  const brandCode = (brand || "GEN").slice(0, 3).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${brandCode}-${rand}`;
}

function generateInternalEan(): string {
  const prefix = "200";
  const body = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
  const digits = prefix + body;
  // Calculate check digit (EAN-13)
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return digits + check;
}

// ---- Accessories CRUD ----

export async function createAccessory(input: {
  name: string;
  category: string;
  brand?: string;
  compatible_models?: string[];
  price: number;
  cost_price?: number;
  ean?: string;
  image_url?: string;
  description?: string;
  online_stock?: number;
  store_stock?: number;
}): Promise<Accessory | null> {
  const supabase = createAdminClient();
  const slug = slugify(input.name) + "-" + Math.random().toString(36).slice(2, 6);
  const sku = generateSku(input.category, input.brand || "");

  const { data, error } = await supabase.from("accessories").insert({
    name: input.name,
    slug,
    category: input.category,
    brand: input.brand || null,
    compatible_models: input.compatible_models || [],
    price: input.price,
    cost_price: input.cost_price || 0,
    sku,
    ean: input.ean || null,
    image_url: input.image_url || null,
    description: input.description || null,
    online_stock: input.online_stock || 0,
    store_stock: input.store_stock || 0,
    status: "published",
  }).select().single();

  if (error) { console.error("createAccessory error:", error); return null; }
  return data as Accessory;
}

export async function bulkCreateAccessories(input: {
  name_pattern: string;
  category: string;
  brand?: string;
  models: string[];
  price: number;
  cost_price?: number;
  ean?: string;
  image_url?: string;
  description?: string;
  online_stock?: number;
  store_stock?: number;
}): Promise<number> {
  const supabase = createAdminClient();
  const rows = input.models.map((model) => ({
    name: `${input.name_pattern} til ${model}`,
    slug: slugify(`${input.name_pattern}-${model}`) + "-" + Math.random().toString(36).slice(2, 6),
    category: input.category,
    brand: input.brand || null,
    compatible_models: [slugify(model)],
    price: input.price,
    cost_price: input.cost_price || 0,
    sku: generateSku(input.category, input.brand || ""),
    ean: input.ean || null,
    image_url: input.image_url || null,
    description: input.description || null,
    online_stock: input.online_stock || 0,
    store_stock: input.store_stock || 0,
    status: "published" as const,
  }));

  const { data, error } = await supabase.from("accessories").insert(rows).select("id");
  if (error) { console.error("bulkCreate error:", error); return 0; }
  return data?.length || 0;
}

export async function getAccessories(filters?: {
  category?: string;
  brand?: string;
  model?: string;
  status?: string;
  search?: string;
  inStoreOnly?: boolean;
}): Promise<Accessory[]> {
  const supabase = createAdminClient();
  let query = supabase.from("accessories").select("*").order("created_at", { ascending: false });

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.brand) query = query.eq("brand", filters.brand);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.model) query = query.contains("compatible_models", [filters.model]);
  if (filters?.inStoreOnly) query = query.gt("store_stock", 0);
  if (filters?.search) query = query.ilike("name", `%${filters.search}%`);

  const { data } = await query;
  return (data as Accessory[]) || [];
}

export async function updateAccessory(id: string, updates: Partial<Accessory>): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("accessories").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
  return !error;
}

export async function deleteAccessory(id: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("accessories").update({ status: "archived" }).eq("id", id);
  return !error;
}

// ---- Templates ----

export async function getTemplates(): Promise<AccessoryTemplate[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("accessory_templates").select("*").order("created_at", { ascending: false });
  return (data as AccessoryTemplate[]) || [];
}

export async function createTemplate(input: Omit<AccessoryTemplate, "id" | "created_at">): Promise<AccessoryTemplate | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("accessory_templates").insert(input).select().single();
  return data as AccessoryTemplate | null;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("accessory_templates").delete().eq("id", id);
  return !error;
}

// ---- EAN ----

export { generateInternalEan };

// ---- Reservations ----

export async function createReservation(input: {
  product_type: "accessory" | "device";
  product_id: string;
  product_name: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  store_id?: string;
}): Promise<Reservation | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("reservations").insert({
    ...input,
    store_id: input.store_id || "slagelse",
  }).select().single();
  if (error) { console.error("createReservation error:", error); return null; }
  return data as Reservation;
}

export async function getReservations(filters?: {
  status?: string;
  store_id?: string;
}): Promise<Reservation[]> {
  const supabase = createAdminClient();
  let query = supabase.from("reservations").select("*").order("created_at", { ascending: false });
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.store_id) query = query.eq("store_id", filters.store_id);
  const { data } = await query;
  return (data as Reservation[]) || [];
}

export async function updateReservationStatus(id: string, status: string): Promise<boolean> {
  const supabase = createAdminClient();
  const updates: Record<string, any> = { status };
  if (status === "ready") updates.ready_at = new Date().toISOString();
  if (status === "collected") updates.collected_at = new Date().toISOString();
  const { error } = await supabase.from("reservations").update(updates).eq("id", id);
  return !error;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/platform-types.ts src/lib/supabase/accessories.ts
git commit -m "feat: add accessories types and query library"
```

---

### Task 3: Admin API routes

**Files:**
- Create: `src/app/api/admin/accessories/route.ts`
- Create: `src/app/api/admin/accessories/[id]/route.ts`
- Create: `src/app/api/admin/accessories/bulk/route.ts`
- Create: `src/app/api/admin/accessories/ean-lookup/route.ts`
- Create: `src/app/api/admin/accessories/generate-ean/route.ts`
- Create: `src/app/api/admin/accessories/templates/route.ts`

- [ ] **Step 1: Main CRUD route**

`src/app/api/admin/accessories/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createAccessory, getAccessories } from "@/lib/supabase/accessories";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const accessories = await getAccessories({
    category: url.searchParams.get("category") || undefined,
    brand: url.searchParams.get("brand") || undefined,
    search: url.searchParams.get("search") || undefined,
    status: url.searchParams.get("status") || undefined,
  });
  return NextResponse.json(accessories);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const accessory = await createAccessory(body);
  if (!accessory) return NextResponse.json({ error: "Kunne ikke oprette produkt" }, { status: 500 });
  return NextResponse.json(accessory);
}
```

- [ ] **Step 2: Single item route**

`src/app/api/admin/accessories/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { updateAccessory, deleteAccessory } from "@/lib/supabase/accessories";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const ok = await updateAccessory(id, body);
  if (!ok) return NextResponse.json({ error: "Opdatering fejlede" }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteAccessory(id);
  if (!ok) return NextResponse.json({ error: "Sletning fejlede" }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Bulk create route**

`src/app/api/admin/accessories/bulk/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { bulkCreateAccessories } from "@/lib/supabase/accessories";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await bulkCreateAccessories(body);
  return NextResponse.json({ created: count });
}
```

- [ ] **Step 4: EAN lookup route**

`src/app/api/admin/accessories/ean-lookup/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const ean = new URL(req.url).searchParams.get("ean");
  if (!ean) return NextResponse.json({ error: "Missing EAN" }, { status: 400 });

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${ean}.json`);
    const data = await res.json();
    if (data.status === 1) {
      return NextResponse.json({
        found: true,
        name: data.product.product_name || null,
        brand: data.product.brands || null,
        image: data.product.image_url || null,
      });
    }
  } catch {}

  return NextResponse.json({ found: false });
}
```

- [ ] **Step 5: Generate EAN route**

`src/app/api/admin/accessories/generate-ean/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { generateInternalEan } from "@/lib/supabase/accessories";

export async function POST() {
  return NextResponse.json({ ean: generateInternalEan() });
}
```

- [ ] **Step 6: Templates route**

`src/app/api/admin/accessories/templates/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getTemplates, createTemplate, deleteTemplate } from "@/lib/supabase/accessories";

export async function GET() {
  return NextResponse.json(await getTemplates());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const template = await createTemplate(body);
  if (!template) return NextResponse.json({ error: "Fejl" }, { status: 500 });
  return NextResponse.json(template);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await deleteTemplate(id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 7: Commit all API routes**

```bash
git add src/app/api/admin/accessories/
git commit -m "feat: add accessories admin API routes (CRUD, bulk, EAN, templates)"
```

---

### Task 4: Admin opret-side (bulk creation with barcode + camera)

**Files:**
- Create: `src/app/(admin)/admin/tilbehoer/page.tsx` — liste over produkter
- Create: `src/app/(admin)/admin/tilbehoer/opret/page.tsx` — oprettelsesformular

This is a large "use client" page. Follow the pattern from `tilfoej-cover/page.tsx` but simpler and with barcode scanning.

- [ ] **Step 1: Create product list page**

`src/app/(admin)/admin/tilbehoer/page.tsx` — shows all accessories with filters, search, quick stock edit, and link to create new.

Key features:
- Filter by category, status
- Search by name
- Inline stock edit (click number → input → save)
- Delete/archive button
- "Opret ny" button linking to /admin/tilbehoer/opret
- Stats at top: total products, published, total stock value

- [ ] **Step 2: Create the opret page**

`src/app/(admin)/admin/tilbehoer/opret/page.tsx` — the main creation form.

Sections:
1. **Template quick-select** — row of template cards at top, click to pre-fill
2. **Category selector** — 6 buttons (Cover, Skærmbeskyttelse, Oplader, Kabel, Lyd, Andet)
3. **Brand input** — text with autocomplete suggestions
4. **Model multi-select** — grouped by brand (Apple, Samsung, etc.), select-all per group, search
5. **Product details** — Name pattern, Price (DKK), Cost price, Online stock, Store stock
6. **EAN section** — 3 buttons: Scan (camera), Tast ind (input), Generer (auto)
7. **Image** — Camera capture (MediaDevices API) or file upload, preview with remove
8. **Actions** — "Opret X produkter" (shows count based on selected models), "Gem som template"

The barcode scanner uses `html5-qrcode` library — add to package.json. On scan success, calls `/api/admin/accessories/ean-lookup` and autofills if found.

Camera capture: `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` → canvas snapshot → upload to `/api/upload`.

- [ ] **Step 3: Add navigation link in admin layout**

Modify `src/app/(admin)/admin/layout.tsx` — add "Tilbehør" link in the sidebar under "Butik" section, linking to `/admin/tilbehoer`.

- [ ] **Step 4: Install html5-qrcode**

```bash
npm install html5-qrcode
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(admin)/admin/tilbehoer/ src/app/(admin)/admin/layout.tsx package.json package-lock.json
git commit -m "feat: add admin tilbehør pages (list + bulk create with barcode)"
```

---

## Chunk 2: Click & Collect System

### Task 5: Reservation API + SMS

**Files:**
- Create: `src/app/api/reservations/route.ts` (public — create reservation)
- Create: `src/app/api/admin/reservations/route.ts` (admin — list)
- Create: `src/app/api/admin/reservations/[id]/route.ts` (admin — update status)

- [ ] **Step 1: Public reservation endpoint**

`src/app/api/reservations/route.ts`:
- POST: Creates reservation, decrements store_stock, sends SMS confirmation
- Validates: product exists, store_stock > 0, required fields present

- [ ] **Step 2: Admin reservation endpoints**

List + status update. "Ready" sends SMS to customer. "Collected" finalizes. "Cancelled" restores stock.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/reservations/ src/app/api/admin/reservations/
git commit -m "feat: add reservation API with SMS notifications"
```

---

### Task 6: Admin reservations dashboard

**Files:**
- Create: `src/app/(admin)/admin/reservationer/page.tsx`

- [ ] **Step 1: Build reservations admin page**

Shows: Active reservations list with status badges, customer info, product name, time remaining.
Actions: "Klar til afhentning" → sends SMS, "Afhentet" → closes, "Annuller" → restores stock.
Filter by status (pending/ready/collected/expired).

- [ ] **Step 2: Add to admin layout sidebar**

- [ ] **Step 3: Commit**

---

### Task 7: Store availability badge component

**Files:**
- Create: `src/components/ui/store-badge.tsx`

- [ ] **Step 1: Build reusable badge**

```typescript
// Shows "✓ På lager i Slagelse" (green) or "Kun online" (gray) or "Sidste X stk" (orange)
export function StoreBadge({ storeStock }: { storeStock: number }) { ... }
```

- [ ] **Step 2: Build reservation form component**

```typescript
// Slide-in form: Name + Phone → creates reservation
export function ReservationForm({ productId, productName, productType, onSuccess }: {...}) { ... }
```

- [ ] **Step 3: Commit**

---

## Chunk 3: Public Tilbehørsside Redesign

### Task 8: Public accessories API

**Files:**
- Create: `src/app/api/accessories/route.ts`
- Create: `src/app/api/accessories/[slug]/route.ts`

- [ ] **Step 1: Public list endpoint with filters**

GET with query params: category, brand, model, search, inStore, page, limit

- [ ] **Step 2: Single product endpoint**

- [ ] **Step 3: Commit**

---

### Task 9: Redesign tilbehør page

**Files:**
- Rewrite: `src/app/tilbehoer/page.tsx`
- Create: `src/components/tilbehoer/accessory-grid.tsx` (client component with filters)
- Create: `src/components/tilbehoer/accessory-card.tsx`

- [ ] **Step 1: New tilbehør page layout**

Sections:
1. Hero with butik-indvendig.jpg (covers wall)
2. Quick model search: "Find tilbehør til din enhed"
3. Category cards (5 categories with icons)
4. Product grid with sidebar filters
5. Each product card shows: image, name, price, store badge, "Tilføj til kurv" + "Afhent i butik"

- [ ] **Step 2: Accessory card with Click & Collect**

Card shows StoreBadge. Click "Afhent i butik" opens ReservationForm modal.

- [ ] **Step 3: Category pages update**

`src/app/tilbehoer/[category]/page.tsx` — fetch from accessories API instead of Shopify.

- [ ] **Step 4: Commit**

```bash
git add src/app/tilbehoer/ src/components/tilbehoer/ src/app/api/accessories/
git commit -m "feat: redesign tilbehør page with accessories API + click & collect"
```

---

### Task 10: Final integration + push

- [ ] **Step 1: Build verification**

```bash
npx next build
```

- [ ] **Step 2: Push**

```bash
git push origin main
```
