# Cover Upload Tool — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Admin page at `/admin/tilfoej-cover` for rapid-fire creation of individual cover/case products on Shopify.

**Architecture:** Upload image to Supabase (existing route), create product on Shopify via Admin API `productCreate`, add to `covers-1` collection via `collectionAddProducts`. Form resets after success for speed.

**Tech Stack:** Next.js, Shopify Admin GraphQL API (2024-10), Supabase Storage, Tailwind CSS

---

### Task 1: Extend Shopify Admin Client

**Files:**
- Modify: `src/lib/shopify/admin-client.ts`

**Step 1: Add `createProduct` function**

Adds `productCreate` mutation that:
- Creates product with title, body HTML, vendor "PhoneSpot", product type, tags
- Sets single variant with price
- Attaches image via external URL (Supabase public URL)
- Returns product ID and handle

**Step 2: Add `addProductToCollection` function**

Adds `collectionAddProducts` mutation that:
- Takes collection ID and product ID
- Adds product to the specified collection

**Step 3: Add `getCollectionByHandle` function**

Query to resolve `covers-1` handle to a collection GID.

---

### Task 2: Create API Route

**Files:**
- Create: `src/app/api/admin/products/create/route.ts`

POST endpoint that:
1. Receives: `{ title, price, imageUrl, models, productType }`
2. Calls `createProduct()` with the data
3. Calls `addProductToCollection()` to add to covers-1
4. Returns the created product

---

### Task 3: Build Admin Page

**Files:**
- Create: `src/app/(admin)/admin/tilfoej-cover/page.tsx`

Client component with:
- Photo upload (drag & drop + click) with preview
- Multi-select for compatible models (iPhone 13-16 series, Samsung S/A series, etc.)
- Price input (default 79 kr)
- Auto-generated title from selected models
- Submit → success toast → form reset (keep price)
- Created products counter for the session

---

### Task 4: Add to Admin Navigation

**Files:**
- Modify: `src/app/(admin)/admin/layout.tsx`

Add "Tilføj Cover" nav item between "Ny indlevering" and "Reparationer".
