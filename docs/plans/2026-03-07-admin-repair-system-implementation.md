# Admin Repair System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace C1ST with an in-house repair management system built into the existing Next.js admin panel.

**Architecture:** Extend existing `/admin` route group with new pages and API routes. Supabase for data, GatewayAPI for SMS, Shopify Admin API for Draft Orders/payments, @react-pdf/renderer for documents.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL + Storage), GatewayAPI, Shopify Admin API (GraphQL), @react-pdf/renderer, Resend, TypeScript, Tailwind CSS v4

---

### Task 1: Database Migration — New Tables

**Files:**
- Create: `src/lib/supabase/migrations/003_admin_repair_system.sql`

**Step 1: Write the migration SQL**

```sql
-- ============================================================
-- 003_admin_repair_system.sql
-- New tables: customers, customer_devices, contact_inquiries, sms_log
-- Alter: repair_tickets (add new columns, new status value)
-- ============================================================

-- customers
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('privat', 'erhverv')),
  name text not null,
  email text,
  phone text not null,
  company_name text,
  cvr text,
  created_at timestamptz default now()
);

create index idx_customers_phone on customers(phone);
create index idx_customers_email on customers(email);

-- customer_devices
create table if not exists customer_devices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  brand text not null,
  model text not null,
  serial_number text,
  color text,
  condition_notes text,
  photos jsonb default '[]',
  created_at timestamptz default now()
);

create index idx_customer_devices_customer on customer_devices(customer_id);

-- contact_inquiries
create table if not exists contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  status text not null default 'ny' check (status in ('ny', 'besvaret', 'lukket')),
  admin_notes text,
  created_at timestamptz default now()
);

-- sms_log
create table if not exists sms_log (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references repair_tickets(id),
  customer_id uuid references customers(id),
  phone text not null,
  message text not null,
  provider_message_id text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz default now()
);

create index idx_sms_log_ticket on sms_log(ticket_id);

-- Extend repair_tickets
alter table repair_tickets
  add column if not exists customer_id uuid references customers(id),
  add column if not exists device_id uuid references customer_devices(id),
  add column if not exists services jsonb,
  add column if not exists internal_notes jsonb default '[]',
  add column if not exists intake_checklist jsonb,
  add column if not exists intake_photos jsonb default '[]',
  add column if not exists checkout_photos jsonb default '[]',
  add column if not exists shopify_draft_order_id text,
  add column if not exists shopify_order_id text,
  add column if not exists paid boolean default false,
  add column if not exists paid_at timestamptz;

-- Update status check constraint to include 'diagnostik'
-- Drop old constraint and recreate (safe approach)
alter table repair_tickets drop constraint if exists repair_tickets_status_check;
alter table repair_tickets add constraint repair_tickets_status_check
  check (status in ('modtaget', 'diagnostik', 'tilbud_sendt', 'godkendt', 'i_gang', 'faerdig', 'afhentet'));

-- RLS policies
alter table customers enable row level security;
alter table customer_devices enable row level security;
alter table contact_inquiries enable row level security;
alter table sms_log enable row level security;

create policy "Auth read customers" on customers for select using (auth.role() = 'authenticated');
create policy "Auth write customers" on customers for all using (auth.role() = 'authenticated');
create policy "Auth read customer_devices" on customer_devices for select using (auth.role() = 'authenticated');
create policy "Auth write customer_devices" on customer_devices for all using (auth.role() = 'authenticated');
create policy "Auth read contact_inquiries" on contact_inquiries for select using (auth.role() = 'authenticated');
create policy "Auth write contact_inquiries" on contact_inquiries for all using (auth.role() = 'authenticated');
create policy "Auth read sms_log" on sms_log for select using (auth.role() = 'authenticated');
create policy "Auth write sms_log" on sms_log for all using (auth.role() = 'authenticated');

-- Supabase Storage bucket for device photos
-- Run manually in Supabase Dashboard: create bucket 'device-photos' (public: false)
```

**Step 2: Run migration in Supabase**

Run the SQL in Supabase SQL Editor (Dashboard > SQL Editor > paste > Run).

**Step 3: Create Supabase Storage bucket**

In Supabase Dashboard: Storage > New bucket > Name: `device-photos` > Private (not public).

**Step 4: Commit**

```bash
git add src/lib/supabase/migrations/003_admin_repair_system.sql
git commit -m "feat: add database migration for admin repair system"
```

---

### Task 2: TypeScript Types

**Files:**
- Modify: `src/lib/supabase/types.ts`

**Step 1: Add new types to types.ts**

Add after the existing `RepairStatusLog` interface:

```typescript
// Update RepairStatus to include 'diagnostik'
export type RepairStatus =
  | "modtaget"
  | "diagnostik"
  | "tilbud_sendt"
  | "godkendt"
  | "i_gang"
  | "faerdig"
  | "afhentet";

export type CustomerType = "privat" | "erhverv";

export interface Customer {
  id: string;
  type: CustomerType;
  name: string;
  email: string | null;
  phone: string;
  company_name: string | null;
  cvr: string | null;
  created_at: string;
}

export interface CustomerDevice {
  id: string;
  customer_id: string;
  brand: string;
  model: string;
  serial_number: string | null;
  color: string | null;
  condition_notes: string | null;
  photos: string[];
  created_at: string;
}

export type ChecklistStatus = "ok" | "fejl" | "ikke_relevant";

export interface ChecklistItem {
  label: string;
  status: ChecklistStatus;
  note: string;
  photo_url: string | null;
}

export interface InternalNote {
  text: string;
  author: string;
  timestamp: string;
}

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: "ny" | "besvaret" | "lukket";
  admin_notes: string | null;
  created_at: string;
}

export interface SmsLogEntry {
  id: string;
  ticket_id: string | null;
  customer_id: string | null;
  phone: string;
  message: string;
  provider_message_id: string | null;
  status: "pending" | "sent" | "failed";
  created_at: string;
}
```

Update the existing `RepairTicket` interface to include new fields:

```typescript
export interface RepairTicket {
  id: string;
  // Legacy fields (kept for backwards compat with old tickets)
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  device_type: string;
  device_model: string;
  issue_description: string;
  service_type: string;
  // New fields
  customer_id: string | null;
  device_id: string | null;
  services: { id: string; name: string; price_dkk: number }[] | null;
  internal_notes: InternalNote[];
  intake_checklist: ChecklistItem[] | null;
  intake_photos: string[];
  checkout_photos: string[];
  shopify_draft_order_id: string | null;
  shopify_order_id: string | null;
  paid: boolean;
  paid_at: string | null;
  // Existing
  status: RepairStatus;
  booking_details: BookingDetails | null;
  created_at: string;
  updated_at: string;
}
```

Also update the Database interface to include the new tables.

**Step 2: Commit**

```bash
git add src/lib/supabase/types.ts
git commit -m "feat: add TypeScript types for admin repair system"
```

---

### Task 3: GatewayAPI SMS Client

**Files:**
- Create: `src/lib/gateway-api/client.ts`
- Create: `src/lib/gateway-api/templates.ts`

**Step 1: Install no new dependencies (GatewayAPI is a REST API)**

No npm packages needed — just fetch.

**Step 2: Write the SMS client**

`src/lib/gateway-api/client.ts`:

```typescript
const GATEWAY_API_TOKEN = process.env.GATEWAYAPI_TOKEN ?? "";
const GATEWAY_API_URL = "https://gatewayapi.com/rest/mtsms";
const SENDER_NAME = "PhoneSpot";

interface SendSmsResult {
  success: boolean;
  messageId: string | null;
  error: string | null;
}

export async function sendSms(
  phone: string,
  message: string,
): Promise<SendSmsResult> {
  // Normalize Danish phone numbers
  const normalized = phone.replace(/\s+/g, "").replace(/^(\+45)?/, "45");

  try {
    const res = await fetch(GATEWAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GATEWAY_API_TOKEN}`,
      },
      body: JSON.stringify({
        sender: SENDER_NAME,
        message,
        recipients: [{ msisdn: Number(normalized) }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, messageId: null, error: err };
    }

    const data = await res.json();
    return {
      success: true,
      messageId: String(data.ids?.[0] ?? ""),
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      messageId: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
```

**Step 3: Write SMS templates**

`src/lib/gateway-api/templates.ts`:

```typescript
import { STORE } from "@/lib/store-config";

interface SmsTemplateData {
  customerName: string;
  deviceName: string;
  ticketId: string;
  price?: number;
  estimatedDate?: string;
}

export function getSmsTemplate(
  status: string,
  data: SmsTemplateData,
): string | null {
  const { customerName, deviceName, ticketId, price, estimatedDate } = data;
  const shortId = ticketId.slice(0, 8);

  switch (status) {
    case "modtaget":
      return `Hej ${customerName}, vi har modtaget din ${deviceName}. Sags-ID: ${shortId}. Vi vender tilbage med et tilbud. - ${STORE.name}`;
    case "tilbud_sendt":
      return `Hej ${customerName}, dit tilbud paa ${deviceName} er klar: ${price} DKK. Ring til os paa ${STORE.phone} for at godkende. - ${STORE.name}`;
    case "godkendt":
      return `Tak ${customerName}! Vi gaar i gang med din ${deviceName}.${estimatedDate ? ` Forventet faerdig: ${estimatedDate}.` : ""} - ${STORE.name}`;
    case "faerdig":
      return `Hej ${customerName}, din ${deviceName} er klar til afhentning i ${STORE.mall}. Aabent: Hverdage ${STORE.hours.weekdays}, Loerdag ${STORE.hours.saturday}. - ${STORE.name}`;
    default:
      return null;
  }
}
```

**Step 4: Commit**

```bash
git add src/lib/gateway-api/
git commit -m "feat: add GatewayAPI SMS client and templates"
```

---

### Task 4: SMS API Route

**Files:**
- Create: `src/app/api/sms/route.ts`
- Create: `src/app/api/sms/send/route.ts`

**Step 1: Write the send SMS API route**

`src/app/api/sms/send/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { sendSms } from "@/lib/gateway-api/client";

export async function POST(request: Request) {
  const body = await request.json();
  const { ticket_id, customer_id, phone, message } = body;

  if (!phone || !message) {
    return NextResponse.json(
      { error: "Telefon og besked er paakraevet" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // Send SMS
  const result = await sendSms(phone, message);

  // Log to database
  await supabase.from("sms_log").insert({
    ticket_id: ticket_id ?? null,
    customer_id: customer_id ?? null,
    phone,
    message,
    provider_message_id: result.messageId,
    status: result.success ? "sent" : "failed",
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "SMS kunne ikke sendes" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, messageId: result.messageId });
}
```

**Step 2: Commit**

```bash
git add src/app/api/sms/
git commit -m "feat: add SMS send API route with logging"
```

---

### Task 5: Shopify Admin API Client

**Files:**
- Create: `src/lib/shopify/admin-client.ts`

**Step 1: Write the Shopify Admin API client**

Note: The existing `src/lib/shopify/client.ts` uses the Storefront API. This new file uses the Admin API for Draft Orders.

```typescript
const domain = process.env.SHOPIFY_STORE_DOMAIN ?? "";
const adminAccessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? "";
const API_VERSION = "2024-10";

const adminEndpoint = `https://${domain}/admin/api/${API_VERSION}/graphql.json`;

async function shopifyAdminFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(adminEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminAccessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Shopify Admin API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json() as { data: T; errors?: unknown[] };
  if (json.errors) {
    throw new Error(`Shopify Admin GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

interface DraftOrderLineItem {
  title: string;
  quantity: number;
  originalUnitPrice: string; // e.g. "899.00"
}

interface CreateDraftOrderInput {
  customerEmail?: string;
  customerPhone?: string;
  lineItems: DraftOrderLineItem[];
  note?: string;
  tags?: string[];
}

interface DraftOrderResult {
  id: string;
  invoiceUrl: string;
  name: string;
}

export async function createDraftOrder(input: CreateDraftOrderInput): Promise<DraftOrderResult> {
  const mutation = `
    mutation draftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          invoiceUrl
          name
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      lineItems: input.lineItems.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        originalUnitPrice: item.originalUnitPrice,
      })),
      ...(input.customerEmail ? { email: input.customerEmail } : {}),
      ...(input.customerPhone ? { phone: input.customerPhone } : {}),
      ...(input.note ? { note: input.note } : {}),
      ...(input.tags ? { tags: input.tags } : {}),
    },
  };

  const data = await shopifyAdminFetch<{
    draftOrderCreate: {
      draftOrder: DraftOrderResult | null;
      userErrors: { field: string[]; message: string }[];
    };
  }>(mutation, variables);

  if (data.draftOrderCreate.userErrors.length > 0) {
    throw new Error(
      `Draft order errors: ${data.draftOrderCreate.userErrors.map((e) => e.message).join(", ")}`,
    );
  }

  if (!data.draftOrderCreate.draftOrder) {
    throw new Error("Draft order creation returned null");
  }

  return data.draftOrderCreate.draftOrder;
}

export async function sendDraftOrderInvoice(draftOrderId: string, email?: string): Promise<void> {
  const mutation = `
    mutation draftOrderInvoiceSend($id: ID!, $email: EmailInput) {
      draftOrderInvoiceSend(id: $id, email: $email) {
        userErrors {
          field
          message
        }
      }
    }
  `;

  await shopifyAdminFetch(mutation, {
    id: draftOrderId,
    ...(email ? { email: { to: email } } : {}),
  });
}
```

**Step 2: Commit**

```bash
git add src/lib/shopify/admin-client.ts
git commit -m "feat: add Shopify Admin API client for draft orders"
```

---

### Task 6: Shopify Webhook Handler

**Files:**
- Create: `src/app/api/webhooks/shopify/route.ts`

**Step 1: Write the webhook handler**

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import crypto from "crypto";

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET ?? "";

function verifyWebhook(body: string, hmac: string): boolean {
  const hash = crypto
    .createHmac("sha256", SHOPIFY_WEBHOOK_SECRET)
    .update(body, "utf8")
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac));
}

export async function POST(request: Request) {
  const body = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256") ?? "";
  const topic = request.headers.get("x-shopify-topic") ?? "";

  // Verify webhook signature
  if (SHOPIFY_WEBHOOK_SECRET && !verifyWebhook(body, hmac)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const supabase = createServerClient();

  if (topic === "orders/paid") {
    // Find ticket by shopify_order_id or shopify_draft_order_id
    const orderId = String(payload.id);
    const { data: ticket } = await supabase
      .from("repair_tickets")
      .select("id")
      .or(`shopify_order_id.eq.${orderId},shopify_draft_order_id.eq.${orderId}`)
      .single();

    if (ticket) {
      await supabase
        .from("repair_tickets")
        .update({
          paid: true,
          paid_at: new Date().toISOString(),
          shopify_order_id: orderId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);
    }
  }

  if (topic === "orders/cancelled") {
    const orderId = String(payload.id);
    const { data: ticket } = await supabase
      .from("repair_tickets")
      .select("id")
      .or(`shopify_order_id.eq.${orderId},shopify_draft_order_id.eq.${orderId}`)
      .single();

    if (ticket) {
      await supabase
        .from("repair_tickets")
        .update({
          paid: false,
          paid_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);
    }
  }

  return NextResponse.json({ received: true });
}
```

**Step 2: Commit**

```bash
git add src/app/api/webhooks/shopify/route.ts
git commit -m "feat: add Shopify webhook handler for order payments"
```

---

### Task 7: Photo Upload API Route

**Files:**
- Create: `src/app/api/upload/route.ts`

**Step 1: Write the upload route using Supabase Storage**

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const folder = formData.get("folder") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Ingen fil valgt" }, { status: 400 });
  }

  const supabase = createServerClient();

  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = `${folder ?? "misc"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from("device-photos")
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Kunne ikke uploade fil" },
      { status: 500 },
    );
  }

  const { data: urlData } = supabase.storage
    .from("device-photos")
    .getPublicUrl(fileName);

  return NextResponse.json({ url: urlData.publicUrl, path: fileName });
}
```

**Step 2: Commit**

```bash
git add src/app/api/upload/route.ts
git commit -m "feat: add photo upload API route with Supabase Storage"
```

---

### Task 8: Customer API Routes

**Files:**
- Create: `src/app/api/customers/route.ts`
- Create: `src/app/api/customers/[id]/route.ts`
- Create: `src/app/api/customers/[id]/devices/route.ts`
- Create: `src/app/api/customers/search/route.ts`

**Step 1: Write customer CRUD routes**

`src/app/api/customers/route.ts` — GET (list) + POST (create):

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*, customer_devices(*)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { type, name, email, phone, company_name, cvr } = body;

  if (!type || !name || !phone) {
    return NextResponse.json(
      { error: "Type, navn og telefon er paakraevet" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      type,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone.trim(),
      company_name: type === "erhverv" ? company_name?.trim() || null : null,
      cvr: type === "erhverv" ? cvr?.trim() || null : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
```

`src/app/api/customers/search/route.ts` — GET with query param:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*, customer_devices(*)")
    .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,company_name.ilike.%${q}%`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
```

`src/app/api/customers/[id]/route.ts` — GET single + PATCH update:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*, customer_devices(*)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Kunde ikke fundet" }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createServerClient();

  const { error } = await supabase
    .from("customers")
    .update(body)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
```

`src/app/api/customers/[id]/devices/route.ts` — POST (add device):

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { brand, model, serial_number, color, condition_notes, photos } = body;

  if (!brand || !model) {
    return NextResponse.json(
      { error: "Brand og model er paakraevet" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("customer_devices")
    .insert({
      customer_id: id,
      brand: brand.trim(),
      model: model.trim(),
      serial_number: serial_number?.trim() || null,
      color: color?.trim() || null,
      condition_notes: condition_notes?.trim() || null,
      photos: photos ?? [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
```

**Step 2: Commit**

```bash
git add src/app/api/customers/
git commit -m "feat: add customer CRUD and search API routes"
```

---

### Task 9: Contact Inquiries — Update API + Admin Page

**Files:**
- Modify: `src/app/api/contact/route.ts`
- Create: `src/app/api/contact/[id]/route.ts`
- Create: `src/app/(admin)/admin/henvendelser/page.tsx`

**Step 1: Update contact API to save to Supabase**

In `src/app/api/contact/route.ts`, add Supabase insert before the Resend email send:

```typescript
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/client";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, phone, subject, message } = body;

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Udfyld alle felter" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Save to database
  await supabase.from("contact_inquiries").insert({
    name: name.trim(),
    email: email.trim(),
    phone: phone?.trim() || null,
    subject: subject?.trim() || null,
    message: message.trim(),
  });

  try {
    await resend.emails.send({
      from: "PhoneSpot Kontakt <noreply@phonespot.dk>",
      to: "info@phonespot.dk",
      replyTo: email,
      subject: `Kontakt: ${subject || "Generel henvendelse"}`,
      text: `Navn: ${name}\nEmail: ${email}\n${phone ? `Telefon: ${phone}\n` : ""}\n${message}`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Kunne ikke sende besked" },
      { status: 500 },
    );
  }
}
```

**Step 2: Write contact detail/update API route**

`src/app/api/contact/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createServerClient();

  const { error } = await supabase
    .from("contact_inquiries")
    .update(body)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
```

**Step 3: Write the Henvendelser admin page**

Create `src/app/(admin)/admin/henvendelser/page.tsx` — a client component that:
- Fetches all contact_inquiries from Supabase
- Shows list with status badges (ny = blue, besvaret = green, lukket = gray)
- Filter by status
- Click to expand — shows full message + admin notes field
- Buttons to change status and save notes

Follow the same pattern as `src/app/(admin)/admin/reparationer/page.tsx` for styling and structure.

**Step 4: Commit**

```bash
git add src/app/api/contact/ src/app/\(admin\)/admin/henvendelser/
git commit -m "feat: add contact inquiries to Supabase and admin inbox"
```

---

### Task 10: Update Admin Sidebar Navigation

**Files:**
- Modify: `src/app/(admin)/admin/layout.tsx`

**Step 1: Add new nav items**

Add to `NAV_ITEMS` array in `src/app/(admin)/admin/layout.tsx`:

After "Dashboard", add "Indlevering" (href: `/admin/indlevering`).
After "Reparationer", keep "Kunder".
After "Kunder", add "Henvendelser" (href: `/admin/henvendelser`).
After "Prisliste", add "SMS Log" (href: `/admin/sms-log`).

Use appropriate SVG icons for each (inbox icon for Henvendelser, chat-bubble for SMS Log, plus-circle for Indlevering).

Also add `diagnostik` to `STATUS_LABELS` and `STATUS_COLORS` in all admin pages that reference them.

**Step 2: Commit**

```bash
git add src/app/\(admin\)/admin/layout.tsx
git commit -m "feat: update admin sidebar with new navigation items"
```

---

### Task 11: Intake Wizard — Step 1 (Customer)

**Files:**
- Create: `src/app/(admin)/admin/indlevering/page.tsx`
- Create: `src/app/(admin)/admin/indlevering/steps/customer-step.tsx`

**Step 1: Create the intake wizard page**

`src/app/(admin)/admin/indlevering/page.tsx` — a "use client" component that:
- Manages wizard state (currentStep: 1-4)
- Holds all form data in a single state object
- Renders the correct step component
- Shows step indicator (1. Kunde, 2. Enhed, 3. Reparation, 4. Opsummering)

**Step 2: Create the customer step**

`steps/customer-step.tsx`:
- Search bar that calls `GET /api/customers/search?q=...` (debounced 300ms)
- Results dropdown showing matching customers
- "Opret ny kunde" button that reveals a form
- Privat/Erhverv toggle
- Fields: Navn, Telefon, Email (required for privat; optional for erhverv adds Firmanavn + CVR)
- "Naeste" button to proceed

**Step 3: Commit**

```bash
git add src/app/\(admin\)/admin/indlevering/
git commit -m "feat: add intake wizard step 1 — customer search and creation"
```

---

### Task 12: Intake Wizard — Step 2 (Device + Checklist)

**Files:**
- Create: `src/app/(admin)/admin/indlevering/steps/device-step.tsx`
- Create: `src/app/(admin)/admin/indlevering/steps/checklist.tsx`

**Step 1: Create the device step**

`steps/device-step.tsx`:
- If customer has existing devices, show them as selectable cards
- "Tilfoej ny enhed" form: Brand (dropdown from repair_brands), Model (text), Serienummer, Farve
- Below the device form: the Checklist component

**Step 2: Create the checklist component**

`steps/checklist.tsx`:
- List of checklist items, each with:
  - Label (e.g. "Skaerm")
  - 3-button toggle: OK / Fejl / Ikke relevant
  - Text input for notes
  - Upload button for photo (calls `POST /api/upload`)
  - Photo thumbnail preview
- Items: Skaerm, Bagside/ramme, Kamera, Opladning, Lyd/hoejttaler, Knapper, Vandskade-indikator, Batteri, Find My/iCloud, Adgangskode, Tilbehoer
- General photos section (multiple uploads for overall check-in photos)

**Step 3: Commit**

```bash
git add src/app/\(admin\)/admin/indlevering/steps/device-step.tsx src/app/\(admin\)/admin/indlevering/steps/checklist.tsx
git commit -m "feat: add intake wizard step 2 — device registration and checklist"
```

---

### Task 13: Intake Wizard — Step 3 (Repair Selection)

**Files:**
- Create: `src/app/(admin)/admin/indlevering/steps/repair-step.tsx`

**Step 1: Create the repair selection step**

`steps/repair-step.tsx`:
- Auto-lookup: based on selected brand/model, fetch matching services from `repair_services` via `repair_models` + `repair_brands`
- Show available services as checkboxes with prices
- "Tilfoej fritekst-reparation" — custom name + price input
- Internal notes textarea (for the workshop)
- Running total at bottom
- "Naeste" button

**Step 2: Commit**

```bash
git add src/app/\(admin\)/admin/indlevering/steps/repair-step.tsx
git commit -m "feat: add intake wizard step 3 — repair service selection"
```

---

### Task 14: Intake Wizard — Step 4 (Summary + Submit)

**Files:**
- Create: `src/app/(admin)/admin/indlevering/steps/summary-step.tsx`
- Create: `src/app/api/intake/route.ts`

**Step 1: Create the summary step**

`steps/summary-step.tsx`:
- Displays all collected data: customer info, device, checklist summary, selected repairs, total price, internal notes
- Checkbox: "Opret Shopify betaling" (default on)
- Checkbox: "Send SMS til kunden" (default on)
- Checkbox: "Send email til kunden" (default on)
- "Opret sag" button — calls `POST /api/intake`
- On success: shows links to "Download indleveringsbevis (PDF)" and "Download vaerkstedsrapport (PDF)"

**Step 2: Write the intake API route**

`src/app/api/intake/route.ts`:
- Receives all wizard data
- Creates customer (or uses existing)
- Creates device (or uses existing)
- Creates repair_ticket with all new fields
- Logs initial status to repair_status_log
- If Shopify checkbox: calls createDraftOrder from admin-client
- If SMS checkbox: calls POST /api/sms/send with template
- If email checkbox: sends confirmation via Resend
- Returns ticket ID

**Step 3: Commit**

```bash
git add src/app/\(admin\)/admin/indlevering/steps/summary-step.tsx src/app/api/intake/route.ts
git commit -m "feat: add intake wizard step 4 — summary, submit, and integrations"
```

---

### Task 15: PDF Generation — Intake Receipt + Workshop Report

**Files:**
- Create: `src/lib/pdf/intake-receipt.tsx`
- Create: `src/lib/pdf/workshop-report.tsx`
- Create: `src/app/api/pdf/intake-receipt/[ticketId]/route.ts`
- Create: `src/app/api/pdf/workshop-report/[ticketId]/route.ts`

**Step 1: Install @react-pdf/renderer**

```bash
npm install @react-pdf/renderer
```

**Step 2: Write intake receipt PDF template**

`src/lib/pdf/intake-receipt.tsx`:
- Uses @react-pdf/renderer Document, Page, View, Text, Image components
- PhoneSpot logo + store info header
- Sags-ID + dato
- Customer info section
- Device info section
- Checklist summary (items marked as fejl highlighted)
- Selected repairs with prices
- Total price
- Terms and conditions text
- Rendered server-side, returned as PDF stream

**Step 3: Write workshop report PDF template**

`src/lib/pdf/workshop-report.tsx`:
- Large sags-ID header
- Customer name + phone
- Device + serial number
- Checklist as printable checkboxes
- Selected repairs as checklist
- Internal notes
- Empty "Tekniker noter:" section for handwriting

**Step 4: Write API routes that generate and stream PDFs**

Each route: fetch ticket + customer + device from Supabase, render PDF with @react-pdf/renderer `renderToStream`, return as `application/pdf` response.

**Step 5: Commit**

```bash
git add src/lib/pdf/ src/app/api/pdf/
git commit -m "feat: add PDF generation for intake receipt and workshop report"
```

---

### Task 16: Update Existing Ticket Detail Page

**Files:**
- Modify: `src/app/(admin)/admin/reparationer/[id]/page.tsx`

**Step 1: Enhance ticket detail page**

Update the existing ticket detail page to:
- Show linked customer info (from `customers` table if `customer_id` exists)
- Show device info (from `customer_devices` if `device_id` exists)
- Show intake checklist with photos
- Show intake/checkout photos
- Internal notes section: display existing notes + "Add note" form
- SMS section: "Send SMS" button with template dropdown + manual text
- Payment status: show paid/unpaid badge, "Opret Shopify betaling" button, "Send betalingslink" button
- PDF download links: intake receipt + workshop report
- Checkout photos upload (for when device is returned)

**Step 2: Add diagnostik to status progression and labels**

Update `STATUS_LABELS`, `STATUS_COLORS`, `STATUS_PROGRESSION` to include `diagnostik` between `modtaget` and `tilbud_sendt`.

**Step 3: Commit**

```bash
git add src/app/\(admin\)/admin/reparationer/\[id\]/page.tsx
git commit -m "feat: enhance ticket detail with customer, device, SMS, photos, payments"
```

---

### Task 17: Update Reparationer List Page

**Files:**
- Modify: `src/app/(admin)/admin/reparationer/page.tsx`

**Step 1: Enhance the repairs list**

- Add `diagnostik` to status filter and labels
- Show customer name from `customers` table (join via customer_id) when available
- Show device brand/model from `customer_devices` when available
- Show paid/unpaid badge
- Add "Ny indlevering" button linking to `/admin/indlevering`

**Step 2: Commit**

```bash
git add src/app/\(admin\)/admin/reparationer/page.tsx
git commit -m "feat: update repairs list with new fields and diagnostik status"
```

---

### Task 18: Update Customer Page

**Files:**
- Modify: `src/app/(admin)/admin/kunder/page.tsx`
- Create: `src/app/(admin)/admin/kunder/[id]/page.tsx`

**Step 1: Rewrite kunder page to use customers table**

Replace the current ticket-grouping approach with direct `customers` table queries:
- Fetch from `customers` with `customer_devices` join
- Show customer type badge (privat/erhverv)
- Show company name + CVR for erhverv
- Click to go to customer detail page

**Step 2: Create customer detail page**

`src/app/(admin)/admin/kunder/[id]/page.tsx`:
- Customer info (editable)
- List of devices with photos
- List of all repair tickets for this customer
- "Ny indlevering" button (pre-fills customer in wizard)

**Step 3: Commit**

```bash
git add src/app/\(admin\)/admin/kunder/
git commit -m "feat: rewrite customer page with proper customer table and detail view"
```

---

### Task 19: SMS Log Page

**Files:**
- Create: `src/app/(admin)/admin/sms-log/page.tsx`

**Step 1: Create SMS log page**

- Fetch all from `sms_log` ordered by created_at desc
- Show: timestamp, phone, message (truncated), status badge (sent=green, failed=red, pending=yellow)
- Click to expand full message
- Link to ticket if ticket_id exists
- Search by phone number

**Step 2: Commit**

```bash
git add src/app/\(admin\)/admin/sms-log/
git commit -m "feat: add SMS log admin page"
```

---

### Task 20: Update Status API to Send SMS

**Files:**
- Modify: `src/app/api/repairs/[id]/status/route.ts`

**Step 1: Add SMS sending on status change**

After status update and email send, add:
- Look up customer phone (from customers table via customer_id, or fallback to ticket.customer_phone)
- Get SMS template for the new status
- If template exists, call sendSms and log it

**Step 2: Commit**

```bash
git add src/app/api/repairs/\[id\]/status/route.ts
git commit -m "feat: send SMS notification on repair status change"
```

---

### Task 21: Update Dashboard

**Files:**
- Modify: `src/app/(admin)/admin/page.tsx`

**Step 1: Enhance dashboard**

- Add "Nye henvendelser" stat card (count of contact_inquiries with status = 'ny')
- Add quick action: "Ny indlevering" button
- Add quick action: "Se henvendelser" button
- Show payment status on recent tickets (paid/unpaid badge)

**Step 2: Commit**

```bash
git add src/app/\(admin\)/admin/page.tsx
git commit -m "feat: update admin dashboard with inquiries and intake shortcut"
```

---

### Task 22: Environment Variables

**Files:**
- Modify: `.env.local` (not committed — document in README)

**Step 1: Document required env vars**

Add these to your `.env.local`:

```
# GatewayAPI (SMS)
GATEWAYAPI_TOKEN=your_token_here

# Shopify Admin API (for Draft Orders)
SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_token_here

# Shopify Webhooks
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here
```

The following should already exist:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SHOPIFY_STORE_DOMAIN=...
RESEND_API_KEY=...
```

**Step 2: Set up Shopify webhook**

In Shopify Admin > Settings > Notifications > Webhooks:
- Add webhook: `orders/paid` -> `https://phonespot.dk/api/webhooks/shopify`
- Add webhook: `orders/cancelled` -> `https://phonespot.dk/api/webhooks/shopify`

**Step 3: Set up GatewayAPI account**

Sign up at gatewayapi.com, get API token, add to env.

**Step 4: Commit any non-secret config changes**

```bash
git commit --allow-empty -m "docs: document required environment variables for admin system"
```

---

### Task 23: Final Integration Test

**Step 1: Test the full walk-in flow**

1. Go to `/admin/indlevering`
2. Create a new privat customer
3. Add a device with checklist (mark some items as fejl, upload a test photo)
4. Select repair services
5. Submit — verify ticket appears in `/admin/reparationer`
6. Open ticket detail — verify all data shows correctly
7. Download intake receipt PDF
8. Download workshop report PDF
9. Change status — verify SMS is sent (check SMS log)
10. Open `/admin/kunder` — verify customer shows with device

**Step 2: Test contact inquiry flow**

1. Submit contact form on public site
2. Verify it appears in `/admin/henvendelser`
3. Change status to besvaret, add admin note

**Step 3: Test Shopify integration**

1. Create a ticket with Shopify payment enabled
2. Verify draft order appears in Shopify admin
3. Complete payment in Shopify POS
4. Verify webhook updates ticket as paid

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete admin repair system phase 1"
```
